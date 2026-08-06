import React, { useState, useEffect, useCallback } from 'react';
import { 
  Award, TrendingUp, Calendar, CheckCircle2, AlertTriangle, 
  Sparkles, Save, Send, Clock, User, Shield, BookOpen, Star,
  Zap, FileText, ChevronRight, RefreshCw, BarChart2, Activity
} from 'lucide-react';
import { useToast } from './ToastProvider';

const API_BASE = import.meta.env.VITE_API_URL;

const GRADE_META = {
  'Outstanding': { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400', badge: '🏆 Outstanding' },
  'Excellent': { color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-400', badge: '⭐ Excellent' },
  'Better': { color: 'bg-lime-500/10 text-lime-600 border-lime-500/20 dark:bg-lime-500/20 dark:text-lime-400', badge: '🚀 Better' },
  'Very Good': { color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:bg-cyan-500/20 dark:text-cyan-400', badge: '👍 Very Good' },
  'Good': { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400', badge: '✅ Good' },
  'Needs Improvement': { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400', badge: '⚠️ Needs Improvement' },
  'Bad': { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400', badge: '⚠️ Bad' },
  'Very Bad': { color: 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400', badge: '🚨 Very Bad' },
  'Critical': { color: 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400', badge: '🚨 Critical' }
};

// Color spectrum mapping based directly on Overall KPI Score or Grade
export const getKpiColorCode = (input) => {
  let score = -1;
  let statusStr = '';

  if (typeof input === 'number') {
    score = input;
  } else if (typeof input === 'object' && input !== null) {
    score = typeof input.overallScore === 'number' ? input.overallScore : parseFloat(input.overallScore || -1);
    statusStr = (input.grade || '').toLowerCase();
  } else if (typeof input === 'string') {
    statusStr = input.toLowerCase();
    const parsed = parseFloat(input);
    if (!isNaN(parsed)) score = parsed;
  }

  // Evaluate statusStr if score was not a valid number
  if (score < 0 && statusStr) {
    if (statusStr.includes('outstanding') || statusStr.includes('excellent') || statusStr.includes('better')) score = 90;
    else if (statusStr.includes('very good') || statusStr.includes('good')) score = 75;
    else if (statusStr.includes('average') || statusStr.includes('fair')) score = 55;
    else if (statusStr.includes('needs improvement') || (statusStr.includes('bad') && !statusStr.includes('very bad'))) score = 35;
    else if (statusStr.includes('very bad') || statusStr.includes('critical')) score = 15;
    else score = 75;
  }

  if (score >= 85) {
    return {
      bg: 'bg-emerald-500',
      hex: '#10b981',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/30',
      label: 'Outstanding',
      code: 'GREEN'
    };
  }
  if (score >= 70) {
    return {
      bg: 'bg-lime-500',
      hex: '#84cc16',
      text: 'text-lime-600 dark:text-lime-400',
      border: 'border-lime-500/30',
      label: 'Good',
      code: 'LIME'
    };
  }
  if (score >= 50) {
    return {
      bg: 'bg-amber-500',
      hex: '#f59e0b',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/30',
      label: 'Average',
      code: 'YELLOW'
    };
  }
  if (score >= 30) {
    return {
      bg: 'bg-orange-500',
      hex: '#f97316',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-500/30',
      label: 'Needs Improvement',
      code: 'ORANGE'
    };
  }
  return {
    bg: 'bg-rose-500',
    hex: '#ef4444',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
    label: 'Critical',
    code: 'RED'
  };
};

const PerformanceTab = ({ user }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [generatingAI, setGeneratingAI] = useState(false);
  const [savingHR, setSavingHR] = useState(false);
  const [savingTL, setSavingTL] = useState(false);

  // Determine current user role from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = String(currentUser.role_id || currentUser.roleId || currentUser.role || '').toLowerCase();
  const isHR = ['1', 'hr'].includes(userRole) || String(currentUser.designation || '').toLowerCase().includes('hr');
  const isAdmin = ['2', '10', 'admin'].includes(userRole);
  const isTeamLead = !isHR && (['manager', 'lead', 'employee'].includes(userRole) || String(currentUser.designation || '').toLowerCase().includes('lead') || String(currentUser.designation || '').toLowerCase().includes('manager'));

  // HR Form State
  const [hrForm, setHrForm] = useState({
    performanceRemark: '',
    strengths: '',
    weaknesses: '',
    trainingRecommendation: '',
    promotionRecommendation: '',
    improvementAreas: '',
    generalNotes: '',
    overallRating: 8
  });

  // Team Lead Form State
  const [tlForm, setTlForm] = useState({
    technicalPerformance: 8,
    taskQuality: 8,
    communication: 8,
    teamCollaboration: 8,
    deadlineManagement: 7,
    learningAbility: 8,
    codeQuality: 8,
    problemSolving: 8,
    attendanceBehaviour: 9,
    discipline: 9,
    additionalRemarks: '',
    overallRating: 8
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
      const data = await res.json();
      if (data.success && data.data) {
        setPerformanceData(data.data);

        // Populate HR Form if remark exists
        if (data.data.hrRemark) {
          setHrForm({
            performanceRemark: data.data.hrRemark.performanceRemark || '',
            strengths: data.data.hrRemark.strengths || '',
            weaknesses: data.data.hrRemark.weaknesses || '',
            trainingRecommendation: data.data.hrRemark.trainingRecommendation || '',
            promotionRecommendation: data.data.hrRemark.promotionRecommendation || '',
            improvementAreas: data.data.hrRemark.improvementAreas || '',
            generalNotes: data.data.hrRemark.generalNotes || '',
            overallRating: data.data.hrRemark.overallRating || 8
          });
        }

        // Populate TL Form if remark exists
        if (data.data.teamLeadRemark) {
          setTlForm({
            technicalPerformance: data.data.teamLeadRemark.technicalPerformance || 8,
            taskQuality: data.data.teamLeadRemark.taskQuality || 8,
            communication: data.data.teamLeadRemark.communication || 8,
            teamCollaboration: data.data.teamLeadRemark.teamCollaboration || 8,
            deadlineManagement: data.data.teamLeadRemark.deadlineManagement || 7,
            learningAbility: data.data.teamLeadRemark.learningAbility || 8,
            codeQuality: data.data.teamLeadRemark.codeQuality || 8,
            problemSolving: data.data.teamLeadRemark.problemSolving || 8,
            attendanceBehaviour: data.data.teamLeadRemark.attendanceBehaviour || 9,
            discipline: data.data.teamLeadRemark.discipline || 9,
            additionalRemarks: data.data.teamLeadRemark.additionalRemarks || '',
            overallRating: data.data.teamLeadRemark.overallRating || 8
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch performance:', e);
      showToast('Error loading performance records.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, month, getAuthHeaders, showToast]);

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
        showToast(`HR Remark ${status === 'submitted' ? 'submitted' : 'saved draft'} successfully!`, 'success');
        fetchPerformance();
      } else {
        showToast(data.message || 'Failed to save HR remark.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Server error while saving HR remark.', 'error');
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
        showToast(data.message || 'Failed to save Team Lead remark.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Server error while saving Team Lead remark.', 'error');
    } finally {
      setSavingTL(false);
    }
  };

  const handleGenerateAIReport = async () => {
    const employeeId = user._id || user.id;
    try {
      setGeneratingAI(true);
      const res = await fetch(`${API_BASE}/v1/performance/employee/${employeeId}/ai-report`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ month })
      });
      const data = await res.json();
      if (res.ok || data.success) {
        showToast('AI Performance Evaluation generated!', 'success');
        fetchPerformance();
      } else {
        showToast(data.message || 'AI Generation failed.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Server error during AI report generation.', 'error');
    } finally {
      setGeneratingAI(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="animate-spin text-indigo-500" size={32} />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading KPI & Evaluation Matrix...</p>
      </div>
    );
  }

  const kpiScore = performanceData?.kpiScore || { overallScore: 85, grade: 'Very Good' };
  const kpiColor = getKpiColorCode(kpiScore.overallScore);
  const gradeMeta = GRADE_META[kpiScore.grade] || GRADE_META['Good'];

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100">
      
      {/* ── Top Header Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Award className="text-indigo-600 dark:text-indigo-400" size={20} />
            <h3 className="text-base font-black uppercase tracking-tight">Performance & KPI Engine</h3>
          </div>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Evaluation period: <span className="text-indigo-500 font-bold">{month}</span></p>
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
            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all active:scale-95 shadow-md shadow-indigo-600/20"
            title="Refresh Evaluation Matrix"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Metric Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI Score Card */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Overall KPI Score</span>
            <BarChart2 size={18} className="text-indigo-500" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-3xl font-black tracking-tight">{kpiScore.overallScore}%</span>
            
            {/* Color Dot indicator based on status text appearing here */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 shadow-2xs">
              <span className={`w-2.5 h-2.5 rounded-full ${kpiColor.bg} animate-pulse shrink-0 ring-2 ring-white dark:ring-slate-900`} />
              <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200">{kpiScore.grade}</span>
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${kpiColor.bg}`} 
              style={{ width: `${Math.min(100, kpiScore.overallScore)}%` }}
            />
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attendance Stability</span>
            <Calendar size={18} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {kpiScore.metaStats?.attendancePercentage || 95}%
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              ({kpiScore.metaStats?.presentDays || 20}/{kpiScore.metaStats?.workingDays || 22} Days)
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Weighted Weightage: <strong className="text-slate-700 dark:text-slate-300">20%</strong></p>
        </div>

        {/* Task Velocity */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Task Execution</span>
            <CheckCircle2 size={18} className="text-cyan-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-cyan-600 dark:text-cyan-400">
              {performanceData?.taskSummary?.completed || 0}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              of {performanceData?.taskSummary?.total || 0} Total Tasks
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Pending: <strong className="text-amber-500">{performanceData?.taskSummary?.pending || 0}</strong></p>
        </div>

        {/* AI Readiness */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Report Status</span>
            <Sparkles size={18} className="text-purple-500" />
          </div>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 block truncate">
            {performanceData?.review?.aiSummary ? 'Generated ✨' : 'Not Generated'}
          </span>
          <button
            onClick={handleGenerateAIReport}
            disabled={generatingAI}
            className="mt-2 w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 disabled:opacity-60 cursor-pointer"
          >
            {generatingAI ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Generate AI Report
          </button>
        </div>

      </div>

      {/* ── Remarks Grid (HR & Team Lead forms) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* HR REMARK SECTION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Shield className="text-indigo-600 dark:text-indigo-400" size={18} />
              <h4 className="font-extrabold text-sm uppercase tracking-wider">HR Manager Remarks</h4>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500">
              HR Exclusive
            </span>
          </div>

          {(isHR || isAdmin) ? (
            <form onSubmit={(e) => { e.preventDefault(); handleSaveHRRemark('submitted'); }} className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Performance Remark</label>
                <textarea 
                  rows={2}
                  value={hrForm.performanceRemark}
                  onChange={(e) => setHrForm(prev => ({ ...prev, performanceRemark: e.target.value }))}
                  placeholder="General monthly observation..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-emerald-500 block mb-1">Core Strengths</label>
                  <input 
                    type="text"
                    value={hrForm.strengths}
                    onChange={(e) => setHrForm(prev => ({ ...prev, strengths: e.target.value }))}
                    placeholder="Punctual, fast learner..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-rose-500 block mb-1">Weaknesses / Areas</label>
                  <input 
                    type="text"
                    value={hrForm.weaknesses}
                    onChange={(e) => setHrForm(prev => ({ ...prev, weaknesses: e.target.value }))}
                    placeholder="Documentation depth..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Training Recommendation</label>
                  <input 
                    type="text"
                    value={hrForm.trainingRecommendation}
                    onChange={(e) => setHrForm(prev => ({ ...prev, trainingRecommendation: e.target.value }))}
                    placeholder="Advanced React Architecture..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Promotion Recommendation</label>
                  <input 
                    type="text"
                    value={hrForm.promotionRecommendation}
                    onChange={(e) => setHrForm(prev => ({ ...prev, promotionRecommendation: e.target.value }))}
                    placeholder="Senior Developer Track..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Overall HR Rating (1 - 10)</label>
                  <span className="text-xs font-black text-indigo-500">{hrForm.overallRating} / 10</span>
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

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveHRRemark('draft')}
                  disabled={savingHR}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save size={14} /> Save Draft
                </button>
                <button
                  type="submit"
                  disabled={savingHR}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <Send size={14} /> Submit HR Remark
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 py-2">
              {performanceData?.hrRemark ? (
                <div className="space-y-2 text-xs">
                  <p className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 italic">
                    "{performanceData.hrRemark.performanceRemark || 'No summary text entered.'}"
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <p><strong className="text-emerald-500 uppercase">Strengths:</strong> {performanceData.hrRemark.strengths || 'N/A'}</p>
                    <p><strong className="text-rose-500 uppercase">Weaknesses:</strong> {performanceData.hrRemark.weaknesses || 'N/A'}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reviewed By: {performanceData.hrRemark.reviewerId?.name || 'HR Manager'}</p>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Clock className="mx-auto text-slate-400 mb-2" size={24} />
                  <p className="text-xs font-bold text-slate-400">HR Remark Pending Submission</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* TEAM LEAD REMARK SECTION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <User className="text-cyan-600 dark:text-cyan-400" size={18} />
              <h4 className="font-extrabold text-sm uppercase tracking-wider">Team Lead Evaluation</h4>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500">
              Lead / Manager
            </span>
          </div>

          {(isTeamLead || isHR || isAdmin) ? (
            <form onSubmit={(e) => { e.preventDefault(); handleSaveTLRemark('submitted'); }} className="space-y-3">
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Technical Score', key: 'technicalPerformance' },
                  { label: 'Task Quality', key: 'taskQuality' },
                  { label: 'Communication', key: 'communication' },
                  { label: 'Collaboration', key: 'teamCollaboration' },
                  { label: 'Deadline Mgmt', key: 'deadlineManagement' },
                  { label: 'Problem Solving', key: 'problemSolving' },
                ].map(({ label, key }) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">{label}</label>
                    <input 
                      type="number"
                      min={1}
                      max={10}
                      value={tlForm[key]}
                      onChange={(e) => setTlForm(prev => ({ ...prev, [key]: parseInt(e.target.value) || 7 }))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs font-bold text-center outline-none"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Additional Remarks</label>
                <textarea 
                  rows={2}
                  value={tlForm.additionalRemarks}
                  onChange={(e) => setTlForm(prev => ({ ...prev, additionalRemarks: e.target.value }))}
                  placeholder="Technical feedback, code quality, discipline..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Overall Team Lead Rating (1 - 10)</label>
                  <span className="text-xs font-black text-cyan-500">{tlForm.overallRating} / 10</span>
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

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveTLRemark('draft')}
                  disabled={savingTL}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save size={14} /> Save Draft
                </button>
                <button
                  type="submit"
                  disabled={savingTL}
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20 cursor-pointer"
                >
                  <Send size={14} /> Submit Evaluation
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 py-2">
              {performanceData?.teamLeadRemark ? (
                <div className="space-y-2 text-xs">
                  <p className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 italic">
                    "{performanceData.teamLeadRemark.additionalRemarks || 'Evaluation logged successfully.'}"
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 font-semibold">
                    <span>Tech: {performanceData.teamLeadRemark.technicalPerformance}/10</span>
                    <span>Quality: {performanceData.teamLeadRemark.taskQuality}/10</span>
                    <span>Collab: {performanceData.teamLeadRemark.teamCollaboration}/10</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Evaluated By: {performanceData.teamLeadRemark.reviewerId?.name || 'Team Lead'}</p>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Clock className="mx-auto text-slate-400 mb-2" size={24} />
                  <p className="text-xs font-bold text-slate-400">Team Lead Evaluation Pending</p>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* ── AI Report Output Section ── */}
      {performanceData?.review?.aiSummary && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Sparkles className="text-purple-500" size={20} />
            <h4 className="font-extrabold text-sm uppercase tracking-wider">AI Executive Monthly Evaluation</h4>
          </div>
          <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 font-mono whitespace-pre-wrap">
            {performanceData.review.aiSummary}
          </div>
        </div>
      )}

      {/* ── Performance History Timeline ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="text-slate-400" size={18} />
            <h4 className="font-extrabold text-sm uppercase tracking-wider">Immutable Performance Trajectory</h4>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Audit History Log</span>
        </div>

        {performanceData?.history?.length > 0 ? (
          <div className="space-y-3">
            {performanceData.history.map((item, idx) => (
              <div key={item.id || idx} className="flex items-start justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-xs gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 font-bold text-[10px]">
                    {item.role === 'HR Manager' ? 'HR' : 'TL'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-slate-900 dark:text-slate-100">{item.reviewerName || item.role}</h5>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">• {item.month}</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">{item.remark || 'Performance evaluation recorded'}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 block">{item.kpiScore}% KPI</span>
                  <span className="text-[9px] font-bold text-slate-400">{item.grade}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-6">No previous historical evaluations recorded.</p>
        )}
      </div>

    </div>
  );
};

export default PerformanceTab;
