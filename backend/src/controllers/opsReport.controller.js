import OpsReport from '../models/opsReport.model.js';
import User from '../models/user.model.js';
import Lead from '../models/lead.model.js';
import LeadFollowup from '../models/leadFollowup.model.js';

/**
 * 1. GET OPERATIONS REPORT BY DATE
 * GET /api/v1/ops-reports/by-date?dateString=YYYY-MM-DD&userId=...
 */
export const getReportByDate = async (req, res, next) => {
  try {
    const { dateString } = req.query;
    let targetUserId = req.query.userId;

    if (!dateString) {
      return res.status(400).json({
        success: false,
        message: 'dateString parameter is required (format: YYYY-MM-DD)'
      });
    }

    const currentUserId = req.user.id || req.user._id;
    const currentUserRole = String(req.user.role || req.user.role_id || '').toLowerCase().trim();
    const isPrivileged = ['1', '2', 'hr', 'admin'].includes(currentUserRole);

    // If userId is provided, verify permissions
    if (targetUserId) {
      if (targetUserId !== String(currentUserId) && !isPrivileged) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own reports.'
        });
      }
    } else {
      targetUserId = currentUserId;
    }

    const report = await OpsReport.findOne({
      userId: targetUserId,
      dateString: dateString
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Operations daily shift report not found for this date.'
      });
    }

    return res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error in getReportByDate:', error);
    next(error);
  }
};

/**
 * 2. SAVE OR UPDATE OPERATIONS REPORT (UPSERT)
 * POST /api/v1/ops-reports
 */
export const saveReport = async (req, res, next) => {
  try {
    const { dateString } = req.body;
    let targetUserId = req.body.userId;

    if (!dateString) {
      return res.status(400).json({
        success: false,
        message: 'dateString is required'
      });
    }

    const currentUserId = req.user.id || req.user._id;
    const currentUserRole = String(req.user.role || req.user.role_id || '').toLowerCase().trim();
    const isPrivileged = ['1', '2', 'hr', 'admin'].includes(currentUserRole);

    // If targetUserId is provided, check if client has rights to save on behalf of that user
    if (targetUserId) {
      if (targetUserId !== String(currentUserId) && !isPrivileged) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You cannot save reports for other users.'
        });
      }
    } else {
      targetUserId = currentUserId;
    }

    const updateData = {
      userId: targetUserId,
      dateString,
      basicDetails: req.body.basicDetails,
      dailyOperations: req.body.dailyOperations || [],
      salesActivity: req.body.salesActivity || [],
      salesPerformance: req.body.salesPerformance || [],
      revenueTracking: req.body.revenueTracking || [],
      academyStatus: req.body.academyStatus || [],
      kpiTracking: req.body.kpiTracking || [],
      issuesEscalations: req.body.issuesEscalations || [],
      handover: req.body.handover,
      approval: req.body.approval
    };

    const report = await OpsReport.findOneAndUpdate(
      { userId: targetUserId, dateString },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Operations daily shift report saved successfully.',
      data: report
    });
  } catch (error) {
    console.error('Error in saveReport:', error);
    next(error);
  }
};

/**
 * 3. GET OPERATIONS STAFF LIST (For HR/Admin dropdown selection)
 * GET /api/v1/ops-reports/ops-staff
 */
export const getOpsStaffList = async (req, res, next) => {
  try {
    const currentUserRole = String(req.user.role || req.user.role_id || '').toLowerCase().trim();
    const isPrivileged = ['1', '2', 'hr', 'admin'].includes(currentUserRole);

    if (!isPrivileged) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Exclusive to Admins and Management.'
      });
    }

    // Query users belonging to the Manager - OPS Sales & Growth Designation
    const opsStaff = await User.find({
      $or: [
        { designationId: '6a2f91472df21dc234018cab' },
        { designation_id: '6a2f91472df21dc234018cab' }
      ]
    }, '_id name employeeId email designation')
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: opsStaff
    });
  } catch (error) {
    console.error('Error in getOpsStaffList:', error);
    next(error);
  }
};

/**
 * 4. GET SUBMITTED DATES
 * GET /api/v1/ops-reports/submitted-dates?userId=...
 */
export const getSubmittedDates = async (req, res, next) => {
  try {
    let targetUserId = req.query.userId;
    const currentUserId = req.user.id || req.user._id;
    const currentUserRole = String(req.user.role || req.user.role_id || '').toLowerCase().trim();
    const isPrivileged = ['1', '2', 'hr', 'admin'].includes(currentUserRole);

    if (targetUserId) {
      if (targetUserId !== String(currentUserId) && !isPrivileged) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You cannot view report dates for other users.'
        });
      }
    } else {
      targetUserId = currentUserId;
    }

    const reports = await OpsReport.find({ userId: targetUserId }, 'dateString');
    const dates = reports.map(r => r.dateString);

    return res.status(200).json({
      success: true,
      data: dates
    });
  } catch (error) {
    console.error('Error in getSubmittedDates:', error);
    next(error);
  }
};

/**
 * 5. GET LEAD STATS FOR OPS DAILY REPORT
 * GET /api/v1/ops-reports/lead-stats?date=YYYY-MM-DD
 * Auto-fetches lead counts from the CRM for the Daily Course Counseling & Sales Activity table.
 * Captures both newly created leads AND leads whose course interest was updated on the report date.
 */
