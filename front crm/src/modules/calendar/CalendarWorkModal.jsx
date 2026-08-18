import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import CalendarWorkForm from './CalendarWorkForm';

/**
 * Compact modal for creating/editing calendar work items
 */
const CalendarWorkModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  employees = [],
  loading = false,
  error = null
}) => {
  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl z-10 p-5 max-h-[80vh] overflow-y-auto"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>

          <div className="mb-4 pr-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {initialData?._id || initialData?.id ? 'Edit Calendar Work' : 'Create New Calendar Work'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {initialData?._id || initialData?.id
                ? 'Update the details of this calendar work item'
                : 'Add a new content piece to the calendar'}
            </p>
          </div>

          <CalendarWorkForm
            initialData={initialData}
            employees={employees}
            onSubmit={onSubmit}
            loading={loading}
            error={error}
          />
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default CalendarWorkModal;
