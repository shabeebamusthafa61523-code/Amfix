import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Plus, Search, LayoutGrid, List, ChevronRight, Loader2, 
  Clock, Layers, CheckCircle2, Archive, Eye, Edit, X, Trash2, 
  FolderKanban, ShieldCheck, ArrowUpRight
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';

const API_BASE = import.meta.env.VITE_API_URL;

const CATEGORIES = [
  'ALL',
  'Web Development',
  'Mobile Development',
  'Design',
  'Digital Marketing',
  'Data Science',
  'Software Engineering',
  'Business'
];

const STATUSES = ['ALL', 'ACTIVE', 'DRAFT', 'ARCHIVED', 'INACTIVE'];

const initialCourseForm = {
  courseCode: '',
  courseName: '',
  category: 'Web Development',
  shortDescription: '',
  description: '',
  durationValue: 6,
  durationUnit: 'Months',
  status: 'ACTIVE',
  syllabus: [
    {
      moduleId: 'mod_1',
      title: 'Module 1: Fundamentals & Environment Setup',
      description: 'Introduction to core concepts and toolchain setup',
      order: 1,
      topics: [
        { topicId: 'top_1', title: 'Course Orientation & Architecture Overview', description: '', order: 1 },
        { topicId: 'top_2', title: 'Environment Configuration & Developer Tools', description: '', order: 2 }
      ]
    }
  ]
};

