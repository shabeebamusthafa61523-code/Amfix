import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Paperclip, Pencil, Send, Trash2 } from 'lucide-react';
import {
  addTaskComment,
  deleteTaskComment,
  getTaskComments,
  updateTaskComment
} from '../services/taskService';
import { formatApiError } from '../utils/errorUtils';

const TaskCollaboration = ({ task, currentUserId, onTaskUpdate }) => {
  const taskId = task?.id || task?._id;
  const loadedTaskId = useRef(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError('');
    try {
      const result = await getTaskComments(taskId);
      setComments(Array.isArray(result.comments) ? result.comments : []);
    } catch (err) {
      setError(formatApiError(err, 'Unable to load comments.'));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (!taskId || loadedTaskId.current === String(taskId)) return;
    loadedTaskId.current = String(taskId);
    load();
  }, [load, taskId]);

  const submit = async event => {
    event.preventDefault();
    if ((!text.trim() && !files.length) || saving) return;
    setSaving(true);
    setError('');
    try {
      const result = await addTaskComment(taskId, text, files);
      setText('');
      setFiles([]);
      onTaskUpdate?.(result.task);
      await load();
    } catch (err) {
      setError(formatApiError(err, 'Unable to add comment.'));
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async commentId => {
    const comment = editingText.trim();
    if (!comment || saving) return;
    setSaving(true);
    setError('');
    try {
      const result = await updateTaskComment(taskId, commentId, comment);
      setEditingCommentId(null);
      setEditingText('');
      onTaskUpdate?.(result.task);
      await load();
    } catch (err) {
      setError(formatApiError(err, 'Unable to update comment.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async commentId => {
    if (!window.confirm('Delete this comment?')) return;
    setError('');
    try {
      const result = await deleteTaskComment(taskId, commentId);
      onTaskUpdate?.(result.task);
      await load();
    } catch (err) {
      setError(formatApiError(err, 'Unable to delete comment.'));
    }
  };

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
        <MessageSquare size={15} /> Discussion
      </h3>
      {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}
      <div className="mt-3 max-h-56 space-y-3 overflow-y-auto">
        {loading ? <p className="text-xs text-slate-400">Loading comments…</p> : comments.length ? comments.map(comment => {
          const author = comment.author || {};
          const commentId = comment.id || comment._id;
          const own = String(author.id || author._id || author) === String(currentUserId);
          const isEditing = editingCommentId === String(commentId);
          return (
            <article key={commentId} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
              <div className="flex justify-between gap-2">
                <div>
                  <span className="text-xs font-bold">{author.name || 'Team member'}</span>
                  {comment.createdAt && <span className="ml-2 text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>}
                </div>
                {own && !isEditing && <div className="flex gap-2">
                  <button type="button" onClick={() => { setEditingCommentId(String(commentId)); setEditingText(comment.comment || ''); }} aria-label="Edit comment" className="text-slate-500"><Pencil size={13} /></button>
                  <button type="button" onClick={() => remove(commentId)} aria-label="Delete comment" className="text-rose-500"><Trash2 size={13} /></button>
                </div>}
              </div>
              {isEditing ? <div className="mt-2 space-y-2">
                <textarea value={editingText} onChange={event => setEditingText(event.target.value)} maxLength={5000} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-800 dark:bg-slate-950" />
                <div className="flex gap-2">
                  <button type="button" disabled={saving || !editingText.trim()} onClick={() => saveEdit(commentId)} className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-bold text-white disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => setEditingCommentId(null)} className="text-xs text-slate-500">Cancel</button>
                </div>
              </div> : <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">{comment.comment}</p>}
              {comment.attachments?.length > 0 && <div className="mt-2 space-y-1">
                {comment.attachments.map(attachment => <a key={attachment.id || attachment._id || attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="block truncate text-xs text-indigo-600 hover:underline"><Paperclip size={12} className="mr-1 inline" />{attachment.name || 'Attachment'}</a>)}
              </div>}
            </article>
          );
        }) : <p className="text-xs text-slate-400">No comments yet.</p>}
      </div>
      <form onSubmit={submit} className="mt-3 space-y-2">
        <textarea value={text} onChange={event => setText(event.target.value)} maxLength={5000} placeholder="Write a comment…" className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs dark:border-slate-800 dark:bg-slate-950" />
        <div className="flex items-center justify-between gap-2">
          <label className="cursor-pointer text-xs text-indigo-600"><Paperclip size={14} className="inline" /> Add files<input type="file" multiple className="sr-only" onChange={event => setFiles(Array.from(event.target.files || []))} /></label>
          <button disabled={saving || (!text.trim() && !files.length)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Send size={13} /> {saving ? 'Sending' : 'Comment'}</button>
        </div>
        {files.length > 0 && <p className="text-[11px] text-slate-500">{files.length} file(s) selected</p>}
      </form>
    </section>
  );
};

export default TaskCollaboration;
