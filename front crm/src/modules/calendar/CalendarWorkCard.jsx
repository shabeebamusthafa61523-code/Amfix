import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, User } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Calendar work item card
 * Shows compact information about a work item
 */
const CalendarWorkCard = ({
  item,
  onClick,
  compact = true
}) => {
  // Determine work status badge
  const getWorkStatusBadge = (status) => {
    const statusMap = {
      draft: { bg: 'bg-slate-200 dark:bg-slate-700', text: 'text-slate-700 dark:text-slate-200', label: 'Draft' },
      in_progress: { bg: 'bg-blue-200 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-200', label: 'In Progress' },
      ready_for_review: { bg: 'bg-amber-200 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-200', label: 'Review' },
      approved: { bg: 'bg-green-200 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-200', label: 'Approved' },
      revision_requested: { bg: 'bg-orange-200 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-200', label: 'Revision' },
      completed: { bg: 'bg-emerald-200 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-200', label: '✓ Done' }
    };
    return statusMap[status] || statusMap.draft;
  };

  // Determine posting status indicator
  const getPostingStatusIcon = (status) => {
    if (status === 'posted') {
      return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
    } else if (status === 'failed') {
      return <AlertTriangle className="w-3 h-3 text-rose-500" />;
    }
    return <Clock className="w-3 h-3 text-amber-500" />;
  };

  // Check if overdue
  const isOverdue = () => {
    if (item.postingStatus === 'posted') return false;
    const postDate = new Date(item.postingDate);
    return postDate < new Date();
  };

  const workStatus = getWorkStatusBadge(item.workStatus);
  const postedIndicator = item.postingStatus === 'posted';
  const overdue = isOverdue();

  // Get assignee name
  const getAssigneeInfo = () => {
    if (item.assignedTo) {
      if (typeof item.assignedTo === 'object') {
        return {
          name: item.assignedTo.name || item.assignedTo.email?.split('@')[0] || 'Unknown',
          initial: (item.assignedTo.name || '?').charAt(0).toUpperCase()
        };
      }
      return { name: 'Unknown', initial: '?' };
    }
    return { name: 'Unassigned', initial: '?' };
  };

  const assignee = getAssigneeInfo();

  return (
    <motion.div
      onClick={onClick}
      className={`p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 cursor-pointer transition group ${
        overdue ? 'border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20' : ''
      }`}
      whileHover={{ y: -2 }}
    >
      <div className="flex flex-col gap-1">
        {/* Title */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate flex-1">
            {item.title}
          </h4>
          {postedIndicator && (
            <span className="shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </span>
          )}
        </div>

        {/* Content Type */}
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {item.contentType?.replace(/_/g, ' ') || 'Content'}
        </p>

        {/* Status Badges */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded font-semibold ${workStatus.bg} ${workStatus.text} whitespace-nowrap`}>
            {workStatus.label}
          </span>
          {postedIndicator && (
            <span className="px-2 py-0.5 rounded font-semibold bg-emerald-200 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200 whitespace-nowrap">
              ✓ Posted
            </span>
          )}
        </div>

        {/* Posting Time if scheduled */}
        {item.postingTime && !postedIndicator && (
          <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {item.postingTime}
          </p>
        )}

        {/* Overdue Badge */}
        {overdue && (
          <div className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-semibold">
            <AlertTriangle className="w-3 h-3" />
            Overdue
          </div>
        )}

        {/* Assignee */}
        {compact && assignee && (
          <div className="flex items-center gap-1 text-xs">
            <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">
              {assignee.initial}
            </div>
            <span className="text-slate-600 dark:text-slate-400 truncate">
              {assignee.name}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CalendarWorkCard;
