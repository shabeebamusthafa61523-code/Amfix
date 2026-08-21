import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';
import CalendarWork from '../models/calendarWork.model.js';
import mongoose from 'mongoose';

/**
 * Resolve Assigned User and their Team Leads / Managers
 */
export const findTeamLeadsForUser = async (assignedUserId) => {
  if (!assignedUserId || !mongoose.Types.ObjectId.isValid(String(assignedUserId))) {
    return [];
  }

  const assignedUser = await User.findById(assignedUserId)
    .select('_id name email reportingManager department departmentId role role_id')
    .lean();

  if (!assignedUser) return [assignedUserId];

  const recipientIds = new Set([String(assignedUser._id)]);

  // 1. Check if reportingManager is set
  if (assignedUser.reportingManager) {
    const mgrVal = String(assignedUser.reportingManager).trim();
    let managerQuery = null;

    if (mongoose.Types.ObjectId.isValid(mgrVal)) {
      managerQuery = { _id: mgrVal };
    } else {
      managerQuery = {
        $or: [
          { employeeId: mgrVal },
          { email: mgrVal.toLowerCase() },
          { name: { $regex: `^${mgrVal}$`, $options: 'i' } }
        ]
      };
    }

    const mgr = await User.findOne(managerQuery).select('_id').lean();
    if (mgr && String(mgr._id) !== String(assignedUser._id)) {
      recipientIds.add(String(mgr._id));
    }
  }

  // 2. Find Team Leads / Managers in the same department
  const deptQuery = [];
  if (assignedUser.departmentId) deptQuery.push({ departmentId: assignedUser.departmentId });
  if (assignedUser.department) deptQuery.push({ department: assignedUser.department });

  if (deptQuery.length > 0) {
    const teamLeads = await User.find({
      $or: deptQuery,
      _id: { $ne: assignedUser._id },
      $or: [
        { role_id: { $in: ['1', '2', 'hr', 'admin', 'manager', 'lead'] } },
        { role: { $regex: 'lead|manager|head|admin|supervisor', $options: 'i' } },
        { designation: { $regex: 'lead|manager|head|supervisor', $options: 'i' } }
      ]
    }).select('_id').lean();

    for (const tl of teamLeads) {
      recipientIds.add(String(tl._id));
    }
  }

  return Array.from(recipientIds);
};

/**
 * Send notification to Assigned Person and Team Lead(s) when Content Calendar Item is added or updated
 */
export const notifyContentAssignedAndTeamLead = async (calendarWork, creatorId = null) => {
  try {
    if (!calendarWork || !calendarWork.assignedTo) return;

    const assignedUserId = calendarWork.assignedTo._id || calendarWork.assignedTo;
    const recipientIds = await findTeamLeadsForUser(assignedUserId);

    const postingDateStr = calendarWork.postingDate
      ? new Date(calendarWork.postingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : (calendarWork.workDate ? new Date(calendarWork.workDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Scheduled Posting Date');

    let creatorName = 'Content Management';
    if (creatorId) {
      const creatorUser = await User.findById(creatorId).select('name').lean();
      if (creatorUser) creatorName = creatorUser.name;
    }

    const notificationsToCreate = recipientIds.map(userId => ({
      title: `📅 Content Calendar: ${calendarWork.title || 'New Content Scheduled'}`,
      description: `Content "${calendarWork.title}" (${calendarWork.contentType || 'Content'}) is scheduled for posting on ${postingDateStr}.`,
      image: calendarWork.imageUrl || null,
      imageUrl: calendarWork.imageUrl || null,
      category: 'official',
      assignedTo: userId,
      createdBy: creatorId || null,
      createdByName: creatorName,
      isRead: false
    }));

    await Notification.insertMany(notificationsToCreate);
  } catch (error) {
    console.error('Error notifying assigned user and team lead for calendar work:', error);
  }
};

/**
 * Check and notify Assigned Person and Team Lead(s) on the Posting Date of scheduled content
 */
export const checkAndNotifyPostingDateDue = async () => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const dueItems = await CalendarWork.find({
      $or: [
        { postingDate: { $gte: todayStart, $lte: todayEnd } },
        { scheduledPostTime: { $gte: todayStart, $lte: todayEnd } },
        { postingDate: { $lt: todayStart }, postingStatus: { $ne: 'posted' } }
      ],
      postingStatus: { $ne: 'posted' }
    }).populate('assignedTo', '_id name email');

    for (const item of dueItems) {
      if (!item.assignedTo) continue;

      const recipientIds = await findTeamLeadsForUser(item.assignedTo._id || item.assignedTo);
      const postingDateStr = item.postingDate
        ? new Date(item.postingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Today';

      const notificationsToCreate = recipientIds.map(userId => ({
        title: `🚨 Content Posting Due Today: ${item.title}`,
        description: `Today (${postingDateStr}) is the posting date for "${item.title}" (${item.contentType || 'Content'}). Assigned to: ${item.assignedTo.name || 'Team Member'}.`,
        image: item.imageUrl || null,
        imageUrl: item.imageUrl || null,
        category: 'emergency',
        assignedTo: userId,
        createdBy: item.createdBy || null,
        createdByName: 'System Posting Monitor',
        isRead: false
      }));

      await Notification.insertMany(notificationsToCreate);
    }
  } catch (error) {
    console.error('Error checking posting date notifications:', error);
  }
};
