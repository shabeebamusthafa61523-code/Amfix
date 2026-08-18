import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit2, Trash2, Calendar, Clock, User, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

/**
 * Detailed view modal for calendar work items
 * Shows all information and allows status updates
 */
const CalendarWorkDetails = ({
  isOpen,
  onClose,
  work,
  onEdit,
  onDelete,
  onStatusUpdate,
  onPostingStatusUpdate,
  loading = false
}) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);
  const [postingStatusUpdateOpen, setPostingStatusUpdateOpen] = useState(false);
  const [selectedWorkStatus, setSelectedWorkStatus] = useState(work?.workStatus || '');
  const [selectedPostingStatus, setSelectedPostingStatus] = useState(work?.postingStatus || '');
  const [postUrl, setPostUrl] = useState('');
  const [postingNotes, setPostingNotes] = useState('');

  if (!isOpen || !work) return null;

  const workStatuses = [
    'draft', 'in_progress', 'ready_for_review', 'approved', 'revision_requested', 'completed'
  ];

  const postingStatuses = [
    'not_scheduled', 'scheduled', 'ready_to_post', 'posted', 'failed', 'cancelled'
  ];

  const getStatusColor = (status, type = 'work') => {
    if (type === 'posting') {
      const colors = {
        not_scheduled: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200',
        scheduled: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200',
        ready_to_post: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200',
        posted: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200',
        failed: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-200',
        cancelled: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
      };
      return colors[status] || colors.not_scheduled;
    }

    const colors = {
      draft: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200',
      in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200',
      ready_for_review: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200',
      approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200',
      revision_requested: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-200',
      completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200'
    };
    return colors[status] || colors.draft;
  };

  const isOverdue = () => {
    if (work.postingStatus === 'posted') return false;
    const postDate = new Date(work.postingDate);
    return postDate < new Date();
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="sticky top-4 right-4 float-right p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition z-10"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>

          <div className="p-6">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {work.title}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit && onEdit(work)}
                    className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/50 transition"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Overdue Alert */}
              {isOverdue() && work.postingStatus !== 'posted' && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 mb-4">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-rose-700 dark:text-rose-200">Overdue</p>
                    <p className="text-xs text-rose-600 dark:text-rose-300">
                      This content was scheduled to be posted on {new Date(work.postingDate).toLocaleDateString()} but hasn't been posted yet.
                    </p>
                  </div>
                </div>
              )}

              {/* Posted Indicator */}
              {work.postingStatus === 'posted' && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">✓ Posted</p>
                    {work.actualPostTime && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-300">
                        Posted on {new Date(work.actualPostTime).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {work.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  {work.description}
                </p>
              )}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Content Type */}
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Content Type</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {work.contentType?.replace(/_/g, ' ') || 'Not specified'}
                </p>
              </div>

              {/* Assigned To */}
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Assigned To</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <User size={14} />
                  {work.assignedTo?.name || 'Unknown'}
                </p>
              </div>

              {/* Work Status */}
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Work Status</p>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${getStatusColor(work.workStatus)}`}>
                    {work.workStatus?.replace(/_/g, ' ')}
                  </span>
                  <button
                    onClick={() => setStatusUpdateOpen(true)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Posting Status */}
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Posting Status</p>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${getStatusColor(work.postingStatus, 'posting')}`}>
                    {work.postingStatus?.replace(/_/g, ' ')}
                  </span>
                  <button
                    onClick={() => setPostingStatusUpdateOpen(true)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Work Date */}
              {work.workDate && (
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Work Date</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Calendar size={14} />
                    {new Date(work.workDate).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Due Date */}
              {work.workDueDate && (
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Due Date</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Calendar size={14} />
                    {new Date(work.workDueDate).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Posting Date & Time */}
              {work.postingDate && (
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Posting Date</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Calendar size={14} />
                    {new Date(work.postingDate).toLocaleDateString()}
                  </p>
                </div>
              )}

              {work.postingTime && (
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Posting Time</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Clock size={14} />
                    {work.postingTime}
                  </p>
                </div>
              )}

              {/* Campaign */}
              {work.campaign && (
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Campaign</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{work.campaign}</p>
                </div>
              )}

              {/* Tags */}
              {work.tags && work.tags.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {work.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Media Links */}
              {work.socialMediaLinks && work.socialMediaLinks.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Social Media Links</p>
                  <div className="flex flex-col gap-2">
                    {work.socialMediaLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2"
                      >
                        <ExternalLink size={14} />
                        {link.platform}: {link.postUrl.substring(0, 50)}...
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Created Info */}
              {work.createdAt && (
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Created</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {new Date(work.createdAt).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Updated Info */}
              {work.updatedAt && (
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Updated</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {new Date(work.updatedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-sm transition"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          onDelete(work._id);
          setDeleteConfirmOpen(false);
          onClose();
        }}
        title="Delete Calendar Work"
        message={`Are you sure you want to delete "${work.title}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />

      {/* Status Update Modal */}
      <ConfirmModal
        isOpen={statusUpdateOpen}
        onClose={() => setStatusUpdateOpen(false)}
        onConfirm={() => {
          onStatusUpdate(work._id, selectedWorkStatus);
          setStatusUpdateOpen(false);
        }}
        title="Update Work Status"
        message={`Update work status to ${selectedWorkStatus.replace(/_/g, ' ')}?`}
        confirmText="Update"
        type="warning"
      />

      {/* Posting Status Update Modal */}
      <ConfirmModal
        isOpen={postingStatusUpdateOpen}
        onClose={() => setPostingStatusUpdateOpen(false)}
        onConfirm={() => {
          onPostingStatusUpdate(work._id, {
            status: selectedPostingStatus,
            actualPostTime: selectedPostingStatus === 'posted' ? new Date() : undefined,
            notes: postingNotes
          });
          setPostingStatusUpdateOpen(false);
        }}
        title="Update Posting Status"
        message={`Update posting status to ${selectedPostingStatus.replace(/_/g, ' ')}?`}
        confirmText="Update"
        type="warning"
      />
    </AnimatePresence>,
    document.body
  );
};

export default CalendarWorkDetails;