const CourseManagement = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid');
  const [stats, setStats] = useState({ totalCourses: 0, activeCourses: 0, archivedCourses: 0, draftCourses: 0 });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState(initialCourseForm);
  const [activeTab, setActiveTab] = useState('basic');

  const handleNavigateToCourse = (courseObj) => {
    const targetId = courseObj?._id || courseObj?.id || courseObj?.courseId;
    if (!targetId || targetId === 'undefined' || targetId === 'null') {
      showToast("Selected course has an invalid or missing identifier.", "warning");
      return;
    }
    navigate(`/academy/courses/${targetId}`);
  };

  const getHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return {
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`,
      'Content-Type': 'application/json'
    };
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const cleanBase = (API_BASE || '/api').replace(/\/$/, '');
      const endpoint = cleanBase.endsWith('/v1')
        ? `${cleanBase}/academy/courses?search=${encodeURIComponent(searchQuery)}&category=${selectedCategory}&status=${selectedStatus}`
        : `${cleanBase}/v1/academy/courses?search=${encodeURIComponent(searchQuery)}&category=${selectedCategory}&status=${selectedStatus}`;

      const res = await fetch(endpoint, { headers: getHeaders() });
      if (!res.ok) {
        throw new Error('Failed to load course list');
      }

      const data = await res.json();
      setCourses(data.data || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Fetch Courses Error:", err);
      showToast("Unable to fetch courses directory.", "error");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedStatus, getHeaders, showToast]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleOpenAddModal = () => {
    setEditingCourse(null);
    setFormData(initialCourseForm);
    setActiveTab('basic');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (course) => {
    setEditingCourse(course);
    setFormData({
      courseCode: course.courseCode || '',
      courseName: course.courseName || '',
      category: course.category || 'Web Development',
      shortDescription: course.shortDescription || '',
      description: course.description || '',
      durationValue: course.durationValue || 6,
      durationUnit: course.durationUnit || 'Months',
      status: course.status || 'ACTIVE',
      syllabus: Array.isArray(course.syllabus) && course.syllabus.length > 0 
        ? course.syllabus 
        : initialCourseForm.syllabus
    });
    setActiveTab('basic');
    setIsModalOpen(true);
  };

  const handleAddModule = () => {
    const nextOrder = formData.syllabus.length + 1;
    const newMod = {
      moduleId: `mod_${Date.now()}`,
      title: `Module ${nextOrder}: New Curriculum Module`,
      description: '',
      order: nextOrder,
      topics: [
        { topicId: `top_${Date.now()}`, title: 'Topic 1: Introduction', description: '', order: 1 }
      ]
    };
    setFormData(prev => ({
      ...prev,
      syllabus: [...prev.syllabus, newMod]
    }));
  };

  const handleRemoveModule = (modIndex) => {
    setFormData(prev => ({
      ...prev,
      syllabus: prev.syllabus.filter((_, i) => i !== modIndex)
    }));
  };

  const handleModuleChange = (modIndex, field, value) => {
    setFormData(prev => {
      const updatedSyllabus = [...prev.syllabus];
      updatedSyllabus[modIndex] = {
        ...updatedSyllabus[modIndex],
        [field]: value
      };
      return { ...prev, syllabus: updatedSyllabus };
    });
  };

  const handleAddTopic = (modIndex) => {
    setFormData(prev => {
      const updatedSyllabus = [...prev.syllabus];
      const targetMod = updatedSyllabus[modIndex];
      const nextOrder = (targetMod.topics || []).length + 1;
      const newTopic = {
        topicId: `top_${Date.now()}`,
        title: `Topic ${nextOrder}: New Lesson Topic`,
        description: '',
        order: nextOrder
      };
      targetMod.topics = [...(targetMod.topics || []), newTopic];
      return { ...prev, syllabus: updatedSyllabus };
    });
  };

  const handleRemoveTopic = (modIndex, topicIndex) => {
    setFormData(prev => {
      const updatedSyllabus = [...prev.syllabus];
      const targetMod = updatedSyllabus[modIndex];
      targetMod.topics = targetMod.topics.filter((_, i) => i !== topicIndex);
      return { ...prev, syllabus: updatedSyllabus };
    });
  };

  const handleTopicChange = (modIndex, topicIndex, field, value) => {
    setFormData(prev => {
      const updatedSyllabus = [...prev.syllabus];
      const targetMod = updatedSyllabus[modIndex];
      const updatedTopics = [...targetMod.topics];
      updatedTopics[topicIndex] = {
        ...updatedTopics[topicIndex],
        [field]: value
      };
      targetMod.topics = updatedTopics;
      return { ...prev, syllabus: updatedSyllabus };
    });
  };

  const handleSubmitCourse = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.courseName.trim()) {
      showToast('Course Name is required.', 'warning');
      setIsSubmitting(false);
      return;
    }

    try {
      const cleanBase = (API_BASE || '/api').replace(/\/$/, '');
      const endpoint = editingCourse 
        ? `${cleanBase}/v1/academy/courses/${editingCourse._id || editingCourse.id}`
        : `${cleanBase}/v1/academy/courses`;

      const method = editingCourse ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchCourses();
        showToast(
          editingCourse ? "Course updated successfully!" : "New Course created successfully!", 
          "success"
        );
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.message || errData.detail || "Course creation failed.", "error");
      }
    } catch (err) {
      showToast(err.message || "Network error occurred.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleArchive = async (courseId, currentStatus) => {
    const isArchived = currentStatus === 'ARCHIVED';
    const action = isArchived ? 'activate' : 'archive';
    try {
      const cleanBase = (API_BASE || '/api').replace(/\/$/, '');
      const res = await fetch(`${cleanBase}/v1/academy/courses/${courseId}/${action}`, {
        method: 'POST',
        headers: getHeaders()
      });

      if (res.ok) {
        showToast(`Course ${isArchived ? 'activated' : 'archived'} successfully!`, 'success');
        fetchCourses();
      } else {
        showToast('Status transition failed.', 'error');
      }
    } catch (err) {
      showToast('Network error while updating course status.', 'error');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-10 pb-24 pt-4 max-w-7xl mx-auto px-4 font-sans text-slate-600 dark:text-slate-200 transition-colors duration-300"
    >
      {/* Top Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tighter">
            <span className="text-indigo-600 dark:text-indigo-400">Course</span> Management
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Academy Curriculum & Batch Scheduling Hub
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <button 
              onClick={() => setViewMode('grid')} 
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-indigo-700 text-white shadow-md shadow-indigo-600/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('table')} 
              className={`p-3 rounded-xl transition-all cursor-pointer ${viewMode === 'table' ? 'bg-indigo-700 text-white shadow-md shadow-indigo-600/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              <List size={18} />
            </button>
          </div>

          <button 
            onClick={handleOpenAddModal} 
            className="px-6 py-3.5 rounded-2xl bg-indigo-700 text-white shadow-md shadow-indigo-600/20 font-black text-[10px] uppercase tracking-wider transition-all hover:bg-indigo-600 cursor-pointer flex items-center gap-2"
          >
            <Plus size={16} /> Create New Course
          </button>
        </div>
      </div>

      {/* Dashboard Stat Cards (Matching Dashboard.jsx StatCard component structure) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total Catalog Courses', value: stats.totalCourses, icon: BookOpen, color: 'text-indigo-600 dark:text-indigo-400', border: 'bg-indigo-600', sub: 'Academy Curriculum' },
          { label: 'Active Curriculums', value: stats.activeCourses, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', border: 'bg-emerald-500', sub: 'Currently Operational' },
          { label: 'Draft Courses', value: stats.draftCourses, icon: Layers, color: 'text-amber-600 dark:text-amber-400', border: 'bg-amber-500', sub: 'In Development' },
          { label: 'Archived Courses', value: stats.archivedCourses, icon: Archive, color: 'text-rose-600 dark:text-rose-400', border: 'bg-rose-500', sub: 'Past Curriculums' }
        ].map((s, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/50 p-6 rounded-[2rem] relative overflow-hidden group shadow-sm hover:shadow-md transition-all hover:border-slate-350 dark:hover:border-slate-700">
            <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${s.border}`} />
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mb-1">{s.label}</p>
                <h3 className={`text-3xl font-black italic tracking-tight ${s.color}`}>{s.value}</h3>
                <p className="text-[9px] text-slate-400 dark:text-slate-450 font-bold uppercase tracking-wide">{s.sub}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-slate-100 dark:border-slate-800/60 transition-all duration-300 group-hover:scale-110">
                <s.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Controls & Search (Matching Dashboard.jsx filter pills) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by course code, title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-slate-100 text-xs font-bold outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-400 placeholder:font-semibold"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">Category: {c}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            {STATUSES.map(s => (
              <option key={s} value={s} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">Status: {s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Course Directory Views */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="animate-spin text-indigo-500" size={44} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Loading Academy Course Catalog...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-16 text-center shadow-sm">
          <BookOpen className="mx-auto text-slate-400 mb-4 opacity-50" size={48} />
          <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100">No Courses Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto font-medium">
            No course curriculums match your search parameters. Try adjusting filters or create a new course.
          </p>
          <button 
            onClick={handleOpenAddModal}
            className="mt-6 px-6 py-3 rounded-2xl bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider cursor-pointer inline-flex items-center gap-2"
          >
            <Plus size={14} /> Create First Course
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div key="grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(course => {
                const courseId = course._id || course.id;
                const isArchived = course.status === 'ARCHIVED';

                return (
                  <motion.div 
                    key={courseId}
                    className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-7 rounded-[2.5rem] hover:shadow-md transition-all relative flex flex-col justify-between shadow-sm"
                  >
                    <div>
                      {/* Header Badge */}
                      <div className="flex items-center justify-between mb-6">
                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700">
                          {course.courseCode}
                        </span>

                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          course.status === 'ACTIVE' ? 'bg-emerald-500 text-white shadow-xs' :
                          course.status === 'ARCHIVED' ? 'bg-rose-500 text-white shadow-xs' :
                          'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {course.status}
                        </span>
                      </div>

                      {/* Title & Category */}
                      <div className="mb-6 cursor-pointer" onClick={() => handleNavigateToCourse(course)}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                          {course.category}
                        </span>
                        <h3 className="text-slate-900 dark:text-slate-100 font-extrabold text-xl leading-tight uppercase tracking-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {course.courseName}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2 line-clamp-2">
                          {course.shortDescription || course.description || 'No description provided.'}
                        </p>
                      </div>

                      {/* Quick Stats Grid */}
                      <div className="grid grid-cols-2 gap-3 p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 text-xs">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-indigo-500" />
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase">Duration</p>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{course.durationValue} {course.durationUnit}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <FolderKanban size={16} className="text-indigo-500" />
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase">Batches</p>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{course.batchCount || 0} Batches</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Action Controls */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleNavigateToCourse(course)}
                        className="flex-1 py-3 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
                      >
                        <Eye size={13} /> View Course
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(course)}
                        className="p-3 bg-white dark:bg-slate-950 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-800"
                        title="Edit Course"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleArchive(courseId, course.status)}
                        className="p-3 bg-white dark:bg-slate-950 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-500 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-800"
                        title={isArchived ? "Activate Course" : "Archive Course"}
                      >
                        <Archive size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Course Code & Title</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map(course => {
                      const courseId = course._id || course.id;
                      return (
                        <tr key={courseId} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                          <td className="px-6 py-5 cursor-pointer" onClick={() => handleNavigateToCourse(course)}>
                            <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 block mb-0.5">
                              {course.courseCode}
                            </span>
                            <p className="text-slate-900 dark:text-slate-100 font-bold text-sm uppercase tracking-tight hover:text-indigo-600">
                              {course.courseName}
                            </p>
                          </td>
                          <td className="px-6 py-5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {course.category}
                          </td>
                          <td className="px-6 py-5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {course.durationValue} {course.durationUnit}
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              course.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' :
                              course.status === 'ARCHIVED' ? 'bg-rose-500/10 text-rose-500' :
                              'bg-amber-500/10 text-amber-500'
                            }`}>
                              {course.status}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center justify-end gap-2.5">
                              <button
                                onClick={() => handleNavigateToCourse(course)}
                                className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-xl transition-all cursor-pointer"
                                title="View Details"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(course)}
                                className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-xl transition-all cursor-pointer"
                                title="Edit Course"
                              >
                                <Edit size={15} />
                              </button>
                              <button
                                onClick={() => handleToggleArchive(courseId, course.status)}
                                className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 text-slate-600 dark:text-slate-300 hover:text-rose-500 rounded-xl transition-all cursor-pointer"
                                title="Archive / Activate"
                              >
                                <Archive size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Course Create / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 md:p-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden my-auto"
            >
              <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                    {editingCourse ? 'Edit' : 'Create'} <span className="text-indigo-600">Course</span>
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Academy Curriculum Definition Node
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-4 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
              </header>

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 px-8 bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setActiveTab('basic')}
                  className={`py-4 px-6 font-black text-xs uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                    activeTab === 'basic' 
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                      : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  1. Basic Information
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('syllabus')}
                  className={`py-4 px-6 font-black text-xs uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                    activeTab === 'syllabus' 
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                      : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  2. Syllabus & Modules ({formData.syllabus.length})
                </button>
              </div>

              <form onSubmit={handleSubmitCourse} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                {activeTab === 'basic' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Course Code (Auto-generated if blank)</label>
                        <input
                          type="text"
                          placeholder="e.g. MERN-001"
                          value={formData.courseCode}
                          onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 outline-none text-sm font-medium focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Course Title *</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. Full Stack MERN Development"
                          value={formData.courseName}
                          onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 outline-none text-sm font-medium focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 outline-none text-sm cursor-pointer"
                        >
                          {CATEGORIES.filter(c => c !== 'ALL').map(c => (
                            <option key={c} value={c} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Duration Value</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.durationValue}
                          onChange={(e) => setFormData({ ...formData, durationValue: parseInt(e.target.value, 10) || 1 })}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 outline-none text-sm font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Duration Unit</label>
                        <select
                          value={formData.durationUnit}
                          onChange={(e) => setFormData({ ...formData, durationUnit: e.target.value })}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 outline-none text-sm cursor-pointer"
                        >
                          <option value="Days" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">Days</option>
                          <option value="Weeks" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">Weeks</option>
                          <option value="Months" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">Months</option>
                          <option value="Years" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">Years</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Short Summary</label>
                      <input
                        type="text"
                        placeholder="Brief 1-sentence course overview..."
                        value={formData.shortDescription}
                        onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 outline-none text-sm font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Detailed Description</label>
                      <textarea
                        rows={4}
                        placeholder="Detailed course description and learning objectives..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-slate-900 dark:text-slate-100 outline-none text-sm font-medium"
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveTab('syllabus')}
                        className="bg-indigo-700 hover:bg-indigo-600 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                      >
                        Next: Build Syllabus <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                        Curriculum Syllabus Builder
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddModule}
                        className="bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer border border-indigo-500/20"
                      >
                        <Plus size={14} /> Add Module
                      </button>
                    </div>

                    {formData.syllabus.map((mod, modIdx) => (
                      <div key={mod.moduleId || modIdx} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 relative">
                        <div className="flex items-center justify-between gap-4">
                          <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                            {modIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={mod.title}
                            placeholder="Module Title..."
                            onChange={(e) => handleModuleChange(modIdx, 'title', e.target.value)}
                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none"
                          />
                          {formData.syllabus.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveModule(modIdx)}
                              className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                              title="Delete Module"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        {/* Topics List */}
                        <div className="pl-6 space-y-2 border-l-2 border-slate-200 dark:border-slate-800 ml-4 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                              Module Topics ({mod.topics?.length || 0})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddTopic(modIdx)}
                              className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Plus size={12} /> Add Topic
                            </button>
                          </div>

                          {(mod.topics || []).map((top, topIdx) => (
                            <div key={top.topicId || topIdx} className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-slate-400">
                                {modIdx + 1}.{topIdx + 1}
                              </span>
                              <input
                                type="text"
                                value={top.title}
                                placeholder="Topic Title..."
                                onChange={(e) => handleTopicChange(modIdx, topIdx, 'title', e.target.value)}
                                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                              />
                              {(mod.topics || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTopic(modIdx, topIdx)}
                                  className="text-rose-400 hover:text-rose-600 p-1 cursor-pointer"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setActiveTab('basic')}
                        className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer"
                      >
                        Back to Details
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-indigo-700 hover:bg-indigo-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
                      >
                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                        Save Course
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CourseManagement;
