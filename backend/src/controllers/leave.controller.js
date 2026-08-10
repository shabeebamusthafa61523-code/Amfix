import LeaveRequest from '../models/leaveRequest.model.js';
import User from '../models/user.model.js';
import { sendNotification } from '../services/notification.service.js';
import socketService from '../services/socket.service.js';

/**
 * Helper to check if a user has HR/Admin privileges
 */
const isHrOrAdmin = (userObj) => {
  if (!userObj) return false;
  const role = String(userObj.role || '').toLowerCase().trim();
  const roleId = String(userObj.role_id || userObj.roleId || '').trim();
  const dept = String(userObj.department || '').toLowerCase().trim();
  const desig = String(userObj.designation || '').toLowerCase().trim();

  return (
    userObj.isSuperAdmin === true ||
    role === 'superadmin' ||
    role === 'admin' ||
    role === 'hr' ||
    roleId === '0' ||
    roleId === '1' ||
    roleId === '2' ||
    dept.includes('hr') ||
    dept.includes('admin') ||
    desig.includes('hr')
  );
};

/**
 * Helper to fetch HR/Admin user IDs for targeted notifications
 */
const getHrUserIds = async () => {
  try {
    const hrUsers = await User.find({
      $or: [
        { isSuperAdmin: true },
        { role_id: { $in: ['0', '1', '2'] } },
        { role: { $in: ['admin', 'hr', 'superadmin'] } },
        { department: { $regex: /hr|admin/i } },
        { designation: { $regex: /hr/i } }
      ]
    }).select('_id');
    return hrUsers.map(u => u._id);
  } catch (err) {
    console.error('Error fetching HR users for notification:', err);
    return [];
  }
};

/**
 * Helper to find Team Lead User ID by manager name
 */
const getTeamLeadUserId = async (managerName) => {
  if (!managerName || managerName.trim() === '' || managerName.toLowerCase() === 'unassigned') {
    return null;
  }
  try {
    const cleanName = managerName.trim();
    const leadUser = await User.findOne({
      name: { $regex: new RegExp(`^${cleanName}$`, 'i') }
    }).select('_id');
    return leadUser ? leadUser._id : null;
  } catch (err) {
    console.error('Error finding team lead by name:', err);
    return null;
  }
};

/**
 * @desc Submit a new Leave Request
 * @route POST /api/leaves
 * @access Protected
 */
export const createLeaveRequest = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, ccUserIds } = req.body;
    const userId = req.user.id || req.user._id;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Leave type, start date, end date, and reason are required.'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date or end date format.'
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be earlier than start date.'
      });
    }

    // Calculate total days
    let totalDays = 1;
    if (leaveType === 'Half Day') {
      totalDays = 0.5;
    } else {
      const diffTime = Math.abs(end - start);
      totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    // Fetch employee details from DB for accurate metadata
    const userObj = await User.findById(userId);
    if (!userObj) {
      return res.status(404).json({ success: false, message: 'User record not found.' });
    }

    // Resolve CC Users
    let resolvedCcUsers = [];
    if (Array.isArray(ccUserIds) && ccUserIds.length > 0) {
      const ccDocs = await User.find({ _id: { $in: ccUserIds } }).select('_id name email');
      resolvedCcUsers = ccDocs.map(u => ({
        userId: u._id,
        name: u.name,
        email: u.email
      }));
    }

    const newLeave = new LeaveRequest({
      user: userId,
      employeeId: userObj.employeeId || '',
      userName: userObj.name || '',
      userEmail: userObj.email || '',
      department: userObj.department || '',
      reportingManager: userObj.reportingManager || '',
      ccUsers: resolvedCcUsers,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      teamLeadStatus: 'PENDING',
      hrStatus: 'PENDING',
      finalStatus: 'PENDING'
    });

    await newLeave.save();

    // --- TARGETED NOTIFICATION LOGIC ---
    // 1. Target Team Lead (Reporting Manager)
    const teamLeadId = await getTeamLeadUserId(userObj.reportingManager);
    if (teamLeadId && teamLeadId.toString() !== userId.toString()) {
      await sendNotification(
        teamLeadId,
        `📅 New Leave Request from ${userObj.name} (${leaveType}, ${totalDays} day(s)). Pending your review.`,
        'info',
        'Team Leave Request',
        userId,
        userObj.name
      );
    }

    // 2. Target CC Users
    for (const ccUser of resolvedCcUsers) {
      if (ccUser.userId.toString() !== userId.toString()) {
        await sendNotification(
          ccUser.userId,
          `📋 CC Notice: ${userObj.name} (${userObj.department || 'General'}) submitted a Leave Request (${leaveType}, ${totalDays} day(s)).`,
          'info',
          'Leave Request CC Notice',
          userId,
          userObj.name
        );
      }
    }

    // 2. Target HR / Admin Users
    const hrUserIds = await getHrUserIds();
    for (const hrId of hrUserIds) {
      if (hrId.toString() !== userId.toString() && (!teamLeadId || hrId.toString() !== teamLeadId.toString())) {
        await sendNotification(
          hrId,
          `📋 New Leave Request submitted by ${userObj.name} (${userObj.department || 'General'} - ${leaveType}, ${totalDays} day(s)).`,
          'info',
          'Leave Request Alert',
          userId,
          userObj.name
        );
      }
    }

    // Live Socket Alert for Management
    if (socketService && socketService.emitNewApproval) {
      socketService.emitNewApproval({
        type: 'Leave Request',
        employee: userObj.name,
        department: userObj.department,
        totalDays,
        createdAt: newLeave.createdAt
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully.',
      data: newLeave
    });

  } catch (error) {
    console.error('Error creating leave request:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while submitting leave request.'
    });
  }
};

