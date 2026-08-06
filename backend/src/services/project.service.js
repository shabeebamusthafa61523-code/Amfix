import Project from '../models/project.model.js';
import Notification from '../models/notification.model.js';
import { sendNotification } from './notification.service.js';

export const generateProjectCode = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `PRJ-${currentYear}-`;

  const latestProject = await Project.findOne({ projectCode: { $regex: `^${prefix}` } })
    .sort({ createdAt: -1 })
    .exec();

  if (!latestProject || !latestProject.projectCode) {
    return `${prefix}0001`;
  }

  const parts = latestProject.projectCode.split('-');
  const seq = parseInt(parts[2], 10) || 0;
  const nextSeq = String(seq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
};

/**
 * Broadcast notifications for project lifecycle events
 */
export const notifyProjectEvent = async ({
  project,
  eventType, // 'PROJECT_CREATED' | 'EMPLOYEE_ASSIGNED' | 'EMPLOYEE_REMOVED' | 'STATUS_CHANGED' | 'DEADLINE_UPDATED' | 'PROJECT_COMPLETED'
  triggeredBy,
  message,
  targetUserIds = []
}) => {
  try {
    const recipients = new Set(targetUserIds.map(id => String(id)));
    
    // Add PM & Team Lead to recipients
    if (project.projectManager) recipients.add(String(project.projectManager._id || project.projectManager));
    if (project.assignedTeamLead) recipients.add(String(project.assignedTeamLead._id || project.assignedTeamLead));
    
    // Add assigned employees
    if (Array.isArray(project.assignedEmployees)) {
      project.assignedEmployees.forEach(emp => recipients.add(String(emp._id || emp)));
    }

    const titleMap = {
      'PROJECT_CREATED': `📁 New Project Created: ${project.projectName}`,
      'EMPLOYEE_ASSIGNED': `👤 You were assigned to Project: ${project.projectName}`,
      'EMPLOYEE_REMOVED': `⚠️ Assignment Update: ${project.projectName}`,
      'STATUS_CHANGED': `🔄 Project Status Updated: ${project.projectName} -> ${project.status}`,
      'DEADLINE_UPDATED': `⏰ Project Deadline Updated: ${project.projectName}`,
      'PROJECT_COMPLETED': `🎉 Project Completed: ${project.projectName}`
    };

    const notificationTitle = titleMap[eventType] || `Project Alert: ${project.projectName}`;

    for (const userId of recipients) {
      if (userId === String(triggeredBy)) continue; // Don't notify the user who triggered the event

      await Notification.create({
        title: notificationTitle,
        description: message || notificationTitle,
        assignedTo: userId,
        createdBy: triggeredBy
      });

      await sendNotification(userId, message || notificationTitle, 'info');
    }
  } catch (error) {
    console.error("Failed to dispatch project notification event:", error.message);
  }
};
