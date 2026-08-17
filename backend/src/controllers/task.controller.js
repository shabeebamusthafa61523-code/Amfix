import mongoose from 'mongoose';
import Task from '../models/task.model.js';
import User from '../models/user.model.js';
import Client from '../models/client.model.js';
import Project from '../models/project.model.js';
import { AppError } from '../middleware/errorHandler.js';
import { v2 as cloudinary } from 'cloudinary';
import { sendTaskAssignmentEmail, sendTaskStatusUpdateEmail, sendNotification } from '../services/notification.service.js';

// Configure Cloudinary using project environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper: Upload file buffer to Cloudinary using upload_stream
const uploadToCloudinary = (fileBuffer, originalname = '') => {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      return reject(new Error('Cloudinary credentials missing in environment'));
    }
    const isRaw = !/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(originalname);
    const stream = cloudinary.uploader.upload_stream(
      { 
        folder: 'crm_tasks', 
        resource_type: isRaw ? 'raw' : 'auto' 
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// Helper: Delete asset from Cloudinary using public ID
const deleteFromCloudinary = (publicId) => {
  if (!publicId) return Promise.resolve();
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
};

const getUserId = (createdBy) => {
  if (!createdBy) return undefined;
  if (typeof createdBy === 'object') {
    const val = createdBy._id || createdBy.id || createdBy;
    return val ? val.toString() : undefined;
  }
  return createdBy.toString();
};

const formatLeanTask = (task) => {
  if (!task) return null;
  const id = task._id ? task._id.toString() : (task.id || '');
  const user_id = getUserId(task.created_by);
  const file = task.file_url;
  const image = task.file_url;

  let clientVal = null;
  let clientIdVal = null;
  if (task.client) {
    if (typeof task.client === 'object' && (task.client._id || task.client.id)) {
      clientIdVal = (task.client._id || task.client.id).toString();
      clientVal = {
        ...task.client,
        id: clientIdVal
      };
      delete clientVal._id;
    } else {
      clientIdVal = task.client.toString();
      clientVal = clientIdVal;
    }
  }

  let projectVal = null;
  let projectIdVal = null;
  if (task.project) {
    if (typeof task.project === 'object' && (task.project._id || task.project.id)) {
      projectIdVal = (task.project._id || task.project.id).toString();
      projectVal = {
        ...task.project,
        id: projectIdVal
      };
      delete projectVal._id;
    } else {
      projectIdVal = task.project.toString();
      projectVal = projectIdVal;
    }
  }

  let assignees = [];
  if (Array.isArray(task.assigned_to)) {
    assignees = task.assigned_to.map(u => {
      if (!u) return null;
      if (typeof u === 'object' && (u._id || u.id)) {
        const uId = (u._id || u.id).toString();
        const obj = { ...u, id: uId };
        delete obj._id;
        return obj;
      }
      return u.toString();
    }).filter(Boolean);
  } else if (task.assigned_to) {
    if (typeof task.assigned_to === 'object' && (task.assigned_to._id || task.assigned_to.id)) {
      const uId = (task.assigned_to._id || task.assigned_to.id).toString();
      const obj = { ...task.assigned_to, id: uId };
      delete obj._id;
      assignees = [obj];
    } else {
      assignees = [task.assigned_to.toString()];
    }
  }

  const formatted = {
    ...task,
    id,
    user_id,
    assigned_to: assignees,
    file,
    image,
    attachments: (task.attachments && task.attachments.length > 0) ? task.attachments : (file ? [{ url: file, name: 'Attachment', fileType: 'file' }] : []),
    links: task.links || [],
    subtasks: (task.subtasks || []).map(st => {
      if (!st) return st;
      const stId = st._id ? st._id.toString() : (st.id || '');
      let created_by = st.created_by;
      if (created_by && typeof created_by === 'object' && created_by._id) {
        created_by = { ...created_by, id: created_by._id.toString() };
      }
      let completed_by = st.completed_by;
      if (completed_by && typeof completed_by === 'object' && completed_by._id) {
        completed_by = { ...completed_by, id: completed_by._id.toString() };
      }
      return { ...st, id: stId, created_by, completed_by };
    }),
    client: clientVal,
    client_id: clientIdVal,
    project: projectVal,
    project_id: projectIdVal
  };

  if (formatted.created_by && formatted.created_by._id) {
    formatted.created_by.id = formatted.created_by._id.toString();
    delete formatted.created_by._id;
  }

  delete formatted._id;
  delete formatted.__v;
  return formatted;
};

export const syncProjectProgress = async (projectId) => {
  if (!projectId) return;
  try {
    const Project = (await import('../models/project.model.js')).default;
    const projIdStr = typeof projectId === 'object' ? (projectId._id || projectId.id || projectId).toString() : projectId.toString();

    let queryIdList = [projIdStr];
    if (mongoose.Types.ObjectId.isValid(projIdStr)) {
      queryIdList.push(new mongoose.Types.ObjectId(projIdStr));
    }

    const totalTasks = await Task.countDocuments({ project: { $in: queryIdList } });
    if (totalTasks === 0) {
      await Project.findByIdAndUpdate(projIdStr, { progress: 0 });
      return;
    }

    const completedTasks = await Task.countDocuments({
      project: { $in: queryIdList },
      status: { $in: ['done', 'Completed', 'completed', 'Done', 'DONE'] }
    });

    const progressPercentage = Math.round((completedTasks / totalTasks) * 100);
    await Project.findByIdAndUpdate(projIdStr, { progress: progressPercentage });
  } catch (err) {
    console.error("Failed to sync project progress:", err.message);
  }
};

/**
 * 1. CREATE TASK
 * POST /api/v1/tasks/create
 */
export const createTask = async (req, res, next) => {
  try {
    const { title, description, assigned_to, designation_id, dueDate, client, project, priority, links: rawLinks } = req.body;

    const userId = req.user.id || req.user._id;

    let attachments = [];
    let file_url;
    let file_public_id;

    // Handle files upload (multiple images / files)
    const filesList = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);
    if (filesList.length > 0) {
      for (const f of filesList) {
        let attachmentUrl = null;
        let attachmentPublicId = null;

        try {
          if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
            const uploadResult = await uploadToCloudinary(f.buffer, f.originalname || '');
            if (uploadResult && uploadResult.secure_url) {
              attachmentUrl = uploadResult.secure_url;
              attachmentPublicId = uploadResult.public_id;
            }
          }
        } catch (err) {
          console.warn("Cloudinary task attachment upload failed, utilizing Base64 fallback:", err?.message || err);
        }

        if (!attachmentUrl && f.buffer) {
          const mime = f.mimetype || 'application/octet-stream';
          const base64 = f.buffer.toString('base64');
          attachmentUrl = `data:${mime};base64,${base64}`;
        }

        if (attachmentUrl) {
          const isImage = f.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.originalname || '');
          attachments.push({
            url: attachmentUrl,
            name: f.originalname || 'Attachment',
            public_id: attachmentPublicId,
            fileType: isImage ? 'image' : 'file'
          });
        }
      }
      if (attachments.length > 0) {
        file_url = attachments[0].url;
        file_public_id = attachments[0].public_id;
      }
    }

    // Handle links array / JSON string
    let links = [];
    if (rawLinks) {
      try {
        links = typeof rawLinks === 'string' ? JSON.parse(rawLinks) : rawLinks;
        if (!Array.isArray(links)) links = [];
      } catch (e) {
        links = [];
      }
    }

    // Handle subtasks array / JSON string
    let subtasks = [];
    const { subtasks: rawSubtasks } = req.body;
    if (rawSubtasks) {
      try {
        const parsed = typeof rawSubtasks === 'string' ? JSON.parse(rawSubtasks) : rawSubtasks;
        if (Array.isArray(parsed)) {
          subtasks = parsed.map(st => ({
            title: typeof st === 'string' ? st.trim() : (st.title || '').trim(),
            completed: Boolean(st.completed),
            created_by: userId
          })).filter(st => st.title);
        }
      } catch (e) {
        subtasks = [];
      }
    }

    // Handle assigned_to array / single / JSON string
    let assigneesInput = assigned_to;
    let assigneeIds = [];
    if (typeof assigneesInput === 'string') {
      try {
        const parsed = JSON.parse(assigneesInput);
        if (Array.isArray(parsed)) assigneesInput = parsed;
        else assigneesInput = assigneesInput.split(',').map(s => s.trim());
      } catch (e) {
        assigneesInput = assigneesInput.split(',').map(s => s.trim());
      }
    }

    if (Array.isArray(assigneesInput)) {
      assigneeIds = assigneesInput
        .map(id => (typeof id === 'object' && id ? (id._id || id.id || String(id)) : String(id)).trim())
        .filter(id => mongoose.Types.ObjectId.isValid(id));
    } else if (assigneesInput && mongoose.Types.ObjectId.isValid(String(assigneesInput).trim())) {
      assigneeIds = [String(assigneesInput).trim()];
    }

    if (assigneeIds.length === 0) {
      throw new AppError('At least one assigned user is required', 400);
    }

    const task = new Task({
      title: title?.trim(),
      description: description?.trim() || "",

      assigned_to: assigneeIds,
      designation_id: designation_id || undefined,
      dueDate: dueDate || undefined,
      client: (client && mongoose.Types.ObjectId.isValid(client)) ? new mongoose.Types.ObjectId(client) : null,
      project: (project && mongoose.Types.ObjectId.isValid(project)) ? new mongoose.Types.ObjectId(project) : null,

      status: "pending",
      priority: (priority && ['low', 'medium', 'high'].includes(String(priority).toLowerCase())) ? String(priority).toLowerCase() : 'medium',

      // creator
      created_by: userId,
      user_id: userId,

      attachments,
      links,
      subtasks,

      // image/file
      file_url,
      file_public_id,

      image: file_url || null
    });

    await task.save();

    if (task.project) {
      await syncProjectProgress(task.project);
    }

    const populatedTask = await Task.findById(task._id)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('subtasks.created_by', 'name email')
      .populate('subtasks.completed_by', 'name email')
      .populate('client', 'companyName clientName clientId')
      .populate('project', 'projectName projectCode status')
      .lean();

    // Trigger in-app notification & email assignment to all assignees
    try {
      const assignees = Array.isArray(populatedTask?.assigned_to) ? populatedTask.assigned_to : [populatedTask?.assigned_to].filter(Boolean);
      for (const assignee of assignees) {
        if (!assignee) continue;
        const assigneeId = assignee._id || assignee.id;
        const assigneeEmail = assignee.email;
        const assigneeName = assignee.name;
        const creatorName = populatedTask.created_by?.name || req.user?.name || 'Manager';

        // Send in-app notification
        if (assigneeId) {
          await sendNotification(
            assigneeId,
            `You have been assigned a new task: "${task.title}". Due date: ${dueDate ? new Date(dueDate).toLocaleDateString() : 'No deadline'}`,
            'task_assigned',
            `New Task Assigned: ${task.title}`,
            userId,
            creatorName
          );
        }

        // Send task assignment email
        if (assigneeEmail) {
          sendTaskAssignmentEmail({
            recipientEmail: assigneeEmail,
            recipientName: assigneeName,
            taskTitle: task.title,
            taskDescription: task.description,
            dueDate: task.dueDate,
            creatorName
          });
        }
      }
    } catch (mailErr) {
      console.error("Task assignment email/notification error:", mailErr);
    }

    const formattedTask = formatLeanTask(populatedTask);

    return res.status(201).json({
      success: true,
      task: formattedTask
    });

  } catch (error) {
    console.error("CREATE TASK ERROR:", error);
    next(error);
  }
};

