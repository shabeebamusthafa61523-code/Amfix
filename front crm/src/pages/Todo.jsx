import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Clock, CheckCircle2, Eye, Layout, X, 
  Trash2, Edit3, Save, Upload, Image as ImageIcon, 
  Loader2, Camera, ShieldCheck, User, Target, Info, Building, FolderKanban,
  Paperclip, Link2, ExternalLink, FileText
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import ConfirmModal from '../components/ConfirmModal';

const API_BASE = import.meta.env.VITE_API_URL;// --- UTILS & CONSTANTS ---
const getTaskImageUrl = (path) => {
  if (!path) return null;
  if (typeof path === 'object') {
    path = path.url || path.file || path.image || path.path || null;
    if (!path) return null;
  }
  if (typeof path !== 'string') return null;

  // Cloudinary PDF handling: convert .pdf to .png viewable URL so Cloudinary streams it on screen cleanly
  if (path.includes('res.cloudinary.com')) {
    let cleanUrl = path
      .replace('/raw/upload/', '/image/upload/')
      .replace('/image/upload/fl_inline/', '/image/upload/');
      
    if (/\.pdf$/i.test(cleanUrl)) {
      cleanUrl = cleanUrl.replace(/\.pdf$/i, '.png');
    }
    return cleanUrl;
  }

  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }

  const cleanPath = path.replace(/^\//, '');
  if (cleanPath.startsWith('uploads') || cleanPath.startsWith('files')) {
    const backendHost = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace('/api/v1', '').replace('/api', '');
    return `${backendHost}/${cleanPath}`;
  }

  const fileName = path.split(/[\\/]/).pop();
  if (fileName.startsWith('http')) return fileName;
  const cleanFileName = fileName.replace(/\.pdf$/i, '.png');
  return `https://res.cloudinary.com/davmqgfsq/image/upload/v1776844261/tasks/${cleanFileName}`;
};

const COLUMN_META = {
  pending: { label: 'Pending', icon: Layout, color: 'bg-[#e26a6a]', glow: 'shadow-[#e26a6a]/20' },
  current: { label: 'Current', icon: Clock, color: 'bg-[#e5a23a]', glow: 'shadow-[#e5a23a]/20' },
  preview: { label: 'Preview', icon: Eye, color: 'bg-indigo-500', glow: 'shadow-indigo-500/20' },
  done: { label: 'Completed', icon: CheckCircle2, color: 'bg-[#b7d333]', glow: 'shadow-[#b7d333]/20' }
};

const PRIORITY_META = {
  high: { 
    label: 'High Priority',
    shortLabel: 'High', 
    color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30', 
    dot: 'bg-rose-500',
    style: { backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.4)' },
    dotStyle: { backgroundColor: '#f43f5e' }
  },
  medium: { 
    label: 'Medium Priority', 
    shortLabel: 'Medium',
    color: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30', 
    dot: 'bg-sky-500',
    style: { backgroundColor: 'rgba(2, 132, 199, 0.18)', color: '#0284c7', borderColor: 'rgba(2, 132, 199, 0.45)' },
    dotStyle: { backgroundColor: '#0284c7' }
  },
  low: { 
    label: 'Low Priority', 
    shortLabel: 'Low',
    color: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30', 
    dot: 'bg-yellow-500',
    style: { backgroundColor: 'rgba(234, 179, 8, 0.18)', color: '#ca8a04', borderColor: 'rgba(234, 179, 8, 0.45)' },
    dotStyle: { backgroundColor: '#eab308' }
  }
};

const DEFAULT_DESIGNATIONS = [
  { id: "1", name: "HR Manager" }, { id: "2", name: "Graphic Designer" },
  { id: "3", name: "Digital Marketer" }, { id: "4", name: "React Developer" },
  { id: "5", name: "Node Developer" }, { id: "6", name: "Flutter Developer" },
  { id: "7", name: "Fullstack" }, { id: "8", name: "Admin" }, { id: "9", name: "Manager" }
];

