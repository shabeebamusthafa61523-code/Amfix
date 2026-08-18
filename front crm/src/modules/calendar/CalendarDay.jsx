import React from 'react';
import { Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import CalendarWorkCard from './CalendarWorkCard';

/**
 * Individual calendar day cell
 * Displays date, work items, and add button
 */
const CalendarDay = ({
  day,
  items = [],
  isToday = false,
  onItemClick,
  onAddClick
}) => {
  if (day === null) {
    return <div className="min-h-[120px] bg-transparent" />;
  }

  return (
    <motion.div
      className={`min-h-[120px] rounded-lg border-2 transition-all ${
        isToday
          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
      }`}
      whileHover={{ scale: 1.02 }}
    >
      {/* Day Header */}
      <div className={`px-3 py-2 border-b ${
        isToday
          ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-100/50 dark:bg-indigo-900/30'
          : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
      } flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${
            isToday
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-700 dark:text-slate-300'
          }`}>
            {day}
          </span>
          {isToday && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
              Today
            </span>
          )}
        </div>

        <button
          onClick={onAddClick}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition opacity-0 group-hover:opacity-100"
          title="Add work for this day"
          aria-label={`Add work for ${day}`}
        >
          <Plus className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>
      </div>

      {/* Day Content */}
      <div className="p-2 flex flex-col gap-1 max-h-[280px] overflow-y-auto group">
        {items.length === 0 ? (
          <div className="text-xs text-slate-400 dark:text-slate-500 py-2 text-center">
            No work scheduled
          </div>
        ) : (
          items.map(item => (
            <CalendarWorkCard
              key={item._id}
              item={item}
              onClick={() => onItemClick && onItemClick(item)}
              compact
            />
          ))
        )}
      </div>
    </motion.div>
  );
};

export default CalendarDay;
