import Attendance from '../models/attendance.model.js';
import Task from '../models/task.model.js';
import EmployeeReports from '../models/employeeReports.model.js';
import PerformanceRemark from '../models/performanceRemark.model.js';
import KPIScore from '../models/kpiScore.model.js';

/**
 * KPI Engine Service
 * Calculates comprehensive KPI score for an employee based on Tasks %, Reports %, Attendance %, HR Rating, and Team Lead Rating.
 */

export const getGradeFromScore = (score) => {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Better';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Bad';
  return 'Very Bad';
};

export const calculateEmployeeKPI = async (employeeId, monthStr) => {
  const [yearStr, mStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(mStr, 10) - 1;

  const startDateStr = `${monthStr}-01`;
  const endDateObj = new Date(year, monthIdx + 1, 0);
  const endDateStr = `${monthStr}-${String(endDateObj.getDate()).padStart(2, '0')}`;

  // 1. Attendance Metrics (20% Weight)
  const attendanceRecords = await Attendance.find({
    user_id: employeeId,
    date: { $gte: startDateStr, $lte: endDateStr }
  });

  const presentDays = attendanceRecords.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
  const totalDaysInMonth = endDateObj.getDate();
  const estimatedWorkingDays = Math.min(22, totalDaysInMonth);
  const workingDays = Math.max(estimatedWorkingDays, attendanceRecords.length || estimatedWorkingDays);

  const attendancePercentage = workingDays > 0 ? Math.min(100, Math.round((presentDays / workingDays) * 100)) : 100;
  const attendanceScore = attendancePercentage;

  // 2. Task Completion Metrics (30% Weight)
  const tasks = await Task.find({
    $or: [{ assigned_to: employeeId }, { user_id: employeeId }]
  });

  const tasksCompleted = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length || 1;
  const taskCompletionPercentage = Math.round((tasksCompleted / totalTasks) * 100);
  const taskScore = taskCompletionPercentage;

  // 3. Reports Submission Metrics (25% Weight)
  let reportScore = 80;
  try {
    const reportsCount = await EmployeeReports.countDocuments({
      employee_id: employeeId,
      created_at: { $gte: new Date(startDateStr), $lte: endDateObj }
    });
    reportScore = Math.min(100, Math.max(50, Math.round((reportsCount / 20) * 100)));
  } catch (err) {
    reportScore = 80;
  }

  // 4. Fetch Ratings & Status (HR Rating 15%, TL Rating 15%, Performance Status 10%)
  let hrRating = 5;
  let tlRating = 5;
  let evalStatus = 'Good';
  try {
    const PerformanceReview = (await import('../models/performanceReview.model.js')).default;
    const review = await PerformanceReview.findOne({ employeeId, month: monthStr });
    if (review) {
      if (review.hrRating !== undefined && review.hrRating !== null) hrRating = review.hrRating;
      if (review.tlRating !== undefined && review.tlRating !== null) tlRating = review.tlRating;
      if (review.status) evalStatus = review.status;
    } else {
      const hrRemarkObj = await PerformanceRemark.findOne({ employeeId, month: monthStr, type: 'HR' });
      const tlRemarkObj = await PerformanceRemark.findOne({ employeeId, month: monthStr, type: 'TEAM_LEAD' });
      if (hrRemarkObj && hrRemarkObj.overallRating) hrRating = hrRemarkObj.overallRating;
      if (tlRemarkObj && tlRemarkObj.overallRating) tlRating = tlRemarkObj.overallRating;
    }
  } catch (e) {}

  const STATUS_SCORES = {
    'Very Bad': 20,
    'Bad': 40,
    'Good': 60,
    'Better': 80,
    'Excellent': 100,
    'Needs Improvement': 40,
    'Outstanding': 100
  };

  const hrRatingScore = Math.min(100, Math.max(0, Number(hrRating) * 10));
  const managerRatingScore = Math.min(100, Math.max(0, Number(tlRating) * 10));
  const statusScore = STATUS_SCORES[evalStatus] || 60;

  // 5. Weighted Sum: Tasks (25%), Reports (20%), Attendance (15%), HR Rating (15%), TL Rating (15%), Status (10%)
  const weights = {
    task: 25,
    reports: 20,
    attendance: 15,
    hrRating: 15,
    tlRating: 15,
    status: 10
  };

  const overallScore = Math.min(100, Math.round(
    (taskScore * (weights.task / 100)) +
    (reportScore * (weights.reports / 100)) +
    (attendanceScore * (weights.attendance / 100)) +
    (hrRatingScore * (weights.hrRating / 100)) +
    (managerRatingScore * (weights.tlRating / 100)) +
    (statusScore * (weights.status / 100))
  ));

  const grade = getGradeFromScore(overallScore);

  // Save or update KPIScore record
  const kpiData = {
    employeeId,
    month: monthStr,
    attendanceScore,
    taskScore,
    projectScore: taskScore,
    deptReportScore: reportScore,
    hrRatingScore,
    managerRatingScore,
    statusScore,
    overallScore,
    grade,
    weights,
    metaStats: {
      attendancePercentage,
      presentDays,
      workingDays,
      tasksCompleted,
      tasksPending: totalTasks - tasksCompleted,
      totalTasks
    }
  };

  const kpiRecord = await KPIScore.findOneAndUpdate(
    { employeeId, month: monthStr },
    kpiData,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return kpiRecord;
};
