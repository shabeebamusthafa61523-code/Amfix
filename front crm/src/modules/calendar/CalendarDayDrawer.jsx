import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Calendar } from 'lucide-react';
import CalendarWorkCard from './CalendarWorkCard';

/**
 * Side drawer listing all scheduled work for a selected date cell.
 */
const CalendarDayDrawer = ({
  isOpen,
  date,
  items = [],
  onClose,
  onItemClick,
  onStatusChange,
  onAddWork
}) => {
  const heading = date
    ? date.toLocaleString('default', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Scheduled work';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-40">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.08 }}
            className="absolute inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                  Day schedule
                </p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  {heading}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {items.length === 0
                    ? 'No work scheduled for this date'
                    : `${items.length} scheduled ${items.length === 1 ? 'item' : 'items'}`}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label="Close day schedule"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onAddWork}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
              >
                <Plus className="w-4 h-4" />
                Add work for this day
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {items.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center px-6">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Click a work item after adding it to view the full details, image, and status controls.
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <CalendarWorkCard
                    key={item._id || item.id}
                    item={item}
                    work={item}
                    compact={false}
                    onClick={() => onItemClick && onItemClick(item)}
                    onStatusChange={onStatusChange}
                  />
                ))
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CalendarDayDrawer;