/**
 * 2. GET ALL TASKS (Role-based access)
 * GET /api/v1/tasks/all
 */
export const getAllTasks = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const roleName = String(req.user.role || '').toLowerCase();
    const roleId = String(req.user.role_id || '');
    
    let userDeptName = String(req.user.department || '').toLowerCase().trim();
    let userDeptId = String(req.user.departmentId?._id || req.user.departmentId || req.user.department_id || '').trim();
    let userDesignationName = String(req.user.designation || '').toLowerCase().trim();

    if ((!userDeptName || !userDesignationName || !userDeptId) && userId) {
      try {
        const currentUserObj = await User.findById(userId)
          .populate('departmentId', 'name')
          .populate('designationId', 'name')
          .lean();

        if (currentUserObj) {
          if (!userDeptName) {
            userDeptName = String(
              currentUserObj.department ||
              currentUserObj.departmentId?.name ||
              ''
            ).toLowerCase().trim();
          }
          if (!userDeptId) {
            userDeptId = String(
              currentUserObj.departmentId?._id ||
              currentUserObj.departmentId ||
              ''
            ).trim();
          }
          if (!userDesignationName) {
            userDesignationName = String(
              currentUserObj.designation ||
              currentUserObj.designationId?.name ||
              ''
            ).toLowerCase().trim();
          }
        }
      } catch (err) {}
    }

    // Dynamic checks based on Department ID/name, Designation name, and Role
    const isHrAdminDept = (
      userDeptName.includes('hr') ||
      userDeptName.includes('admin')
    );
    const isExecutiveDesignation = ['md', 'managing director', 'coo', 'ceo', 'director', 'executive_director'].some(
      title => userDesignationName.includes(title) || roleName.includes(title)
    );
    const isSuperAdmin = roleName === 'superadmin' || roleId === '0';

    // Grant full task access dynamically for HR/ADMIN department, Executive designations (MD/COO/CEO), or Superadmin
    const isAdminOrHr = isHrAdminDept || isExecutiveDesignation || isSuperAdmin;

    const targetUserId = req.query.user_id || req.query.userId || req.query.targetUserId;

    let query = {};
    if (targetUserId) {
      query = {
        $or: [
          { created_by: targetUserId },
          { assigned_to: targetUserId },
          { user_id: targetUserId }
        ]
      };
    } else if (isAdminOrHr) {
      // Admin/HR see all tasks
      query = {};
    } else {
      // Check if they manage any departments
      const Department = (await import('../modules/departments/department.model.js')).default;
      const ledDepartments = await Department.find({ managerId: userId }).select('_id name');
      
      let deptIds = ledDepartments.map(d => d._id);
      let deptNames = ledDepartments.map(d => d.name);
      
      // Also check role/designation-based team leads
      const currentUserObj = await User.findById(userId).select('departmentId department designation');
      let userDeptId = req.user.departmentId || currentUserObj?.departmentId;
      let userDeptName = currentUserObj?.department;
      const designationName = String(currentUserObj?.designation || '').toLowerCase();

      const isRoleBasedTeamLead = (
        roleName.includes('manager') ||
        roleName.includes('lead') ||
        roleName.includes('hod') ||
        designationName.includes('manager') ||
        designationName.includes('lead') ||
        designationName.includes('hod') ||
        roleId === '2'
      );

      if (isRoleBasedTeamLead && deptIds.length === 0) {
         // Use their own department as fallback
         if (userDeptId) {
           deptIds.push(userDeptId);
           // Fetch the actual department name from DB just to be safe
           try {
             const fallbackDept = await Department.findById(userDeptId).select('name');
             if (fallbackDept && fallbackDept.name) {
               deptNames.push(fallbackDept.name);
             }
           } catch (err) {}
         }
         if (userDeptName) {
           deptNames.push(userDeptName);
         }
      }

      if (deptIds.length > 0 || deptNames.length > 0) {
        // Find users in these departments
        const UserDepartment = (await import('../models/userDepartment.model.js')).default;
        const userDepts = await UserDepartment.find({ departmentId: { $in: deptIds } }).select('userId');
        const userDeptUserIds = userDepts.map(ud => ud.userId).filter(Boolean);

        const usersInDept = await User.find({
          $or: [
            { departmentId: { $in: deptIds } },
            { department: { $in: deptNames, $ne: '' } }
          ]
        }).select('_id');
        const directUserIds = usersInDept.map(u => u._id);

        const allUserIds = [...new Set([...userDeptUserIds.map(String), ...directUserIds.map(String), String(userId)])];
        
        query = {
          $or: [
            { assigned_to: { $in: allUserIds } },
            { created_by: userId }
          ]
        };
      } else {
        // Normal users see only works assigned to them
        query = { 
          $or: [
            { assigned_to: userId },
            { created_by: userId }
          ]
        };
      }
    }

    const tasks = await Task.find(query)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('subtasks.created_by', 'name email')
      .populate('subtasks.completed_by', 'name email')
      .populate('client', 'companyName clientName clientId')
      .populate('project', 'projectName projectCode status')
      .select('-file_public_id')
      .sort({ createdAt: -1 })
      .lean();

    const formattedTasks = tasks.map(formatLeanTask);

    return res.status(200).json(formattedTasks);
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET TASKS BY USER ID (Admin only)
 * GET /api/v1/tasks/user/tasks?user_id=...
 */
