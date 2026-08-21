import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, X, CheckCircle2, Clock, ExternalLink, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNotificationTheme } from '../utils/notificationThemes';

const NavbarNotificationPopup = ({
  notification,
  onClose,
  onMarkAsRead
}) => {
  const navigate = useNavigate();

  if (!notification) return null;

  const theme = getNotificationTheme(notification.category);

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return 'Just now';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffMs / (1000 * 60 * 60 * 24))}d ago`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -30, scale: 0.9, rotate: -1 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 450, damping: 22 }}
        className={`fixed top-20 right-4 md:right-8 z-[100] w-[370px] max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-2 ${theme.cardBorder} rounded-2xl ${theme.modalShadow} overflow-hidden shadow-2xl ring-4 ring-indigo-500/10`}
      >
        {/* Top High-Noticeable Animated Accent Banner */}
        <div className={`${theme.banner} h-2 w-full animate-pulse`} />

        <div className="p-4 space-y-3">
          {/* Header Row with Noticeable Pulsing Ping */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className={`w-9 h-9 rounded-xl ${theme.iconBg} flex items-center justify-center shrink-0 shadow-sm`}>
                  <BellRing size={20} className="animate-bounce" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 block">
                    {theme.tagText}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs animate-pulse">
                    <Sparkles size={8} /> New
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                  <Clock size={10} /> {getTimeAgo(notification.createdAt)}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>

          {/* Notification Content Body */}
          <div className="space-y-1.5 pl-0.5">
            <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
              {notification.title || 'Notification Alert'}
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
              {notification.description || notification.desc}
            </p>

            {/* High-Noticeable Image Attachment */}
            {(notification.imageUrl || notification.image) && (
              <div className="mt-2.5 rounded-xl overflow-hidden border-2 border-indigo-500/30 dark:border-indigo-500/40 shadow-md max-h-40 relative group">
                <img 
                  src={notification.imageUrl || notification.image} 
                  alt="Notification Attachment" 
                  className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-md text-[9px] font-bold text-white uppercase tracking-wider">
                  Attachment
                </div>
              </div>
            )}

            {notification.createdByName && (
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 pt-1 flex items-center gap-1">
                From: <span className="font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{notification.createdByName}</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 gap-2">
            <button
              onClick={() => {
                onClose();
                navigate('/notifications');
              }}
              className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer transition-colors"
            >
              View All <ExternalLink size={10} />
            </button>

            <button
              onClick={() => {
                if (onMarkAsRead) onMarkAsRead(notification._id || notification.id);
                onClose();
              }}
              className={`px-3.5 py-1.5 ${theme.buttonBg} text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shadow-md hover:shadow-lg active:scale-95`}
            >
              <CheckCircle2 size={12} /> Mark Read
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NavbarNotificationPopup;
