import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Activity, UserCheck, UserMinus, BarChart3,
  TrendingUp, Clock, CheckCircle2, AlertCircle, Layout, RefreshCw, Eye, PieChart,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env?.VITE_API_URL || import.meta.env?.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const formatTime = (timeString) => {
  if (!timeString) return 'N/A';
  return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getWorkHours = (record) => {
  if (!record || !record.check_in_time) return '0.00 hrs';
  
  const start = new Date(record.check_in_time);
  const end = record.check_out_time ? new Date(record.check_out_time) : new Date();
  
  const diffMs = end - start;
  const diffHrs = Math.max(0, diffMs / (1000 * 60 * 60));
  return `${diffHrs.toFixed(2)} hrs`;
};

// Custom SVG Doughnut Chart Component
const DoughnutChart = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercent = 0;

  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
      {total === 0 ? (
        <div className="text-slate-400 text-sm">No tasks</div>
      ) : (
        <>
          <svg viewBox="-1 -1 2 2" className="w-full h-full transform -rotate-90">
            {data.map((item, index) => {
              if (item.value === 0) return null;
              const percent = item.value / total;
              const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
              cumulativePercent += percent;
              const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
              const largeArcFlag = percent > 0.5 ? 1 : 0;
              
              // If it's a full circle
              if (percent === 1) {
                return (
                  <circle
                    key={item.label}
                    cx="0"
                    cy="0"
                    r="0.8"
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth="0.3"
                    className="transition-all duration-1000"
                  />
                );
              }

              const pathData = [
                `M ${startX * 0.8} ${startY * 0.8}`,
                `A 0.8 0.8 0 ${largeArcFlag} 1 ${endX * 0.8} ${endY * 0.8}`
              ].join(' ');

              return (
                <path
                  key={item.label}
                  d={pathData}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="0.3"
                  className="transition-all duration-1000 hover:stroke-[0.35] cursor-pointer"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-black text-slate-800 dark:text-white">{total}</span>
            <span className="text-xs font-bold text-slate-400 uppercase">Tasks</span>
          </div>
        </>
      )}
    </div>
  );
};

export default function HrDashboard() {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch users
      const usersRes = await fetch(`${API_URL}/v1/users/list`, { headers });
      const usersData = await usersRes.json();
      
      // Fetch tasks
      const tasksRes = await fetch(`${API_URL}/tasks/all`, { headers });
      const tasksData = await tasksRes.json();

      // Fetch today's attendance
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
      const attRes = await fetch(`${API_URL}/attendance/all/${todayStr}`, { headers });
      const attData = await attRes.ok ? await attRes.json() : [];

      setUsers(Array.isArray(usersData) ? usersData : (usersData.data || []));
      setTasks(Array.isArray(tasksData) ? tasksData : (tasksData.data || []));
      setAttendance(Array.isArray(attData) ? attData : []);
    } catch (error) {
      console.error('Error fetching HR Dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute Online/Offline stats based on today's attendance
  const userStats = useMemo(() => {
    let online = [];
    let offline = [];

    // Map attendance records by user_id
    const attendedUserIds = new Set(
      attendance.filter(a => a.check_in_time).map(a => a.user_id.toString())
    );

    users.forEach(u => {
      if (!u.isActive && u.status === 'inactive') return; // Skip completely deactivated

      let isOnline = attendedUserIds.has(u._id.toString());

      if (isOnline) {
        online.push(u);
      } else {
        offline.push(u);
      }
    });

    return { online, offline, total: online.length + offline.length };
  }, [users, attendance]);

  // Compute Task Performance per User
  const performanceStats = useMemo(() => {
    const userTaskMap = {};

    tasks.forEach(t => {
      const uId = t.assigned_to?._id || t.assigned_to?.id || (typeof t.assigned_to === 'string' ? t.assigned_to : null);
      const uName = t.assigned_to?.name || 'Unassigned';
      if (!uId || typeof uId !== 'string') return;

      if (!userTaskMap[uId]) {
        userTaskMap[uId] = {
          id: uId,
          name: uName,
          total: 0,
          pending: 0,
          current: 0,
          preview: 0,
          done: 0
        };
      }
      
      userTaskMap[uId].total += 1;
      if (t.status === 'pending') userTaskMap[uId].pending += 1;
      else if (t.status === 'current') userTaskMap[uId].current += 1;
      else if (t.status === 'preview') userTaskMap[uId].preview += 1;
      else if (t.status === 'done') userTaskMap[uId].done += 1;
      else userTaskMap[uId].pending += 1; // fallback
    });

    // Rank by total tasks handled, or completed tasks
    const ranked = Object.values(userTaskMap).sort((a, b) => b.total - a.total).slice(0, 10); // Top 10

    return ranked;
  }, [tasks]);

  // Compute Company Workload Doughnut Data
  const companyWorkloadData = useMemo(() => {
    let counts = { pending: 0, current: 0, preview: 0, done: 0 };
    tasks.forEach(t => {
      if (counts[t.status] !== undefined) {
        counts[t.status] += 1;
      } else {
        counts.pending += 1;
      }
    });

    return [
      { label: 'Pending', value: counts.pending, color: '#94a3b8', bgClass: 'bg-slate-400' },     // Slate 400
      { label: 'Current', value: counts.current, color: '#3b82f6', bgClass: 'bg-blue-500' },      // Blue 500
      { label: 'Preview', value: counts.preview, color: '#f59e0b', bgClass: 'bg-amber-500' },     // Amber 500
      { label: 'Done', value: counts.done, color: '#b7d333', bgClass: 'bg-emerald-500' }          // Emerald 500
    ];
  }, [tasks]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] p-4 md:p-8 font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              HR Overview
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-base">
              Live Staff Availability & Performance Metrics
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/hr-report')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all"
            >
              <Layout size={16} /> Daily Report
            </button>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-sm shadow-sm hover:bg-indigo-700 hover:shadow transition-all active:scale-95"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Staff */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg inline-block border border-indigo-100 dark:border-indigo-500/20">
                  <Users className="text-WHITE-600 dark:text-indigo-400" size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staff</p>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {loading ? '...' : userStats.total}
                  </h3>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Online Today */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg inline-block border border-emerald-100 dark:border-emerald-500/20 relative">
                  <UserCheck className="text-emerald-600 dark:text-emerald-400" size={20} />
                  <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border border-white dark:border-slate-900" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Checked In Today</p>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {loading ? '...' : userStats.online.length}
                  </h3>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Offline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg inline-block border border-slate-200 dark:border-slate-700/50">
                  <UserMinus className="text-slate-500 dark:text-slate-400" size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Not Checked In</p>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {loading ? '...' : userStats.offline.length}
                  </h3>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Company Tasks Completed */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg inline-block border border-blue-100 dark:border-blue-500/20">
                  <CheckCircle2 className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasks Done</p>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {loading ? '...' : tasks.filter(t => t.status === 'done').length}
                  </h3>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Top Performers (Segmented Bars) */}
          <div className="lg:col-span-2 p-6 md:p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="text-indigo-600 dark:text-indigo-500" size={20} /> Top Performers by Tasks
              </h2>
              {/* Legend */}
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-md border border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-slate-300 dark:bg-slate-600" />Pending</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-blue-500" />Current</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-amber-500" />Preview</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-emerald-500" />Done</div>
              </div>
            </div>
            
            <div className="space-y-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400 text-sm">
                  <Loader2 size={24} className="animate-spin text-indigo-500" />
                  <span>Loading metrics...</span>
                </div>
              ) : performanceStats.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No task data available</div>
              ) : (
                performanceStats.map((stat, idx) => {
                  const pendingPct = (stat.pending / stat.total) * 100;
                  const currentPct = (stat.current / stat.total) * 100;
                  const previewPct = (stat.preview / stat.total) * 100;
                  const donePct = (stat.done / stat.total) * 100;

                  return (
                    <div key={stat.id} className="relative group">
                      <div className="flex justify-between items-end mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-400 w-4">{idx + 1}.</span>
                          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{stat.name}</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-slate-400 hidden sm:inline-block">
                            {stat.pending} Pending • {stat.current} Current • {stat.preview} Preview • {stat.done} Done
                          </span>
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">{stat.total} Total</span>
                        </div>
                      </div>
                      
                      {/* Segmented Progress Bar Track */}
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden group-hover:h-3 transition-all duration-300">
                        {stat.pending > 0 && (
                          <div style={{ width: `${pendingPct}%` }} title={`${stat.pending} Pending`} className="bg-slate-300 dark:bg-slate-600 relative flex items-center justify-center cursor-pointer hover:brightness-110" />
                        )}
                        {stat.current > 0 && (
                          <div style={{ width: `${currentPct}%` }} title={`${stat.current} Current`} className="bg-blue-500 relative flex items-center justify-center border-l border-white/20 cursor-pointer hover:brightness-110" />
                        )}
                        {stat.preview > 0 && (
                          <div style={{ width: `${previewPct}%` }} title={`${stat.preview} Preview`} className="bg-amber-500 relative flex items-center justify-center border-l border-white/20 cursor-pointer hover:brightness-110" />
                        )}
                        {stat.done > 0 && (
                          <div style={{ width: `${donePct}%` }} title={`${stat.done} Done`} className="bg-emerald-500 relative flex items-center justify-center border-l border-white/20 cursor-pointer hover:brightness-110" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Doughnut Chart & Availability */}
          <div className="space-y-6">
            
            {/* Company Workload Overview Doughnut */}
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] flex flex-col">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-between mb-2">
                <span className="flex items-center gap-2">
                  <PieChart className="text-slate-500" size={18} />
                  Company Workload
                </span>
              </h2>
              
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 text-sm">
                  <Loader2 size={24} className="animate-spin text-indigo-500" />
                  <span>Loading...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center mt-2">
                  <DoughnutChart data={companyWorkloadData} />
                  
                  {/* Doughnut Legend */}
                  <div className="grid grid-cols-2 gap-3 w-full mt-6">
                    {companyWorkloadData.map(item => (
                      <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-sm ${item.bgClass}`} />
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{item.label}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Online Users List */}
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] flex flex-col h-[320px]">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between mb-4 shrink-0 uppercase tracking-wider">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Checked In Today
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {userStats.online.length}
                </span>
              </h2>
              <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-4 gap-2 text-slate-400 text-sm">
                    <Loader2 size={16} className="animate-spin text-indigo-500" />
                    <span>Loading...</span>
                  </div>
                ) : userStats.online.length === 0 ? (
                  <div className="text-center text-slate-400 py-4 text-sm">No one checked in yet</div>
                ) : (
                  userStats.online.map(u => (
                    <div key={u._id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-xs border border-slate-200 dark:border-slate-700">
                          {(u.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900 dark:text-slate-200">{u.name}</p>
                          <p className="text-[11px] text-slate-500 truncate max-w-[120px]">{u.designation || 'Staff'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedUser(u)} 
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
          </div>

            {/* Offline Users List */}
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] flex flex-col h-[320px]">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between mb-4 shrink-0 uppercase tracking-wider">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  Not Checked In
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {userStats.offline.length}
                </span>
              </h2>
              <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-4 gap-2 text-slate-400 text-sm">
                    <Loader2 size={16} className="animate-spin text-indigo-500" />
                    <span>Loading...</span>
                  </div>
                ) : userStats.offline.length === 0 ? (
                  <div className="text-center text-slate-400 py-4 text-sm">Everyone is checked in!</div>
                ) : (
                  userStats.offline.map(u => (
                    <div key={u._id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group opacity-80 hover:opacity-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center font-bold text-slate-400 dark:text-slate-500 text-xs border border-slate-200 dark:border-slate-700/50">
                          {(u.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">{u.name}</p>
                          <p className="text-[11px] text-slate-400">
                            Did not check in today
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedUser(u)} 
                        className="text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
        
      </div>

      {/* User Progress Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedUser(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 text-xl border border-indigo-100 dark:border-indigo-500/20">
                    {(selectedUser.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{selectedUser.name}</h2>
                    <p className="text-sm font-semibold text-slate-500 mt-0.5">{selectedUser.designation || 'Staff Member'} <span className="text-slate-300 dark:text-slate-600 font-normal mx-1">•</span> Task Progress</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                {(() => {
                  const userTasks = tasks.filter(t => {
                    const assignedId = t.assigned_to?._id || t.assigned_to?.id || (typeof t.assigned_to === 'string' ? t.assigned_to : null);
                    return assignedId === selectedUser._id;
                  });

                  const todayRecord = attendance.find(a => a.user_id.toString() === selectedUser._id.toString());

                  const counts = { pending: 0, current: 0, preview: 0, done: 0 };
                  userTasks.forEach(t => {
                    if (counts[t.status] !== undefined) counts[t.status]++;
                    else counts.pending++;
                  });

                  const total = userTasks.length;
                  const donePct = total > 0 ? Math.round((counts.done / total) * 100) : 0;

                  const doughnutData = [
                    { label: 'Pending', value: counts.pending, color: '#94a3b8' },
                    { label: 'Current', value: counts.current, color: '#3b82f6' },
                    { label: 'Preview', value: counts.preview, color: '#f59e0b' },
                    { label: 'Done', value: counts.done, color: '#b7d333' }
                  ];

                  return (
                    <div className="space-y-8">
                      {/* Attendance Card */}
                      {todayRecord ? (
                        <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Checked In</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatTime(todayRecord.check_in_time)}</span>
                          </div>
                          <div className="space-y-1 sm:border-x border-slate-200/50 dark:border-slate-800/50 sm:px-4 max-sm:border-y max-sm:py-3 px-0">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Checked Out</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                              {todayRecord.check_out_time ? formatTime(todayRecord.check_out_time) : (
                                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="space-y-1 sm:pl-2">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Work Hours</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{getWorkHours(todayRecord)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <AlertCircle size={14} className="text-slate-400" />
                          <span>Staff has not checked in today.</span>
                        </div>
                      )}

                      {/* Overall Progress */}
                      <div className="flex flex-col md:flex-row items-center gap-8 justify-center">
                        <DoughnutChart data={doughnutData} />
                        
                        <div className="space-y-4 w-full md:w-auto">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                              <p className="text-xs font-semibold text-slate-500 uppercase">Completion Rate</p>
                              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{donePct}%</p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                              <p className="text-xs font-semibold text-slate-500 uppercase">Total Tasks</p>
                              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{total}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/50">
                              <span className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400"><div className="w-2 h-2 rounded-sm bg-slate-300 dark:bg-slate-600" /> Pending</span>
                              <span className="font-bold text-sm text-slate-900 dark:text-white">{counts.pending}</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/50">
                              <span className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400"><div className="w-2 h-2 rounded-sm bg-blue-500" /> Current</span>
                              <span className="font-bold text-sm text-slate-900 dark:text-white">{counts.current}</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/50">
                              <span className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400"><div className="w-2 h-2 rounded-sm bg-amber-500" /> Preview</span>
                              <span className="font-bold text-sm text-slate-900 dark:text-white">{counts.preview}</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/50">
                              <span className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400"><div className="w-2 h-2 rounded-sm bg-emerald-500" /> Done</span>
                              <span className="font-bold text-sm text-slate-900 dark:text-white">{counts.done}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Task List */}
                      {userTasks.length > 0 && (
                        <div className="mt-8 border-t border-slate-200/50 dark:border-slate-800/50 pt-6">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Task Details</h3>
                          <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                            {userTasks.map(task => (
                              <div key={task._id} className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                                <div className="flex justify-between items-start gap-4">
                                  <div>
                                    <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{task.title || 'Untitled Task'}</h4>

                                    {task.dueDate && (
                                      <p className={`text-[10px] font-bold mt-1 ${(new Date(task.dueDate) - new Date()) <= 24 * 60 * 60 * 1000 && task.status !== 'done' ? 'text-rose-500' : 'text-slate-500'}`}>
                                        Due: {new Date(task.dueDate).toLocaleDateString()}
                                      </p>
                                    )}

                                    {task.description && (
                                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                                    )}
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap border
                                    ${task.status === 'done' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' :
                                      task.status === 'current' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400' :
                                      task.status === 'preview' ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400' :
                                      'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}
                                  >
                                    {task.status || 'pending'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
