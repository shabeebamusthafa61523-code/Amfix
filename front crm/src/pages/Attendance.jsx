// ===============================
// FRONTEND: Attendance.jsx
// ===============================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  LogIn,
  LogOut,
  History,
  ShieldCheck,
  Timer,
  Loader2,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL;
// ===============================
// HELPERS
// ===============================

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const getISTDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata'
  }).format(new Date());
};

const parseAsUTC = (dateInput) => {
  if (!dateInput) return null;

  if (dateInput instanceof Date) {
    return dateInput;
  }

  const value = String(dateInput);

  return new Date(value.endsWith('Z') ? value : `${value}Z`);
};

const formatToISTFull = (dateInput) => {
  if (!dateInput) return '---';

  try {
    return parseAsUTC(dateInput).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).toUpperCase();
  } catch {
    return '---';
  }
};

const formatTime = (dateInput) => {
  if (!dateInput) return '---';

  try {
    return parseAsUTC(dateInput).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '---';
  }
};

const calculateWorkingHours = (checkIn, checkOut) => {
  if (!checkIn) return "0.00";

  const start = parseAsUTC(checkIn);
  const end = checkOut ? parseAsUTC(checkOut) : new Date();

  return Math.max(
    0,
    (end.getTime() - start.getTime()) / 3600000
  ).toFixed(2);
};

const calculateWorkingMinutes = (checkIn, checkOut) => {
  if (!checkIn) return 0;

  const start = parseAsUTC(checkIn);
  const end = checkOut ? parseAsUTC(checkOut) : new Date();

  return Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60000)
  );
};

const formatAccruedMinutes = (checkIn, checkOut) => {
  const totalMins = calculateWorkingMinutes(checkIn, checkOut);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs > 0) {
    return `${totalMins} MINS (${hrs}h ${mins}m)`;
  }
  return `${totalMins} MINS`;
};

// ===============================
// LIVE CLOCK
// ===============================

const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <div className="flex items-baseline gap-3 mb-2">
        <div className="text-6xl lg:text-7xl font-black text-slate-900 dark:text-slate-100 italic tracking-tighter leading-none select-none">
          {time.getHours().toString().padStart(2, '0')}
          <span className="animate-pulse text-indigo-500">:</span>
          {time.getMinutes().toString().padStart(2, '0')}
        </div>

        <div className="text-xl lg:text-2xl font-mono text-indigo-500/50 font-bold w-10">
          {time.getSeconds().toString().padStart(2, '0')}
        </div>
      </div>

      <p className="text-[10px] tracking-[0.4em] text-slate-600 dark:text-slate-400 font-black uppercase mb-6">
        Universal Time Protocol
      </p>
    </>
  );
};

// ===============================
// MAIN COMPONENT
// ===============================

