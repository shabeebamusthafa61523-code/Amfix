import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, BookOpen, Video, FileText, Link as LinkIcon, CheckCircle2, 
  Award, PlayCircle, Download, ExternalLink, ChevronRight, ChevronDown, 
  Loader2, AlertCircle, Sparkles, Upload, Send 
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';

const API_BASE = import.meta.env.VITE_API_URL;

const StudentCourseViewer = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState(null);
  const [activeAssignment, setActiveAssignment] = useState(null);

  // Lesson Action & Progress State
  const [completing, setCompleting] = useState(false);

  // Submission Form State
  const [submissionType, setSubmissionType] = useState('TEXT');
  const [textAnswer, setTextAnswer] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileMetadata, setFileMetadata] = useState({});
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

  const fetchCourseContent = useCallback(async () => {
    setLoading(true);
    try {
      const cleanBase = (API_BASE || '/api').replace(/\/$/, '');
      const endpoint = cleanBase.endsWith('/v1')
        ? `${cleanBase}/academy/courses/${courseId}/lms-content`
        : `${cleanBase}/v1/academy/courses/${courseId}/lms-content`;

      const res = await fetch(endpoint, { headers: getHeaders() });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to fetch course content.');

      setCourseData(data.data);

      // Auto-select first lesson or assignment if available
      const firstMod = data.data?.modules?.[0];
      if (firstMod?.lessons?.length > 0) {
        setActiveLesson(firstMod.lessons[0]);
        setActiveAssignment(null);
      } else if (firstMod?.assignments?.length > 0) {
        setActiveAssignment(firstMod.assignments[0]);
        setActiveLesson(null);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, getHeaders, showToast]);

  useEffect(() => {
    if (courseId) fetchCourseContent();
  }, [courseId, fetchCourseContent]);

  const handleMarkComplete = async (lessonId) => {
    setCompleting(true);
    try {
      const cleanBase = (API_BASE || '/api').replace(/\/$/, '');
      const endpoint = cleanBase.endsWith('/v1')
        ? `${cleanBase}/academy/lessons/${lessonId}/complete`
        : `${cleanBase}/v1/academy/lessons/${lessonId}/complete`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: getHeaders()
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to mark lesson complete.');

      showToast('Lesson marked as complete!', 'success');
      setActiveLesson(prev => prev ? { ...prev, isCompleted: true } : null);
      fetchCourseContent();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCompleting(false);
    }
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

      setFileUrl(data.data.url);
      setFileMetadata({
        publicId: data.data.publicId || '',
        originalName: data.data.originalName || file.name,
        mimeType: data.data.mimeType || file.type,
        size: data.data.size || file.size
      });
      showToast('Assignment file uploaded successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!activeAssignment) return;

    if (submissionType === 'TEXT' && !textAnswer.trim()) {
      showToast('Please enter your text answer.', 'error');
      return;
    }

    if (submissionType === 'LINK' && !externalUrl.trim()) {
      showToast('Please provide a valid solution link.', 'error');
      return;
    }

    if (submissionType === 'FILE' && !fileUrl) {
      showToast('Please attach a file for your submission.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const cleanBase = (API_BASE || '/api').replace(/\/$/, '');
      const endpoint = cleanBase.endsWith('/v1')
        ? `${cleanBase}/academy/assignments/${activeAssignment._id}/submit`
        : `${cleanBase}/v1/academy/assignments/${activeAssignment._id}/submit`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          submissionType,
          fileUrl,
          fileMetadata,
          textAnswer: textAnswer.trim(),
          externalUrl: externalUrl.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit assignment.');

      showToast('Assignment solution submitted successfully!', 'success');
      fetchCourseContent();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-950 min-h-screen flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={44} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Loading Course Viewer...</p>
      </div>
    );
  }

  const course = courseData?.course || {};
  const modules = courseData?.modules || [];
  const enrollment = courseData?.enrollment || {};

  return (
    <div className="bg-white dark:bg-slate-950 min-h-screen text-slate-600 dark:text-slate-200 font-sans">
      
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/academy/learning')}
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft size={16} /> Back to Courses
          </button>
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {course.courseCode}
            </span>
            <h1 className="text-base font-extrabold uppercase tracking-tight text-slate-900 dark:text-slate-100 truncate max-w-xl">
              {course.courseName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>Progress:</span>
            <span className="text-indigo-600 dark:text-indigo-400">{enrollment.progressPercentage || 0}%</span>
          </div>
          <div className="w-24 sm:w-32 h-2.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-500" 
              style={{ width: `${enrollment.progressPercentage || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Dual-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[calc(100vh-65px)]">
        
        {/* Left Interactive Sidebar (Modules, Lessons & Assignments) */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-65px)]">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Curriculum Navigation
          </h2>

          <div className="space-y-4">
            {modules.map((mod, modIdx) => (
              <div key={mod.moduleId || modIdx} className="space-y-2">
                <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Module {modIdx + 1}
                  </p>
                  <h3 className="text-xs font-extrabold uppercase tracking-tight text-slate-900 dark:text-slate-100">
                    {mod.title}
                  </h3>
                </div>

                <div className="pl-2 space-y-1">
                  {(mod.lessons || []).map((les, lesIdx) => {
                    const isSelected = activeLesson?._id === les._id;
                    return (
                      <button
                        key={les._id}
                        onClick={() => {
                          setActiveLesson(les);
                          setActiveAssignment(null);
                        }}
                        className={`w-full p-3 rounded-xl text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20' 
                            : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {les.isCompleted ? (
                            <CheckCircle2 size={15} className={isSelected ? 'text-white' : 'text-emerald-500'} />
                          ) : (
                            <PlayCircle size={15} className={isSelected ? 'text-white' : 'text-indigo-500'} />
                          )}
                          <span className="text-xs truncate">{lesIdx + 1}. {les.title}</span>
                        </div>
                        <span className="text-[9px] uppercase font-black opacity-80">{les.contentType}</span>
                      </button>
                    );
                  })}

                  {(mod.assignments || []).map((asg, asgIdx) => {
                    const isSelected = activeAssignment?._id === asg._id;
                    const isGraded = asg.submission?.status === 'GRADED';

                    return (
                      <button
                        key={asg._id}
                        onClick={() => {
                          setActiveAssignment(asg);
                          setActiveLesson(null);
                        }}
                        className={`w-full p-3 rounded-xl text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20' 
                            : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Award size={15} className={isSelected ? 'text-white' : 'text-amber-500'} />
                          <span className="text-xs truncate">Assignment: {asg.title}</span>
                        </div>
                        {isGraded && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500 text-white">
                            {asg.submission.grade}/{asg.maxMarks}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Main Viewer (Lesson Player / Assignment Form) */}
        <div className="lg:col-span-3 p-6 md:p-10 space-y-8 overflow-y-auto max-h-[calc(100vh-65px)]">
          
          {/* Active Lesson Content Viewer */}
          {activeLesson && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {activeLesson.contentType} LESSON
                  </span>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                    {activeLesson.title}
                  </h2>
                </div>

                {!activeLesson.isCompleted ? (
                  <button
                    onClick={() => handleMarkComplete(activeLesson._id)}
                    disabled={completing}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-2"
                  >
                    {completing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    Mark as Complete
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 size={16} /> Completed
                  </span>
                )}
              </div>

              {activeLesson.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {activeLesson.description}
                </p>
              )}

              {/* Render Video Player */}
              {activeLesson.contentType === 'VIDEO' && (
                <div className="bg-black rounded-3xl overflow-hidden shadow-2xl aspect-video border border-slate-800">
                  {activeLesson.fileUrl ? (
                    <video controls className="w-full h-full object-contain">
                      <source src={activeLesson.fileUrl} type={activeLesson.fileMetadata?.mimeType || "video/mp4"} />
                      Your browser does not support video playback.
                    </video>
                  ) : activeLesson.externalUrl ? (
                    <iframe
                      src={activeLesson.externalUrl.replace("watch?v=", "embed/")}
                      title={activeLesson.title}
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-bold">
                      No video source attached.
                    </div>
                  )}
                </div>
              )}

              {/* Render PDF / Document Reader */}
              {(activeLesson.contentType === 'PDF' || activeLesson.contentType === 'DOCUMENT') && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl space-y-6">
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <FileText className="text-indigo-600" size={24} />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {activeLesson.fileMetadata?.originalName || 'Downloadable Lesson Material'}
                        </h4>
                        <p className="text-[10px] text-slate-400">PDF / Document File</p>
                      </div>
                    </div>
                    {activeLesson.fileUrl && (
                      <a
                        href={activeLesson.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <Download size={14} /> Download Document
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Render External Link */}
              {activeLesson.contentType === 'LINK' && activeLesson.externalUrl && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl text-center space-y-4">
                  <LinkIcon className="mx-auto text-indigo-600" size={36} />
                  <p className="text-xs text-slate-500">This lesson contains external learning resources.</p>
                  <a
                    href={activeLesson.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider"
                  >
                    Open Resource Link <ExternalLink size={14} />
                  </a>
                </div>
              )}

              {/* Render Text Content */}
              {activeLesson.contentType === 'TEXT' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl space-y-4">
                  <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {activeLesson.textContent || 'No text content provided.'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Assignment Submission Form */}
          {activeAssignment && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-500">
                    PRACTICAL ASSIGNMENT
                  </span>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                    {activeAssignment.title}
                  </h2>
                </div>
                <span className="px-4 py-2 rounded-xl text-xs font-black uppercase bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  Max Marks: {activeAssignment.maxMarks}
                </span>
              </div>

              {activeAssignment.instructions && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Instructions</h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium">
                    {activeAssignment.instructions}
                  </p>
                </div>
              )}

              {/* Evaluation Status Banner */}
              {activeAssignment.submission && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Your Submission Status</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      activeAssignment.submission.status === 'GRADED' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {activeAssignment.submission.status}
                    </span>
                  </div>

                  {activeAssignment.submission.status === 'GRADED' && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2">
                      <p className="text-xs font-bold text-emerald-600">
                        Score Evaluated: {activeAssignment.submission.grade} / {activeAssignment.maxMarks}
                      </p>
                      {activeAssignment.submission.feedback && (
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          <strong>Instructor Feedback:</strong> {activeAssignment.submission.feedback}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Submission Form */}
              <form onSubmit={handleSubmitAssignment} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl space-y-6">
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                  Submit Solution
                </h3>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                    Submission Format
                  </label>
                  <div className="flex gap-4">
                    {['TEXT', 'FILE', 'LINK'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSubmissionType(type)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          submissionType === type
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-slate-950 text-slate-400 border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {submissionType === 'TEXT' && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                      Text Answer / Explanation
                    </label>
                    <textarea
                      rows={6}
                      value={textAnswer}
                      onChange={(e) => setTextAnswer(e.target.value)}
                      placeholder="Type your complete assignment solution code or text answer here..."
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-xs font-medium text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}

                {submissionType === 'LINK' && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                      GitHub Repository or Live Solution Link
                    </label>
                    <input
                      type="url"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="https://github.com/username/project-repo"
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}

                {submissionType === 'FILE' && (
                  <div className="space-y-2 p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                      Attach Solution File (ZIP, PDF, DOC)
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
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  Submit Solution
                </button>
              </form>
            </div>
          )}

          {!activeLesson && !activeAssignment && (
            <div className="p-20 text-center text-slate-400 font-medium space-y-3">
              <BookOpen className="mx-auto opacity-40" size={48} />
              <p className="text-xs">Select a lesson or assignment from the curriculum menu on the left to begin learning.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentCourseViewer;
