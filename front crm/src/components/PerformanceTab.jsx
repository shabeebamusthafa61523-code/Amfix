import React, { useState, useEffect, useCallback } from 'react';
import { 
  Award, Calendar, CheckCircle2, Shield, User, Clock, 
  Save, Send, RefreshCw, BarChart2, Crown, Sparkles
} from 'lucide-react';
import { useToast } from './ToastProvider';

const API_BASE = import.meta.env.VITE_API_URL;

const STATUS_OPTIONS = [
  'Outstanding',
  'Excellent',
  'Better',
  'Good',
  'Needs Improvement',
  'Bad',
  'Very Bad'
];

// Color code helper based on status string or numerical score
export const getKpiColorCode = (input) => {
  let score = -1;
  let statusStr = '';

  if (typeof input === 'number') {
    score = input;
  } else if (typeof input === 'object' && input !== null) {
    score = typeof input.overallScore === 'number' ? input.overallScore : parseFloat(input.overallScore || -1);
    statusStr = (input.grade || input.status || '').toLowerCase();
  } else if (typeof input === 'string') {
    statusStr = input.toLowerCase();
    const parsed = parseFloat(input);
    if (!isNaN(parsed)) score = parsed;
  }

  if (score < 0 && statusStr) {
    if (statusStr.includes('outstanding') || statusStr.includes('excellent')) score = 90;
    else if (statusStr.includes('better')) score = 80;
    else if (statusStr.includes('good')) score = 70;
    else if (statusStr.includes('improvement')) score = 45;
    else if (statusStr.includes('bad') && !statusStr.includes('very bad')) score = 35;
    else if (statusStr.includes('very bad')) score = 15;
  }

  if (score >= 85) return { bg: 'bg-emerald-500', hex: '#10b981', text: 'text-emerald-600 dark:text-emerald-400', label: 'Outstanding' };
  if (score >= 75) return { bg: 'bg-green-500', hex: '#22c55e', text: 'text-green-600 dark:text-green-400', label: 'Excellent' };
  if (score >= 65) return { bg: 'bg-lime-500', hex: '#84cc16', text: 'text-lime-600 dark:text-lime-400', label: 'Better' };
  if (score >= 50) return { bg: 'bg-yellow-500', hex: '#eab308', text: 'text-yellow-600 dark:text-yellow-400', label: 'Good' };
  if (score >= 35) return { bg: 'bg-amber-500', hex: '#f59e0b', text: 'text-amber-600 dark:text-amber-400', label: 'Needs Improvement' };
  if (score >= 20) return { bg: 'bg-orange-500', hex: '#f97316', text: 'text-orange-600 dark:text-orange-400', label: 'Bad' };
  if (score >= 0)  return { bg: 'bg-red-500', hex: '#ef4444', text: 'text-red-600 dark:text-red-400', label: 'Very Bad' };
  return { bg: 'bg-slate-400', hex: '#94a3b8', text: 'text-slate-500 dark:text-slate-400', label: 'Not Evaluated' };
};