export const getUserTasks = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const roleName = String(req.user.role || '').toLowerCase();
    const roleId = String(req.user.role_id || '');
    
    let userDeptName = String(req.user.department || '').toLowerCase().trim();
    let userDeptId = String(req.user.departmentId?._id || req.user.departmentId || req.user.department_id || '').trim();
    let userDesignationName = String(req.user.designation || '').toLowerCase().trim();

    if ((!userDeptName || !userDesignationName || !userDeptId) && userId) {
      try {
        const currentUserObj = await User.findById(userId)
          .populate('departmentId', 'name')
          .populate('designationId', 'name')
          .lean();

        if (currentUserObj) {
          if (!userDeptName) {
            userDeptName = String(
              currentUserObj.department ||
              currentUserObj.departmentId?.name ||
              ''
            ).toLowerCase().trim();
          }
          if (!userDeptId) {
            userDeptId = String(
              currentUserObj.departmentId?._id ||
              currentUserObj.departmentId ||
              ''
            ).trim();
          }
          if (!userDesignationName) {
            userDesignationName = String(
              currentUserObj.designation ||
              currentUserObj.designationId?.name ||
              ''
            ).toLowerCase().trim();
          }
        }
      } catch (err) {}
    }

    // Dynamic checks based on Department ID/name, Designation name, and Role
    const isHrAdminDept = (
      userDeptName.includes('hr') ||
      userDeptName.includes('admin')
    );
    const isExecutiveDesignation = ['md', 'managing director', 'coo', 'ceo', 'director', 'executive_director'].some(
      title => userDesignationName.includes(title) || roleName.includes(title)
    );
    const isSuperAdmin = roleName === 'superadmin' || roleId === '0';

    // Grant full task access dynamically for HR/ADMIN department, Executive designations (MD/COO/CEO), or Superadmin
    const isAdminOrHr = isHrAdminDept || isExecutiveDesignation || isSuperAdmin;

    const Department = (await import('../modules/departments/department.model.js')).default;
    const ledDepartments = await Department.find({ managerId: userId }).select('_id');
    const isDbTeamLead = ledDepartments.length > 0;

    const UserObj = (await import('../models/user.model.js')).default;
    const currentUserObj = await UserObj.findById(userId).select('designation');
    const designationName = String(currentUserObj?.designation || '').toLowerCase();

    const isRoleBasedTeamLead = (
      roleName.includes('manager') ||
      roleName.includes('lead') ||
      roleName.includes('hod') ||
      designationName.includes('manager') ||
      designationName.includes('lead') ||
      designationName.includes('hod') ||
      roleId === '2'
    );

    if (!isAdminOrHr && !isRoleBasedTeamLead && !isDbTeamLead) {
      throw new AppError('Access denied. Insufficient permissions to view user tasks.', 403);
    }

    const { user_id } = req.query;

    const tasks = await Task.find({ assigned_to: user_id })
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('subtasks.created_by', 'name email')
      .populate('subtasks.completed_by', 'name email')
      .populate('client', 'companyName clientName clientId')
      .populate('project', 'projectName projectCode status')
      .select('-file_public_id')
      .sort({ createdAt: -1 })
      .lean();

    const formattedTasks = tasks.map(formatLeanTask);

    return res.status(200).json(formattedTasks);
  } catch (error) {
    next(error);
  }
};

