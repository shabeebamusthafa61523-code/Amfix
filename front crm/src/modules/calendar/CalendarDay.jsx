import React from 'react';
import { Plus, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_CONFIG = {
  draft: {
    bg: 'bg-slate-100 dark:bg-slate-800/80',
    border: 'border-slate-300 dark:border-slate-700',
    text: 'text-slate-700 dark:text-slate-200',
    dot: 'bg-slate-400',
    label: 'Draft'
  },
  in_progress: {
    bg: 'bg-blue-500/15 dark:bg-blue-950/60',
    border: 'border-blue-300 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
    label: 'In Progress'
  },
  ready_for_review: {
    bg: 'bg-amber-500/15 dark:bg-amber-950/60',
    border: 'border-amber-300 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-300',
    dot: 'bg-amber-500',
    label: 'Review'
  },
  approved: {
    bg: 'bg-emerald-500/15 dark:bg-emerald-950/60',
    border: 'border-emerald-300 dark:border-emerald-800',
    text: 'text-emerald-800 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    label: 'Approved'
  },
  revision_requested: {
    bg: 'bg-rose-500/15 dark:bg-rose-950/60',
    border: 'border-rose-300 dark:border-rose-800',
    text: 'text-rose-800 dark:text-rose-300',
    dot: 'bg-rose-500',
    label: 'Revision'
  },
  completed: {
    bg: 'bg-green-500/20 dark:bg-green-950/70',
    border: 'border-green-400 dark:border-green-800',
    text: 'text-green-800 dark:text-green-300',
    dot: 'bg-green-500',
    label: 'Completed'
  },
  cancelled: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
    text: 'text-slate-400 dark:text-slate-500',
    dot: 'bg-slate-400',
    label: 'Cancelled'
  }
};

const CONTENT_TYPE_ICONS = {
  reel: '🎬',
  video: '🎥',
  carousel: '🎠',
  post: '🖼️',
  story: '📲',
  graphic: '🎨',
  article: '📝'
};

const getItemStatus = (item) =>
  String(item?.workStatus || item?.status || 'draft')
    .trim()
    .toLowerCase();

/**
 * Noticeable, visually vibrant content calendar date cell.
 * Displays bold title cards, status color pills, and content type icons.
 */
const CalendarDay = ({
  day,
  items = [],
  isToday = false,
  isDayCompleted = false,
  onDayClick,
  onAddClick
}) => {
  if (day === null) {
    return <div className="min-h-[124px] bg-transparent" />;
  }

  const count = items.length;
  const visibleItems = items.slice(0, 2);
  const extraCount = Math.max(0, count - visibleItems.length);
  const allCompleted = count > 0 && items.every(item => {
    const s = getItemStatus(item);
    return s === 'completed' || String(item?.postingStatus).toLowerCase() === 'posted';
  });
  const dateCompleted = isDayCompleted || allCompleted;

  return (
    <motion.div
      onClick={() => onDayClick && onDayClick(day)}
      className={`relative group min-h-[124px] rounded-2xl border-2 p-2 transition-all cursor-pointer flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
        dateCompleted
          ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 shadow-emerald-500/15 ring-1 ring-emerald-500/30'
          : isToday
          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
          : count > 0
          ? 'border-indigo-300 dark:border-indigo-800/80 bg-gradient-to-b from-indigo-50/30 to-white dark:from-indigo-950/20 dark:to-slate-900 hover:border-indigo-500'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-800'
      }`}
      whileHover={{ scale: 1.015 }}
    >
      {/* Big Watermark Tick for Completed Dates */}
      {dateCompleted && (
        <CheckCircle2 className="w-16 h-16 text-emerald-500/20 dark:text-emerald-400/25 absolute -bottom-2 -right-2 pointer-events-none stroke-[2.5]" />
      )}

      {/* Day Header Row */}
      <div className="flex items-center justify-between gap-1 mb-1.5 z-10">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-black ${
            dateCompleted
              ? 'w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs'
              : isToday
              ? 'w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs'
              : count > 0
              ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
              : 'text-slate-700 dark:text-slate-300'
          }`}>
            {day}
          </span>
          {isToday && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Today
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {dateCompleted && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs flex items-center gap-1" title="Date Completed! All work items done!">
              <CheckCircle2 className="w-3 h-3 stroke-[3]" /> Done
            </span>
          )}

          {count > 0 && !dateCompleted && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-indigo-600 text-white shadow-xs">
              {count} {count === 1 ? 'item' : 'items'}
            </span>
          )}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (onAddClick) onAddClick();
            }}
            className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
            title="Add work for this day"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Visible Item Title Cards */}
      <div className="flex-1 space-y-1 overflow-hidden flex flex-col justify-start z-10">
        {count === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[10px] text-slate-300 dark:text-slate-700 font-medium italic group-hover:text-slate-400 transition-colors">
            + Click to add
          </div>
        ) : (
          visibleItems.map((item, idx) => {
            const statusKey = getItemStatus(item);
            const style = STATUS_CONFIG[statusKey] || STATUS_CONFIG.draft;
            const isCompleted = statusKey === 'completed' || String(item?.postingStatus).toLowerCase() === 'posted';
            const contentType = String(item.contentType || '').toLowerCase();
            const typeIcon = CONTENT_TYPE_ICONS[contentType] || '📌';

            return (
              <div
                key={item._id || item.id || idx}
                className={`px-2 py-1 rounded-xl border text-[11px] font-bold leading-snug flex items-center justify-between gap-1 shadow-2xs transition-all hover:scale-[1.01] ${style.bg} ${style.border} ${style.text}`}
              >
                <div className="flex items-center gap-1 min-w-0 truncate">
                  <span className="text-[10px] shrink-0">{typeIcon}</span>
                  <span className="truncate font-extrabold">{item.title || 'Untitled Work'}</span>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                  {isCompleted && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" title="Completed / Posted" />
                  )}
                  <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} title={style.label} />
                </div>
              </div>
            );
          })
        )}

        {extraCount > 0 && (
          <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 px-1 pt-0.5 flex items-center justify-between">
            <span>+{extraCount} more...</span>
            <span className="text-[9px] font-bold underline">View All</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CalendarDay;
