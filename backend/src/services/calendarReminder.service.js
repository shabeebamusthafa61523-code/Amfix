import CalendarWork from '../models/calendarWork.model.js';
import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';
import logger from '../utils/logger.util.js';
import { findTeamLeadsForUser } from './calendarNotification.service.js';

const TIMEZONE = 'Asia/Kolkata'; // IST

/**
 * Calendar Reminder Service
 * Handles finding and sending reminders for calendar work items whose posting time has passed
 */

export const calendarReminderService = {
  /**
   * Process calendar work reminders
   * Finds calendar items whose posting time has passed and sends reminders to assignees
   */
  processPostingReminders: async () => {
    try {
      logger.info('⏰ CALENDAR REMINDER: Starting posting reminder check...');

      // Find all calendar work items that should have been posted but haven't been
      const now = new Date();

      const overdueItems = await CalendarWork.find({
        scheduledPostTime: { $lt: now },
        postingStatus: { $ne: 'posted', $ne: 'cancelled' },
        reminderSent: { $ne: true }
      }).populate('assignedTo', 'name email designation departmentId');

      if (overdueItems.length === 0) {
        logger.info('⏰ CALENDAR REMINDER: No overdue items to remind about');
        return { processed: 0, success: 0, failed: 0 };
      }

      logger.info(`⏰ CALENDAR REMINDER: Found ${overdueItems.length} overdue calendar items`);

      let successCount = 0;
      let failureCount = 0;

      for (const item of overdueItems) {
        try {
          // Determine recipients (Assigned Person + Team Lead)
          const recipient = item.assignedTo;
          if (!recipient || !recipient._id) {
            logger.warn(`⏰ CALENDAR REMINDER: Cannot send reminder for item ${item._id} - no valid assignee`);
            failureCount++;
            continue;
          }

          const recipientIds = await findTeamLeadsForUser(recipient._id);

          const notificationsToCreate = recipientIds.map(userId => ({
            title: `⏰ Content Posting Due: ${item.title}`,
            description: `The scheduled posting date for content "${item.title}" (${item.contentType || 'Content'}) assigned to ${recipient.name || 'Team Member'} has arrived. Please publish or update status.`,
            image: item.imageUrl || null,
            imageUrl: item.imageUrl || null,
            category: 'emergency',
            assignedTo: userId,
            createdBy: item.createdBy || null,
            createdByName: 'System Posting Monitor',
            isRead: false
          }));

          await Notification.insertMany(notificationsToCreate);

          // Mark as reminder sent
          item.reminderSent = true;
          item.reminderSentAt = new Date();
          item.lastReminderAt = new Date();
          await item.save();

          logger.info(`⏰ CALENDAR REMINDER: Reminders dispatched for "${item.title}" (ID: ${item._id}) to ${recipientIds.length} recipients`);
          successCount++;
        } catch (itemError) {
          logger.error(`⏰ CALENDAR REMINDER: Failed to process item ${item._id}: ${itemError.message}`);
          failureCount++;
        }
      }

      logger.info(`⏰ CALENDAR REMINDER: Completed - Success: ${successCount}, Failed: ${failureCount}`);
      return {
        processed: overdueItems.length,
        success: successCount,
        failed: failureCount
      };
    } catch (error) {
      logger.error(`❌ CALENDAR REMINDER: Error in processPostingReminders: ${error.message}`);
      return { processed: 0, success: 0, failed: 0, error: error.message };
    }
  },

  /**
   * Get overdue calendar work for a user
   * @param {String} userId - User ID
   * @returns {Array} Array of overdue calendar work items
   */
  getOverdueWork: async (userId) => {
    try {
      const now = new Date();
      return await CalendarWork.find({
        assignedTo: userId,
        workDueDate: { $lt: now },
        workStatus: { $ne: 'completed', $ne: 'cancelled' }
      }).sort({ workDueDate: 1 });
    } catch (error) {
      logger.error(`Error getting overdue work: ${error.message}`);
      return [];
    }
  },

  /**
   * Get pending posting work
   * Calendar items scheduled to be posted but not yet posted
   */
  getPendingPostingWork: async (userId) => {
    try {
      const now = new Date();
      return await CalendarWork.find({
        assignedTo: userId,
        scheduledPostTime: { $lt: now },
        postingStatus: { $ne: 'posted', $ne: 'cancelled' }
      }).sort({ scheduledPostTime: 1 });
    } catch (error) {
      logger.error(`Error getting pending posting work: ${error.message}`);
      return [];
    }
  },

  /**
   * Get calendar work statistics for a user
   */
  getUserStats: async (userId) => {
    try {
      const now = new Date();

      const [
        totalWork,
        completedWork,
        inProgressWork,
        overdueWork,
        pendingPostingWork,
        postedWork
      ] = await Promise.all([
        CalendarWork.countDocuments({ assignedTo: userId }),
        CalendarWork.countDocuments({ assignedTo: userId, workStatus: 'completed' }),
        CalendarWork.countDocuments({ assignedTo: userId, workStatus: 'in_progress' }),
        CalendarWork.countDocuments({
          assignedTo: userId,
          workDueDate: { $lt: now },
          workStatus: { $ne: 'completed', $ne: 'cancelled' }
        }),
        CalendarWork.countDocuments({
          assignedTo: userId,
          scheduledPostTime: { $lt: now },
          postingStatus: { $ne: 'posted', $ne: 'cancelled' }
        }),
        CalendarWork.countDocuments({ assignedTo: userId, postingStatus: 'posted' })
      ]);

      return {
        total: totalWork,
        completed: completedWork,
        inProgress: inProgressWork,
        overdue: overdueWork,
        pendingPosting: pendingPostingWork,
        posted: postedWork
      };
    } catch (error) {
      logger.error(`Error getting user stats: ${error.message}`);
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0,
        pendingPosting: 0,
        posted: 0
      };
    }
  }
};

export default calendarReminderService;