export const getLeadStats = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'date parameter is required (YYYY-MM-DD)' });
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayRange = { $gte: dayStart, $lte: dayEnd };

    // 1. New leads created on this date
    const newLeadsToday = await Lead.find({ createdAt: dayRange }).lean();
    const totalNewLeads = newLeadsToday.length;

    // 2. Leads updated on this date (includes course interest changes)
    //    Fetch leads that were updated today but NOT created today (to avoid double-counting)
    const updatedLeadsToday = await Lead.find({
      updatedAt: dayRange,
      createdAt: { $lt: dayStart }   // exclude leads already counted as new
    }).lean();

    // 3. Combined set: all leads that had activity on this date
    const allActiveLeads = [...newLeadsToday, ...updatedLeadsToday];

    // 4. Count by interestedService category (from ALL active leads)
    const categoryCount = (category) =>
      allActiveLeads.filter(l => (l.interestedService || '').toUpperCase().trim() === category.toUpperCase()).length;

    const hotLeads = categoryCount('HOT LEAD');
    const warmLeads = categoryCount('WARM LEAD');
    const coldLeads = categoryCount('COLD LEAD');
    const callBackLeads = categoryCount('CALL BACK');
    const rntLeads = categoryCount('RNT');
    const switchedOffLeads = categoryCount('SWITCHED OFF');
    const wrongLeads = categoryCount('WRONG LEAD');

    // 5. Qualified leads = Interested + Converted (from active leads)
    const qualifiedLeads = allActiveLeads.filter(l => ['Interested', 'Converted'].includes(l.status)).length;

    // 6. Total follow-up calls made today (from LeadFollowup collection)
    const followUpsToday = await LeadFollowup.countDocuments({ createdAt: dayRange });

    // 7. Total calls = new leads + follow-ups
    const totalCalls = totalNewLeads + followUpsToday;

    // 8. Pending follow-ups (status = 'Follow Up' and nextFollowUpDate exists — cumulative)
    const pendingFollowUps = await Lead.countDocuments({
      status: 'Follow Up',
      nextFollowUpDate: { $exists: true, $ne: null }
    });

    // 9. Total pending leads (status = 'New' or 'Contacted' — cumulative)
    const pendingLeads = await Lead.countDocuments({
      status: { $in: ['New', 'Contacted'] }
    });

    // 10. Client meetings fixed (from active leads)
    const meetingsFixed = allActiveLeads.filter(l => l.clientMeetingFixed === 'Yes').length;

    // 11. Admissions / closings done (from active leads)
    const admissionsDone = allActiveLeads.filter(l => l.admissionYesNo === 'Yes').length;

    // 12. Source channel breakdown for Digital Mktg vs Web (new leads only)
    const digitalMktgSources = ['facebook', 'instagram', 'google ads', 'meta', 'social media', 'digital', 'fb', 'ig'];
    const webSources = ['website', 'web', 'landing page', 'seo', 'organic'];

    const countBySource = (leads, sources) =>
      leads.filter(l => {
        const src = (l.source || '').toLowerCase().trim();
        const platform = (l.leadPlatform || '').toLowerCase().trim();
        return sources.some(s => src.includes(s) || platform.includes(s));
      }).length;

    const totalDigital = countBySource(newLeadsToday, digitalMktgSources);
    const totalWeb = countBySource(newLeadsToday, webSources);

    // Build the salesActivity array matching the OPS report structure
    const salesActivity = [
      { activity: 'New Leads Generated', count: String(totalNewLeads), digitalMktg: String(totalDigital), web: String(totalWeb), dueDate: '', remarks: '' },
      { activity: 'Qualified Lead', count: String(qualifiedLeads), digitalMktg: '', web: '', dueDate: '', remarks: '' },
      { activity: 'Total Calls Made', count: String(totalCalls), digitalMktg: '', web: '', dueDate: '', remarks: '' },
      { activity: 'Total Follow up', count: String(followUpsToday), digitalMktg: '', web: '', dueDate: '', remarks: '' },
      { activity: 'Hot Leads', count: String(hotLeads), digitalMktg: '', web: '', dueDate: '', remarks: '' },
      { activity: 'Warm Leads', count: String(warmLeads), digitalMktg: '', web: '', dueDate: '', remarks: '' },
      { activity: 'Cold Leads', count: String(coldLeads), digitalMktg: '', web: '', dueDate: '', remarks: '' },
      { activity: 'Call back Leads', count: String(callBackLeads), digitalMktg: '', web: '', dueDate: '', remarks: '' },
      { activity: 'RNT Leads (Ring Next Time)', count: String(rntLeads), digitalMktg: '', web: '', dueDate: '', remarks: '' },
      { activity: 'Switch Off Leads', count: String(switchedOffLeads), digitalMktg: '', web: '', dueDate: '', remarks: '' },
      { activity: 'Wrong leads', count: String(wrongLeads), digitalMktg: '', web: '', dueDate: '', remarks: '' },
      { activity: 'Total Pending Follow-ups', count: String(pendingFollowUps), digitalMktg: '', web: '', dueDate: '', remarks: '' },
      { activity: 'Total Pending Leads', count: String(pendingLeads), digitalMktg: '', web: '', dueDate: '', remarks: '' },
      { activity: 'Client/Student Meetings Fixed', count: String(meetingsFixed), digitalMktg: '', web: '', dueDate: '', remarks: '' },
      { activity: 'Admissions/Closings Done', count: String(admissionsDone), digitalMktg: '', web: '', dueDate: '', remarks: '' }
    ];

    return res.status(200).json({ success: true, data: salesActivity });
  } catch (error) {
    console.error('Error in getLeadStats:', error);
    next(error);
  }
};