const Todo = () => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [designations, setDesignations] = useState(DEFAULT_DESIGNATIONS);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  
  // Determine current user ID from localStorage or JWT token
  const getCurrentUserId = () => {
    const stored = localStorage.getItem('user_id');
    if (stored) {
      return stored.replace(/"/g, '').trim();
    }
    const rawToken = localStorage.getItem('token');
    if (rawToken) {
      try {
        const payload = JSON.parse(atob(rawToken.split('.')[1]));
        // Common fields: id, _id, user_id
        return (payload.id || payload._id || payload.user_id || '').toString().replace(/"/g, '').trim();
      } catch (e) {
        console.warn('Failed to decode JWT for user id', e);
      }
    }
    return '';
  };
  const [currentUserId] = useState(getCurrentUserId);

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}` };
  }, []);
const fetchData = useCallback(async () => {
  try {

    const [tRes, uRes, dRes] = await Promise.all([
      fetch(`${API_BASE}/tasks/all`, {
        headers: getAuthHeaders()
      }),

      fetch(`${API_BASE}/user/list`, {
        headers: getAuthHeaders()
      }),

      fetch(`${API_BASE}/v1/designations`, {
        headers: getAuthHeaders()
      })
    ]);

    const responseText = await tRes.text();
    const tData = JSON.parse(responseText);
    const uData = await uRes.json();
    
    let dData = [];
    if (dRes.ok) {
      const dJson = await dRes.json();
      dData = dJson.data || [];
    }

    const rawTasks = Array.isArray(tData)
      ? tData
      : (tData.data || []);

    const sortedTasks = [...rawTasks].reverse();
    const cleanedTasks = sortedTasks.map(task=>({
      ...task,
      assigned_to:
        (task.assigned_to && typeof task.assigned_to === "object")
          ? (task.assigned_to.id || task.assigned_to._id || "")
          : (task.assigned_to || "")
    }));

    setTasks(cleanedTasks);
    setUsers(
      Array.isArray(uData) ? uData : []
    );
    if (Array.isArray(dData) && dData.length > 0) {
      setDesignations(dData);
    }
  } catch (e) {
    console.error("Fetch Error:", e);
  } finally {
    setLoading(false);
  }
}, [getAuthHeaders]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const onDragEnd = async (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const newStatus = destination.droppableId;
    const oldTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id.toString() === draggableId ? { ...t, status: newStatus } : t));
    try {
      await fetch(`${API_BASE}/tasks/task-status/${draggableId}?status=${newStatus}`, {
        method: 'PUT', headers: getAuthHeaders()
      });
    } catch (err) { setTasks(oldTasks); }
  };

  if (loading) return (
    <div className="min-h-[75vh] bg-transparent flex flex-col items-center justify-center">
      <div className="relative">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <div className="absolute inset-0 blur-xl bg-indigo-500/20 animate-pulse" />
      </div>
      <p className="mt-6 text-[10px] font-black uppercase tracking-[0.5em] text-indigo-500/50">Syncing Nexus</p>
    </div>
  );
console.log("TOKEN:", localStorage.getItem("token"));
console.log("HEADERS:", getAuthHeaders());
  return (
    <div className="text-slate-700 dark:text-slate-200 font-sans selection:bg-white-500/30 selection:text-white">
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      
      <div className="max-w-[1700px] mx-auto py-2">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
          <div>
            <div className="flex items-center gap-3 ">
              {/* <div className="h-2 w-2 bg-indigo-500 rounded-full animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500/70 dark:text-indigo-400/80">System Live</span> */}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 italic tracking-tighter leading-none">
              TASKS <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500"></span>
            </h1>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="group relative flex items-center justify-center gap-3 px-10 py-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-sm rounded-full font-black text-[11px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-indigo-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <Plus size={18} className="relative z-10 group-hover:text-white" /> 
            <span className="relative z-10 group-hover:text-white">Create Task</span>
          </button>
        </header>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            {Object.keys(COLUMN_META).map(statusKey => (
              <Droppable droppableId={statusKey} key={statusKey}>
                {(provided, snapshot) => (
                  <div 
                    {...provided.droppableProps} ref={provided.innerRef} 
                    className={`flex flex-col min-h-[75vh] rounded-[2.25rem] transition-all duration-300 border ${snapshot.isDraggingOver ? 'bg-indigo-500/[0.03] dark:bg-indigo-500/[0.01] border-indigo-500/30 dark:border-indigo-500/20 shadow-inner' : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200/50 dark:border-slate-800/40'}`}
                  >
                    <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-900/80">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-sm ${COLUMN_META[statusKey].glow}`}>
                          {React.createElement(COLUMN_META[statusKey].icon, {
                            size: 15,
                            className: COLUMN_META[statusKey].color.replace('bg-', 'text-')
                          })}
                        </div>
                        <h2 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] tracking-[0.2em]">{COLUMN_META[statusKey].label}</h2>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200/20 dark:border-slate-800/30">{tasks.filter(t => t.status === statusKey).length}</span>
                    </div>

                    <div className="p-4 space-y-4">
                      {tasks.filter(t => t.status === statusKey).map((task, index) => {
                        const checkIsUrgent = (dateString) => {
                          if (!dateString) return false;
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const due = new Date(dateString);
                          due.setHours(0, 0, 0, 0);
                          const diffTime = due.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          return diffDays <= 1; // Today, tomorrow, or overdue
                        };
                        const isUrgent = task.dueDate && statusKey !== 'done' && checkIsUrgent(task.dueDate);
                        const prioKey = String(task.priority || 'medium').toLowerCase();
                        const prioMeta = PRIORITY_META[prioKey] || PRIORITY_META.medium;

                        return (
                        <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                          {(p, s) => (
                            <div 
                              ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} 
                              onClick={() => setSelectedTask(task)} 
                              className={`group relative p-5 pl-7 rounded-[1.75rem] bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border ${isUrgent ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20' : 'border-slate-200/50 dark:border-slate-800/50'} shadow-sm hover:shadow-lg dark:hover:shadow-indigo-500/[0.02] transition-all duration-300 cursor-grab active:cursor-grabbing hover:-translate-y-[2px] ${s.isDragging ? 'rotate-[1.5deg] scale-[1.02] shadow-2xl z-50 bg-white/95 dark:bg-slate-900/95 border-indigo-500/40 dark:border-indigo-500/50 ring-2 ring-indigo-500/10' : ''}`}
                            >
                              {/* Left Accent Bar */}
                              <div className={`absolute left-0 top-6 bottom-6 w-[3px] rounded-r-full transition-all duration-300 group-hover:top-4 group-hover:bottom-4 ${isUrgent ? 'bg-rose-500' : COLUMN_META[statusKey].color}`} />

                              <div className="flex items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                  {/* Priority Badge Button */}
                                  <span style={prioMeta.style} className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${prioMeta.color}`}>
                                    <span style={prioMeta.dotStyle} className={`w-1.5 h-1.5 rounded-full ${prioMeta.dot} animate-pulse`} />
                                    {prioMeta.shortLabel || prioKey}
                                  </span>
                                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                    {designations.find(d => String(d.id) === String(task.designation_id))?.name || "General"}
                                  </span>
                                </div>
                                {task.project && (
                                  <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/60 truncate max-w-[130px]">
                                    {typeof task.project === 'object' && task.project ? (task.project.projectName || task.project.projectCode) : 'Project'}
                                  </span>
                                )}
                              </div>

                              <h3 className="text-slate-800 dark:text-slate-200 font-bold text-[14px] leading-snug mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">{task.title}</h3>
                              {task.dueDate && (
                                <div className={`text-[10px] font-bold mb-4 flex items-center gap-1.5 ${isUrgent ? 'text-rose-500' : 'text-slate-500'}`}>
                                  <Clock size={12} />
                                  <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                </div>
                              )}

                              
                              <div className="flex items-center justify-between pt-4 border-t border-slate-100/60 dark:border-slate-850/50">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-750/50 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                    <User size={12} />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wide truncate max-w-[120px]">
                                    {
                                      (task.assigned_to && typeof task.assigned_to === "object")
                                        ? task.assigned_to?.name
                                        : users.find(
                                            u => String(u.id || u._id) === String(task.assigned_to)
                                          )?.name
                                          || task.assigned_to
                                          || "No Agent"
                                    }
                                  </span>
                                </div>
                                {task.image && (
                                  <div className="p-1.5 rounded-lg bg-white-500/10 text-white-500 dark:text-indigo-400 border border-indigo-500/10">
                                    <ImageIcon size={12} />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {isModalOpen && (
          <CreateModal 
            onClose={() => setIsModalOpen(false)} 
            users={users} refresh={fetchData} getAuthHeaders={getAuthHeaders} 
            designations={designations}
          />
        )}
        {selectedTask && (
          <DetailModal 
            task={selectedTask} users={users} 
            currentUserId={currentUserId}
            onClose={() => setSelectedTask(null)} 
            onUpdate={fetchData}           // Pointing to your fetch function
            getAuthHeaders={getAuthHeaders}
            API_BASE={API_BASE} // <--- ADD THIS LINE
            DESIGNATIONS={designations} 
            onPreviewFile={(f) => setPreviewFile(f)}
          />
        )}
        {previewFile && (
          <DocPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- CREATE MODAL COMPONENT ---
const CreateModal = ({ onClose, users, refresh, getAuthHeaders, designations }) => {
  const { showToast } = useToast();

  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', designation_id: '', dueDate: '', client: '', project: '', priority: 'medium' });
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [attachedLinks, setAttachedLinks] = useState([]);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  const [clientsList, setClientsList] = useState([]);
  const [clientProjects, setClientProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/v1/clients?limit=100`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data && data.success) setClientsList(data.data.clients || []);
      })
      .catch(err => console.error("Failed to load clients in task modal", err));

    fetch(`${API_BASE}/v1/projects?limit=100`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          const list = data.data.projects || [];
          setAllProjects(list);
          setClientProjects(list);
        }
      })
      .catch(err => console.error("Failed to load projects in task modal", err));
  }, [getAuthHeaders]);

  const handleMultiFiles = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length > 0) {
      setAttachedFiles(prev => [...prev, ...selected]);
    }
    e.target.value = '';
  };

  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddLink = (e) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    let formattedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }
    const newLink = {
      title: linkTitle.trim() || formattedUrl,
      url: formattedUrl
    };
    setAttachedLinks(prev => [...prev, newLink]);
    setLinkTitle('');
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const removeLink = (index) => {
    setAttachedLinks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('description', form.description || '');
    fd.append('assigned_to', form.assigned_to);
    fd.append('designation_id', form.designation_id);
    fd.append('status', 'pending');
    fd.append('priority', form.priority || 'medium');
    if (form.dueDate) fd.append('dueDate', form.dueDate);
    if (form.dueDate) fd.append('dueDate', form.dueDate);
    if (form.client) fd.append('client', form.client);
    if (form.project) fd.append('project', form.project);

    // Append multiple files
    attachedFiles.forEach(f => {
      fd.append('file', f);
    });

    // Append links as JSON
    if (attachedLinks.length > 0) {
      fd.append('links', JSON.stringify(attachedLinks));
    }

  // DEBUG
  for (let pair of fd.entries()) {
    console.log(pair[0], pair[1]);
  }

  try {
    const res = await fetch(`${API_BASE}/tasks/create`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: fd
    });

    const data = await res.json();

    console.log("STATUS:", res.status);
    console.log("RESPONSE:", data);
    console.log("ERRORS FULL:", JSON.stringify(data.errors, null, 2));
    if (!res.ok) {
      showToast(data.message || "Task creation failed", "error");
      return;
    }

    showToast("Task successfully created!", "success");
    await refresh();
    onClose();

  } catch (e) {
    console.error("CREATE ERROR:", e);
    showToast("Network error. Task creation failed.", "error");
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex justify-center items-start pt-6 overflow-y-auto p-4"
    >
      <motion.div 
        initial={{ y: -40, scale: 0.95 }} animate={{ y: 0, scale: 1 }}
        className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl p-6 shadow-xl relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"><X size={18}/></button>
        
        <header className="mb-4">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">New <span className="text-indigo-600">Task</span></h2>
        </header>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Multi-Attachments & Multi-Links Section */}
          <div className="space-y-2.5 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] flex items-center gap-1.5">
                <Paperclip size={12} /> Attachments & Links ({attachedFiles.length + attachedLinks.length})
              </span>
              <button
                type="button"
                onClick={() => setShowLinkInput(prev => !prev)}
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Link2 size={12} /> + Add External Link
              </button>
            </div>

            {/* Multi-file selection input */}
            <div className="group relative flex items-center gap-3 w-full border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl px-3 py-2.5 bg-white dark:bg-slate-800 transition-all cursor-pointer">
              <input 
                type="file" 
                multiple 
                className="absolute inset-0 opacity-0 cursor-pointer w-full z-10" 
                onChange={handleMultiFiles} 
              />
              <Upload size={15} className="text-indigo-500 shrink-0" />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                Upload files / images — Select multiple files or images
              </span>
            </div>

            {/* Render Selected File Chips */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {attachedFiles.map((f, idx) => {
                  const isImg = f.type?.startsWith('image/');
                  return (
                    <div key={idx} className="flex items-center gap-2 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                      {isImg ? (
                        <img src={URL.createObjectURL(f)} className="w-5 h-5 rounded-md object-cover" alt="thumb" />
                      ) : (
                        <FileText size={13} className="text-indigo-500" />
                      )}
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate max-w-[140px]">{f.name}</span>
                      <button type="button" onClick={() => removeFile(idx)} className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer">
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Link Popover Inline */}
            {showLinkInput && (
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    placeholder="Link Title (e.g. Figma, Drive)" 
                    value={linkTitle} 
                    onChange={e => setLinkTitle(e.target.value)} 
                    className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none text-slate-900 dark:text-slate-100"
                  />
                  <input 
                    type="url" 
                    placeholder="https://example.com" 
                    value={linkUrl} 
                    onChange={e => setLinkUrl(e.target.value)} 
                    className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowLinkInput(false)} className="px-2.5 py-1 text-[10px] font-bold text-slate-500 cursor-pointer">Cancel</button>
                  <button type="button" onClick={handleAddLink} className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider cursor-pointer">Save Link</button>
                </div>
              </div>
            )}

            {/* Render Selected Link Chips */}
            {attachedLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {attachedLinks.map((l, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800/60 text-[10px] font-bold">
                    <ExternalLink size={12} />
                    <span className="truncate max-w-[150px]">{l.title}</span>
                    <button type="button" onClick={() => removeLink(idx)} className="text-indigo-400 hover:text-rose-500 p-0.5 cursor-pointer">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] ml-1">Title</label>
              <input required className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-900 text-sm font-semibold outline-none focus:border-indigo-500/50" placeholder="Task title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] ml-1">Priority</label>
              <select
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-bold outline-none cursor-pointer"
                value={form.priority || 'medium'}
                onChange={e => setForm({ ...form, priority: e.target.value })}
              >
                <option value="high">🔴 High</option>
                <option value="medium">🔷 Medium</option>
                <option value="low">🟡 Low</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] ml-1">Due Date</label>
              <input type="date" min={new Date().toISOString().split('T')[0]} className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-900 text-sm font-semibold outline-none focus:border-indigo-500/50" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
            </div>
          </div>

          {/* Client & Project Selection Section (Feature 1) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] ml-1">Client</label>
              <select
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-bold outline-none"
                value={form.client}
                onChange={async (e) => {
                  const clientId = e.target.value;
                  setForm(prev => ({ ...prev, client: clientId, project: '' }));
                  if (clientId) {
                    try {
                      const res = await fetch(`${API_BASE}/v1/projects?client=${clientId}&limit=100`, { headers: getAuthHeaders() });
                      const d = await res.json();
                      if (d && d.success) setClientProjects(d.data.projects || []);
                    } catch (err) { console.error("Failed to fetch client projects", err); }
                  } else {
                    setClientProjects(allProjects);
                  }
                }}
              >
                <option value="">Select Client (Optional)</option>
                {clientsList.map(c => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.companyName} ({c.clientId})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] ml-1">Project</label>
              <select
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-bold outline-none cursor-pointer"
                value={form.project}
                onChange={e => {
                  const projId = e.target.value;
                  const selectedProj = clientProjects.find(p => String(p._id || p.id) === String(projId));
                  let parentClient = form.client;
                  if (selectedProj && selectedProj.client) {
                    parentClient = (selectedProj.client && typeof selectedProj.client === 'object') ? (selectedProj.client._id || selectedProj.client.id) : selectedProj.client;
                  }
                  setForm({ ...form, project: projId, client: parentClient });
                }}
              >
                <option value="">Select Active Project (Optional)</option>
                {clientProjects.map(p => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.projectName} ({p.projectCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] ml-1">Assign To</label>
            <div className="grid grid-cols-2 gap-3">
              <select
                required
                className="appearance-none bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 px-3 py-2 rounded-xl text-gray-900 dark:text-gray-200 text-xs font-bold outline-none"
                value={form.assigned_to}
                onChange={e => {
                  const userId = e.target.value;
                  const user = users.find(u => String(u.id || u._id) === String(userId));
                  let desigId = '';
                  if (user) {
                    if (user.designationId) {
                      desigId = (user.designationId && typeof user.designationId === 'object')
                        ? (user.designationId._id || user.designationId.id || '')
                        : String(user.designationId);
                    } else if (user.designation) {
                      desigId = String(user.designation);
                    }
                  }
                  setForm({ ...form, assigned_to: userId, designation_id: desigId });
                }}
              >
                <option value="">Assign to</option>
                {users.map(u => (
                  <option key={u.id || u._id} value={u.id || u._id} className="bg-white text-gray-900">
                    {u.name}
                  </option>
                ))}
              </select>
              <div className="bg-slate-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-650 px-3 py-2 rounded-xl text-gray-500 dark:text-gray-400 text-xs font-bold flex items-center">
                <span>
                  {designations.find(d => String(d.id || d._id) === String(form.designation_id))?.name || "Designation"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] ml-1">Briefing</label>
            <textarea className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-900 text-sm h-20 resize-none outline-none focus:border-indigo-500/50" placeholder="Enter task details..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>

          <button disabled={isSubmitting} className="w-full py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-black uppercase text-[11px] tracking-[0.2em] transition-all flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
            Submit Task
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

// --- LIVE IN-APP DOCUMENT PREVIEW MODAL ---
const DocPreviewModal = ({ file, onClose }) => {
  if (!file) return null;
  const rawUrl = typeof file === 'string' ? file : (file.url || file.file || file.image);
  const fileName = typeof file === 'object' && file.name ? file.name : (rawUrl ? rawUrl.split(/[\\/]/).pop() : 'Document');
  
  const isImage = (typeof file === 'object' && file.fileType === 'image') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(rawUrl || '');
  const isPdf = /\.(pdf)$/i.test(rawUrl || fileName);
  
  let targetUrl = rawUrl;
  if (targetUrl && targetUrl.includes('res.cloudinary.com')) {
    targetUrl = targetUrl.replace('/raw/upload/', '/image/upload/');
  }

  // Cloudinary PDF to Image rendering URL
  const cloudinaryJpgUrl = (targetUrl && targetUrl.includes('res.cloudinary.com') && isPdf) 
    ? targetUrl.replace(/\.pdf$/i, '.jpg') 
    : null;

  const [useJpgFallback, setUseJpgFallback] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[6000] bg-slate-950/80 backdrop-blur-md flex flex-col justify-between p-3 md:p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900/90 text-white px-5 py-3 rounded-2xl border border-slate-800 shadow-2xl mb-3">
        <div className="flex items-center gap-3 truncate">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
            {isImage || isPdf ? <ImageIcon size={18} /> : <FileText size={18} />}
          </div>
          <div className="truncate">
            <h3 className="text-sm font-bold text-slate-100 truncate max-w-md">{fileName}</h3>
            <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">
              {isImage ? 'Image Preview' : (isPdf ? 'PDF Live View' : 'Document View')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPdf && cloudinaryJpgUrl && (
            <button
              type="button"
              onClick={() => setUseJpgFallback(prev => !prev)}
              className="px-3 py-1.5 bg-indigo-600/30 border border-indigo-500/40 hover:bg-indigo-600 text-xs font-bold rounded-xl text-indigo-200 transition-colors cursor-pointer"
            >
              {useJpgFallback ? 'Switch to PDF View' : 'Render Page as Image'}
            </button>
          )}
          <a 
            href={targetUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 text-slate-200 transition-colors"
          >
            <ExternalLink size={13} /> Open Raw Link
          </a>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Embedded Live Viewer Area */}
      <div className="flex-1 w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center relative shadow-inner">
        {isImage || useJpgFallback ? (
          <img src={useJpgFallback ? cloudinaryJpgUrl : targetUrl} className="max-w-full max-h-full object-contain p-4 rounded-xl" alt={fileName} />
        ) : isPdf ? (
          <object 
            data={targetUrl} 
            type="application/pdf" 
            className="w-full h-full min-h-[75vh] rounded-2xl border-0 bg-white"
          >
            <iframe 
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(targetUrl)}&embedded=true`} 
              className="w-full h-full min-h-[75vh] rounded-2xl border-0 bg-white" 
              title={fileName}
            />
          </object>
        ) : (
          <iframe 
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(targetUrl)}&embedded=true`} 
            className="w-full h-full min-h-[75vh] rounded-2xl border-0 bg-white" 
            title={fileName}
          />
        )}
      </div>
    </motion.div>
  );
};

