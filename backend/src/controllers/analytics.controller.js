import Lead from '../models/lead.model.js';
import LeadFollowup from '../models/leadFollowup.model.js';
import redis from '../config/redis.js';
import mongoose from 'mongoose';
import User from '../models/user.model.js';

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 300;

/**
 * Helper to determine row-level security match query
 */
const getRLSFilter = async (req) => {
  const role = String(req.user?.role || req.user?.role_id || '').toLowerCase().trim();
  const userId = req.user?.id || req.user?._id;
  const isPrivileged = ['1', '2', 'hr', 'admin'].includes(role);

  let matchFilter = {};

  if (!isPrivileged) {
    matchFilter = { assignedTo: new mongoose.Types.ObjectId(userId) };
  }

  const deptQuery = req.query.department;
  if (deptQuery && deptQuery !== 'all') {
    // Find all users in this department
    const usersInDept = await User.find({
      $or: [
        { department: deptQuery },
        { departmentId: mongoose.isValidObjectId(deptQuery) ? new mongoose.Types.ObjectId(deptQuery) : null }
      ]
    }).select('_id');
    
    const userIds = usersInDept.map(u => u._id);
    
    if (matchFilter.assignedTo) {
      matchFilter = {
        $and: [
          matchFilter,
          { assignedTo: { $in: userIds } }
        ]
      };
    } else {
      matchFilter = { assignedTo: { $in: userIds } };
    }
  }

  return matchFilter;
};

/**
 * Helper to fetch from cache or execute and cache
 */
const getCachedOrCompute = async (cacheKey, computeFn) => {
  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log(`⚡ Analytics cache hit for key: ${cacheKey}`);
      return JSON.parse(cachedData);
    }
  } catch (error) {
    console.warn(`Redis cache get failed for ${cacheKey}:`, error.message);
  }

  const computedData = await computeFn();

  try {
    await redis.set(cacheKey, JSON.stringify(computedData), 'EX', CACHE_TTL);
  } catch (error) {
    console.warn(`Redis cache set failed for ${cacheKey}:`, error.message);
  }

  return computedData;
};

