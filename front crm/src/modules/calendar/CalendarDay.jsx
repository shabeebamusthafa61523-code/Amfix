import React from 'react';
import { Plus, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_DOT_COLORS = {
  draft: 'bg-slate-400',
  in_progress: 'bg-blue-400',
  ready_for_review: 'bg-amber-400',
  approved: 'bg-green-400',
  revision_requested: 'bg-orange-400',
  completed: 'bg-emerald-500',
  cancelled: 'bg-slate-500'
};

const getItemStatus = (item) =>
  String(item?.workStatus || item?.status || 'draft')
    .trim()
    .toLowerCase();

/**
 * Clean calendar date cell.
 * Shows only the date, a completed tick, and a compact work summary.
 * Full titles/details open in the day drawer on click.
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
    return <div className="min-h-[92px] bg-transparent" />;
  }

  const count = items.length;
  const visibleDots = items.slice(0, 3);
  const extraCount = Math.max(0, count - visibleDots.length);

  return (
    <motion.div
      onClick={() => onDayClick && onDayClick(day)}
      className={`relative group min-h-[92px] rounded-lg border-2 transition-all cursor-pointer ${
        isToday
          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-400/70 dark:hover:border-emerald-500/40'
      }`}
      whileHover={{ scale: 1.02 }}
    >
      {isDayCompleted && (
        <CheckCircle className="absolute top-1.5 right-1.5 w-4 h-4 text-emerald-500 pointer-events-none z-10" />
      )}

      <div className="px-2.5 pt-2 pr-7 flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-bold ${
            isToday
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-700 dark:text-slate-300'
          }`}>
            {day}
          </span>
          {isToday && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">
              Today
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (onAddClick) onAddClick();
          }}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition opacity-0 group-hover:opacity-100"
          title="Add work for this day"
          aria-label={`Add work for ${day}`}
        >
          <Plus className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>
      </div>

      {count > 0 && (
        <div className="px-2.5 pb-2.5 pt-3 flex flex-col items-center gap-1.5">
          <div className="flex items-center justify-center gap-1">
            {visibleDots.map((item, index) => (
              <span
                key={item._id || item.id || index}
                className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[getItemStatus(item)] || STATUS_DOT_COLORS.draft}`}
              />
            ))}
            {extraCount > 0 && (
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 ml-0.5">
                +{extraCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            {count === 1 ? '1 item' : `+${count} items`}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default CalendarDay;