// --- DETAIL MODAL COMPONENT (CLEANED & INTEGRATED) ---
const DetailModal = ({ task, currentUserId, onClose, onUpdate, getAuthHeaders, DESIGNATIONS, users, API_BASE, onPreviewFile }) => {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newFile, setNewFile] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const statusConfig = {
    pending: { 
      label: 'Pending', 
      activeClass: 'bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 font-bold', 
      dot: 'bg-rose-600' 
    },
    current: { 
      label: 'Current', 
      activeClass: 'bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 font-bold', 
      dot: 'bg-amber-600' 
    },
    preview: { 
      label: 'Preview', 
      activeClass: 'bg-indigo-100 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-800 dark:text-indigo-300 font-bold', 
      dot: 'bg-indigo-600' 
    },
    done: { 
      label: 'Completed', 
      activeClass: 'bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 font-bold', 
      dot: 'bg-emerald-600' 
    }
  };

  const canModify = useMemo(() => {
    const getCreatorId = () => {
      const candidates = [
        task?.user_id,
        task?.created_by?._id,
        task?.created_by?.id,
        task?.created_by
      ];

      for (const val of candidates) {
        if (!val) continue;
        const str = (val && typeof val === 'object')
          ? (val._id || val.id || '').toString().trim()
          : (val ? val.toString().trim() : '');

        if (str && str !== '[object Object]') {
          return str;
        }
      }
      return null;
    };

    const creatorId = getCreatorId();
    return currentUserId && creatorId && String(currentUserId).trim() === creatorId;
  }, [task, currentUserId]);

  const [clientsList, setClientsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);

  useEffect(() => {
    if (!API_BASE || !getAuthHeaders) return;
    fetch(`${API_BASE}/v1/clients?limit=100`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(d => d?.success && setClientsList(d.data.clients || []))
      .catch(() => {});

    fetch(`${API_BASE}/v1/projects?limit=100`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(d => d?.success && setProjectsList(d.data.projects || []))
      .catch(() => {});
  }, [getAuthHeaders, API_BASE]);

  useEffect(() => { 
    if (task) { 
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const rawClient = (task.client && typeof task.client === 'object') ? (task.client._id || task.client.id) : (task.client || task.client_id || '');
      const rawProject = (task.project && typeof task.project === 'object') ? (task.project._id || task.project.id) : (task.project || task.project_id || '');
      setEditForm({ ...task, status: task.status || "pending", client: rawClient, project: rawProject }); 
      setIsEditing(false); 
      setNewFile(null);
    } 
  }, [task]);

  if (!task || !editForm) return null;

  const handleUpdate = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const fd = new FormData();
    fd.append('title', editForm.title);
    fd.append('description', editForm.description || '');
    fd.append('assigned_to', editForm.assigned_to);
    fd.append('designation_id', editForm.designation_id);
    if (editForm.priority) fd.append('priority', editForm.priority);

    if (editForm.client) {
      const cid = (editForm.client && typeof editForm.client === 'object') ? (editForm.client._id || editForm.client.id) : editForm.client;
      if (cid) fd.append('client', cid);
    }
    if (editForm.project) {
      const pid = (editForm.project && typeof editForm.project === 'object') ? (editForm.project._id || editForm.project.id) : editForm.project;
      if (pid) fd.append('project', pid);
    }

    if (newFile) fd.append('file', newFile);
    if (editForm.dueDate) fd.append('dueDate', editForm.dueDate);

    try {
      await fetch(`${API_BASE}/tasks/update/${task.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: fd
      });

      if (editForm.status !== task.status) {
        await fetch(`${API_BASE}/tasks/task-status/${task.id}?status=${editForm.status}`, {
          method: "PUT",
          headers: getAuthHeaders()
        });
      }

      await onUpdate();
      onClose();

    } catch (e) {
      console.error("Update error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setEditForm(prev => ({ ...prev, status: newStatus }));

    try {
      await fetch(`${API_BASE}/tasks/task-status/${task.id}?status=${newStatus}`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      await onUpdate();
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  const handleDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleteConfirmOpen(false);
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/tasks/delete/${task.id}`, { 
        method: "DELETE", 
        headers: getAuthHeaders()
      });

      if (res.ok) {
        showToast("Task successfully deleted!", "success");
        await onUpdate();
        onClose();
      } else {
        showToast("Failed to delete task.", "error");
        console.warn("Backend Session Error detected, forcing UI refresh...");
        await onUpdate();
        onClose();
      }
    } catch (e) {
      showToast("Error deleting task.", "error");
      console.error("Delete error:", e);
      await onUpdate();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[5000] bg-slate-900/40 backdrop-blur-sm flex justify-center items-start pt-6 overflow-y-auto p-4"
    >
      <motion.div 
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col lg:flex-row shadow-2xl"
      >
        <div className="w-full lg:w-3/12 bg-slate-50 dark:bg-slate-950/40 p-4 flex flex-col items-center justify-start gap-3 relative border-r border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 self-start">
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[8px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.3em]">Task</span>
          </div>

          {/* Attachments & Links Gallery in Detail Modal */}
          <div className="w-full space-y-2">
            {task.attachments && task.attachments.length > 0 ? (
              <div className="space-y-1.5 w-full">
                {task.attachments.map((att, idx) => {
                  const fileUrl = getTaskImageUrl(att);
                  const isImg = att?.fileType === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileUrl || att?.name || '');
                  return (
                    <div key={idx} className="group relative w-full">
                      <a 
                        href={fileUrl} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 hover:border-indigo-500/50 transition shadow-xs cursor-pointer group w-full text-left"
                      >
                        {isImg ? (
                          <ImageIcon size={14} className="text-indigo-500 shrink-0 group-hover:scale-110 transition-transform" />
                        ) : (
                          <FileText size={14} className="text-indigo-500 shrink-0 group-hover:scale-110 transition-transform" />
                        )}
                        <span className="truncate flex-1 font-bold text-[11px]">{att.name || (isImg ? 'View Image' : 'View Document')}</span>
                        <ExternalLink size={11} className="text-slate-400 group-hover:text-indigo-500 shrink-0" />
                      </a>
                    </div>
                  );
                })}
              </div>
            ) : (
              (task.image || task.file) && (
                <a 
                  href={getTaskImageUrl(task.image || task.file)} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 hover:border-indigo-500/50 transition shadow-xs cursor-pointer group w-full text-left"
                >
                  <ImageIcon size={14} className="text-indigo-500 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="truncate flex-1 font-bold text-[11px]">View Attachment</span>
                  <ExternalLink size={11} className="text-slate-400 group-hover:text-indigo-500 shrink-0" />
                </a>
              )
            )}

            {/* Links List */}
            {task.links && task.links.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 w-full">
                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider block">Attached Links</span>
                {task.links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold hover:underline truncate w-full"
                  >
                    <ExternalLink size={12} className="shrink-0 text-indigo-500" />
                    <span className="truncate flex-1">{link.title || link.url}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {isEditing && (
            <label className="w-full py-2 border border-dashed border-indigo-500/30 rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-indigo-500/5 transition-all">
              <input type="file" multiple className="hidden" onChange={(e) => setNewFile(e.target.files[0])} />
              <Camera size={13} className="text-indigo-500" />
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate max-w-[120px]">
                {newFile ? newFile.name : 'Add / Replace File'}
              </span>
            </label>
          )}
        </div>

        <div className="w-full lg:w-9/12 p-5 relative flex flex-col justify-between bg-white dark:bg-slate-900">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all">
            <X size={16} />
          </button>

          <div>
            {/* STATUS & PRIORITY */}
            <div className="mb-3">
              {isEditing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mb-1 block ml-1">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full appearance-none bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-black uppercase tracking-[0.15em] outline-none focus:border-indigo-500/50 cursor-pointer"
                    >
                      <option value="pending">PENDING</option>
                      <option value="current">CURRENT</option>
                      <option value="preview">PREVIEW</option>
                      <option value="done">COMPLETED</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mb-1 block ml-1">Priority</label>
                    <select
                      value={editForm.priority || 'medium'}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                      className="w-full appearance-none bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-black uppercase tracking-[0.15em] outline-none focus:border-indigo-500/50 cursor-pointer"
                    >
                      <option value="high">🔴 HIGH PRIORITY</option>
                      <option value="medium">🔷 MEDIUM PRIORITY</option>
                      <option value="low">🟡 LOW PRIORITY</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusConfig[task.status]?.activeClass || 'bg-slate-500/10 border-slate-500/20 text-slate-600'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${statusConfig[task.status]?.dot || 'bg-slate-500'}`} />
                    <span className="font-black uppercase text-[10px] tracking-widest">
                      {statusConfig[task.status]?.label || task.status}
                    </span>
                  </div>

                  {(() => {
                    const prioKey = String(task.priority || 'medium').toLowerCase();
                    const meta = PRIORITY_META[prioKey] || PRIORITY_META.medium;
                    return (
                      <div style={meta.style} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${meta.color}`}>
                        <div style={meta.dotStyle} className={`w-1.5 h-1.5 rounded-full animate-pulse ${meta.dot}`} />
                        <span className="font-black uppercase text-[10px] tracking-widest">
                          {meta.label}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mb-1 block ml-1">Title</label>
                  <input 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-slate-900 dark:text-slate-100 text-base font-bold outline-none focus:border-indigo-500/50" 
                    value={editForm.title} 
                    onChange={e => setEditForm({...editForm, title: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mb-1 block ml-1">Description</label>
                  <textarea 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-slate-900 dark:text-slate-100 text-sm h-24 outline-none focus:border-indigo-500/50 resize-none leading-relaxed" 
                    value={editForm.description} 
                    onChange={e => setEditForm({...editForm, description: e.target.value})} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mb-1 block ml-1">Client</label>
                    <select
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-bold outline-none cursor-pointer"
                      value={(editForm.client && typeof editForm.client === 'object') ? (editForm.client._id || editForm.client.id) : (editForm.client || '')}
                      onChange={e => setEditForm({ ...editForm, client: e.target.value })}
                    >
                      <option value="">Select Client (Optional)</option>
                      {clientsList.map(c => (
                        <option key={c._id || c.id} value={c._id || c.id}>
                          {c.companyName} ({c.clientId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mb-1 block ml-1">Project</label>
                    <select
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-bold outline-none cursor-pointer"
                      value={(editForm.project && typeof editForm.project === 'object') ? (editForm.project._id || editForm.project.id) : (editForm.project || '')}
                      onChange={e => setEditForm({ ...editForm, project: e.target.value })}
                    >
                      <option value="">Select Active Project (Optional)</option>
                      {projectsList.map(p => (
                        <option key={p._id || p.id} value={p._id || p.id}>
                          {p.projectName} ({p.projectCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight leading-tight">
                  {task.title}
                </h2>
                
                {/* CLIENT & PROJECT BADGES */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
                    <Building className="w-3.5 h-3.5 text-indigo-500" />
                    <span>
                      Client: {typeof task.client === 'object' && task.client ? (task.client?.companyName || task.client?.clientName) : (clientsList.find(c => String(c._id || c.id) === String(task.client || task.client_id))?.companyName || (task.client || 'General Client'))}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800/60">
                    <FolderKanban className="w-3.5 h-3.5 text-indigo-500" />
                    <span>
                      Project: {typeof task.project === 'object' && task.project ? (task.project?.projectName || task.project?.projectCode) : (projectsList.find(p => String(p._id || p.id) === String(task.project || task.project_id))?.projectName || (task.project || 'Standalone Task'))}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border-y border-r border-slate-100 dark:border-slate-800 border-l-2 border-l-indigo-500 rounded-r-xl">
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium">
                    {task.description || 'No briefing recorded.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 rounded-xl px-3 mt-3">
            <div>
              <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] block mb-2">Staff</span>
              {isEditing ? (
                <div className="relative">
                  <select
                    required
                    className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-slate-900 dark:text-slate-100 text-[11px] font-bold outline-none cursor-pointer"
                    value={editForm.assigned_to}
                    onChange={e => {
                      const userId = e.target.value;
                      const user = users.find(u => String(u.id || u._id) === String(userId));
                      let desigId = '';
                      if (user) {
                        if (user.designationId) {
                          desigId = (user.designationId && typeof user.designationId === 'object')
                            ? (user.designationId._id || user.designationId.id || '')
                            : String(user.designationId);
                        } else if (user.designation) {
                          desigId = String(user.designation);
                        }
                      }
                      setEditForm({ ...editForm, assigned_to: userId, designation_id: desigId });
                    }}
                  >
                    <option value="">Assign to</option>
                    {users.map(u => (
                      <option key={u.id || u._id} value={u.id || u._id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                    <User size={18} />
                  </div>
                  <span className="text-slate-900 dark:text-slate-100 font-bold tracking-tight uppercase text-sm">
                    {
                      (task.assigned_to && typeof task.assigned_to === "object")
                        ? task.assigned_to?.name
                        : users?.find(
                            u => String(u.id || u._id) === String(task.assigned_to)
                          )?.name
                          || task.assigned_to
                          || "No Staff"
                    }
                  </span>
                </div>
              )}
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] block mb-2">Designation</span>
              {isEditing ? (
                <div className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-gray-500 dark:text-gray-400 text-[11px] font-bold">
                  {DESIGNATIONS?.find(d => String(d.id || d._id) === String(editForm.designation_id))?.name || "Designation"}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/20 text-purple-400">
                    <Target size={18} />
                  </div>
                  <span className="text-slate-900 dark:text-slate-100 font-bold tracking-tight uppercase text-sm">
                    {DESIGNATIONS?.find(d => String(d.id) === String(task.designation_id))?.name || "General"}
                  </span>
                </div>
              )}
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] block mb-2">Due Date</span>
              {isEditing ? (
                <input 
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-gray-500 dark:text-gray-400 text-[11px] font-bold outline-none"
                  value={editForm.dueDate ? new Date(editForm.dueDate).toISOString().split('T')[0] : ''}
                  onChange={e => setEditForm({...editForm, dueDate: e.target.value})} 
                />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20 text-rose-400">
                    <Clock size={18} />
                  </div>
                  <span className="text-slate-900 dark:text-slate-100 font-bold tracking-tight uppercase text-sm">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No Due Date'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2.5">
            {canModify ? (
              <>
                {isDeleteConfirmOpen ? (
                  <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 px-3 py-1.5 rounded-xl animate-in slide-in-from-left-2 fade-in duration-200">
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">Delete task?</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsDeleteConfirmOpen(false)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleConfirmDelete}
                        className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg shadow-md shadow-red-500/20 transition-colors"
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={handleDelete}
                    disabled={isSaving || isDeleting}
                    className="px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center cursor-pointer"
                  >
                    {isDeleting ? <Loader2 className="animate-spin" size={13} /> : <Trash2 size={13} />}
                  </button>
                )}
                <button 
                  onClick={isEditing ? handleUpdate : () => setIsEditing(true)} 
                  disabled={isSaving || isDeleting}
                  className="px-4 py-2 bg-indigo-600 text-white font-extrabold uppercase text-[10px] tracking-[0.15em] rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={13} /> : isEditing ? <Save size={13} /> : <Edit3 size={13} />}
                  {isEditing ? (isSaving ? "Saving..." : "Save Changes") : "Edit Task"}
                </button>
              </>
            ) : (
              <div className="w-full py-6 bg-slate-50 dark:bg-slate-950/20 rounded-3xl border border-slate-205 dark:border-slate-800 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 italic font-medium">
                <span className="text-[11px] uppercase tracking-widest font-black">Authorized Creator Access Only</span>
                <span className="text-[8px] opacity-40 uppercase">Visitor: {currentUserId?.slice(0, 8)}... |Owner: {
                  (
                    task?.user_id ||
                    task?.created_by?._id ||
                    task?.created_by?.id ||
                    task?.created_by
                  )?.toString().slice(0,8)
                }...</span>
              </div>
            )}
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
};
export default Todo;