/**
 * 4. GET TASKS FOR CURRENT LOGGED IN USER
 * GET /api/v1/tasks/current-user/tasks
 */
export const getCurrentUserTasks = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    const tasks = await Task.find({ assigned_to: userId })
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('subtasks.created_by', 'name email')
      .populate('subtasks.completed_by', 'name email')
      .populate('client', 'companyName clientName clientId')
      .populate('project', 'projectName projectCode status')
      .select('-file_public_id')
      .sort({ createdAt: -1 })
      .lean();

    const formattedTasks = tasks.map(formatLeanTask);

    return res.status(200).json(formattedTasks);
  } catch (error) {
    next(error);
  }
};

/**
 * 5. DELETE TASK
 * DELETE /api/v1/tasks/delete/:task_id
 */
export const deleteTask = async (req, res, next) => {
  try {
    const { task_id } = req.params;

    const task = await Task.findById(task_id);
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Verify creator authorization or SuperAdmin privileges
    const userId = req.user.id || req.user._id;
    const roleName = String(req.user.role || '').toLowerCase();
    const roleId = String(req.user.role_id || req.user.roleId || '');
    const isSuperAdmin = req.user.isSuperAdmin === true || req.user.is_super_admin === true || roleName === 'superadmin' || roleId === '0';

    const isCreator = task.created_by && task.created_by.toString() === userId.toString();

    if (!isCreator && !isSuperAdmin) {
      throw new AppError('Forbidden: Only the task creator or SuperAdmin can delete this task', 403);
    }

    if (task.file_public_id) {
      await deleteFromCloudinary(task.file_public_id);
    }

    const projectId = task.project;
    await task.deleteOne();

    if (projectId) {
      await syncProjectProgress(projectId);
    }

    return res.status(200).json({
      success: true,
      message: 'Task and associated file resources deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. UPDATE TASK STATUS ONLY
 * PUT /api/v1/tasks/task-status/:task_id?status=...
 */
export const updateTaskStatus = async (req, res, next) => {
  try {
    const { task_id } = req.params;
    const { status } = req.query;

    const task = await Task.findById(task_id);
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    task.status = status;
    await task.save();

    if (task.project) {
      await syncProjectProgress(task.project);
    }

    const populatedTask = await Task.findById(task._id)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('client', 'companyName clientName clientId')
      .populate('project', 'projectName projectCode status')
      .lean();

    // Send status update notification & email/SMS to both ASSIGNEE and TASK CREATOR
    try {
      const creatorUser = populatedTask.created_by;
      const assigneeUser = populatedTask.assigned_to;
      const updaterName = req.user?.name || assigneeUser?.name || 'Staff Member';
      const statusText = (status || task.status || '').toUpperCase();

      const recipientsToNotify = [creatorUser, assigneeUser].filter(u => u && (u._id || u.id));
      const uniqueRecipients = Array.from(new Map(recipientsToNotify.map(u => [(u._id || u.id).toString(), u])).values());

      for (const recipient of uniqueRecipients) {
        if (recipient.email) {
          sendTaskStatusUpdateEmail({
            recipientEmail: recipient.email,
            recipientName: recipient.name || 'Team Member',
            taskTitle: task.title,
            oldStatus: 'previous',
            newStatus: statusText,
            updatedByName: updaterName
          });
        }
        const recipientId = recipient._id || recipient.id;
        if (recipientId) {
          await sendNotification(
            recipientId,
            `Task status updated to "${statusText}" for "${task.title}" by ${updaterName}.`,
            'task_status_changed',
            `Task Status Updated: ${task.title}`,
            req.user?.id || req.user?._id,
            updaterName
          );
        }
      }
    } catch (statusMailErr) {
      console.error("Task creator/assignee status email error:", statusMailErr);
    }

    const formattedTask = formatLeanTask(populatedTask);

    return res.status(200).json(formattedTask);
  } catch (error) {
    next(error);
  }
};

/**
 * 7. UPDATE TASK
 * PUT /api/v1/tasks/update/:task_id
 */
export const updateTask = async (req, res, next) => {
  try {
    const { task_id } = req.params;
    const { title, description, assigned_to, designation_id, client, project } = req.body;

    const task = await Task.findById(task_id);
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Verify creator authorization or SuperAdmin privileges
    const userId = req.user.id || req.user._id;
    const roleName = String(req.user.role || '').toLowerCase();
    const roleId = String(req.user.role_id || req.user.roleId || '');
    const isSuperAdmin = req.user.isSuperAdmin === true || req.user.is_super_admin === true || roleName === 'superadmin' || roleId === '0';

    const isCreator = task.created_by && task.created_by.toString() === userId.toString();

    if (!isCreator && !isSuperAdmin) {
      throw new AppError('Forbidden: Only the task creator or SuperAdmin can edit this task', 403);
    }

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description;
    if (assigned_to !== undefined) {
      let assigneesInput = assigned_to;
      let assigneeIds = [];
      if (typeof assigneesInput === 'string') {
        try {
          const parsed = JSON.parse(assigneesInput);
          if (Array.isArray(parsed)) assigneesInput = parsed;
          else assigneesInput = assigneesInput.split(',').map(s => s.trim());
        } catch (e) {
          assigneesInput = assigneesInput.split(',').map(s => s.trim());
        }
      }
      if (Array.isArray(assigneesInput)) {
        assigneeIds = assigneesInput
          .map(id => (typeof id === 'object' && id ? (id._id || id.id || String(id)) : String(id)).trim())
          .filter(id => mongoose.Types.ObjectId.isValid(id));
      } else if (assigneesInput && mongoose.Types.ObjectId.isValid(String(assigneesInput).trim())) {
        assigneeIds = [String(assigneesInput).trim()];
      }
      task.assigned_to = assigneeIds;
    }
    if (req.body.status !== undefined) task.status = req.body.status;
    if (req.body.priority !== undefined && ['low', 'medium', 'high'].includes(String(req.body.priority).toLowerCase())) {
      task.priority = String(req.body.priority).toLowerCase();
    }
    if (req.body.dueDate !== undefined) task.dueDate = req.body.dueDate;
    if (client !== undefined) {
      task.client = (client && mongoose.Types.ObjectId.isValid(client)) ? new mongoose.Types.ObjectId(client) : null;
    }
    if (project !== undefined) {
      const oldProject = task.project;
      task.project = (project && mongoose.Types.ObjectId.isValid(project)) ? new mongoose.Types.ObjectId(project) : null;
      if (oldProject && oldProject.toString() !== (task.project ? task.project.toString() : '')) {
        await syncProjectProgress(oldProject);
      }
    }

    // Explicit check for designation_id updates (handles empty string resets)
    if (designation_id !== undefined) {
      task.designation_id = designation_id || undefined;
    }

    // Handle multi-file uploads
    const filesList = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);
    if (filesList.length > 0) {
      if (!task.attachments) task.attachments = [];
      for (const f of filesList) {
        let attachmentUrl = null;
        let attachmentPublicId = null;

        try {
          if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
            const uploadResult = await uploadToCloudinary(f.buffer, f.originalname || '');
            if (uploadResult && uploadResult.secure_url) {
              attachmentUrl = uploadResult.secure_url;
              attachmentPublicId = uploadResult.public_id;
            }
          }
        } catch (err) {
          console.warn("Cloudinary task attachment upload failed, utilizing Base64 fallback:", err?.message || err);
        }

        if (!attachmentUrl && f.buffer) {
          const mime = f.mimetype || 'application/octet-stream';
          const base64 = f.buffer.toString('base64');
          attachmentUrl = `data:${mime};base64,${base64}`;
        }

        if (attachmentUrl) {
          const isImage = f.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.originalname || '');
          task.attachments.push({
            url: attachmentUrl,
            name: f.originalname || 'Attachment',
            public_id: attachmentPublicId,
            fileType: isImage ? 'image' : 'file'
          });
          if (!task.file_url) {
            task.file_url = attachmentUrl;
            task.file_public_id = attachmentPublicId;
          }
        }
      }
    }

    if (req.body.links !== undefined) {
      try {
        const parsedLinks = typeof req.body.links === 'string' ? JSON.parse(req.body.links) : req.body.links;
        if (Array.isArray(parsedLinks)) {
          task.links = parsedLinks;
        }
      } catch (e) {
        console.error("Error parsing links:", e);
      }
    }

    if (req.body.subtasks !== undefined) {
      try {
        const parsedSubtasks = typeof req.body.subtasks === 'string' ? JSON.parse(req.body.subtasks) : req.body.subtasks;
        if (Array.isArray(parsedSubtasks)) {
          task.subtasks = parsedSubtasks.map(st => ({
            title: typeof st === 'string' ? st.trim() : (st.title || '').trim(),
            completed: Boolean(st.completed),
            created_by: st.created_by || userId,
            completed_by: st.completed ? (st.completed_by || userId) : null
          })).filter(st => st.title);
        }
      } catch (e) {
        console.error("Error parsing subtasks:", e);
      }
    }

    await task.save();

    if (task.project) {
      await syncProjectProgress(task.project);
    }

    const populatedTask = await Task.findById(task._id)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('subtasks.created_by', 'name email')
      .populate('subtasks.completed_by', 'name email')
      .populate('client', 'companyName clientName clientId')
      .populate('project', 'projectName projectCode status')
      .lean();

    // Trigger notification & email/SMS to both assignee and task creator on task updates
    try {
      const creatorUser = populatedTask.created_by;
      const assignees = Array.isArray(populatedTask.assigned_to) ? populatedTask.assigned_to : [populatedTask.assigned_to].filter(Boolean);
      const updaterName = req.user?.name || 'Manager';

      const recipientsToNotify = [creatorUser, ...assignees].filter(u => u && (u._id || u.id));
      const uniqueRecipients = Array.from(new Map(recipientsToNotify.map(u => [(u._id || u.id).toString(), u])).values());

      for (const recipient of uniqueRecipients) {
        const recipientId = recipient._id || recipient.id;
        const updateDetail = req.body.status ? `Status: ${String(req.body.status).toUpperCase()}` : 'Task details modified';
        if (recipientId) {
          await sendNotification(
            recipientId,
            `Task "${task.title}" was updated by ${updaterName}. (${updateDetail})`,
            'task_updated',
            `Task Updated: ${task.title}`,
            req.user?.id || req.user?._id,
            updaterName
          );
        }
      }
    } catch (updateMailErr) {
      console.error("Task update email error:", updateMailErr);
    }

    const formattedTask = formatLeanTask(populatedTask);

    return res.status(200).json(formattedTask);
  } catch (error) {
    next(error);
  }
};

/**
 * 8. ADD SUBTASK
 * POST /api/v1/tasks/:task_id/subtasks
 */
export const addSubtask = async (req, res, next) => {
  try {
    const { task_id } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
      throw new AppError('Subtask title is required', 400);
    }

    const task = await Task.findById(task_id);
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const userId = req.user.id || req.user._id;
    const roleName = String(req.user.role || '').toLowerCase();
    const roleId = String(req.user.role_id || req.user.roleId || '');
    const isSuperAdmin = req.user.isSuperAdmin === true || req.user.is_super_admin === true || roleName === 'superadmin' || roleId === '0';

    const isCreator = task.created_by && task.created_by.toString() === userId.toString();
    const isAssignee = Array.isArray(task.assigned_to)
      ? task.assigned_to.some(u => (u._id || u.id || u).toString() === userId.toString())
      : (task.assigned_to && (task.assigned_to._id || task.assigned_to.id || task.assigned_to).toString() === userId.toString());

    if (!isCreator && !isAssignee && !isSuperAdmin) {
      throw new AppError('Forbidden: Only the task creator, assignee, or Admin can add subtasks', 403);
    }

    if (!task.subtasks) task.subtasks = [];
    task.subtasks.push({
      title: title.trim(),
      completed: false,
      created_by: userId
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('subtasks.created_by', 'name email')
      .populate('subtasks.completed_by', 'name email')
      .populate('client', 'companyName clientName clientId')
      .populate('project', 'projectName projectCode status')
      .lean();

    // Send notification to the other party
    try {
      const targetUserId = isCreator ? task.assigned_to : task.created_by;
      if (targetUserId && targetUserId.toString() !== userId.toString()) {
        const updaterName = req.user?.name || 'Team Member';
        await sendNotification(
          targetUserId,
          `New subtask "${title.trim()}" added to task "${task.title}" by ${updaterName}.`,
          'subtask_added',
          `Subtask Added: ${task.title}`,
          userId,
          updaterName
        );
      }
    } catch (notifErr) {
      console.error("Subtask notification error:", notifErr);
    }

    const formattedTask = formatLeanTask(populatedTask);
    return res.status(201).json(formattedTask);
  } catch (error) {
    next(error);
  }
};

/**
 * 9. TOGGLE / UPDATE SUBTASK
 * PUT /api/v1/tasks/:task_id/subtasks/:subtask_id
 */
export const toggleSubtask = async (req, res, next) => {
  try {
    const { task_id, subtask_id } = req.params;
    const { completed, title } = req.body;

    const task = await Task.findById(task_id);
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const userId = req.user.id || req.user._id;
    const roleName = String(req.user.role || '').toLowerCase();
    const roleId = String(req.user.role_id || req.user.roleId || '');
    const isSuperAdmin = req.user.isSuperAdmin === true || req.user.is_super_admin === true || roleName === 'superadmin' || roleId === '0';

    const isCreator = task.created_by && task.created_by.toString() === userId.toString();
    const isAssignee = Array.isArray(task.assigned_to)
      ? task.assigned_to.some(u => (u._id || u.id || u).toString() === userId.toString())
      : (task.assigned_to && (task.assigned_to._id || task.assigned_to.id || task.assigned_to).toString() === userId.toString());

    if (!isCreator && !isAssignee && !isSuperAdmin) {
      throw new AppError('Forbidden: Only the task creator, assignee, or Admin can update subtasks', 403);
    }

    if (!task.subtasks) task.subtasks = [];
    const subtask = task.subtasks.id(subtask_id) || task.subtasks.find(st => (st._id ? st._id.toString() : st.id) === subtask_id);

    if (!subtask) {
      throw new AppError('Subtask not found', 404);
    }

    if (completed !== undefined) {
      subtask.completed = Boolean(completed);
      subtask.completed_by = subtask.completed ? userId : null;
    }

    if (title !== undefined && title.trim()) {
      subtask.title = title.trim();
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('subtasks.created_by', 'name email')
      .populate('subtasks.completed_by', 'name email')
      .populate('client', 'companyName clientName clientId')
      .populate('project', 'projectName projectCode status')
      .lean();

    const formattedTask = formatLeanTask(populatedTask);
    return res.status(200).json(formattedTask);
  } catch (error) {
    next(error);
  }
};

/**
 * 10. DELETE SUBTASK
 * DELETE /api/v1/tasks/:task_id/subtasks/:subtask_id
 */
export const deleteSubtask = async (req, res, next) => {
  try {
    const { task_id, subtask_id } = req.params;

    const task = await Task.findById(task_id);
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const userId = req.user.id || req.user._id;
    const roleName = String(req.user.role || '').toLowerCase();
    const roleId = String(req.user.role_id || req.user.roleId || '');
    const isSuperAdmin = req.user.isSuperAdmin === true || req.user.is_super_admin === true || roleName === 'superadmin' || roleId === '0';

    const isCreator = task.created_by && task.created_by.toString() === userId.toString();
    const isAssignee = Array.isArray(task.assigned_to)
      ? task.assigned_to.some(u => (u._id || u.id || u).toString() === userId.toString())
      : (task.assigned_to && (task.assigned_to._id || task.assigned_to.id || task.assigned_to).toString() === userId.toString());

    if (!isCreator && !isAssignee && !isSuperAdmin) {
      throw new AppError('Forbidden: Only the task creator, assignee, or Admin can delete subtasks', 403);
    }

    task.subtasks = (task.subtasks || []).filter(st => (st._id ? st._id.toString() : st.id) !== subtask_id);

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('subtasks.created_by', 'name email')
      .populate('subtasks.completed_by', 'name email')
      .populate('client', 'companyName clientName clientId')
      .populate('project', 'projectName projectCode status')
      .lean();

    const formattedTask = formatLeanTask(populatedTask);
    return res.status(200).json(formattedTask);
  } catch (error) {
    next(error);
  }
};

