import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, X, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
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
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`fixed top-20 right-4 md:right-8 z-[100] w-[360px] max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border ${theme.cardBorder} rounded-2xl ${theme.modalShadow} overflow-hidden`}
      >
        {/* Top Decorative Banner Line */}
        <div className={`${theme.banner} h-1.5 w-full`} />

        <div className="p-4 space-y-3">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl ${theme.iconBg} flex items-center justify-center shrink-0`}>
                <BellRing size={18} className="animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
                  {theme.tagText}
                </span>
                <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                  <Clock size={10} /> {getTimeAgo(notification.createdAt)}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>

          {/* Notification Title & Body */}
          <div 
            onClick={() => {
              if (onMarkAsRead) onMarkAsRead(notification._id || notification.id);
              onClose();
              navigate('/notifications');
            }}
            className="space-y-1 pl-1 cursor-pointer"
          >
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
              {notification.title || 'Notification Alert'}
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 whitespace-pre-wrap break-words">
              {notification.description || notification.desc}
            </p>

            {(notification.imageUrl || notification.image) && (
              <div className="mt-2 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm max-h-36">
                <img 
                  src={notification.imageUrl || notification.image} 
                  alt="Notification Attachment" 
                  className="w-full h-36 object-cover"
                />
              </div>
            )}

            {notification.createdByName && (
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 pt-1">
                From: <span className="font-bold text-slate-700 dark:text-slate-200">{notification.createdByName}</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 gap-2">
            <button
              onClick={() => {
                onClose();
                navigate('/notifications');
              }}
              className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
            >
              View All <ExternalLink size={10} />
            </button>

            <button
              onClick={() => {
                if (onMarkAsRead) onMarkAsRead(notification._id || notification.id);
                onClose();
              }}
              className={`px-3 py-1.5 ${theme.buttonBg} text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shadow-md active:scale-95`}
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
