import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import Task from '../models/task.model.js';
import User from '../models/user.model.js';
import Project from '../models/project.model.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  sendTaskAssignmentEmail,
  sendTaskStatusUpdateEmail,
  sendNotification
} from '../services/notification.service.js';

/* =========================================================
   CONSTANTS
========================================================= */

const VALID_STATUSES = [
  'pending',
  'in-progress',
  'in_progress',
  'completed',
  'done',
  'cancelled',
  'on-hold',
  'on_hold'
];

const VALID_PRIORITIES = ['low', 'medium', 'high'];

/* =========================================================
   HELPERS
========================================================= */

const getAuthUserId = (req) => {
  return req.user?.id || req.user?._id || req.user?.userId;
};

const normalizeId = (value) => {
  if (!value) return null;

  if (typeof value === 'object') {
    return value._id?.toString?.() ||
      value.id?.toString?.() ||
      null;
  }

  return value.toString();
};

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(String(value || ''));
};

const getUserRole = (req) => {
  return String(req.user?.role || '').toLowerCase().trim();
};

const getRoleId = (req) => {
  return String(
    req.user?.role_id ||
    req.user?.roleId ||
    ''
  ).trim();
};

const isSuperAdminUser = (req) => {
  const role = getUserRole(req);
  const roleId = getRoleId(req);

  return (
    req.user?.isSuperAdmin === true ||
    req.user?.is_super_admin === true ||
    role === 'superadmin' ||
    role === 'super_admin' ||
    roleId === '0'
  );
};

const getUserName = (req) => {
  return (
    req.user?.name ||
    req.user?.fullName ||
    req.user?.username ||
    'Team Member'
  );
};

/* =========================================================
   ROLE / PERMISSION HELPERS
========================================================= */

const getCurrentUserDetails = async (req) => {
  const userId = getAuthUserId(req);

  if (!userId) {
    throw new AppError('Authenticated user not found', 401);
  }

  const user = await User.findById(userId)
    .populate('departmentId', 'name')
    .populate('designationId', 'name')
    .lean();

  return user;
};

const getUserPermissionContext = async (req) => {
  const userId = getAuthUserId(req);

  const user = await getCurrentUserDetails(req);

  const roleName = String(
    req.user?.role ||
    user?.role ||
    ''
  ).toLowerCase().trim();

  const roleId = String(
    req.user?.role_id ||
    req.user?.roleId ||
    user?.role_id ||
    user?.roleId ||
    ''
  ).trim();

  const departmentName = String(
    req.user?.department ||
    user?.department ||
    user?.departmentId?.name ||
    ''
  ).toLowerCase().trim();

  const departmentId = normalizeId(
    req.user?.departmentId ||
    req.user?.department_id ||
    user?.departmentId
  );

  const designationName = String(
    req.user?.designation ||
    user?.designation ||
    user?.designationId?.name ||
    ''
  ).toLowerCase().trim();

  const isSuperAdmin =
    isSuperAdminUser(req) ||
    roleName === 'superadmin' ||
    roleName === 'super_admin' ||
    roleId === '0';

  const isHrOrAdminDepartment =
    departmentName.includes('hr') ||
    departmentName.includes('human resource') ||
    departmentName.includes('admin') ||
    departmentName.includes('management');

  const executiveTitles = [
    'md',
    'managing director',
    'ceo',
    'chief executive officer',
    'coo',
    'chief operating officer',
    'director',
    'executive director'
  ];

  const isExecutive = executiveTitles.some(
    title =>
      designationName === title ||
      designationName.includes(title) ||
      roleName === title ||
      roleName.includes(title)
  );

  const isManagerOrLead =
    roleName.includes('manager') ||
    roleName.includes('lead') ||
    roleName.includes('hod') ||
    designationName.includes('manager') ||
    designationName.includes('lead') ||
    designationName.includes('hod') ||
    roleId === '2';

  return {
    user,
    userId,
    roleName,
    roleId,
    departmentName,
    departmentId,
    designationName,
    isSuperAdmin,
    isHrOrAdminDepartment,
    isExecutive,
    isManagerOrLead,
    isAdminOrHr: isSuperAdmin || isHrOrAdminDepartment || isExecutive
  };
};

/* =========================================================
   LOCAL FILE STORAGE
========================================================= */

const getLocalUploadRoot = () =>
  path.resolve(process.cwd(), 'uploads', 'tasks');

const getRelativeUploadUrl = (absoluteFilePath) => {
  const relativePath = path
    .relative(process.cwd(), absoluteFilePath)
    .replace(/\\/g, '/');

  return `/${relativePath}`;
};