/**
 * @desc Get my own leave requests
 * @route GET /api/leaves/my
 * @access Protected
 */
export const getMyLeaveRequests = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const leaves = await LeaveRequest.find({ user: userId })
      .populate('teamLeadActionBy', 'name')
      .populate('hrActionBy', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error('Error fetching user leave requests:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching your leave requests.'
    });
  }
};

/**
 * @desc Get leave requests for Team Lead's direct reports
 * @route GET /api/leaves/team
 * @access Protected (Team Leads / Managers)
 */
export const getTeamLeaveRequests = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Find requests where reportingManager matches current user's name
    const managerName = currentUser.name;
    const leaves = await LeaveRequest.find({
      $or: [
        { reportingManager: { $regex: new RegExp(`^${managerName.trim()}$`, 'i') } },
        { teamLeadActionBy: userId }
      ]
    })
      .populate('user', 'name email department profile_image avatar')
      .populate('teamLeadActionBy', 'name')
      .populate('hrActionBy', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error('Error fetching team leave requests:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching team leave requests.'
    });
  }
};

/**
 * @desc Get all leave requests for HR / Admin / Management
 * @route GET /api/leaves/all
 * @access Protected (HR / Admin / SuperAdmin)
 */
export const getAllLeaveRequests = async (req, res) => {
  try {
    const { status, department, search } = req.query;
    const query = {};

    if (status && status !== 'ALL') {
      query.finalStatus = status;
    }

    if (department && department !== 'ALL') {
      query.department = { $regex: new RegExp(department, 'i') };
    }

    if (search && search.trim()) {
      query.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } }
      ];
    }

    const leaves = await LeaveRequest.find(query)
      .populate('user', 'name email department profile_image avatar')
      .populate('teamLeadActionBy', 'name')
      .populate('hrActionBy', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error('Error fetching all leave requests:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching all leave requests.'
    });
  }
};

/**
 * @desc Approve or Reject a Leave Request (Stage 1 or Stage 2)
 * @route PUT /api/leaves/:id/action
 * @access Protected
 */
