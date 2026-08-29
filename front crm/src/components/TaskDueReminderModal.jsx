import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertCircle, ArrowRight, X, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './ToastProvider';
import { playNotificationBeep } from '../utils/soundUtils';

const rawApiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const API_BASE = rawApiBase.endsWith('/v1') ? rawApiBase : `${rawApiBase}/v1`;

const formatTimeDisplay = (dVal) => {
  if (!dVal) return '';
  try {
    const d = new Date(dVal);
    if (isNaN(d.getTime())) return '';
    const dateStr = d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} ${timeStr}`;
  } catch (e) {
    return '';
  }
};

const TaskDueReminderModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dueTask, setDueTask] = useState(null);
  const [minsLeft, setMinsLeft] = useState(0);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const getCurrentUserId = () => {
    try {
      const saved = localStorage.getItem('user');
      if (saved) {
        const u = JSON.parse(saved);
        return (u._id || u.id || '').toString().trim();
      }
      const rawToken = localStorage.getItem('token');
      if (rawToken) {
        const payload = JSON.parse(atob(rawToken.split('.')[1]));
        return (payload.id || payload._id || payload.user_id || '').toString().trim();
      }
    } catch (e) {
      console.warn("Error resolving current user ID:", e.message);
    }
    return '';
  };

  const dispatchNotifications = useCallback(async (task, minutesRemaining) => {
    const taskId = task.id || task._id;
    const reminderKey = `task_due_reminded_${taskId}`;
    if (sessionStorage.getItem(reminderKey)) return;
    sessionStorage.setItem(reminderKey, 'true');

    const formattedTime = formatTimeDisplay(task.dueDate);

    // 1. Dispatch Web Browser Push Notification
    try {
      if ('Notification' in window) {
        const notifBody = `Task "${task.title}" is due in ${minutesRemaining} minutes (${formattedTime}).`;
        if (Notification.permission === 'granted') {
          new Notification('⏰ Task Due Soon Reminder!', {
            body: notifBody,
            icon: '/logo2.png',
            tag: `task_due_${taskId}`
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(perm => {
            if (perm === 'granted') {
              new Notification('⏰ Task Due Soon Reminder!', {
                body: notifBody,
                icon: '/logo2.png',
                tag: `task_due_${taskId}`
              });
            }
          });
        }
      }
    } catch (pushErr) {
      console.warn("Task due browser push error:", pushErr.message);
    }

    // 2. Dispatch In-App Database Notification
    try {
      const rawToken = localStorage.getItem('token') || '';
      const cleanToken = rawToken.replace(/"/g, '').trim();
      const authHeader = cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`;

      const rawBase = API_BASE.replace(/\/+$/, '');
      const url = rawBase.endsWith('/v1') ? `${rawBase}/notifications` : `${rawBase}/v1/notifications`;
      const currentUserId = getCurrentUserId();
      const assigneeId = (typeof task.assigned_to === 'object' && task.assigned_to)
        ? (task.assigned_to._id || task.assigned_to.id || '').toString().trim()
        : String(task.assigned_to || '').trim();
      const targetUserId = assigneeId || currentUserId;

      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: '⏰ Task Due Soon Reminder',
          description: `Your assigned task "${task.title}" is due in ${minutesRemaining} minutes at ${formattedTime}.`,
          assignedTo: [targetUserId],
          type: 'warning'
        })
      });
    } catch (inAppErr) {
      console.warn("Task due in-app notification error:", inAppErr.message);
    }
  }, []);

  const checkTaskDueTimes = useCallback(async () => {
    try {
      const currentUserId = getCurrentUserId();
      const rawToken = localStorage.getItem('token');
      if (!currentUserId || !rawToken) return true;

      const cleanToken = rawToken.replace(/"/g, '').trim();
      const authHeader = cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${API_BASE}/tasks/all`, {
        headers: { 'Authorization': authHeader },
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));

      if (!res.ok) {
        console.warn(`Error checking task due times: HTTP ${res.status}`);
        return false;
      }

      const data = await res.json();
      const tasksList = Array.isArray(data) ? data : (data.tasks || data.data || []);
      const now = Date.now();

      const matchesAssignee = (assigned, userId) => {
        const list = Array.isArray(assigned) ? assigned : (assigned ? [assigned] : []);
        return list.some((item) => {
          const assigneeId = (typeof item === 'object' && item)
            ? String(item._id || item.id || '').trim()
            : String(item || '').trim();
          return assigneeId === userId;
        });
      };

      for (const t of tasksList) {
        if (!t.dueDate || t.status === 'done') continue;

        if (!matchesAssignee(t.assigned_to, currentUserId)) continue;

        const dueTimestamp = new Date(t.dueDate).getTime();
        if (isNaN(dueTimestamp)) continue;

        const diffMs = dueTimestamp - now;
        const diffMinutes = Math.ceil(diffMs / 60000);

        // Alert window: 0 to 10 minutes before due time
        if (diffMs > 0 && diffMs <= 10 * 60 * 1000) {
          const taskId = t.id || t._id;
          const reminderKey = `task_due_reminded_${taskId}`;

          if (!sessionStorage.getItem(reminderKey)) {
            setDueTask(t);
            setMinsLeft(diffMinutes);
            playNotificationBeep();
            setIsOpen(true);
            dispatchNotifications(t, diffMinutes);
            break; // Show one modal at a time
          }
        }
      }

      return true;
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        return true;
      }
      console.warn("Error checking task due times:", err.message);
      return false;
    }
  }, [dispatchNotifications]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;
    let inFlight = false;
    let consecutiveFailures = 0;
    const BASE_INTERVAL_MS = 30000;
    const MAX_BACKOFF_MS = 5 * 60 * 1000;

    const scheduleNext = (delay) => {
      if (cancelled) return;
      timeoutId = setTimeout(runCheck, delay);
    };

    const runCheck = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      const ok = await checkTaskDueTimes();
      inFlight = false;

      if (ok) {
        consecutiveFailures = 0;
        scheduleNext(BASE_INTERVAL_MS);
        return;
      }

      consecutiveFailures += 1;
      const backoff = Math.min(BASE_INTERVAL_MS * 2 ** consecutiveFailures, MAX_BACKOFF_MS);
      scheduleNext(backoff);
    };

    runCheck();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [checkTaskDueTimes]);

  const handleGoToTask = () => {
    setIsOpen(false);
    navigate('/todo');
  };

  const handleDismiss = () => {
    if (dueTask) {
      const taskId = dueTask.id || dueTask._id;
      sessionStorage.setItem(`task_due_reminded_${taskId}`, 'true');
    }
    setIsOpen(false);
    showToast("Task due reminder dismissed.", "info");
  };

  if (!isOpen || !dueTask) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-3xl p-6 shadow-2xl overflow-hidden"
        >
          {/* Decorative Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Close / Dismiss Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Dismiss"
          >
            <X size={18} />
          </button>

          {/* Content */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-inner animate-pulse">
              <Clock size={24} />
            </div>

            <div className="space-y-2 pr-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
                <AlertCircle size={12} />
                <span>Due in {minsLeft} {minsLeft === 1 ? 'Minute' : 'Minutes'}</span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                {dueTask.title || 'Task Due Soon'}
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                This task is set to be due at <strong className="text-rose-600 dark:text-rose-400">{formatTimeDisplay(dueTask.dueDate)}</strong>. Please review and update its status.
              </p>

              {dueTask.project && (
                <div className="pt-1">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    Project: {typeof dueTask.project === 'object' ? (dueTask.project.projectName || dueTask.project.projectCode) : 'Assigned Project'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-center cursor-pointer"
            >
              Dismiss
            </button>

            <button
              onClick={handleGoToTask}
              className="flex-1 py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View in TODO</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TaskDueReminderModal;
