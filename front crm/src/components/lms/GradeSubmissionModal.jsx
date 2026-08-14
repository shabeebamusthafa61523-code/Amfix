import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Award, FileText, ExternalLink, Download, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '../ToastProvider';

const API_BASE = import.meta.env.VITE_API_URL;

const GradeSubmissionModal = ({ submission, assignment, onClose, onGraded }) => {
  const { showToast } = useToast();
  const [grade, setGrade] = useState(submission?.grade !== null && submission?.grade !== undefined ? submission.grade : '');
  const [feedback, setFeedback] = useState(submission?.feedback || '');
  const [status, setStatus] = useState(submission?.status || 'GRADED');
  const [submitting, setSubmitting] = useState(false);

  const getHeaders = () => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return {
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`,
      'Content-Type': 'application/json'
    };
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    const numGrade = parseFloat(grade);
    const max = assignment?.maxMarks || submission?.maxMarks || 100;

    if (isNaN(numGrade) || numGrade < 0 || numGrade > max) {
      showToast(`Grade must be a number between 0 and ${max}.`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const cleanBase = (API_BASE || '/api').replace(/\/$/, '');
      const endpoint = cleanBase.endsWith('/v1') 
        ? `${cleanBase}/academy/submissions/${submission._id}/grade`
        : `${cleanBase}/v1/academy/submissions/${submission._id}/grade`;

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          grade: numGrade,
          feedback: feedback.trim(),
          status
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to grade submission.');

      showToast('Submission evaluated successfully!', 'success');
      if (onGraded) onGraded(data.data);
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const student = submission?.studentId || {};
  const maxMarks = assignment?.maxMarks || submission?.maxMarks || 100;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative my-auto w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Award size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                Evaluate Student Submission
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {student.name || 'Student'} ({student.studentId || student.email || 'N/A'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleGradeSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Submission Preview Card */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Submitted Format: <strong className="text-slate-700 dark:text-slate-200 uppercase">{submission.submissionType}</strong></span>
              <span>Submitted At: {new Date(submission.submittedAt).toLocaleString()}</span>
            </div>

            {submission.submissionType === 'FILE' && submission.fileUrl && (
              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-xs">
                  {submission.fileMetadata?.originalName || 'Submitted Assignment File'}
                </span>
                <a
                  href={submission.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <Download size={14} /> Open File
                </a>
              </div>
            )}

            {submission.submissionType === 'LINK' && submission.externalUrl && (
              <a
                href={submission.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <ExternalLink size={14} /> {submission.externalUrl}
              </a>
            )}

            {submission.textAnswer && (
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {submission.textAnswer}
              </div>
            )}
          </div>

          {/* Grade & Status Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Grade Score (Max {maxMarks}) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={maxMarks}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder={`0 - ${maxMarks}`}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">/ {maxMarks}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Evaluation Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="GRADED">GRADED (Approved)</option>
                <option value="UNDER_REVIEW">UNDER REVIEW</option>
                <option value="RETURNED">RETURNED (Needs Revision)</option>
              </select>
            </div>
          </div>

          {/* Feedback Textarea */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Instructor Feedback & Recommendations
            </label>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide constructive feedback for the student..."
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-2"
            >
              {submitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
              Save Evaluation
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
};

export default GradeSubmissionModal;