export const analyticsController = {
  /**
   * GET /api/v1/analytics/summary
   * Fetch cumulative metrics for dashboard cards
   */
  getSummary: async (req, res) => {
    try {
      const matchFilter = await getRLSFilter(req);
      const cacheKey = `analytics:summary:${req.user?.id || 'all'}:${req.query.department || 'all'}`;

      const data = await getCachedOrCompute(cacheKey, async () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // 24 Hours Metrics
        const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const past48h = new Date(Date.now() - 48 * 60 * 60 * 1000);

        // 1. Total Leads counts
        const totalLeads = await Lead.countDocuments(matchFilter);
        const mtdLeads = await Lead.countDocuments({
          ...matchFilter,
          createdAt: { $gte: startOfMonth }
        });
        const lastMtdLeads = await Lead.countDocuments({
          ...matchFilter,
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        });

        // 2. New Leads (Last 24h vs previous 24h for trend)
        const newLeads24h = await Lead.countDocuments({
          ...matchFilter,
          createdAt: { $gte: past24h }
        });
        const previousLeads24h = await Lead.countDocuments({
          ...matchFilter,
          createdAt: { $gte: past48h, $lt: past24h }
        });
        let newLeadsTrend = 0;
        if (previousLeads24h > 0) {
          newLeadsTrend = Math.round(((newLeads24h - previousLeads24h) / previousLeads24h) * 100);
        } else if (newLeads24h > 0) {
          newLeadsTrend = 100;
        }

        // MTD trend
        let mtdTrend = 0;
        if (lastMtdLeads > 0) {
          mtdTrend = Math.round(((mtdLeads - lastMtdLeads) / lastMtdLeads) * 100);
        } else if (mtdLeads > 0) {
          mtdTrend = 100;
        }

        // 3. Converted count & rate
        const convertedLeads = await Lead.countDocuments({
          ...matchFilter,
          status: 'Converted'
        });
        const conversionRate = totalLeads > 0 ? parseFloat(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;

        // 4. Lost count & breakdown
        const lostLeads = await Lead.countDocuments({
          ...matchFilter,
          status: 'Lost'
        });
        const lostReasons = await Lead.aggregate([
          { $match: { ...matchFilter, status: 'Lost' } },
          { $group: { _id: { $ifNull: ['$lostReason', 'Not specified'] }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]);

        // 5. Follow-ups pending (leads where nextFollowUpDate is scheduled & status is Follow Up)
        const followUpsPending = await Lead.countDocuments({
          ...matchFilter,
          status: 'Follow Up',
          nextFollowUpDate: { $exists: true, $ne: null }
        });

        // 6. Admissions Confirmed (admissionYesNo: 'Yes')
        const admissionsConfirmed = await Lead.countDocuments({
          ...matchFilter,
          admissionYesNo: 'Yes'
        });

        return {
          totalLeads: {
            value: totalLeads,
            mtdValue: mtdLeads,
            trend: mtdTrend
          },
          newLeads: {
            value: newLeads24h,
            trend: newLeadsTrend
          },
          followUpsPending: {
            value: followUpsPending
          },
          convertedLeads: {
            value: convertedLeads,
            rate: conversionRate
          },
          lostLeads: {
            value: lostLeads,
            reasons: lostReasons.map(r => ({ reason: r._id, count: r.count }))
          },
          admissionsConfirmed: {
            value: admissionsConfirmed
          }
        };
      });

      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error in analytics summary:', error);
      return res.status(500).json({ success: false, message: 'Failed to load summary stats', error: error.message });
    }
  },

  /**
   * GET /api/v1/analytics/conversion-rate
   * Fetch stage funnel breakdowns
   */
  getConversionRate: async (req, res) => {
    try {
      const matchFilter = await getRLSFilter(req);
      const cacheKey = `analytics:funnel:${req.user?.id || 'all'}:${req.query.department || 'all'}`;

      const data = await getCachedOrCompute(cacheKey, async () => {
        const stats = await Lead.aggregate([
          { $match: matchFilter },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const countsMap = {
          'New': 0,
          'Contacted': 0,
          'Follow Up': 0,
          'Interested': 0,
          'Converted': 0,
          'Lost': 0
        };

        stats.forEach(item => {
          if (item._id in countsMap) {
            countsMap[item._id] = item.count;
          }
        });

        const total = Object.values(countsMap).reduce((a, b) => a + b, 0);

        // Calculate funnel progress (drop-offs)
        const funnel = [
          { stage: 'New', count: countsMap['New'], percentage: total > 0 ? Math.round((countsMap['New'] / total) * 100) : 0 },
          { stage: 'Contacted', count: countsMap['Contacted'], percentage: total > 0 ? Math.round((countsMap['Contacted'] / total) * 100) : 0 },
          { stage: 'Follow Up', count: countsMap['Follow Up'], percentage: total > 0 ? Math.round((countsMap['Follow Up'] / total) * 100) : 0 },
          { stage: 'Interested', count: countsMap['Interested'], percentage: total > 0 ? Math.round((countsMap['Interested'] / total) * 100) : 0 },
          { stage: 'Converted', count: countsMap['Converted'], percentage: total > 0 ? Math.round((countsMap['Converted'] / total) * 100) : 0 },
          { stage: 'Lost', count: countsMap['Lost'], percentage: total > 0 ? Math.round((countsMap['Lost'] / total) * 100) : 0 }
        ];

        return {
          totalLeads: total,
          breakdown: countsMap,
          funnel
        };
      });

      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error in conversion rate analytics:', error);
      return res.status(500).json({ success: false, message: 'Failed to calculate conversion rate', error: error.message });
    }
  },

  /**
   * GET /api/v1/analytics/staff-performance
   * Fetch staff allocation and conversion rates
   */
  getStaffPerformance: async (req, res) => {
    try {
      const matchFilter = await getRLSFilter(req);
      const cacheKey = `analytics:staff:${req.user?.id || 'all'}:${req.query.department || 'all'}`;

      const data = await getCachedOrCompute(cacheKey, async () => {
        return await Lead.aggregate([
          { $match: { ...matchFilter, assignedTo: { $ne: null } } },
          {
            $group: {
              _id: '$assignedTo',
              totalAssigned: { $sum: 1 },
              convertedCount: { $sum: { $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0] } },
              lostCount: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'staffInfo'
            }
          },
          { $unwind: '$staffInfo' },
          {
            $project: {
              _id: 1,
              name: '$staffInfo.name',
              email: '$staffInfo.email',
              profileImage: '$staffInfo.profile_image',
              totalAssigned: 1,
              convertedCount: 1,
              lostCount: 1,
              conversionRate: {
                $cond: [
                  { $gt: ['$totalAssigned', 0] },
                  { $multiply: [{ $divide: ['$convertedCount', '$totalAssigned'] }, 100] },
                  0
                ]
              }
            }
          },
          { $sort: { conversionRate: -1, totalAssigned: -1 } }
        ]);
      });

      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error in staff performance analytics:', error);
      return res.status(500).json({ success: false, message: 'Failed to retrieve staff performance', error: error.message });
    }
  },

  /**
   * GET /api/v1/analytics/source-performance
   * Fetch channel attribution rates
   */
  getSourcePerformance: async (req, res) => {
    try {
      const matchFilter = await getRLSFilter(req);
      const cacheKey = `analytics:source:${req.user?.id || 'all'}:${req.query.department || 'all'}`;

      const data = await getCachedOrCompute(cacheKey, async () => {
        return await Lead.aggregate([
          { $match: matchFilter },
          {
            $group: {
              _id: { $ifNull: ['$source', 'Unknown Source'] },
              totalLeads: { $sum: 1 },
              convertedCount: { $sum: { $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0] } },
              lostCount: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } }
            }
          },
          {
            $project: {
              source: '$_id',
              totalLeads: 1,
              convertedCount: 1,
              lostCount: 1,
              conversionRate: {
                $cond: [
                  { $gt: ['$totalLeads', 0] },
                  { $multiply: [{ $divide: ['$convertedCount', '$totalLeads'] }, 100] },
                  0
                ]
              }
            }
          },
          { $sort: { totalLeads: -1 } }
        ]);
      });

      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error in source performance analytics:', error);
      return res.status(500).json({ success: false, message: 'Failed to retrieve channel attribution metrics', error: error.message });
    }
  },

  /**
   * GET /api/v1/analytics/followup-metrics
   * Fetch responses and engagement statistics
   */
  getFollowupMetrics: async (req, res) => {
    try {
      const matchFilter = await getRLSFilter(req);
      const cacheKey = `analytics:followup:${req.user?.id || 'all'}:${req.query.department || 'all'}`;

      const data = await getCachedOrCompute(cacheKey, async () => {
        // Find all followups where the associated lead matches our RLS filters
        const activeLeads = await Lead.find(matchFilter).select('_id');
        const leadIds = activeLeads.map(l => l._id);

        const totalFollowups = await LeadFollowup.countDocuments({ leadId: { $in: leadIds } });
        
        // Count followups categorised by status changed to
        const statusBreakdown = await LeadFollowup.aggregate([
          { $match: { leadId: { $in: leadIds } } },
          { $group: { _id: '$statusChangedTo', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);

        // Engagement timeline (followups logged in the last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weeklyTimeline = await LeadFollowup.aggregate([
          {
            $match: {
              leadId: { $in: leadIds },
              createdAt: { $gte: sevenDaysAgo }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]);

        return {
          totalLogsCount: totalFollowups,
          breakdown: statusBreakdown.map(sb => ({ status: sb._id || 'Note Logged', count: sb.count })),
          weeklyTimeline: weeklyTimeline.map(wt => ({ date: wt._id, count: wt.count }))
        };
      });

      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error in followup metrics analytics:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch followup metrics', error: error.message });
    }
  }
};