const deleteLocalAttachmentFile = async (attachment) => {
  if (!attachment) return;

  let candidatePath = attachment.path;

  if (!candidatePath && attachment.url) {
    try {
      const url = new URL(attachment.url, 'http://localhost');
      if (url.pathname.startsWith('/uploads/')) {
        candidatePath = url.pathname.replace(/^\//, '');
      }
    } catch {
      candidatePath = String(attachment.url || '')
        .replace(/^\//, '')
        .trim();
    }
  }

  if (!candidatePath) return;

  const absolutePath = path.resolve(process.cwd(), candidatePath);

  try {
    await fs.access(absolutePath);
    await fs.unlink(absolutePath);
  } catch {
    // Ignore missing or already removed local files.
  }
};

const processUploadedFiles = async (files, taskId) => {
  const attachments = [];

  if (!Array.isArray(files) || files.length === 0) {
    return attachments;
  }

  for (const file of files) {
    if (!file?.path) continue;

    const isImage =
      file.mimetype?.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif|heic|jfif)$/i.test(
        file.originalname || ''
      );

    const relativePath = path
      .relative(process.cwd(), file.path)
      .replace(/\\/g, '/');

    attachments.push({
      url: `/${relativePath}`,
      path: relativePath,
      name: file.originalname || 'Attachment',
      public_id: `${taskId || 'task'}-${Date.now()}-${file.filename || 'attachment'}`,
      fileType: isImage ? 'image' : 'file',
      size: Number(file.size) || 0
    });
  }

  return attachments;
};

/* =========================================================
   PARSING HELPERS
========================================================= */

const parseArrayInput = (value) => {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const parseAssigneeIds = (value) => {
  const parsed = parseArrayInput(value);

  return parsed
    .map(item => {
      if (typeof item === 'object' && item !== null) {
        return normalizeId(item);
      }

      return String(item || '').trim();
    })
    .filter(id => id && isValidObjectId(id));
};

const parseLinks = (value) => {
  const links = parseArrayInput(value);

  return links
    .filter(Boolean)
    .map(link => {
      if (typeof link === 'string') {
        return {
          url: link.trim(),
          title: link.trim()
        };
      }

      return {
        ...link,
        url: String(link.url || '').trim(),
        title: String(
          link.title ||
          link.name ||
          link.url ||
          ''
        ).trim()
      };
    })
    .filter(link => link.url);
};

const parseSubtasks = (value, userId) => {
  const parsed = parseArrayInput(value);

  return parsed
    .map(st => {
      if (typeof st === 'string') {
        return {
          title: st.trim(),
          completed: false,
          created_by: userId,
          completed_by: null
        };
      }

      return {
        title: String(st?.title || '').trim(),
        completed: Boolean(st?.completed),
        created_by:
          normalizeId(st?.created_by) || userId,
        completed_by:
          st?.completed
            ? normalizeId(st?.completed_by) || userId
            : null
      };
    })
    .filter(st => st.title);
};

/* =========================================================
   FORMAT TASK
========================================================= */

const formatLeanTask = (task) => {
  if (!task) return null;

  const id = normalizeId(task._id || task.id);

  const formatted = {
    ...task,

    id,

    user_id: normalizeId(
      task.created_by || task.user_id
    ),

    assigned_to: [],

    file: task.file_url || null,

    image: task.file_url || null,

    attachments:
      Array.isArray(task.attachments)
        ? task.attachments
        : task.file_url
          ? [
              {
                url: task.file_url,
                name: 'Attachment',
                public_id: task.file_public_id || null,
                fileType: 'file'
              }
            ]
          : [],

    links: Array.isArray(task.links)
      ? task.links
      : [],

    subtasks: Array.isArray(task.subtasks)
      ? task.subtasks.map(st => ({
          ...st,
          id: normalizeId(st?._id || st?.id),
          created_by:
            typeof st?.created_by === 'object'
              ? {
                  ...st.created_by,
                  id: normalizeId(
                    st.created_by._id ||
                    st.created_by.id
                  )
                }
              : st?.created_by,
          completed_by:
            typeof st?.completed_by === 'object'
              ? {
                  ...st.completed_by,
                  id: normalizeId(
                    st.completed_by._id ||
                    st.completed_by.id
                  )
                }
              : st?.completed_by
        }))
      : [],

    client_id: normalizeId(task.client),

    project_id: normalizeId(task.project)
  };

  /* Assigned users */

  if (Array.isArray(task.assigned_to)) {
    formatted.assigned_to =
      task.assigned_to
        .filter(Boolean)
        .map(user => {
          if (typeof user === 'object') {
            return {
              ...user,
              id: normalizeId(
                user._id || user.id
              )
            };
          }

          return String(user);
        });
  } else if (task.assigned_to) {
    formatted.assigned_to = [
      typeof task.assigned_to === 'object'
        ? {
            ...task.assigned_to,
            id: normalizeId(
              task.assigned_to._id ||
              task.assigned_to.id
            )
          }
        : String(task.assigned_to)
    ];
  }

  /* Created by */

  if (
    formatted.created_by &&
    typeof formatted.created_by === 'object'
  ) {
    formatted.created_by = {
      ...formatted.created_by,
      id: normalizeId(
        formatted.created_by._id ||
        formatted.created_by.id
      )
    };
  }

  /* Client */

  if (
    task.client &&
    typeof task.client === 'object'
  ) {
    formatted.client = {
      ...task.client,
      id: normalizeId(
        task.client._id ||
        task.client.id
      )
    };
  } else {
    formatted.client = task.client || null;
  }

  /* Project */

  if (
    task.project &&
    typeof task.project === 'object'
  ) {
    formatted.project = {
      ...task.project,
      id: normalizeId(
        task.project._id ||
        task.project.id
      )
    };
  } else {
    formatted.project = task.project || null;
  }

  delete formatted._id;
  delete formatted.__v;
  delete formatted.file_public_id;

  return formatted;
};

/* =========================================================
   POPULATE TASK
========================================================= */

const getPopulatedTask = async (taskId) => {
  return Task.findById(taskId)
    .populate('assigned_to', 'name email')
    .populate('created_by', 'name email')
    .populate('subtasks.created_by', 'name email')
    .populate('subtasks.completed_by', 'name email')
    .populate(
      'client',
      'companyName clientName clientId'
    )
    .populate(
      'project',
      'projectName projectCode status'
    )
    .lean();
};

/* =========================================================
   PROJECT PROGRESS
========================================================= */

export const syncProjectProgress = async (projectId) => {
  if (!projectId) return;

  try {
    const projectIdString =
      normalizeId(projectId);

    if (!projectIdString) return;

    if (!isValidObjectId(projectIdString)) {
      return;
    }

    const totalTasks =
      await Task.countDocuments({
        project: projectIdString
      });

    if (totalTasks === 0) {
      await Project.findByIdAndUpdate(
        projectIdString,
        {
          $set: {
            progress: 0
          }
        }
      );

      return;
    }

    const completedTasks =
      await Task.countDocuments({
        project: projectIdString,
        status: {
          $in: [
            'completed',
            'done',
            'Completed',
            'Done',
            'DONE'
          ]
        }
      });

    const progress = Math.round(
      (completedTasks / totalTasks) * 100
    );

    await Project.findByIdAndUpdate(
      projectIdString,
      {
        $set: {
          progress
        }
      }
    );
  } catch (error) {
    console.error(
      'Failed to sync project progress:',
      error.message
    );
  }
};

/* =========================================================
   CREATE TASK
   POST /api/v1/tasks/create
========================================================= */

export const createTask = async (
  req,
  res,
  next
) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      throw new AppError(
        'Authentication required',
        401
      );
    }

    const {
      title,
      description,
      assigned_to,
      designation_id,
      dueDate,
      client,
      project,
      priority,
      status
    } = req.body;

    if (!title?.trim()) {
      throw new AppError(
        'Task title is required',
        400
      );
    }

    const assigneeIds =
      parseAssigneeIds(assigned_to);

    if (assigneeIds.length === 0) {
      throw new AppError(
        'At least one assigned user is required',
        400
      );
    }

    /* Verify assignees exist */

    const assigneeCount =
      await User.countDocuments({
        _id: {
          $in: assigneeIds
        }
      });

    if (assigneeCount !== assigneeIds.length) {
      throw new AppError(
        'One or more assigned users do not exist',
        400
      );
    }

    /* Files */

    const filesList =
      Array.isArray(req.files)
        ? req.files
        : req.file
          ? [req.file]
          : [];

    const attachments =
      await processUploadedFiles(filesList);

    const fileUrl =
      attachments[0]?.url || null;

    const filePublicId =
      attachments[0]?.public_id || null;

    /* Links */

    const links =
      parseLinks(req.body.links);

    /* Subtasks */

    const subtasks =
      parseSubtasks(
        req.body.subtasks,
        userId
      );

    /* Client */

    const clientId =
      client &&
      isValidObjectId(client)
        ? new mongoose.Types.ObjectId(client)
        : null;

    /* Project */

    const projectId =
      project &&
      isValidObjectId(project)
        ? new mongoose.Types.ObjectId(project)
        : null;

    /* Status */

    const normalizedStatus =
      status &&
      VALID_STATUSES.includes(
        String(status).toLowerCase()
      )
        ? String(status).toLowerCase()
        : 'pending';

    /* Priority */

    const normalizedPriority =
      priority &&
      VALID_PRIORITIES.includes(
        String(priority).toLowerCase()
      )
        ? String(priority).toLowerCase()
        : 'medium';

    const task = new Task({
      title: title.trim(),

      description:
        description?.trim() || '',

      assigned_to:
        assigneeIds,

      designation_id:
        designation_id || undefined,

      dueDate:
        dueDate || undefined,

      client:
        clientId,

      project:
        projectId,

      status:
        normalizedStatus,

      priority:
        normalizedPriority,

      created_by:
        userId,

      user_id:
        userId,

      attachments,

      links,

      subtasks,

      file_url:
        fileUrl,

      file_public_id:
        filePublicId,

      image:
        fileUrl
    });

    await task.save();

    if (projectId) {
      await syncProjectProgress(projectId);
    }

    const populatedTask =
      await getPopulatedTask(task._id);

    /* Notifications */

    try {
      const assignees =
        Array.isArray(
          populatedTask?.assigned_to
        )
          ? populatedTask.assigned_to
          : [];

      const creatorName =
        populatedTask?.created_by?.name ||
        getUserName(req);

      for (const assignee of assignees) {
        const assigneeId =
          normalizeId(assignee);

        if (!assigneeId) continue;

        await sendNotification(
          assigneeId,
          `You have been assigned a new task: "${task.title}". Due date: ${
            dueDate
              ? new Date(
                  dueDate
                ).toLocaleDateString()
              : 'No deadline'
          }`,
          'task_assigned',
          `New Task Assigned: ${task.title}`,
          userId,
          creatorName
        );

        if (assignee.email) {
          await sendTaskAssignmentEmail({
            recipientEmail:
              assignee.email,

            recipientName:
              assignee.name || 'Team Member',

            taskTitle:
              task.title,

            taskDescription:
              task.description,

            dueDate:
              task.dueDate,

            creatorName
          });
        }
      }
    } catch (notificationError) {
      console.error(
        'Task assignment notification failed:',
        notificationError.message
      );
    }

    return res.status(201).json({
      success: true,
      task:
        formatLeanTask(populatedTask)
    });
  } catch (error) {
    console.error(
      'CREATE TASK ERROR:',
      error
    );

    next(error);
  }
};