const Attendance = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const userObj = JSON.parse(savedUser);
        const currentUserRole = String(userObj.role_id || userObj.roleId || userObj.role || '').toLowerCase().trim();
        const isAdmin = ['1', '2', 'hr', 'admin'].includes(currentUserRole);
        if (isAdmin) {
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error("Failed to parse user for admin check:", err);
      }
    }
  }, [navigate]);

  const [todayLog, setTodayLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Calendar and Selected Date States
  const [selectedDate, setSelectedDate] = useState(getISTDate());
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [showCalendar, setShowCalendar] = useState(false);

  const prevMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 0) {
        setCalendarYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const nextMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 11) {
        setCalendarYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const daysInMonth = useMemo(() => {
    return new Date(calendarYear, calendarMonth + 1, 0).getDate();
  }, [calendarYear, calendarMonth]);

  const firstDayIndex = useMemo(() => {
    return new Date(calendarYear, calendarMonth, 1).getDay();
  }, [calendarYear, calendarMonth]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getHeaders = () => {
    const rawToken = localStorage.getItem('token');
    const token = rawToken ? rawToken.replace(/"/g, '') : '';

    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);

      const todayStr = getISTDate();

      const response = await fetch(
        `${API_BASE}/attendance/${todayStr}`,
        {
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        setTodayLog(null);
        return;
      }

      const data = await response.json();

      setTodayLog(data || null);
    } catch {
      setError("System Sync Failed");
      setTodayLog(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const fetchSelectedDateStatus = useCallback(async (dateStr) => {
    try {
      setSelectedLoading(true);
      const response = await fetch(
        `${API_BASE}/attendance/${dateStr}`,
        {
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        setSelectedLog(null);
        return;
      }

      const data = await response.json();
      setSelectedLog(data || null);
    } catch {
      setSelectedLog(null);
    } finally {
      setSelectedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSelectedDateStatus(selectedDate);
  }, [selectedDate, fetchSelectedDateStatus]);

  const getCurrentPositionPromise = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error("Geolocation is not supported by your browser."));
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => {
          let msg = "Could not fetch your location.";
          if (err.code === 1) {
            msg = "Location access denied. Please allow location permissions in your browser to check in at the office.";
          } else if (err.code === 2) {
            msg = "Location unavailable. Please ensure GPS/location service is enabled on your device.";
          } else if (err.code === 3) {
            msg = "Location request timed out. Please try again.";
          }
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleAction = async (type) => {
    setError(null);
    setSuccessMsg(null);
    setActionLoading(true);

    try {
      let bodyData = {};

      if (type === 'check-in' || type === 'check-out') {
        const coords = await getCurrentPositionPromise();
        bodyData = {
          latitude: coords.latitude,
          longitude: coords.longitude
        };
      }

      const response = await fetch(
        `${API_BASE}/attendance/${type}`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(bodyData)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Action denied");
      }

      setSuccessMsg(`${type.replace('-', ' ')} successful!`);

      await fetchStatus();
      if (selectedDate === getISTDate()) {
        fetchSelectedDateStatus(selectedDate);
      }

      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);

    } catch (err) {
      setError(err.message);

      setTimeout(() => {
        setError(null);
      }, 7000);
    } finally {
      setActionLoading(false);
    }
  };

  const liveWorkingMinutes = useMemo(() => {
    if (!todayLog?.check_in_time) return 0;

    if (todayLog?.check_out_time) {
      return calculateWorkingMinutes(
        todayLog.check_in_time,
        todayLog.check_out_time
      );
    }

    return calculateWorkingMinutes(
      todayLog.check_in_time,
      currentTime
    );
  }, [todayLog, currentTime]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0c10] flex items-center justify-center">
        <Loader2 className="text-indigo-500 animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 text-slate-600 dark:text-slate-200 font-sans max-h-screen overflow-y-auto lg:overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <header className="flex justify-between items-end mb-4">
          <div>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-100 italic tracking-tighter leading-none"
            >
              STAFF.
              <span className="text-indigo-500">
                LOG
              </span>
            </motion.h2>

            <div className="flex items-center gap-2 mt-2">
              <div
                className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                  todayLog?.check_in_time && !todayLog?.check_out_time
                    ? 'bg-emerald-500'
                    : 'bg-red-500'
                }`}
              />

              <p className="text-[10px] font-bold uppercase tracking-[0.4em]">
                Network Status:
                <span className="ml-2">
                  {todayLog?.check_in_time &&
                  !todayLog?.check_out_time
                    ? 'SECURE_ONLINE'
                    : 'TERMINATED'}
                </span>
              </p>
            </div>
          </div>

          <div className="hidden md:block bg-white dark:bg-slate-900 px-5 py-2.5 rounded-xl border text-xs font-bold shadow-xs">
            {currentTime.toLocaleDateString('en-IN', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              timeZone: 'Asia/Kolkata'
            }).toUpperCase()}
          </div>
        </header>

        <AnimatePresence mode="wait">

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-4"
            >
              <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-[10px] font-black uppercase tracking-widest">
                <AlertTriangle size={14} />
                {error}
              </div>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-4"
            >
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                <CheckCircle2 size={14} />
                {successMsg}
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT */}
          <div className="lg:col-span-8 space-y-6">

            {/* MAIN */}
            <div className="relative group">
              <div className="relative bg-white dark:bg-slate-900 border rounded-3xl p-6 lg:p-8 flex flex-col items-center overflow-hidden shadow-lg">

                <Fingerprint className="absolute -bottom-10 -right-10 text-slate-100 dark:text-slate-950/20 w-48 h-48 -rotate-12" />

                <LiveClock />

                <div className="grid grid-cols-2 gap-4 w-full max-w-sm relative z-10">

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={
                      actionLoading ||
                      (todayLog?.check_in_time &&
                        !todayLog?.check_out_time)
                    }
                    onClick={() => handleAction('check-in')}
                    className="bg-emerald-500 disabled:opacity-30 hover:bg-emerald-600 p-4 rounded-2xl text-slate-900 font-bold flex flex-col items-center gap-2 cursor-pointer"
                  >
                    <LogIn size={20} />
                    <span className="text-xs uppercase tracking-widest">
                      Login
                    </span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={
                      actionLoading ||
                      !todayLog?.check_in_time ||
                      todayLog?.check_out_time
                    }
                    onClick={() => handleAction('check-out')}
                    className="bg-red-500 disabled:opacity-30 hover:bg-red-600 p-4 rounded-2xl text-white font-bold flex flex-col items-center gap-2 cursor-pointer"
                  >
                    <LogOut size={20} />
                    <span className="text-xs uppercase tracking-widest">
                      Logout
                    </span>
                  </motion.button>

                </div>
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              <StatBlock
                label="Session Date"
                value={todayLog?.date || getISTDate()}
                icon={History}
                color="text-slate-400"
              />

              <StatBlock
                label="In Time"
                value={formatTime(todayLog?.check_in_time)}
                icon={Clock}
                color="text-indigo-400"
              />

              <StatBlock
                label="Work Minutes"
                value={`${liveWorkingMinutes} MINS`}
                icon={Timer}
                color="text-emerald-400"
              />

              <StatBlock
                label="Status"
                value={
                  todayLog?.is_late
                    ? "LATE_ENTRY"
                    : "OPTIMAL"
                }
                icon={Activity}
                color={
                  todayLog?.is_late
                    ? "text-orange-500"
                    : "text-indigo-400"
                }
              />

            </div>

          </div>

          {/* RIGHT */}
          <aside className="lg:col-span-4">
            
            {/* SELECTED DATE DETAILS & DROPDOWN CALENDAR */}
            <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm relative">
              
              <div className="flex justify-between items-center mb-4 relative">
                <h2 className="text-[10px] font-black tracking-[0.3em] text-indigo-500 uppercase">
                  Registry Logs
                </h2>
                
                {/* Date Dropdown Button */}
                <div className="relative">
                  <button 
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-all"
                  >
                    <Calendar size={13} className="text-indigo-500" />
                    <span>{selectedDate === getISTDate() ? 'Today' : selectedDate}</span>
                  </button>

                  {/* Dropdown Calendar Popup */}
                  {showCalendar && (
                    <>
                      {/* Invisible backdrop to close dropdown on click outside */}
                      <div 
                        className="fixed inset-0 z-40 cursor-default" 
                        onClick={() => setShowCalendar(false)}
                      />
                      
                      <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl z-50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black uppercase text-indigo-500">Select Date</span>
                          <div className="flex gap-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); prevMonth(); }} 
                              className="p-1 hover:bg-slate-105 dark:hover:bg-slate-900 rounded text-slate-600 dark:text-slate-400 cursor-pointer"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); nextMonth(); }} 
                              className="p-1 hover:bg-slate-105 dark:hover:bg-slate-900 rounded text-slate-600 dark:text-slate-400 cursor-pointer"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="text-center font-bold text-slate-800 dark:text-slate-200 mb-2 text-xs">
                          {MONTH_NAMES[calendarMonth]} {calendarYear}
                        </div>

                        <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1">
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                            <div key={d} className="py-0.5">{d}</div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-0.5">
                          {Array.from({ length: firstDayIndex }).map((_, i) => (
                            <div key={`empty-${i}`} />
                          ))}
                          
                          {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const dateStr = `${calendarYear}-${(calendarMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                            const isSelected = dateStr === selectedDate;
                            const isToday = dateStr === getISTDate();

                            return (
                              <button
                                key={day}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(dateStr);
                                  setShowCalendar(false);
                                }}
                                className={`text-[11px] p-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                  isSelected 
                                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' 
                                    : isToday
                                      ? 'border border-indigo-500/50 text-indigo-500 hover:bg-indigo-500/10'
                                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {selectedLoading ? (
                <div className="py-8 flex justify-center items-center">
                  <Loader2 className="text-indigo-500 animate-spin" size={24} />
                </div>
              ) : selectedLog ? (
                <div className="space-y-6">
                  <DetailRow
                    label="System Check-In"
                    value={formatToISTFull(selectedLog.check_in_time)}
                  />

                  <DetailRow
                    label="System Check-Out"
                    value={formatToISTFull(selectedLog.check_out_time)}
                  />

                  <DetailRow
                    label="Accrued Minutes"
                    value={formatAccruedMinutes(selectedLog.check_in_time, selectedLog.check_out_time)}
                  />

                  <DetailRow
                    label="Entry Status"
                    value={selectedLog.is_late ? "LATE_ENTRY" : "OPTIMAL"}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock size={24} className="mx-auto text-slate-350 dark:text-slate-650 mb-2" />
                  <p className="text-xs text-slate-550 dark:text-slate-450 font-medium">No record for this date.</p>
                </div>
              )}

            </div>
          </aside>

        </div>
      </div>
    </div>
  );
};

const StatBlock = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white dark:bg-slate-900 border p-4 rounded-2xl shadow-xs">
    <Icon size={16} className={`mb-2 ${color}`} />

    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-1">
      {label}
    </p>

    <p className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
      {value}
    </p>
  </div>
);

const DetailRow = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
      {label}
    </p>

    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
      {value}
    </p>
  </div>
);

export default Attendance;