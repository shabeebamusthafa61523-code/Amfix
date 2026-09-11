import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit, Trash2, Video, FileText, Link as LinkIcon, 
  Upload, Eye, EyeOff, Clock, CheckCircle2, AlertCircle, Loader2, X, Sparkles 
} from 'lucide-react';
import { useToast } from '../ToastProvider';

const API_BASE = import.meta.env.VITE_API_URL;

const initialLessonForm = {
  title: '',
  description: '',
  contentType: 'VIDEO',
  fileUrl: '',
  fileMetadata: {},
  externalUrl: '',
  textContent: '',
  durationMinutes: 15,
  order: 1,
  isPublished: true,
  moduleId: ''
};

const LmsContentManager = ({ courseId, syllabus = [], onContentUpdated }) => {
  const { showToast } = useToast();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lesson Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [formData, setFormData] = useState(initialLessonForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const getHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return {
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`,
      'Content-Type': 'application/json'
    };
  }, []);

  const fetchLmsContent = useCallback(async () => {
    setLoading(true);
    try {
      const cleanBase = (API_BASE || '/api').replace(/\/$/, '');
      const endpoint = cleanBase.endsWith('/v1') 
        ? `${cleanBase}/academy/courses/${courseId}/lms-content`
        : `${cleanBase}/v1/academy/courses/${courseId}/lms-content`;

      const res = await fetch(endpoint, { headers: getHeaders() });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to fetch course LMS content.');
      setModules(data.data?.modules || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, getHeaders, showToast]);

  useEffect(() => {
    if (courseId) fetchLmsContent();
  }, [courseId, fetchLmsContent]);

  const handleOpenAddModal = (targetModuleId) => {
    setEditingLesson(null);
    setSelectedFile(null);
    setFormData({
      ...initialLessonForm,
      moduleId: targetModuleId || (syllabus[0]?.moduleId || 'mod_1')
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (lesson) => {
    setEditingLesson(lesson);
    setSelectedFile(null);
    setFormData({
      title: lesson.title || '',
      description: lesson.description || '',
      contentType: lesson.contentType || 'VIDEO',
      fileUrl: lesson.fileUrl || '',
      fileMetadata: lesson.fileMetadata || {},
      externalUrl: lesson.externalUrl || '',
      textContent: lesson.textContent || '',
      durationMinutes: lesson.durationMinutes || 15,
      order: lesson.order || 1,
      isPublished: lesson.isPublished !== undefined ? lesson.isPublished : true,
      moduleId: lesson.moduleId || (syllabus[0]?.moduleId || 'mod_1')
    });
    setIsModalOpen(true);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const cleanBase = (API_BASE || '/api').replace(/\/$/, '');
      const endpoint = cleanBase.endsWith('/v1')
        ? `${cleanBase}/academy/lms/upload`
        : `${cleanBase}/v1/academy/lms/upload`;

      const rawToken = localStorage.getItem('token');
      const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';

      const bodyData = new FormData();
      bodyData.append('file', file);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`
        },
        body: bodyData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'File upload failed.');

      setFormData(prev => ({
        ...prev,
        fileUrl: data.data.url,
        fileMetadata: {
          publicId: data.data.publicId || '',
          originalName: data.data.originalName || file.name,
          mimeType: data.data.mimeType || file.type,
          size: data.data.size || file.size
        }
      }));
      showToast('File uploaded successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitLesson = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Lesson title is required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const cleanBase = (API_BASE || '/api').replace(/\/$/, '');
      let endpoint = '';
      let method = 'POST';

      if (editingLesson) {
        method = 'PATCH';
        endpoint = cleanBase.endsWith('/v1')
          ? `${cleanBase}/academy/lessons/${editingLesson._id}`
          : `${cleanBase}/v1/academy/lessons/${editingLesson._id}`;
      } else {
        method = 'POST';
        endpoint = cleanBase.endsWith('/v1')
          ? `${cleanBase}/academy/courses/${courseId}/lessons`
          : `${cleanBase}/v1/academy/courses/${courseId}/lessons`;
      }

      const res = await fetch(endpoint, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save lesson.');

      showToast(`Lesson ${editingLesson ? 'updated' : 'created'} successfully!`, 'success');
      setIsModalOpen(false);
      fetchLmsContent();
      if (onContentUpdated) onContentUpdated();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Are you sure you want to delete this lesson? Completed progress for this lesson will be removed.')) return;
    try {
      const cleanBase = (API_BASE || '/api').replace(/\/$/, '');
      const endpoint = cleanBase.endsWith('/v1')
        ? `${cleanBase}/academy/lessons/${lessonId}`
        : `${cleanBase}/v1/academy/lessons/${lessonId}`;

      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: getHeaders()
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete lesson.');

      showToast('Lesson deleted successfully.', 'success');
      fetchLmsContent();
      if (onContentUpdated) onContentUpdated();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleTogglePublish = async (lesson) => {
    try {
      const cleanBase = (API_BASE || '/api').replace(/\/$/, '');
      const endpoint = cleanBase.endsWith('/v1')
        ? `${cleanBase}/academy/lessons/${lesson._id}`
        : `${cleanBase}/v1/academy/lessons/${lesson._id}`;

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ isPublished: !lesson.isPublished })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update publish status.');

      showToast(`Lesson ${!lesson.isPublished ? 'published' : 'unpublished'}!`, 'success');
      fetchLmsContent();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Curriculum & LMS Lessons...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
        <div>
          <h2 className="text-xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-slate-100">
            LMS Curriculum & Lesson Manager
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Author video lectures, downloadable PDFs, documents, and interactive text lessons per module.
          </p>
        </div>
        <button
          onClick={() => handleOpenAddModal()}
          className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Add Lesson
        </button>
      </div>

      {/* Modules & Lessons Tree */}
      <div className="space-y-6">
        {modules.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
            <Video className="mx-auto text-slate-400 opacity-50" size={40} />
            <p className="text-xs font-medium text-slate-500">No LMS lessons created for this course yet.</p>
            <button
              onClick={() => handleOpenAddModal()}
              className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-xl text-xs font-bold"
            >
              Create First Lesson
            </button>
          </div>
        ) : (
          modules.map((mod, modIdx) => (
            <div key={mod.moduleId || modIdx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black text-xs flex items-center justify-center">
                    {modIdx + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-extrabold uppercase text-slate-900 dark:text-slate-100">
                      {mod.title}
                    </h3>
                    {mod.description && <p className="text-xs text-slate-400 mt-0.5">{mod.description}</p>}
                  </div>
                </div>
                <button
                  onClick={() => handleOpenAddModal(mod.moduleId)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Add Lesson to Module
                </button>
              </div>

              {/* Lessons List */}
              {(!mod.lessons || mod.lessons.length === 0) ? (
                <p className="text-xs text-slate-400 font-medium py-2 text-center">No lessons added to this module yet.</p>
              ) : (
                <div className="space-y-3">
                  {mod.lessons.map((lesson, lessonIdx) => (
                    <div key={lesson._id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {lesson.contentType === 'VIDEO' && <Video size={18} />}
                          {lesson.contentType === 'PDF' && <FileText size={18} />}
                          {lesson.contentType === 'DOCUMENT' && <FileText size={18} />}
                          {lesson.contentType === 'LINK' && <LinkIcon size={18} />}
                          {lesson.contentType === 'TEXT' && <FileText size={18} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold uppercase tracking-tight text-slate-800 dark:text-slate-200 truncate">
                              {lessonIdx + 1}. {lesson.title}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                              lesson.isPublished ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {lesson.isPublished ? 'PUBLISHED' : 'DRAFT'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold mt-0.5">
                            <span className="uppercase">{lesson.contentType}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Clock size={10} /> {lesson.durationMinutes || 0} mins</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleTogglePublish(lesson)}
                          className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                          title={lesson.isPublished ? "Unpublish Lesson" : "Publish Lesson"}
                        >
                          {lesson.isPublished ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(lesson)}
                          className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 cursor-pointer"
                          title="Edit Lesson"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteLesson(lesson._id)}
                          className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Delete Lesson"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Lesson Modal */}
      {createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative my-auto w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                    <Video size={22} />
                  </div>
                  <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                    {editingLesson ? 'Edit Lesson' : 'Create New Lesson'}
                  </h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitLesson} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Module <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.moduleId}
                      onChange={(e) => setFormData(prev => ({ ...prev, moduleId: e.target.value }))}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                      required
                    >
                      {syllabus.map((s, idx) => (
                        <option key={s.moduleId || idx} value={s.moduleId || `mod_${idx + 1}`}>
                          Module {idx + 1}: {s.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Content Format <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.contentType}
                      onChange={(e) => setFormData(prev => ({ ...prev, contentType: e.target.value }))}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                    >
                      <option value="VIDEO">VIDEO (MP4 / WebM / Cloudinary)</option>
                      <option value="PDF">PDF DOCUMENT</option>
                      <option value="DOCUMENT">DOC / DOCX FILE</option>
                      <option value="LINK">EXTERNAL URL / EMBED LINK</option>
                      <option value="TEXT">RICH TEXT / READABLE LESSON</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Lesson Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Introduction to React Components"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Description / Overview
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of what students will learn in this lesson..."
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* File Upload / Content URL Section */}
                {(formData.contentType === 'VIDEO' || formData.contentType === 'PDF' || formData.contentType === 'DOCUMENT') && (
                  <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Upload File Material (Max 50MB)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleFileUpload(file);
                        }}
                        className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-indigo-600 file:text-white"
                      />
                      {uploading && <Loader2 className="animate-spin text-indigo-600" size={18} />}
                    </div>
                    {formData.fileUrl && (
                      <p className="text-[10px] text-emerald-600 font-bold truncate mt-1">
                        ✓ Uploaded: {formData.fileMetadata?.originalName || formData.fileUrl}
                      </p>
                    )}
                  </div>
                )}

                {formData.contentType === 'LINK' && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      External URL / Embed Link
                    </label>
                    <input
                      type="url"
                      value={formData.externalUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, externalUrl: e.target.value }))}
                      placeholder="https://youtube.com/watch?v=... or https://drive.google.com/..."
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}

                {formData.contentType === 'TEXT' && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Formatted Text Content
                    </label>
                    <textarea
                      rows={5}
                      value={formData.textContent}
                      onChange={(e) => setFormData(prev => ({ ...prev, textContent: e.target.value }))}
                      placeholder="Enter detailed markdown or text explanation..."
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Estimated Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.durationMinutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="isPublished"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                      className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    />
                    <label htmlFor="isPublished" className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 cursor-pointer">
                      Publish Immediately
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md shadow-indigo-600/20 flex items-center gap-2"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    Save Lesson
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </div>
  );
};

export default LmsContentManager;