/* =========================================================
   GET ALL TASKS
   GET /api/v1/tasks/all
========================================================= */

export const getAllTasks = async (
  req,
  res,
  next
) => {
  try {
    const context =
      await getUserPermissionContext(req);

    const {
      userId,
      isAdminOrHr,
      isManagerOrLead
    } = context;

    const targetUserId =
      req.query.user_id ||
      req.query.userId ||
      req.query.targetUserId;

    let query = {};

    /* Specific user filter */

    if (targetUserId) {
      if (!isValidObjectId(targetUserId)) {
        throw new AppError(
          'Invalid user ID',
          400
        );
      }

      /*
       * Admin/manager can inspect another user's
       * tasks. Normal users can only request
       * their own tasks.
       */

      if (
        !isAdminOrHr &&
        !isManagerOrLead &&
        String(targetUserId) !==
          String(userId)
      ) {
        throw new AppError(
          'Forbidden: You cannot view another user tasks',
          403
        );
      }

      query = {
        $or: [
          {
            created_by:
              targetUserId
          },
          {
            assigned_to:
              targetUserId
          },
          {
            user_id:
              targetUserId
          }
        ]
      };
    }

    /* Admin / HR / Executive */

    else if (isAdminOrHr) {
      query = {};
    }

    /* Manager / Team Lead */

    else if (isManagerOrLead) {
      const Department =
        (
          await import(
            '../modules/departments/department.model.js'
          )
        ).default;

      const ledDepartments =
        await Department.find({
          managerId: userId
        }).select('_id');

      const departmentIds =
        ledDepartments.map(
          department =>
            department._id
        );

      const currentUser =
        await User.findById(userId)
          .select(
            'departmentId department'
          )
          .lean();

      if (
        departmentIds.length === 0 &&
        currentUser?.departmentId
      ) {
        departmentIds.push(
          currentUser.departmentId
        );
      }

      const usersInDepartment =
        departmentIds.length > 0
          ? await User.find({
              $or: [
                {
                  departmentId: {
                    $in: departmentIds
                  }
                }
              ]
            }).select('_id')
          : [];

      const teamUserIds =
        usersInDepartment.map(
          user => user._id
        );

      teamUserIds.push(userId);

      query = {
        $or: [
          {
            assigned_to: {
              $in: teamUserIds
            }
          },
          {
            created_by: userId
          }
        ]
      };
    }

    /* Normal user */

    else {
      query = {
        $or: [
          {
            assigned_to: userId
          },
          {
            created_by: userId
          }
        ]
      };
    }

    const tasks =
      await Task.find(query)
        .populate(
          'assigned_to',
          'name email'
        )
        .populate(
          'created_by',
          'name email'
        )
        .populate(
          'subtasks.created_by',
          'name email'
        )
        .populate(
          'subtasks.completed_by',
          'name email'
        )
        .populate(
          'client',
          'companyName clientName clientId'
        )
        .populate(
          'project',
          'projectName projectCode status'
        )
        .select('-file_public_id')
        .sort({
          createdAt: -1
        })
        .lean();

    return res.status(200).json(
      tasks.map(formatLeanTask)
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET USER TASKS
   GET /api/v1/tasks/user/tasks?user_id=...
========================================================= */

export const getUserTasks = async (
  req,
  res,
  next
) => {
  try {
    const {
      userId,
      isAdminOrHr,
      isManagerOrLead
    } =
      await getUserPermissionContext(req);

    const { user_id } = req.query;

    if (!user_id) {
      throw new AppError(
        'user_id is required',
        400
      );
    }

    if (!isValidObjectId(user_id)) {
      throw new AppError(
        'Invalid user ID',
        400
      );
    }

    if (
      !isAdminOrHr &&
      !isManagerOrLead &&
      String(user_id) !== String(userId)
    ) {
      throw new AppError(
        'Access denied. Insufficient permissions.',
        403
      );
    }

    const tasks =
      await Task.find({
        assigned_to: user_id
      })
        .populate(
          'assigned_to',
          'name email'
        )
        .populate(
          'created_by',
          'name email'
        )
        .populate(
          'subtasks.created_by',
          'name email'
        )
        .populate(
          'subtasks.completed_by',
          'name email'
        )
        .populate(
          'client',
          'companyName clientName clientId'
        )
        .populate(
          'project',
          'projectName projectCode status'
        )
        .select('-file_public_id')
        .sort({
          createdAt: -1
        })
        .lean();

    return res.status(200).json(
      tasks.map(formatLeanTask)
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   CURRENT USER TASKS
   GET /api/v1/tasks/current-user/tasks
========================================================= */

export const getCurrentUserTasks = async (
  req,
  res,
  next
) => {
  try {
    const userId =
      getAuthUserId(req);

    if (!userId) {
      throw new AppError(
        'Authentication required',
        401
      );
    }

    const tasks =
      await Task.find({
        $or: [
          {
            assigned_to: userId
          },
          {
            created_by: userId
          }
        ]
      })
        .populate(
          'assigned_to',
          'name email'
        )
        .populate(
          'created_by',
          'name email'
        )
        .populate(
          'subtasks.created_by',
          'name email'
        )
        .populate(
          'subtasks.completed_by',
          'name email'
        )
        .populate(
          'client',
          'companyName clientName clientId'
        )
        .populate(
          'project',
          'projectName projectCode status'
        )
        .select('-file_public_id')
        .sort({
          createdAt: -1
        })
        .lean();

    return res.status(200).json(
      tasks.map(formatLeanTask)
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   DELETE TASK
   DELETE /api/v1/tasks/delete/:task_id
========================================================= */

export const deleteTask = async (
  req,
  res,
  next
) => {
  try {
    const { task_id } =
      req.params;

    if (!isValidObjectId(task_id)) {
      throw new AppError(
        'Invalid task ID',
        400
      );
    }

    const task =
      await Task.findById(task_id);

    if (!task) {
      throw new AppError(
        'Task not found',
        404
      );
    }

    const userId =
      getAuthUserId(req);

    const isCreator =
      normalizeId(task.created_by) ===
      String(userId);

    const isSuperAdmin =
      isSuperAdminUser(req);

    if (
      !isCreator &&
      !isSuperAdmin
    ) {
      throw new AppError(
        'Forbidden: Only the task creator or SuperAdmin can delete this task',
        403
      );
    }

    const projectId =
      task.project;

    /* Delete all local task attachments */
    if (Array.isArray(task.attachments)) {
      for (const attachment of task.attachments) {
        await deleteLocalAttachmentFile(attachment);
      }
    }

    if (task.file_public_id && !task.attachments?.some((attachment) => attachment.public_id === task.file_public_id)) {
      await deleteLocalAttachmentFile({ path: task.file_url || '', url: task.file_url || '' });
    }

    await task.deleteOne();

    if (projectId) {
      await syncProjectProgress(
        projectId
      );
    }

    return res.status(200).json({
      success: true,
      message:
        'Task and associated resources deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   UPDATE TASK STATUS
   PUT /api/v1/tasks/task-status/:task_id
========================================================= */

export const updateTaskStatus = async (
  req,
  res,
  next
) => {
  try {
    const { task_id } =
      req.params;

    const requestedStatus =
      req.body?.status ??
      req.query?.status;

    if (!requestedStatus) {
      throw new AppError(
        'Task status is required',
        400
      );
    }

    const normalizedStatus =
      String(
        requestedStatus
      )
        .trim()
        .toLowerCase();

    if (
      !VALID_STATUSES.includes(
        normalizedStatus
      )
    ) {
      throw new AppError(
        `Invalid task status. Allowed values: ${VALID_STATUSES.join(', ')}`,
        400
      );
    }

    const task =
      await Task.findById(task_id);

    if (!task) {
      throw new AppError(
        'Task not found',
        404
      );
    }

    const userId =
      getAuthUserId(req);

    const isCreator =
      normalizeId(task.created_by) ===
      String(userId);

    const isAssignee =
      Array.isArray(task.assigned_to) &&
      task.assigned_to.some(
        id =>
          normalizeId(id) ===
          String(userId)
      );

    const isSuperAdmin =
      isSuperAdminUser(req);

    if (
      !isCreator &&
      !isAssignee &&
      !isSuperAdmin
    ) {
      throw new AppError(
        'Forbidden: You are not allowed to update this task status',
        403
      );
    }

    const oldStatus =
      task.status;

    task.status =
      normalizedStatus;

    await task.save();

    if (task.project) {
      await syncProjectProgress(
        task.project
      );
    }

    const populatedTask =
      await getPopulatedTask(
        task._id
      );

    try {
      const recipients = [];

      if (
        populatedTask?.created_by
      ) {
        recipients.push(
          populatedTask.created_by
        );
      }

      if (
        Array.isArray(
          populatedTask?.assigned_to
        )
      ) {
        recipients.push(
          ...populatedTask.assigned_to
        );
      }

      const uniqueRecipients =
        Array.from(
          new Map(
            recipients
              .filter(Boolean)
              .map(user => [
                normalizeId(user),
                user
              ])
          ).values()
        );

      const updaterName =
        getUserName(req);

      for (
        const recipient
        of uniqueRecipients
      ) {
        const recipientId =
          normalizeId(recipient);

        if (!recipientId) continue;

        await sendNotification(
          recipientId,
          `Task "${task.title}" status changed from "${oldStatus}" to "${normalizedStatus}" by ${updaterName}.`,
          'task_status_changed',
          `Task Status Updated: ${task.title}`,
          userId,
          updaterName
        );

        if (recipient.email) {
          await sendTaskStatusUpdateEmail({
            recipientEmail:
              recipient.email,

            recipientName:
              recipient.name ||
              'Team Member',

            taskTitle:
              task.title,

            oldStatus:
              oldStatus,

            newStatus:
              normalizedStatus,

            updatedByName:
              updaterName
          });
        }
      }
    } catch (notificationError) {
      console.error(
        'Task status notification failed:',
        notificationError.message
      );
    }

    return res.status(200).json(
      formatLeanTask(
        populatedTask
      )
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   UPDATE TASK
   PUT /api/v1/tasks/update/:task_id
========================================================= */

export const updateTask = async (
  req,
  res,
  next
) => {
  try {
    const { task_id } =
      req.params;

    if (!isValidObjectId(task_id)) {
      throw new AppError(
        'Invalid task ID',
        400
      );
    }

    const task =
      await Task.findById(task_id);

    if (!task) {
      throw new AppError(
        'Task not found',
        404
      );
    }

    const userId =
      getAuthUserId(req);

    const isCreator =
      normalizeId(task.created_by) ===
      String(userId);

    const isSuperAdmin =
      isSuperAdminUser(req);

    if (
      !isCreator &&
      !isSuperAdmin
    ) {
      throw new AppError(
        'Forbidden: Only the task creator or SuperAdmin can edit this task',
        403
      );
    }

    const oldProjectId =
      normalizeId(task.project);

    const {
      title,
      description,
      assigned_to,
      designation_id,
      client,
      project,
      priority,
      dueDate,
      status
    } = req.body;

    /* Basic fields */

    if (title !== undefined) {
      if (!String(title).trim()) {
        throw new AppError(
          'Task title cannot be empty',
          400
        );
      }

      task.title =
        String(title).trim();
    }

    if (description !== undefined) {
      task.description =
        String(description);
    }

    /* Assignees */

    if (
      assigned_to !== undefined
    ) {
      const assigneeIds =
        parseAssigneeIds(
          assigned_to
        );

      if (
        assigneeIds.length === 0
      ) {
        throw new AppError(
          'At least one assigned user is required',
          400
        );
      }

      const assigneeCount =
        await User.countDocuments({
          _id: {
            $in: assigneeIds
          }
        });

      if (
        assigneeCount !==
        assigneeIds.length
      ) {
        throw new AppError(
          'One or more assigned users do not exist',
          400
        );
      }

      task.assigned_to =
        assigneeIds;
    }

    /* Status */

    if (status !== undefined) {
      const normalizedStatus =
        String(status)
          .trim()
          .toLowerCase();

      if (
        !VALID_STATUSES.includes(
          normalizedStatus
        )
      ) {
        throw new AppError(
          'Invalid task status',
          400
        );
      }

      task.status =
        normalizedStatus;
    }

    /* Priority */

    if (
      priority !== undefined
    ) {
      const normalizedPriority =
        String(priority)
          .trim()
          .toLowerCase();

      if (
        !VALID_PRIORITIES.includes(
          normalizedPriority
        )
      ) {
        throw new AppError(
          'Invalid task priority',
          400
        );
      }

      task.priority =
        normalizedPriority;
    }

    /* Due date */

    if (
      dueDate !== undefined
    ) {
      task.dueDate =
        dueDate || null;
    }

    /* Client */

    if (
      client !== undefined
    ) {
      task.client =
        client &&
        isValidObjectId(client)
          ? new mongoose.Types.ObjectId(
              client
            )
          : null;
    }

    /* Project */

    if (
      project !== undefined
    ) {
      task.project =
        project &&
        isValidObjectId(project)
          ? new mongoose.Types.ObjectId(
              project
            )
          : null;
    }

    /* Designation */

    if (
      designation_id !== undefined
    ) {
      task.designation_id =
        designation_id ||
        undefined;
    }

    /* New attachments */

    const filesList =
      Array.isArray(req.files)
        ? req.files
        : req.file
          ? [req.file]
          : [];

    if (filesList.length > 0) {
      const newAttachments =
        await processUploadedFiles(
          filesList
        );

      if (!Array.isArray(task.attachments)) {
        task.attachments = [];
      }

      task.attachments.push(
        ...newAttachments
      );

      if (
        !task.file_url &&
        newAttachments.length > 0
      ) {
        task.file_url =
          newAttachments[0].url;

        task.file_public_id =
          newAttachments[0].public_id;
      }

      if (
        task.file_url
      ) {
        task.image =
          task.file_url;
      }
    }

    /* Links */

    if (
      req.body.links !== undefined
    ) {
      task.links =
        parseLinks(
          req.body.links
        );
    }

    /* Subtasks */

    if (
      req.body.subtasks !== undefined
    ) {
      task.subtasks =
        parseSubtasks(
          req.body.subtasks,
          userId
        );
    }

    await task.save();

    /* Project progress */

    const newProjectId =
      normalizeId(task.project);

    if (
      oldProjectId &&
      oldProjectId !== newProjectId
    ) {
      await syncProjectProgress(
        oldProjectId
      );
    }

    if (newProjectId) {
      await syncProjectProgress(
        newProjectId
      );
    }

    const populatedTask =
      await getPopulatedTask(
        task._id
      );

    /* Notifications */

    try {
      const recipients = [];

      if (
        populatedTask?.created_by
      ) {
        recipients.push(
          populatedTask.created_by
        );
      }

      if (
        Array.isArray(
          populatedTask?.assigned_to
        )
      ) {
        recipients.push(
          ...populatedTask.assigned_to
        );
      }

      const uniqueRecipients =
        Array.from(
          new Map(
            recipients
              .filter(Boolean)
              .map(user => [
                normalizeId(user),
                user
              ])
          ).values()
        );

      const updaterName =
        getUserName(req);

      for (
        const recipient
        of uniqueRecipients
      ) {
        const recipientId =
          normalizeId(recipient);

        if (!recipientId) continue;

        await sendNotification(
          recipientId,
          `Task "${task.title}" was updated by ${updaterName}.`,
          'task_updated',
          `Task Updated: ${task.title}`,
          userId,
          updaterName
        );
      }
    } catch (notificationError) {
      console.error(
        'Task update notification failed:',
        notificationError.message
      );
    }

    return res.status(200).json(
      formatLeanTask(
        populatedTask
      )
    );
  } catch (error) {
    console.error(
      'UPDATE TASK ERROR:',
      error
    );

    next(error);
  }
};

/* =========================================================
   ADD SUBTASK
   POST /api/v1/tasks/:task_id/subtasks
========================================================= */

export const addSubtask = async (
  req,
  res,
  next
) => {
  try {
    const { task_id } =
      req.params;

    const { title } =
      req.body;

    if (!title?.trim()) {
      throw new AppError(
        'Subtask title is required',
        400
      );
    }

    const task =
      await Task.findById(task_id);

    if (!task) {
      throw new AppError(
        'Task not found',
        404
      );
    }

    const userId =
      getAuthUserId(req);

    const isCreator =
      normalizeId(task.created_by) ===
      String(userId);

    const isAssignee =
      Array.isArray(
        task.assigned_to
      ) &&
      task.assigned_to.some(
        id =>
          normalizeId(id) ===
          String(userId)
      );

    const isSuperAdmin =
      isSuperAdminUser(req);

    if (
      !isCreator &&
      !isAssignee &&
      !isSuperAdmin
    ) {
      throw new AppError(
        'Forbidden: Only the task creator, assignee, or SuperAdmin can add subtasks',
        403
      );
    }

    if (!Array.isArray(task.subtasks)) {
      task.subtasks = [];
    }

    task.subtasks.push({
      title: title.trim(),
      completed: false,
      created_by: userId,
      completed_by: null
    });

    await task.save();

    const populatedTask =
      await getPopulatedTask(
        task._id
      );

    /* Notify creator/assignees */

    try {
      const recipients = [];

      if (isCreator) {
        if (
          Array.isArray(
            populatedTask?.assigned_to
          )
        ) {
          recipients.push(
            ...populatedTask.assigned_to
          );
        }
      } else if (
        populatedTask?.created_by
      ) {
        recipients.push(
          populatedTask.created_by
        );
      }

      const updaterName =
        getUserName(req);

      for (
        const recipient
        of recipients
      ) {
        const recipientId =
          normalizeId(recipient);

        if (
          !recipientId ||
          recipientId ===
            String(userId)
        ) {
          continue;
        }

        await sendNotification(
          recipientId,
          `New subtask "${title.trim()}" was added to task "${task.title}" by ${updaterName}.`,
          'subtask_added',
          `Subtask Added: ${task.title}`,
          userId,
          updaterName
        );
      }
    } catch (notificationError) {
      console.error(
        'Subtask notification failed:',
        notificationError.message
      );
    }

    return res.status(201).json(
      formatLeanTask(
        populatedTask
      )
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   UPDATE / TOGGLE SUBTASK
   PUT /api/v1/tasks/:task_id/subtasks/:subtask_id
========================================================= */

export const toggleSubtask = async (
  req,
  res,
  next
) => {
  try {
    const {
      task_id,
      subtask_id
    } = req.params;

    if (
      !isValidObjectId(task_id)
    ) {
      throw new AppError(
        'Invalid task ID',
        400
      );
    }

    const task =
      await Task.findById(task_id);

    if (!task) {
      throw new AppError(
        'Task not found',
        404
      );
    }

    const userId =
      getAuthUserId(req);

    const isCreator =
      normalizeId(task.created_by) ===
      String(userId);

    const isAssignee =
      Array.isArray(
        task.assigned_to
      ) &&
      task.assigned_to.some(
        id =>
          normalizeId(id) ===
          String(userId)
      );

    const isSuperAdmin =
      isSuperAdminUser(req);

    if (
      !isCreator &&
      !isAssignee &&
      !isSuperAdmin
    ) {
      throw new AppError(
        'Forbidden: Only the task creator, assignee, or SuperAdmin can update subtasks',
        403
      );
    }

    const subtask =
      task.subtasks?.id?.(
        subtask_id
      ) ||
      task.subtasks?.find(
        st =>
          normalizeId(
            st?._id || st?.id
          ) ===
          String(subtask_id)
      );

    if (!subtask) {
      throw new AppError(
        'Subtask not found',
        404
      );
    }

    const {
      completed,
      title
    } = req.body;

    if (
      completed !== undefined
    ) {
      subtask.completed =
        Boolean(completed);

      subtask.completed_by =
        subtask.completed
          ? userId
          : null;
    }

    if (
      title !== undefined
    ) {
      if (!String(title).trim()) {
        throw new AppError(
          'Subtask title cannot be empty',
          400
        );
      }

      subtask.title =
        String(title).trim();
    }

    await task.save();

    const populatedTask =
      await getPopulatedTask(
        task._id
      );

    return res.status(200).json(
      formatLeanTask(
        populatedTask
      )
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   DELETE SUBTASK
   DELETE /api/v1/tasks/:task_id/subtasks/:subtask_id
========================================================= */

export const deleteSubtask = async (
  req,
  res,
  next
) => {
  try {
    const {
      task_id,
      subtask_id
    } = req.params;

    const task =
      await Task.findById(task_id);

    if (!task) {
      throw new AppError(
        'Task not found',
        404
      );
    }

    const userId =
      getAuthUserId(req);

    const isCreator =
      normalizeId(task.created_by) ===
      String(userId);

    const isAssignee =
      Array.isArray(
        task.assigned_to
      ) &&
      task.assigned_to.some(
        id =>
          normalizeId(id) ===
          String(userId)
      );

    const isSuperAdmin =
      isSuperAdminUser(req);

    if (
      !isCreator &&
      !isAssignee &&
      !isSuperAdmin
    ) {
      throw new AppError(
        'Forbidden: Only the task creator, assignee, or SuperAdmin can delete subtasks',
        403
      );
    }

    const originalLength =
      task.subtasks?.length || 0;

    task.subtasks =
      (task.subtasks || []).filter(
        st =>
          normalizeId(
            st?._id || st?.id
          ) !==
          String(subtask_id)
      );

    if (
      task.subtasks.length ===
      originalLength
    ) {
      throw new AppError(
        'Subtask not found',
        404
      );
    }

    await task.save();

    const populatedTask =
      await getPopulatedTask(
        task._id
      );

    return res.status(200).json(
      formatLeanTask(
        populatedTask
      )
    );
  } catch (error) {
    next(error);
  }
};

  /* =========================================================
   TASK COLLABORATION - COMMENTS
========================================================= */

/**
 * ADD TASK COMMENT
 * POST /api/v1/tasks/:task_id/comments
 *
 * Supports:
 * - Text comment
 * - Multiple attachments
 * - Images
 * - PDF/files
 */
const addTaskCommentLegacy = async (req, res, next) => {
  try {
    const { task_id } = req.params;

    if (!isValidObjectId(task_id)) {
      throw new AppError('Invalid task ID', 400);
    }

    const task = await Task.findById(task_id);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const userId = getAuthUserId(req);

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    /*
     * User must be creator or assignee.
     * SuperAdmin can always comment.
     */
    const isCreator =
      normalizeId(task.created_by) === String(userId);

    const isAssignee =
      Array.isArray(task.assigned_to) &&
      task.assigned_to.some(
        id => normalizeId(id) === String(userId)
      );

    const isSuperAdmin = isSuperAdminUser(req);

    if (!isCreator && !isAssignee && !isSuperAdmin) {
      throw new AppError(
        'Forbidden: You do not have access to comment on this task',
        403
      );
    }

    const commentText =
      typeof req.body?.comment === 'string'
        ? req.body.comment.trim()
        : typeof req.body?.text === 'string'
          ? req.body.text.trim()
          : typeof req.body?.content === 'string'
            ? req.body.content.trim()
            : '';

    const filesList = Array.isArray(req.files)
      ? req.files
      : req.file
        ? [req.file]
        : [];

    if (!commentText && filesList.length === 0) {
      throw new AppError(
        'Comment text or at least one attachment is required',
        400
      );
    }

    /*
     * Upload attachments
     */
    const attachments =
      await processUploadedFiles(filesList);

    /*
     * Make sure comments array exists.
     */
    if (!Array.isArray(task.comments)) {
      task.comments = [];
    }

    /*
     * Add comment.
     *
     * IMPORTANT:
     * This assumes your Task model has a comments
     * subdocument array.
     */
    task.comments.push({
      user: userId,
      user_id: userId,
      created_by: userId,

      text: commentText,

      comment: commentText,

      attachments,

      createdAt: new Date(),
      updatedAt: new Date()
    });

    await task.save();

    const populatedTask =
      await getPopulatedTask(task._id);

    /*
     * Notify creator and assignees
     */
    try {
      const recipients = [];

      if (populatedTask?.created_by) {
        recipients.push(
          populatedTask.created_by
        );
      }

      if (
        Array.isArray(
          populatedTask?.assigned_to
        )
      ) {
        recipients.push(
          ...populatedTask.assigned_to
        );
      }

      const uniqueRecipients =
        Array.from(
          new Map(
            recipients
              .filter(Boolean)
              .map(user => [
                normalizeId(user),
                user
              ])
          ).values()
        );

      const commenterName =
        getUserName(req);

      for (
        const recipient of uniqueRecipients
      ) {
        const recipientId =
          normalizeId(recipient);

        if (
          !recipientId ||
          recipientId === String(userId)
        ) {
          continue;
        }

        await sendNotification(
          recipientId,
          `${commenterName} added a comment to task "${task.title}".`,
          'task_comment_added',
          `New Comment: ${task.title}`,
          userId,
          commenterName
        );
      }
    } catch (notificationError) {
      console.error(
        'Task comment notification failed:',
        notificationError.message
      );
    }

    /*
     * Return only the newly created comment
     * plus the updated task.
     */
    const latestComment =
      task.comments[
        task.comments.length - 1
      ];

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: {
        ...latestComment.toObject?.() ||
          latestComment,
        id: normalizeId(
          latestComment._id ||
          latestComment.id
        )
      },
      task: formatLeanTask(
        populatedTask
      )
    });
  } catch (error) {
    console.error(
      'ADD TASK COMMENT ERROR:',
      error
    );

    next(error);
  }
};


/**
 * UPDATE TASK COMMENT
 * PUT /api/v1/tasks/:task_id/comments/:comment_id
 *
 * Supports:
 * - Editing comment text
 * - Adding new attachments
 */
const updateTaskCommentLegacy = async (
  req,
  res,
  next
) => {
  try {
    const {
      task_id,
      comment_id
    } = req.params;

    if (!isValidObjectId(task_id)) {
      throw new AppError(
        'Invalid task ID',
        400
      );
    }

    if (!isValidObjectId(comment_id)) {
      throw new AppError(
        'Invalid comment ID',
        400
      );
    }

    const task =
      await Task.findById(task_id);

    if (!task) {
      throw new AppError(
        'Task not found',
        404
      );
    }

    const userId =
      getAuthUserId(req);

    if (!userId) {
      throw new AppError(
        'Authentication required',
        401
      );
    }

    if (!Array.isArray(task.comments)) {
      throw new AppError(
        'Comment not found',
        404
      );
    }

    const comment =
      task.comments.id(comment_id) ||
      task.comments.find(
        item =>
          normalizeId(
            item?._id ||
            item?.id
          ) === String(comment_id)
      );

    if (!comment) {
      throw new AppError(
        'Comment not found',
        404
      );
    }

    const isCommentOwner =
      normalizeId(
        comment.user ||
        comment.user_id ||
        comment.created_by
      ) === String(userId);

    const isSuperAdmin =
      isSuperAdminUser(req);

    if (
      !isCommentOwner &&
      !isSuperAdmin
    ) {
      throw new AppError(
        'Forbidden: Only the comment author or SuperAdmin can edit this comment',
        403
      );
    }

    const newText =
      typeof req.body?.comment === 'string'
        ? req.body.comment.trim()
        : typeof req.body?.text === 'string'
          ? req.body.text.trim()
          : typeof req.body?.content === 'string'
            ? req.body.content.trim()
            : undefined;

    /*
     * Add new attachments if supplied.
     */
    const filesList =
      Array.isArray(req.files)
        ? req.files
        : req.file
          ? [req.file]
          : [];

    if (
      newText !== undefined
    ) {
      comment.text = newText;
      comment.comment = newText;
    }

    if (filesList.length > 0) {
      const newAttachments =
        await processUploadedFiles(
          filesList
        );

      if (!Array.isArray(comment.attachments)) {
        comment.attachments = [];
      }

      comment.attachments.push(
        ...newAttachments
      );
    }

    comment.updatedAt =
      new Date();

    await task.save();

    const populatedTask =
      await getPopulatedTask(
        task._id
      );

    return res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      task: formatLeanTask(
        populatedTask
      )
    });
  } catch (error) {
    console.error(
      'UPDATE TASK COMMENT ERROR:',
      error
    );

    next(error);
  }
};


/**
 * DELETE TASK COMMENT
 * DELETE /api/v1/tasks/:task_id/comments/:comment_id
 */
const deleteTaskCommentLegacy = async (
  req,
  res,
  next
) => {
  try {
    const {
      task_id,
      comment_id
    } = req.params;

    if (!isValidObjectId(task_id)) {
      throw new AppError(
        'Invalid task ID',
        400
      );
    }

    if (!isValidObjectId(comment_id)) {
      throw new AppError(
        'Invalid comment ID',
        400
      );
    }

    const task =
      await Task.findById(task_id);

    if (!task) {
      throw new AppError(
        'Task not found',
        404
      );
    }

    const userId =
      getAuthUserId(req);

    if (!userId) {
      throw new AppError(
        'Authentication required',
        401
      );
    }

    if (!Array.isArray(task.comments)) {
      throw new AppError(
        'Comment not found',
        404
      );
    }

    const comment =
      task.comments.id(comment_id) ||
      task.comments.find(
        item =>
          normalizeId(
            item?._id ||
            item?.id
          ) === String(comment_id)
      );

    if (!comment) {
      throw new AppError(
        'Comment not found',
        404
      );
    }

    const commentOwner =
      normalizeId(
        comment.user ||
        comment.user_id ||
        comment.created_by
      );

    const isCommentOwner =
      commentOwner === String(userId);

    const isSuperAdmin =
      isSuperAdminUser(req);

    if (
      !isCommentOwner &&
      !isSuperAdmin
    ) {
      throw new AppError(
        'Forbidden: Only the comment author or SuperAdmin can delete this comment',
        403
      );
    }

    /*
     * Remove local task comment files before deleting the comment.
     */
    if (Array.isArray(comment.attachments)) {
      for (const attachment of comment.attachments) {
        await deleteLocalAttachmentFile(attachment);
      }
    }

    /*
     * Remove comment.
     */
    if (
      typeof task.comments.id ===
      'function'
    ) {
      const commentSubdocument =
        task.comments.id(
          comment_id
        );

      if (commentSubdocument) {
        commentSubdocument.deleteOne();
      }
    } else {
      task.comments =
        task.comments.filter(
          item =>
            normalizeId(
              item?._id ||
              item?.id
            ) !== String(comment_id)
        );
    }

    await task.save();

    const populatedTask =
      await getPopulatedTask(
        task._id
      );

    return res.status(200).json({
      success: true,
      message:
        'Comment deleted successfully',
      task: formatLeanTask(
        populatedTask
      )
    });
  } catch (error) {
    console.error(
      'DELETE TASK COMMENT ERROR:',
      error
    );

    next(error);
  }
};
/* =========================================================
   TASK COLLABORATION - ADD COMMENT
   POST /api/v1/tasks/:task_id/comments
========================================================= */

export const addTaskComment = async (
  req,
  res,
  next
) => {
  try {
    const { task_id } = req.params;

    if (!isValidObjectId(task_id)) {
      throw new AppError(
        'Invalid task ID',
        400
      );
    }

    const userId = getAuthUserId(req);

    if (!userId) {
      throw new AppError(
        'Authentication required',
        401
      );
    }

    const task = await Task.findById(task_id);

    if (!task) {
      throw new AppError(
        'Task not found',
        404
      );
    }

    /* ---------------------------------------------------------
       PERMISSION
    --------------------------------------------------------- */

    const isCreator =
      normalizeId(task.created_by) ===
      String(userId);

    const isAssignee =
      Array.isArray(task.assigned_to) &&
      task.assigned_to.some(
        id =>
          normalizeId(id) ===
          String(userId)
      );

    const isSuperAdmin =
      isSuperAdminUser(req);

    if (
      !isCreator &&
      !isAssignee &&
      !isSuperAdmin
    ) {
      throw new AppError(
        'Forbidden: Only the task creator, assignee, or SuperAdmin can comment on this task',
        403
      );
    }

    /* ---------------------------------------------------------
       COMMENT TEXT
    --------------------------------------------------------- */

    const commentText =
      String(
        req.body?.comment ||
        req.body?.text ||
        ''
      ).trim();

    /* ---------------------------------------------------------
       FILES
    --------------------------------------------------------- */

    const filesList =
      Array.isArray(req.files)
        ? req.files
        : req.file
          ? [req.file]
          : [];

    if (
      !commentText &&
      filesList.length === 0
    ) {
      throw new AppError(
        'Comment text or attachment is required',
        400
      );
    }

    if (commentText.length > 5000) {
      throw new AppError(
        'Comment cannot exceed 5000 characters',
        400
      );
    }

    /* ---------------------------------------------------------
       UPLOAD COMMENT ATTACHMENTS
    --------------------------------------------------------- */

    const uploadedAttachments = [];

    if (filesList.length > 0) {
      for (const file of filesList) {
        if (!file?.path) continue;

        const isImage =
          file.mimetype?.startsWith('image/') ||
          /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif|heic|jfif)$/i.test(
            file.originalname || ''
          );

        const relativePath = path
          .relative(process.cwd(), file.path)
          .replace(/\\/g, '/');

        uploadedAttachments.push({
          url: `/${relativePath}`,
          path: relativePath,
          name: file.originalname || 'Attachment',
          public_id: `task-comment-${Date.now()}-${file.filename || 'attachment'}`,
          fileType: isImage ? 'image' : 'file',
          size: Number(file.size) || 0
        });
      }
    }

    /* ---------------------------------------------------------
       CREATE COMMENT
    --------------------------------------------------------- */

    if (!Array.isArray(task.comments)) {
      task.comments = [];
    }

    task.comments.push({
      author: userId,
      comment: commentText,
      attachments:
        uploadedAttachments,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await task.save();

    /* ---------------------------------------------------------
       GET POPULATED TASK
    --------------------------------------------------------- */

    const populatedTask =
      await getPopulatedTask(task._id);

    /* ---------------------------------------------------------
       NOTIFICATIONS
    --------------------------------------------------------- */

    try {
      const recipients = [];

      if (
        populatedTask?.created_by
      ) {
        recipients.push(
          populatedTask.created_by
        );
      }

      if (
        Array.isArray(
          populatedTask?.assigned_to
        )
      ) {
        recipients.push(
          ...populatedTask.assigned_to
        );
      }

      const uniqueRecipients =
        Array.from(
          new Map(
            recipients
              .filter(Boolean)
              .map(user => [
                normalizeId(user),
                user
              ])
          ).values()
        );

      const commenterName =
        getUserName(req);

      for (
        const recipient
        of uniqueRecipients
      ) {
        const recipientId =
          normalizeId(recipient);

        if (
          !recipientId ||
          recipientId ===
            String(userId)
        ) {
          continue;
        }

        await sendNotification(
          recipientId,
          `${commenterName} added a comment to task "${task.title}".`,
          'task_comment_added',
          `New Comment: ${task.title}`,
          userId,
          commenterName
        );
      }
    } catch (notificationError) {
      console.error(
        'Comment notification failed:',
        notificationError.message
      );
    }

    return res.status(201).json({
      success: true,
      message:
        'Comment added successfully',
      task:
        formatLeanTask(
          populatedTask
        )
    });
  } catch (error) {
    console.error(
      'ADD TASK COMMENT ERROR:',
      error
    );

    next(error);
  }
};


/* =========================================================
   TASK COLLABORATION - UPDATE COMMENT
   PUT /api/v1/tasks/:task_id/comments/:comment_id
========================================================= */

export const updateTaskComment = async (
  req,
  res,
  next
) => {
  try {
    const {
      task_id,
      comment_id
    } = req.params;

    if (!isValidObjectId(task_id)) {
      throw new AppError(
        'Invalid task ID',
        400
      );
    }

    if (!isValidObjectId(comment_id)) {
      throw new AppError(
        'Invalid comment ID',
        400
      );
    }

    const userId = getAuthUserId(req);

    if (!userId) {
      throw new AppError(
        'Authentication required',
        401
      );
    }

    const task =
      await Task.findById(task_id);

    if (!task) {
      throw new AppError(
        'Task not found',
        404
      );
    }

    const comment =
      task.comments?.id(comment_id);

    if (!comment) {
      throw new AppError(
        'Comment not found',
        404
      );
    }

    /* ---------------------------------------------------------
       PERMISSION
    --------------------------------------------------------- */

    const isCommentAuthor =
      normalizeId(comment.author) ===
      String(userId);

    const isTaskCreator =
      normalizeId(task.created_by) ===
      String(userId);

    const isSuperAdmin =
      isSuperAdminUser(req);

    if (
      !isCommentAuthor &&
      !isTaskCreator &&
      !isSuperAdmin
    ) {
      throw new AppError(
        'Forbidden: You can only edit your own comments',
        403
      );
    }

    /* ---------------------------------------------------------
       COMMENT TEXT
    --------------------------------------------------------- */

    const commentText =
      req.body?.comment !== undefined
        ? String(
            req.body.comment
          ).trim()
        : undefined;

    if (
      commentText !== undefined &&
      commentText.length > 5000
    ) {
      throw new AppError(
        'Comment cannot exceed 5000 characters',
        400
      );
    }

    /* ---------------------------------------------------------
       UPDATE TEXT
    --------------------------------------------------------- */

    if (commentText !== undefined) {
      if (!commentText) {
        throw new AppError(
          'Comment cannot be empty',
          400
        );
      }

      comment.comment =
        commentText;
    }

    /* ---------------------------------------------------------
       NEW ATTACHMENTS
    --------------------------------------------------------- */

    const filesList =
      Array.isArray(req.files)
        ? req.files
        : req.file
          ? [req.file]
          : [];

    if (filesList.length > 0) {
      for (const file of filesList) {
        if (!file?.path) continue;

        const isImage =
          file.mimetype?.startsWith('image/') ||
          /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif|heic|jfif)$/i.test(
            file.originalname || ''
          );

        if (!Array.isArray(comment.attachments)) {
          comment.attachments = [];
        }

        const relativePath = path
          .relative(process.cwd(), file.path)
          .replace(/\\/g, '/');

        comment.attachments.push({
          url: `/${relativePath}`,
          path: relativePath,
          name: file.originalname || 'Attachment',
          public_id: `task-comment-update-${Date.now()}-${file.filename || 'attachment'}`,
          fileType: isImage ? 'image' : 'file',
          size: Number(file.size) || 0
        });
      }
    }

    comment.updatedAt =
      new Date();

    await task.save();

    const populatedTask =
      await getPopulatedTask(
        task._id
      );

    return res.status(200).json({
      success: true,
      message:
        'Comment updated successfully',
      task:
        formatLeanTask(
          populatedTask
        )
    });
  } catch (error) {
    console.error(
      'UPDATE TASK COMMENT ERROR:',
      error
    );

    next(error);
  }
};


/* =========================================================
   TASK COLLABORATION - DELETE COMMENT
   DELETE /api/v1/tasks/:task_id/comments/:comment_id
========================================================= */

export const deleteTaskComment = async (
  req,
  res,
  next
) => {
  try {
    const {
      task_id,
      comment_id
    } = req.params;

    if (!isValidObjectId(task_id)) {
      throw new AppError(
        'Invalid task ID',
        400
      );
    }

    if (!isValidObjectId(comment_id)) {
      throw new AppError(
        'Invalid comment ID',
        400
      );
    }

    const userId = getAuthUserId(req);

    if (!userId) {
      throw new AppError(
        'Authentication required',
        401
      );
    }

    const task =
      await Task.findById(task_id);

    if (!task) {
      throw new AppError(
        'Task not found',
        404
      );
    }

    const comment =
      task.comments?.id(comment_id);

    if (!comment) {
      throw new AppError(
        'Comment not found',
        404
      );
    }

    /* ---------------------------------------------------------
       PERMISSION
    --------------------------------------------------------- */

    const isCommentAuthor =
      normalizeId(comment.author) ===
      String(userId);

    const isTaskCreator =
      normalizeId(task.created_by) ===
      String(userId);

    const isSuperAdmin =
      isSuperAdminUser(req);

    if (
      !isCommentAuthor &&
      !isTaskCreator &&
      !isSuperAdmin
    ) {
      throw new AppError(
        'Forbidden: You can only delete your own comments',
        403
      );
    }

    /* ---------------------------------------------------------
       DELETE LOCAL FILES
    --------------------------------------------------------- */

    if (Array.isArray(comment.attachments)) {
      for (const attachment of comment.attachments) {
        await deleteLocalAttachmentFile(attachment);
      }
    }

    /* ---------------------------------------------------------
       REMOVE COMMENT
    --------------------------------------------------------- */

    task.comments.pull(
      comment_id
    );

    await task.save();

    const populatedTask =
      await getPopulatedTask(
        task._id
      );

    return res.status(200).json({
      success: true,
      message:
        'Comment deleted successfully',
      task:
        formatLeanTask(
          populatedTask
        )
    });
  } catch (error) {
    console.error(
      'DELETE TASK COMMENT ERROR:',
      error
    );

    next(error);
  }
};

/* =========================================================
   TASK COLLABORATION - TASK ATTACHMENTS
========================================================= */

export const getTaskComments = async (req, res, next) => {
  try {
    const { task_id } = req.params;
    const userId = getAuthUserId(req);

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const task = await Task.findById(task_id);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const isCreator =
      normalizeId(task.created_by) === String(userId);
    const isAssignee =
      Array.isArray(task.assigned_to) &&
      task.assigned_to.some(
        assignee => normalizeId(assignee) === String(userId)
      );

    if (!isCreator && !isAssignee && !isSuperAdminUser(req)) {
      throw new AppError(
        'Forbidden: You do not have access to this task\'s comments',
        403
      );
    }

    await task.populate('comments.author', 'name email');

    return res.status(200).json({
      success: true,
      comments: Array.isArray(task.comments)
        ? task.comments.map(comment => comment.toObject())
        : []
    });
  } catch (error) {
    next(error);
  }
};

export const addTaskAttachments = async (req, res, next) => {
  try {
    const { task_id } = req.params;
    const userId = getAuthUserId(req);

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const task = await Task.findById(task_id);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const isCreator =
      normalizeId(task.created_by) === String(userId);
    const isAssignee =
      Array.isArray(task.assigned_to) &&
      task.assigned_to.some(
        assignee => normalizeId(assignee) === String(userId)
      );

    if (!isCreator && !isAssignee && !isSuperAdminUser(req)) {
      throw new AppError(
        'Forbidden: You do not have access to add attachments to this task',
        403
      );
    }

    const files = Array.isArray(req.files)
      ? req.files
      : req.file
        ? [req.file]
        : [];

    if (files.length === 0) {
      throw new AppError('At least one attachment is required', 400);
    }

    const attachments = await processUploadedFiles(files, task_id);

    if (attachments.length === 0) {
      throw new AppError('No attachments could be uploaded', 400);
    }

    task.attachments ??= [];
    task.attachments.push(
      ...attachments.map(attachment => ({
        ...attachment,
        size: Number(
          files.find(file =>
            file.originalname === attachment.name
          )?.size
        ) || 0,
        uploaded_by: userId,
        uploadedAt: new Date()
      }))
    );

    await task.save();

    const populatedTask = await getPopulatedTask(task._id);

    return res.status(201).json({
      success: true,
      message: 'Attachments added successfully',
      task: formatLeanTask(populatedTask)
    });
  } catch (error) {
    console.error('ADD TASK ATTACHMENTS ERROR:', error);
    next(error);
  }
};

export const deleteTaskAttachment = async (req, res, next) => {
  try {
    const { task_id, attachment_id } = req.params;
    const userId = getAuthUserId(req);

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const task = await Task.findById(task_id);

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const attachment = task.attachments?.id(attachment_id);

    if (!attachment) {
      throw new AppError('Attachment not found', 404);
    }

    const isCreator =
      normalizeId(task.created_by) === String(userId);
    const isUploader =
      normalizeId(attachment.uploaded_by) === String(userId);

    if (!isCreator && !isUploader && !isSuperAdminUser(req)) {
      throw new AppError(
        'Forbidden: You can only delete attachments you uploaded',
        403
      );
    }

    await deleteLocalAttachmentFile(attachment);

    attachment.deleteOne();
    await task.save();

    const populatedTask = await getPopulatedTask(task._id);

    return res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully',
      task: formatLeanTask(populatedTask)
    });
  } catch (error) {
    console.error('DELETE TASK ATTACHMENT ERROR:', error);
    next(error);
  }
};