export const approveOrRejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comment, approvalType } = req.body; // action: 'APPROVED' | 'REJECTED', approvalType: 'team_lead' | 'hr'
    const actorId = req.user.id || req.user._id;

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be APPROVED or REJECTED.' });
    }

    const leaveObj = await LeaveRequest.findById(id);
    if (!leaveObj) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    if (leaveObj.finalStatus === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot modify a cancelled leave request.' });
    }

    const actorUser = await User.findById(actorId);
    const userIsHr = isHrOrAdmin(actorUser);

    let targetType = approvalType;
    if (!targetType) {
      targetType = userIsHr ? 'hr' : 'team_lead';
    }

    // Update specific approval fields
    if (targetType === 'team_lead') {
      leaveObj.teamLeadStatus = action;
      leaveObj.teamLeadComment = comment || '';
      leaveObj.teamLeadActionBy = actorId;
      leaveObj.teamLeadActionAt = new Date();
    } else {
      leaveObj.hrStatus = action;
      leaveObj.hrComment = comment || '';
      leaveObj.hrActionBy = actorId;
      leaveObj.hrActionAt = new Date();
    }

    // Evaluate overall finalStatus
    if (leaveObj.teamLeadStatus === 'REJECTED' || leaveObj.hrStatus === 'REJECTED') {
      leaveObj.finalStatus = 'REJECTED';
    } else if (leaveObj.teamLeadStatus === 'APPROVED' && leaveObj.hrStatus === 'APPROVED') {
      leaveObj.finalStatus = 'APPROVED';
    } else {
      leaveObj.finalStatus = 'PENDING';
    }

    await leaveObj.save();

    // --- TARGETED NOTIFICATIONS AFTER ACTION ---
    const requesterId = leaveObj.user;

    // 1. Notify the Employee
    let empMsg = '';
    if (leaveObj.finalStatus === 'APPROVED') {
      empMsg = `🎉 Your leave request (${leaveObj.leaveType}) from ${new Date(leaveObj.startDate).toLocaleDateString()} to ${new Date(leaveObj.endDate).toLocaleDateString()} has been fully APPROVED by both Team Lead and HR!`;
    } else if (leaveObj.finalStatus === 'REJECTED') {
      empMsg = `❌ Your leave request (${leaveObj.leaveType}) was REJECTED by ${targetType === 'hr' ? 'HR' : 'Team Lead'}. Remarks: ${comment || 'No remarks.'}`;
    } else {
      empMsg = `ℹ️ Your leave request was ${action} by ${targetType === 'hr' ? 'HR' : 'Team Lead'}. Awaiting response from ${targetType === 'hr' ? 'Team Lead' : 'HR'}.`;
    }

    await sendNotification(
      requesterId,
      empMsg,
      leaveObj.finalStatus === 'REJECTED' ? 'warning' : 'info',
      'Leave Request Status Update',
      actorId,
      actorUser.name
    );

    // 2. Notify the other approver role
    if (targetType === 'team_lead') {
      // Notify HR about Team Lead's action
      const hrUserIds = await getHrUserIds();
      for (const hrId of hrUserIds) {
        if (hrId.toString() !== actorId.toString()) {
          await sendNotification(
            hrId,
            `📢 Team Lead ${actorUser.name} ${action} leave request for ${leaveObj.userName}.`,
            'info',
            'Leave Request TL Activity',
            actorId,
            actorUser.name
          );
        }
      }
    } else {
      // Notify Team Lead about HR's action
      const tlId = await getTeamLeadUserId(leaveObj.reportingManager);
      if (tlId && tlId.toString() !== actorId.toString()) {
        await sendNotification(
          tlId,
          `📢 HR ${actorUser.name} ${action} leave request for ${leaveObj.userName}.`,
          'info',
          'Leave Request HR Activity',
          actorId,
          actorUser.name
        );
      }
    }

    // 3. Notify CC Users
    if (Array.isArray(leaveObj.ccUsers) && leaveObj.ccUsers.length > 0) {
      for (const ccUser of leaveObj.ccUsers) {
        if (ccUser.userId && ccUser.userId.toString() !== actorId.toString()) {
          await sendNotification(
            ccUser.userId,
            `📋 CC Notice: Leave request for ${leaveObj.userName} was ${action} by ${targetType === 'hr' ? 'HR' : 'Team Lead'}. (Overall Status: ${leaveObj.finalStatus})`,
            'info',
            'Leave Request CC Update',
            actorId,
            actorUser.name
          );
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Leave request ${action.toLowerCase()} successfully.`,
      data: leaveObj
    });

  } catch (error) {
    console.error('Error updating leave request:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating leave request.'
    });
  }
};

/**
 * @desc Cancel a pending Leave Request
 * @route DELETE /api/leaves/:id
 * @access Protected (Owner)
 */
export const cancelLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    const leaveObj = await LeaveRequest.findById(id);
    if (!leaveObj) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    if (leaveObj.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this request.' });
    }

    leaveObj.finalStatus = 'CANCELLED';
    await leaveObj.save();

    return res.status(200).json({
      success: true,
      message: 'Leave request cancelled successfully.',
      data: leaveObj
    });
  } catch (error) {
    console.error('Error cancelling leave request:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while cancelling leave request.'
    });
  }
};
