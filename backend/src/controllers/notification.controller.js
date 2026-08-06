import mongoose from 'mongoose';
import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import { sendEmail } from '../services/notification.service.js';

export const createNotification = async (req, res) => {
  try {
    const { title, description, assignedTo } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Notification description is required.' });
    }

    if (!assignedTo) {
      return res.status(400).json({ success: false, message: 'Please select an assigned user.' });
    }

    const currentUserId = req.user?.id || req.user?._id;
    let createdByName = req.user?.name || '';

    const validCreatorId = (currentUserId && mongoose.Types.ObjectId.isValid(String(currentUserId)))
      ? currentUserId
      : null;

    if (!createdByName && validCreatorId) {
      try {
        const creator = await User.findById(validCreatorId).select('name');
        if (creator) createdByName = creator.name;
      } catch (err) {
        console.warn("Could not fetch creator user name:", err);
      }
    }

    // Support single assignedTo ID or array of IDs
    const rawIds = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
    const recipientIds = rawIds.filter(id => id && mongoose.Types.ObjectId.isValid(String(id)));

    if (recipientIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid assigned user ID provided.' });
    }

    const notificationsToCreate = recipientIds.map(userId => ({
      title: title && title.trim() ? title.trim() : 'Notification',
      description: description.trim(),
      assignedTo: userId,
      createdBy: validCreatorId,
      createdByName: createdByName || 'System',
      isRead: false
    }));

    const createdNotifications = await Notification.insertMany(notificationsToCreate);

    // Trigger Email Dispatch to all recipients
    try {
      const recipientUsers = await User.find({ _id: { $in: recipientIds } }).select('name email');
      for (const u of recipientUsers) {
        if (u.email) {
          sendEmail(
            u.email,
            `🔔 ${title || 'New Notification'}`,
            `<p>Hello <strong>${u.name || 'Team Member'}</strong>,</p><p>${description.trim()}</p><p>- Sent via KOD.BRAND CRM HQ</p>`,
            description.trim()
          );
        }
      }
    } catch (mailErr) {
      console.error("Error triggering notification emails:", mailErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Notification sent successfully!',
      data: createdNotifications
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error creating notification.' });
  }
};

export const getMyNotifications = async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.user?._id;

    if (!currentUserId || !mongoose.Types.ObjectId.isValid(String(currentUserId))) {
      return res.status(200).json({
        success: true,
        unreadCount: 0,
        data: []
      });
    }

    const notifications = await Notification.find({ assignedTo: currentUserId })
      .populate('createdBy', 'name email profile_image designation')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return res.status(200).json({
      success: true,
      unreadCount,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching my notifications:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error fetching notifications.' });
  }
};

export const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('assignedTo', 'name email employeeId designation department')
      .populate('createdBy', 'name email designation')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error fetching notifications.' });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
    }

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error updating notification.' });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.user?._id;
    if (currentUserId && mongoose.Types.ObjectId.isValid(String(currentUserId))) {
      await Notification.updateMany(
        { assignedTo: currentUserId, isRead: false },
        { isRead: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error updating notifications.' });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
    }

    await Notification.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error deleting notification.' });
  }
};