const PerformanceTab = ({ user }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const [savingHR, setSavingHR] = useState(false);
  const [savingTL, setSavingTL] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Role & Department resolution
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = String(currentUser.role_id || currentUser.roleId || currentUser.role || '').toLowerCase().trim();
  const deptName = String(currentUser.department || currentUser.departmentId?.name || currentUser.department_name || '').toLowerCase().trim();

  const isSuperAdmin = userRole === '0' || userRole === 'superadmin' || currentUser.isSuperAdmin === true;
  const isAdminRole = ['2', 'admin'].includes(userRole);
  const isHrDept = deptName.includes('hr') || deptName.includes('human resource');

  // Admin / HR Department privileges
  const isAdminOrHrDept = isSuperAdmin || isAdminRole || isHrDept;

  // Discrete role checks
  const isHR = !isAdminOrHrDept && (['1', 'hr'].includes(userRole) || String(currentUser.designation || '').toLowerCase().includes('hr'));
  const isTeamLead = !isAdminOrHrDept && !isHR && (['manager', 'lead', 'employee', '10'].includes(userRole) || String(currentUser.designation || '').toLowerCase().includes('lead'));

  // Role Visibility Rules:
  // - HR login: ONLY see HR rating & HR remarks
  // - Team Lead login: ONLY see TL rating & TL remarks
  // - Admin / HR Department login: View HR rating & remarks, TL rating & remarks, AND Admin rating & remarks!
  const showHRCard = isHR || isAdminOrHrDept;
  const showTLCard = isTeamLead || isAdminOrHrDept;
  const showAdminCard = isAdminOrHrDept;

  // HR Form State
  const [hrForm, setHrForm] = useState({
    overallRating: 5,
    performanceStatus: 'Good',
    performanceRemark: ''
  });

  // TL Form State
  const [tlForm, setTlForm] = useState({
    overallRating: 5,
    performanceStatus: 'Good',
    additionalRemarks: ''
  });

  // Admin Form State
  const [adminForm, setAdminForm] = useState({
    overallRating: 5,
    performanceStatus: 'Good',
    performanceRemark: ''
  });

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`,
      'Content-Type': 'application/json'
    };
  }, []);

  const fetchPerformance = useCallback(async () => {
    if (!user?._id && !user?.id) return;
    const employeeId = user._id || user.id;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/v1/performance/employee/${employeeId}?month=${month}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        setPerformanceData(null);
        return;
      }
      const data = await res.json();
      if (data.success && data.data) {
        setPerformanceData(data.data);

        // Auto-fetch Performance Status
        const autoFetchedStatus = data.data.review?.status || data.data.kpiScore?.grade || 'Good';

        // Auto-fetch & populate HR Rating, Status & Remarks
        const hrScoreFromKPI = data.data.kpiScore?.hrRatingScore ? Math.round(data.data.kpiScore.hrRatingScore / 10) : 5;
        if (data.data.hrRemark) {
          setHrForm({
            overallRating: data.data.hrRemark.overallRating ?? hrScoreFromKPI,
            performanceStatus: data.data.hrRemark.performanceStatus || autoFetchedStatus,
            performanceRemark: data.data.hrRemark.performanceRemark || ''
          });
        } else {
          setHrForm({ overallRating: hrScoreFromKPI, performanceStatus: autoFetchedStatus, performanceRemark: '' });
        }

        // Auto-fetch & populate Team Lead Rating, Status & Remarks
        const tlScoreFromKPI = data.data.kpiScore?.managerRatingScore ? Math.round(data.data.kpiScore.managerRatingScore / 10) : 5;
        if (data.data.teamLeadRemark) {
          setTlForm({
            overallRating: data.data.teamLeadRemark.overallRating ?? tlScoreFromKPI,
            performanceStatus: data.data.teamLeadRemark.performanceStatus || autoFetchedStatus,
            additionalRemarks: data.data.teamLeadRemark.additionalRemarks || data.data.teamLeadRemark.performanceRemark || ''
          });
        } else {
          setTlForm({ overallRating: tlScoreFromKPI, performanceStatus: autoFetchedStatus, additionalRemarks: '' });
        }

        // Auto-fetch & populate Admin Rating, Status & Remarks
        if (data.data.adminRemark) {
          setAdminForm({
            overallRating: data.data.adminRemark.overallRating ?? 5,
            performanceStatus: data.data.adminRemark.performanceStatus || autoFetchedStatus,
            performanceRemark: data.data.adminRemark.performanceRemark || ''
          });
        } else {
          setAdminForm({ overallRating: 5, performanceStatus: autoFetchedStatus, performanceRemark: '' });
        }
      }
    } catch (e) {
      console.error('Failed to auto-fetch performance from KPI analytics:', e);
    } finally {
      setLoading(false);
    }
  }, [user, month, getAuthHeaders]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const handleSaveHRRemark = async (status = 'submitted') => {
    const employeeId = user._id || user.id;
    try {
      setSavingHR(true);
      const res = await fetch(`${API_BASE}/v1/performance/employee/${employeeId}/hr-remark`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...hrForm, month, status })
      });
      const data = await res.json();
      if (res.ok || data.success) {
        showToast(`HR evaluation ${status === 'submitted' ? 'submitted' : 'saved draft'} successfully!`, 'success');
        fetchPerformance();
      } else {
        showToast(data.message || 'Failed to save HR evaluation.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Server error saving HR evaluation.', 'error');
    } finally {
      setSavingHR(false);
    }
  };

  const handleSaveTLRemark = async (status = 'submitted') => {
    const employeeId = user._id || user.id;
    try {
      setSavingTL(true);
      const res = await fetch(`${API_BASE}/v1/performance/employee/${employeeId}/tl-remark`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...tlForm, month, status })
      });
      const data = await res.json();
      if (res.ok || data.success) {
        showToast(`Team Lead evaluation ${status === 'submitted' ? 'submitted' : 'saved draft'} successfully!`, 'success');
        fetchPerformance();
      } else {
        showToast(data.message || 'Failed to save Team Lead evaluation.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Server error saving Team Lead evaluation.', 'error');
    } finally {
      setSavingTL(false);
    }
  };

  const handleSaveAdminRemark = async (status = 'submitted') => {
    const employeeId = user._id || user.id;
    try {
      setSavingAdmin(true);
      const res = await fetch(`${API_BASE}/v1/performance/employee/${employeeId}/admin-remark`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...adminForm, month, status })
      });
      const data = await res.json();
      if (res.ok || data.success) {
        showToast(`Admin evaluation ${status === 'submitted' ? 'submitted' : 'saved draft'} successfully!`, 'success');
        fetchPerformance();
      } else {
        showToast(data.message || 'Failed to save Admin evaluation.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Server error saving Admin evaluation.', 'error');
    } finally {
      setSavingAdmin(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="animate-spin text-indigo-500" size={28} />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Auto-Fetching KPI Analytics & Performance Status...</p>
      </div>
    );
  }

  const kpiScore = performanceData?.kpiScore;
  const overallScore = kpiScore?.overallScore ?? null;
  const autoFetchedStatus = performanceData?.review?.status || kpiScore?.grade || 'Not Evaluated';
  const kpiColor = getKpiColorCode(overallScore !== null ? overallScore : autoFetchedStatus);

  const attendancePct = kpiScore?.metaStats?.attendancePercentage ?? 0;
  const presentDays = kpiScore?.metaStats?.presentDays ?? 0;
  const workingDays = kpiScore?.metaStats?.workingDays ?? 0;

  const hrRemarkObj = performanceData?.hrRemark;
  const tlRemarkObj = performanceData?.teamLeadRemark;
  const adminRemarkObj = performanceData?.adminRemark;

  const hrRatingValue = hrRemarkObj?.overallRating ?? (kpiScore?.hrRatingScore ? Math.round(kpiScore.hrRatingScore / 10) : null);
  const tlRatingValue = tlRemarkObj?.overallRating ?? (kpiScore?.managerRatingScore ? Math.round(kpiScore.managerRatingScore / 10) : null);
  const adminRatingValue = adminRemarkObj?.overallRating ?? null;

  const hrStatusLabel = hrRemarkObj?.performanceStatus || autoFetchedStatus;
  const tlStatusLabel = tlRemarkObj?.performanceStatus || autoFetchedStatus;
  const adminStatusLabel = adminRemarkObj?.performanceStatus || autoFetchedStatus;

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100">
      
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Award className="text-indigo-600 dark:text-indigo-400" size={20} />
            <h3 className="text-base font-black uppercase tracking-tight">KPI Analytics & Performance View</h3>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[11px] text-slate-400 font-semibold">Evaluation Period: <span className="text-indigo-500 font-bold">{month}</span></p>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">• Performance Status:</span>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getKpiColorCode(autoFetchedStatus).bg} text-white shadow-2xs`}>
              ✨ {autoFetchedStatus}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="month" 
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          />
          <button
            onClick={fetchPerformance}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all active:scale-95 shadow-md shadow-indigo-600/20 cursor-pointer"
            title="Refresh KPI Analytics"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Metric Overview Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* KPI Score */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Overall KPI Score</span>
            <BarChart2 size={18} className="text-indigo-500" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-3xl font-black tracking-tight">{overallScore !== null ? `${overallScore}%` : 'N/A'}</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 shadow-2xs">
              <span className={`w-2.5 h-2.5 rounded-full ${kpiColor.bg} animate-pulse shrink-0`} />
              <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200">{autoFetchedStatus}</span>
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${kpiColor.bg}`} 
              style={{ width: `${Math.min(100, overallScore || 0)}%` }}
            />
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attendance</span>
            <Calendar size={18} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {attendancePct}%
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              ({presentDays}/{workingDays} Days)
            </span>
          </div>
        </div>

        {/* Task Summary */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Task Completion</span>
            <CheckCircle2 size={18} className="text-cyan-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-cyan-600 dark:text-cyan-400">
              {performanceData?.taskSummary?.completed || 0}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              / {performanceData?.taskSummary?.total || 0} Tasks Done
            </span>
          </div>
        </div>

      </div>

      {/* ── Role-Restricted Evaluation Cards Grid ── */}
      <div className={`grid grid-cols-1 ${showHRCard && showTLCard && showAdminCard ? 'lg:grid-cols-3' : (showHRCard && showTLCard) || (showHRCard && showAdminCard) || (showTLCard && showAdminCard) ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-6`}>

        {/* ── 1. HR EVALUATION CARD ── */}
        {showHRCard && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="text-indigo-600 dark:text-indigo-400" size={20} />
                <h4 className="font-extrabold text-sm uppercase tracking-wider">HR Evaluation</h4>
              </div>
              
              {/* Status Badge */}
              {hrRemarkObj ? (
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                  hrRemarkObj.status === 'submitted'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}>
                  {hrRemarkObj.status === 'submitted' ? '✓ Submitted' : 'Draft'}
                </span>
              ) : hrRatingValue !== null ? (
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  Auto-Fetched
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                  Pending
                </span>
              )}
            </div>

            {/* If HR user: allow editing HR rating, performance status & remarks */}
            {isHR ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSaveHRRemark('submitted'); }} className="space-y-4">
                
                {/* HR Rating */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">HR Rating (1 - 10)</label>
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{hrForm.overallRating}</span>
                  </div>
                  <input 
                    type="range"
                    min={1}
                    max={10}
                    value={hrForm.overallRating}
                    onChange={(e) => setHrForm(prev => ({ ...prev, overallRating: parseInt(e.target.value) }))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                {/* Performance Status Field */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">Performance Status (Auto-Fetched)</label>
                  <select
                    value={hrForm.performanceStatus}
                    onChange={(e) => setHrForm(prev => ({ ...prev, performanceStatus: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* HR Remarks */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">HR Remarks</label>
                  <textarea 
                    rows={3}
                    value={hrForm.performanceRemark}
                    onChange={(e) => setHrForm(prev => ({ ...prev, performanceRemark: e.target.value }))}
                    placeholder="Enter HR feedback and performance remark..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSaveHRRemark('draft')}
                    disabled={savingHR}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save size={14} /> Save Draft
                  </button>
                  <button
                    type="submit"
                    disabled={savingHR}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <Send size={14} /> Save HR
                  </button>
                </div>
              </form>
            ) : (
              /* View Only HR Rating & Remarks for Admin / HR Dept */
              <div className="space-y-3 py-2">
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">HR Rating (1-10):</span>
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                    {hrRatingValue !== null ? hrRatingValue : 'Not Rated'}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Performance Status:</span>
                  <span className="text-xs font-black uppercase text-indigo-500">
                    {hrStatusLabel}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">HR Remarks:</span>
                  <p className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 italic">
                    "{hrRemarkObj?.performanceRemark || hrForm.performanceRemark || 'No HR remark recorded.'}"
                  </p>
                </div>

                {hrRemarkObj?.reviewerId?.name && (
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Reviewed By: {hrRemarkObj.reviewerId.name}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 2. TEAM LEAD EVALUATION CARD ── */}
        {showTLCard && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <User className="text-cyan-600 dark:text-cyan-400" size={20} />
                <h4 className="font-extrabold text-sm uppercase tracking-wider">Team Lead Evaluation</h4>
              </div>

              {/* Status Badge */}
              {tlRemarkObj ? (
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                  tlRemarkObj.status === 'submitted'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}>
                  {tlRemarkObj.status === 'submitted' ? '✓ Submitted' : 'Draft'}
                </span>
              ) : tlRatingValue !== null ? (
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                  Auto-Fetched
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                  Pending
                </span>
              )}
            </div>

            {/* If Team Lead user: allow editing TL rating, performance status & remarks */}
            {isTeamLead ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSaveTLRemark('submitted'); }} className="space-y-4">
                
                {/* Team Lead Rating */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Team Lead Rating (1 - 10)</label>
                    <span className="text-sm font-black text-cyan-600 dark:text-cyan-400">{tlForm.overallRating}</span>
                  </div>
                  <input 
                    type="range"
                    min={1}
                    max={10}
                    value={tlForm.overallRating}
                    onChange={(e) => setTlForm(prev => ({ ...prev, overallRating: parseInt(e.target.value) }))}
                    className="w-full accent-cyan-600 cursor-pointer"
                  />
                </div>

                {/* Performance Status Field */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">Performance Status (Auto-Fetched)</label>
                  <select
                    value={tlForm.performanceStatus}
                    onChange={(e) => setTlForm(prev => ({ ...prev, performanceStatus: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Team Lead Remarks */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">Team Lead Remarks</label>
                  <textarea 
                    rows={3}
                    value={tlForm.additionalRemarks}
                    onChange={(e) => setTlForm(prev => ({ ...prev, additionalRemarks: e.target.value }))}
                    placeholder="Enter Team Lead feedback and performance remark..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSaveTLRemark('draft')}
                    disabled={savingTL}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save size={14} /> Save Draft
                  </button>
                  <button
                    type="submit"
                    disabled={savingTL}
                    className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20 cursor-pointer"
                  >
                    <Send size={14} /> Save TL
                  </button>
                </div>
              </form>
            ) : (
              /* View Only TL Rating & Remarks for Admin / HR Dept */
              <div className="space-y-3 py-2">
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Team Lead Rating (1-10):</span>
                  <span className="text-sm font-black text-cyan-600 dark:text-cyan-400">
                    {tlRatingValue !== null ? tlRatingValue : 'Not Rated'}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Performance Status:</span>
                  <span className="text-xs font-black uppercase text-cyan-500">
                    {tlStatusLabel}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Team Lead Remarks:</span>
                  <p className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 italic">
                    "{tlRemarkObj?.additionalRemarks || tlRemarkObj?.performanceRemark || tlForm.additionalRemarks || 'No Team Lead remark recorded.'}"
                  </p>
                </div>

                {tlRemarkObj?.reviewerId?.name && (
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Evaluated By: {tlRemarkObj.reviewerId.name}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 3. ADMIN EVALUATION CARD (Admin / HR Department only) ── */}
        {showAdminCard && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Crown className="text-amber-500" size={20} />
                <h4 className="font-extrabold text-sm uppercase tracking-wider">Admin Evaluation</h4>
              </div>

              {/* Status Badge */}
              {adminRemarkObj ? (
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                  adminRemarkObj.status === 'submitted'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}>
                  {adminRemarkObj.status === 'submitted' ? '✓ Submitted' : 'Draft'}
                </span>
              ) : adminRatingValue !== null ? (
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Auto-Fetched
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                  Pending
                </span>
              )}
            </div>

            {/* If Admin user: allow editing Admin rating, performance status & remarks */}
            {isAdminRole || isSuperAdmin ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSaveAdminRemark('submitted'); }} className="space-y-4">
                
                {/* Admin Rating */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Admin Rating (1 - 10)</label>
                    <span className="text-sm font-black text-amber-500">{adminForm.overallRating}</span>
                  </div>
                  <input 
                    type="range"
                    min={1}
                    max={10}
                    value={adminForm.overallRating}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, overallRating: parseInt(e.target.value) }))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Performance Status Field */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">Performance Status (Auto-Fetched)</label>
                  <select
                    value={adminForm.performanceStatus}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, performanceStatus: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Admin Remarks */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">Admin Remarks</label>
                  <textarea 
                    rows={3}
                    value={adminForm.performanceRemark}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, performanceRemark: e.target.value }))}
                    placeholder="Enter executive admin observation and remarks..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-amber-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSaveAdminRemark('draft')}
                    disabled={savingAdmin}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save size={14} /> Save Draft
                  </button>
                  <button
                    type="submit"
                    disabled={savingAdmin}
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    <Send size={14} /> Save Admin
                  </button>
                </div>

              </form>
            ) : (
              /* View Only Admin Rating & Remarks for HR and Team Lead */
              <div className="space-y-3 py-2">
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Admin Rating (1-10):</span>
                  <span className="text-sm font-black text-amber-500">
                    {adminRatingValue !== null ? adminRatingValue : 'Not Rated'}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Performance Status:</span>
                  <span className="text-xs font-black uppercase text-amber-500">
                    {adminStatusLabel}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Admin Remarks:</span>
                  <p className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 italic">
                    "{adminRemarkObj?.performanceRemark || adminForm.performanceRemark || 'No Admin remark recorded.'}"
                  </p>
                </div>

                {adminRemarkObj?.reviewerId?.name && (
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Reviewed By: {adminRemarkObj.reviewerId.name}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};

export default PerformanceTab;
