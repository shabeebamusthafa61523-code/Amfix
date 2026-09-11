import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Clock, 
  Calendar, 
  Search, 
  User, 
  MapPin, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Users,
  Building,
  Timer,
  Pencil,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const rawApiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const API_BASE = rawApiBase.endsWith('/v1') ? rawApiBase : `${rawApiBase}/v1`;

const getStoredToken = () => {
  const rawToken = localStorage.getItem('token');
  return rawToken ? rawToken.replace(/^"(.*)"$/, '$1').replace(/"/g, '').replace(/^Bearer\s+/i, '').trim() : '';
};

const formatISTTime = (isoString) => {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (err) {
    return '--:--';
  }
};

const formatDateHeader = (dateStr) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
    }
  } catch (e) {}
  return dateStr;
};

const EditAttendanceModal = ({ record, onClose, onSave }) => {
  const [status, setStatus] = useState(record.status || 'PRESENT');
  const [checkInTime, setCheckInTime] = useState(() => {
    if (!record.check_in_time) return '';
    try {
      const d = new Date(record.check_in_time);
      if (isNaN(d.getTime())) return '';
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (e) {
      return '';
    }
  });
  const [checkOutTime, setCheckOutTime] = useState(() => {
    if (!record.check_out_time) return '';
    try {
      const d = new Date(record.check_out_time);
      if (isNaN(d.getTime())) return '';
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (e) {
      return '';
    }
  });
  const [isLate, setIsLate] = useState(!!record.is_late);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(record.id || record._id, {
      status,
      check_in_time: checkInTime,
      check_out_time: checkOutTime,
      is_late: isLate
    });
    setSaving(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
      />

      {/* Modal Dialog Content */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative my-auto z-10"
      >
        <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <X size={18} />
        </button>
        
        <div className="text-center mb-6 pr-6 pl-6">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 mb-1">Edit Attendance Log</h3>
          <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider">{record.user?.name || 'User'} · {record.date}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500">
              <option value="PRESENT">PRESENT</option>
              <option value="ABSENT">ABSENT</option>
              <option value="HALF_DAY">HALF DAY</option>
              <option value="LEAVE">LEAVE</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Check-In Time</label>
              <input type="time" value={checkInTime} onChange={e => setCheckInTime(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Check-Out Time</label>
              <input type="time" value={checkOutTime} onChange={e => setCheckOutTime(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500" />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="is_late_cb" checked={isLate} onChange={e => setIsLate(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
            <label htmlFor="is_late_cb" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Mark as Late Arrival</label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 uppercase tracking-wider cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
};

export default function AttendanceLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grouped'
  const [showFilters, setShowFilters] = useState(false);
  
  // Users list for dropdown
  const [usersList, setUsersList] = useState([]);
  
  // Expanded Date Groups in Grouped View
  const [expandedDates, setExpandedDates] = useState({});

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState(null);

  // Summary Metrics State
  const [summary, setSummary] = useState({
    totalRecords: 0,
    totalPresent: 0,
    totalLate: 0,
    totalHours: '0.00',
    avgHours: '0.00'
  });

  const handleSaveRecord = async (recordId, updatePayload) => {
    try {
      const res = await fetch(`${API_BASE}/attendance/${recordId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updatePayload)
      });
      const data = await res.json();
      if (res.ok || data.success) {
        setEditingRecord(null);
        await fetchAttendanceLogs();
      } else {
        alert(data.message || data.error || 'Failed to update attendance log.');
      }
    } catch (err) {
      console.error('Error updating log:', err);
      alert('Error updating attendance record.');
    }
  };

  const getHeaders = () => {
    const token = getStoredToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  // Fetch Users for Filter Dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE}/users`, { headers: getHeaders() });
        const data = await res.json();
        const rawData = data?.data || data || [];
        if (Array.isArray(rawData)) {
          setUsersList(rawData);
        }
      } catch (err) {
        console.warn('Failed to fetch users list for attendance filter:', err);
      }
    };
    fetchUsers();
  }, []);

  // Fetch Attendance Logs from Backend
  const fetchAttendanceLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedUser) params.append('userId', selectedUser);
      if (selectedStatus && selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (searchQuery) params.append('search', searchQuery);
      if (sortOrder) params.append('sortOrder', sortOrder);
      if (sortBy) params.append('sortBy', sortBy);

      const res = await fetch(`${API_BASE}/attendance/logs?${params.toString()}`, { headers: getHeaders() });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to fetch attendance logs');
      }

      const records = data?.data || [];
      setLogs(records);

      if (data?.summary) {
        setSummary(data.summary);
      }

      // Auto expand top date in grouped view
      if (records.length > 0) {
        const firstDate = records[0].date;
        setExpandedDates(prev => ({ ...prev, [firstDate]: true }));
      }

    } catch (err) {
      console.error('Error fetching attendance logs:', err);
      setError(err.message || 'Failed to load attendance logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceLogs();
  }, [startDate, endDate, selectedUser, selectedStatus, sortOrder, sortBy]);

  // Handle Quick Date Range Presets
  const applyDatePreset = (preset) => {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      const todayStr = formatDate(today);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = formatDate(y);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'last7') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      setStartDate(formatDate(past));
      setEndDate(formatDate(today));
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(today));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Toggle Date-Wise Sort Order (Descending / Ascending)
  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
  };

  // Local Filtered & Grouped Records
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase().trim();
    return logs.filter(item => {
      const uName = item.user?.name || '';
      const uEmail = item.user?.email || '';
      const uEmpId = item.user?.employeeId || '';
      const dateStr = item.date || '';
      return uName.toLowerCase().includes(q) || 
             uEmail.toLowerCase().includes(q) || 
             uEmpId.toLowerCase().includes(q) ||
             dateStr.includes(q);
    });
  }, [logs, searchQuery]);

  const activeFilterCount = useMemo(() => {
    return [
      startDate,
      endDate,
      selectedUser,
      selectedStatus !== 'ALL' ? selectedStatus : null,
      searchQuery.trim()
    ].filter(Boolean).length;
  }, [startDate, endDate, selectedUser, selectedStatus, searchQuery]);

  // Group Records By Date for Everyday Grouped View
  const groupedByDate = useMemo(() => {
    const groups = {};
    filteredLogs.forEach(record => {
      const d = record.date || 'Unknown Date';
      if (!groups[d]) {
        groups[d] = [];
      }
      groups[d].push(record);
    });
    return groups;
  }, [filteredLogs]);

  // CSV Export
  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Date', 'Employee Name', 'Employee ID', 'Email', 'Login Time', 'Logout Time', 'Working Hours (Hrs)', 'Late', 'Distance from Office (m)', 'Latitude', 'Longitude', 'Status'];
    const rows = filteredLogs.map(item => [
      item.date || '',
      item.user?.name || 'N/A',
      item.user?.employeeId || 'N/A',
      item.user?.email || 'N/A',
      formatISTTime(item.check_in_time),
      formatISTTime(item.check_out_time),
      item.working_hours || '0.00',
      item.is_late ? 'Yes' : 'No',
      item.distance_from_office_meters !== null ? item.distance_from_office_meters : 'N/A',
      item.check_in_latitude || '',
      item.check_in_longitude || '',
      item.status || 'UNMARKED'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleGroupExpand = (dateKey) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 font-sans">
      
      {/* Top Header */}
      <div className="max-w-7xl mx-auto space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="space-y-1 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
              <Clock size={11} /> Everyday Verification Node
            </div>
            <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-slate-900 dark:text-slate-100">
              Attendance <span className="text-indigo-600">Logs & Details</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 relative z-10">
            {/* Filter & Sort Toggle Button */}
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                showFilters || activeFilterCount > 0
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Filter size={14} /> Filter & Sort {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-indigo-600 text-[10px] flex items-center justify-center font-black ml-0.5 shadow-sm">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Quick Date Sort Order Button */}
            <button
              onClick={toggleSortOrder}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Toggle Date Sorting Order"
            >
              {sortOrder === 'desc' ? <ArrowDown size={14} className="text-indigo-500" /> : <ArrowUp size={14} className="text-indigo-500" />}
              <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <FileSpreadsheet size={14} /> Export CSV
            </button>

            <button
              onClick={fetchAttendanceLogs}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95"
              title="Refresh Logs"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Summary Metric KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center flex-shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Records</p>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">{summary.totalRecords}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Verified Present</p>
              <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight">{summary.totalPresent}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Late Arrivals</p>
              <h3 className="text-lg font-black text-amber-600 dark:text-amber-400 leading-tight">{summary.totalLate}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900 flex items-center justify-center flex-shrink-0">
              <Timer size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Hours</p>
              <h3 className="text-lg font-black text-blue-600 dark:text-blue-400 leading-tight">{summary.totalHours} <span className="text-[10px] font-bold text-slate-400">hrs</span></h3>
            </div>
          </div>

        </div>

        {/* Collapsible Filter Controls Drawer */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-md space-y-3 overflow-hidden"
            >
              
              {/* Quick Date Presets */}
              <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2 flex items-center gap-1">
                  <Filter size={12} /> Date Range Presets:
                </span>
                <button onClick={() => applyDatePreset('today')} className="px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer">
                  Today
                </button>
                <button onClick={() => applyDatePreset('yesterday')} className="px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer">
                  Yesterday
                </button>
                <button onClick={() => applyDatePreset('last7')} className="px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer">
                  Last 7 Days
                </button>
                <button onClick={() => applyDatePreset('thisMonth')} className="px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer">
                  This Month
                </button>
                <button onClick={() => applyDatePreset('all')} className="px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer">
                  All Dates
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                
                {/* Start Date */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                  />
                </div>

                {/* User Dropdown */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Employee / User</label>
                  <select
                    value={selectedUser}
                    onChange={e => setSelectedUser(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="">All Employees / Users</option>
                    {usersList.map(u => {
                      const hasUniqueEmpId = u.employeeId && u.employeeId !== u.email;
                      return (
                        <option key={u._id || u.id} value={u._id || u.id}>
                          {u.name} {hasUniqueEmpId ? `(${u.employeeId} • ${u.email})` : `(${u.email || u.employeeId || 'No Email'})`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Status Dropdown */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PRESENT">Present</option>
                    <option value="LATE">Late Arrivals</option>
                  </select>
                </div>

                {/* Search Input */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Search Record</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                      type="text"
                      placeholder="Search name, email..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-8 pr-3 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* View Mode Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">View Format:</span>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Full Logs Table
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === 'grouped' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Everyday Date Groups
              </button>
            </div>
          </div>

          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Showing {filteredLogs.length} Records
          </span>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-16 rounded-[2.5rem] shadow-xl text-center space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Fetching verified attendance records...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-8 rounded-[2.5rem] text-center space-y-3">
            <AlertCircle size={36} className="text-red-500 mx-auto" />
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400">Failed to load attendance logs</h3>
            <p className="text-xs text-red-500">{error}</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-16 rounded-[2.5rem] shadow-xl text-center space-y-4">
            <Calendar size={48} className="text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No attendance logs found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">Try selecting a different date range or adjusting your search filters.</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* VIEW MODE 1: Full Logs Table */}
            {viewMode === 'table' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee / User</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Login Time (In)</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Logout Time (Out)</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Working Hours</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Location & Office Distance</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {filteredLogs.map(item => {
                        const imgUrl = item.user?.profile_image;
                        const hasCoords = item.check_in_latitude !== null && item.check_in_longitude !== null;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-950/40 transition-colors">
                            
                            {/* Date */}
                            <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                              {item.date}
                            </td>

                            {/* User Profile */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 flex-shrink-0 overflow-hidden">
                                  {imgUrl ? (
                                    <img src={imgUrl} alt={item.user?.name} className="w-full h-full object-cover" />
                                  ) : (
                                    item.user?.name ? item.user.name.charAt(0).toUpperCase() : '?'
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100 truncate">
                                    {item.user?.name || 'Unknown User'}
                                  </h4>
                                  <p className="text-[10px] text-slate-400 font-semibold truncate">
                                    {item.user?.email || 'N/A'}{item.user?.employeeId && item.user.employeeId !== item.user?.email ? ` • ${item.user.employeeId}` : ''}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Check-In Time */}
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                                <Clock size={12} /> {formatISTTime(item.check_in_time)}
                              </span>
                            </td>

                            {/* Check-Out Time */}
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              {item.check_out_time ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                                  <Clock size={12} /> {formatISTTime(item.check_out_time)}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-800/40">
                                  Active Session
                                </span>
                              )}
                            </td>

                            {/* Working Hours */}
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              <span className="font-mono text-xs font-black text-slate-900 dark:text-slate-100">
                                {item.working_hours || '0.00'} <span className="text-[10px] font-bold text-slate-400">hrs</span>
                              </span>
                              {parseFloat(item.overtime) > 0 && (
                                <p className="text-[9px] text-indigo-500 font-bold mt-0.5">+ {item.overtime} OT</p>
                              )}
                            </td>

                            {/* Location & Office Distance */}
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              {hasCoords ? (
                                <a
                                  href={`https://www.google.com/maps?q=${item.check_in_latitude},${item.check_in_longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all"
                                  title={`Coords: ${item.check_in_latitude}, ${item.check_in_longitude}`}
                                >
                                  <MapPin size={12} className="text-indigo-500" />
                                  {item.distance_from_office_meters !== null 
                                    ? `${item.distance_from_office_meters}m Office` 
                                    : 'GPS Verified'}
                                  <ExternalLink size={10} />
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold italic">Manual / Default</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5 group/row">
                                <button
                                  onClick={() => setEditingRecord(item)}
                                  title="Edit Attendance Record"
                                  className="opacity-0 group-hover/row:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-all cursor-pointer mr-1"
                                >
                                  <Pencil size={13} />
                                </button>
                                {item.is_late && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    Late
                                  </span>
                                )}
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  item.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-500'
                                }`}>
                                  {item.status || 'PRESENT'}
                                </span>
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* VIEW MODE 2: Everyday Date Groups */}
            {viewMode === 'grouped' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                {Object.keys(groupedByDate).map(dateKey => {
                  const dayRecords = groupedByDate[dateKey];
                  const isExpanded = !!expandedDates[dateKey];
                  const formattedHeader = formatDateHeader(dateKey);

                  return (
                    <div key={dateKey} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden transition-all">
                      
                      {/* Date Group Header Bar */}
                      <div
                        onClick={() => toggleGroupExpand(dateKey)}
                        className="p-6 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors border-b border-slate-200 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-mono text-xs font-black flex items-center justify-center shadow-md">
                            <Calendar size={20} />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                              {dateKey} <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 italic">({formattedHeader})</span>
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              {dayRecords.length} Verified Attendance Logs
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            {dayRecords.filter(r => r.status === 'PRESENT').length} Present
                          </span>
                          <button className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300">
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Grouped Logs */}
                      {isExpanded && (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {dayRecords.map(item => (
                            <div key={item.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                              
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 flex-shrink-0 overflow-hidden">
                                  {item.user?.profile_image ? (
                                    <img src={item.user.profile_image} alt={item.user?.name} className="w-full h-full object-cover" />
                                  ) : (
                                    item.user?.name ? item.user.name.charAt(0).toUpperCase() : '?'
                                  )}
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold uppercase text-slate-900 dark:text-slate-100">{item.user?.name || 'Unknown User'}</h4>
                                  <p className="text-[10px] text-slate-400 font-semibold">{item.user?.email || 'N/A'}{item.user?.employeeId && item.user.employeeId !== item.user?.email ? ` • ${item.user.employeeId}` : ''}</p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-xs font-mono group/grow">
                                <div>
                                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Login (Check-In)</span>
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatISTTime(item.check_in_time)}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Logout (Check-Out)</span>
                                  <span className="font-bold text-blue-600 dark:text-blue-400">{formatISTTime(item.check_out_time)}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Work Duration</span>
                                  <span className="font-bold text-slate-900 dark:text-slate-100">{item.working_hours || '0.00'} hrs</span>
                                </div>
                                <button
                                  onClick={() => setEditingRecord(item)}
                                  title="Edit Attendance Record"
                                  className="opacity-0 group-hover/grow:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-all cursor-pointer ml-2"
                                >
                                  <Pencil size={13} />
                                </button>
                              </div>

                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  );
                })}
              </motion.div>
            )}

          </AnimatePresence>
        )}

      </div>

      {/* Edit Attendance Modal */}
      <AnimatePresence>
        {editingRecord && (
          <EditAttendanceModal
            record={editingRecord}
            onClose={() => setEditingRecord(null)}
            onSave={handleSaveRecord}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
