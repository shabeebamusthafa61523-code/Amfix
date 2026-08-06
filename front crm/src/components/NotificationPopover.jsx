import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, BellRing, Clock, Trash2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotificationPopover = ({ 
  isOpen, 
  onClose, 
  notifications = [], 
  onMarkAsRead, 
  onMarkAllRead,
  onDelete
}) => {
  const navigate = useNavigate();

  const handleNavigateToAll = () => {
    onClose();
    navigate('/notifications');
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Invisible Click-away Backdrop */}
          <div className="fixed inset-0 z-40" onClick={onClose} />
          
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-16 right-4 md:right-20 w-[350px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/60">
              <div className="flex items-center gap-2">
                <BellRing size={16} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                  Notifications
                </h3>
              </div>

              {notifications.some(n => !n.isRead) && (
                <button 
                  onClick={onMarkAllRead}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 size={12} /> Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800/40">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n._id || n.id} 
                    onClick={() => {
                      if (!n.isRead && onMarkAsRead) onMarkAsRead(n._id || n.id);
                    }}
                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-all cursor-pointer relative group ${
                      !n.isRead ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    {!n.isRead && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-600 rounded-full shadow-[0_0_10px_#4f46e5]" />
                    )}

                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h4 className={`text-xs font-bold ${!n.isRead ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                        {n.title || 'Notification'}
                      </h4>
                      <span className="text-[9px] font-medium text-slate-400 shrink-0 flex items-center gap-1">
                        <Clock size={10} /> {getTimeAgo(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {n.description || n.desc}
                    </p>

                    {n.createdByName && (
                      <div className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 font-medium mt-1">
                        From: {n.createdByName}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* View All Button */}
            <button 
              onClick={handleNavigateToAll}
              className="w-full py-3.5 text-center text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.15em] hover:bg-indigo-50 dark:hover:bg-slate-950 transition-all border-t border-slate-200 dark:border-slate-800 cursor-pointer"
            >
              View All Notifications
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPopover;