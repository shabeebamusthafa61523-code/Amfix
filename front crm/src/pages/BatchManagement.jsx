import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderKanban, Plus, Search, LayoutGrid, List, ChevronRight, Loader2, 
  BookOpen, Users, CheckCircle2, Archive, Eye, Edit, X, Trash2
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';

const API_BASE = import.meta.env.VITE_API_URL;

const STATUSES = ['ALL', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];

const initialBatchForm = {
  batchCode: '',
  batchName: '',
  courseId: '',
  students: [],
  status: 'UPCOMING'
};

const BatchManagement = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [registeredStudents, setRegisteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid');

  // Modal & Multi-select States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [formData, setFormData] = useState(initialBatchForm);
  const [studentSearchText, setStudentSearchText] = useState('');

  const getHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return {
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`,
      'Content-Type': 'application/json'
    };
  }, []);

  // 1. Fetch Batches Directory
  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const cleanBase = (API_BASE || '/api').replace(/\/$/, '');
      const endpoint = cleanBase.endsWith('/v1')
        ? `${cleanBase}/academy/batches?search=${encodeURIComponent(searchQuery)}&courseId=${selectedCourseFilter}&status=${selectedStatusFilter}`
        : `${cleanBase}/v1/academy/batches?search=${encodeURIComponent(searchQuery)}&courseId=${selectedCourseFilter}&status=${selectedStatusFilter}`;

      const res = await fetch(endpoint, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to load batch list.');

      const data = await res.json();
      setBatches(data.data || []);
    } catch (err) {
      console.error("Fetch Batches Error:", err);
      showToast("Unable to fetch batch list.", "error");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCourseFilter, selectedStatusFilter, getHeaders, showToast]);

  // 2. Fetch Courses List
  const fetchCourses = useCallback(async () => {
    try {
      const cleanBase = (API_BASE || '/api').replace(/\/$/, '');
      const endpoint = cleanBase.endsWith('/v1')
        ? `${cleanBase}/academy/courses`
        : `${cleanBase}/v1/academy/courses`;

      const res = await fetch(endpoint, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCourses(data.data || []);
      }
    } catch (err) {
      console.error("Fetch Courses Error:", err);
    }
  }, [getHeaders]);

  // 3. Fetch Registered Students from Student Attendance Data Source
  const fetchRegisteredStudents = useCallback(async () => {
    try {
      const cleanBase = (API_BASE || '/api').replace(/\/$/, '');
      const endpoint = cleanBase.endsWith('/v1')
        ? `${cleanBase}/users?role=student&limit=500`
        : `${cleanBase}/v1/users?role=student&limit=500`;

      const res = await fetch(endpoint, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const studentUsers = data?.users || data?.data?.users || data?.data || [];
        setRegisteredStudents(studentUsers);
      }
    } catch (err) {
      console.error("Fetch Registered Students Error:", err);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  useEffect(() => {
    fetchCourses();
    fetchRegisteredStudents();
  }, [fetchCourses, fetchRegisteredStudents]);

  const handleOpenAddModal = () => {
    setEditingBatch(null);
    setFormData(initialBatchForm);
    setStudentSearchText('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (batch) => {
    setEditingBatch(batch);
    const existingStudentIds = Array.isArray(batch.students) 
      ? batch.students.map(s => typeof s === 'object' ? s._id || s.id : s)
      : [];

    setFormData({
      batchCode: batch.batchCode || '',
      batchName: batch.batchName || '',
      courseId: batch.courseId?._id || batch.courseId || '',
      students: existingStudentIds,
      status: batch.status || 'UPCOMING'
    });
    setStudentSearchText('');
    setIsModalOpen(true);
  };

  const handleToggleStudentSelection = (studentId) => {
    setFormData(prev => {
      const current = prev.students || [];
      const isSelected = current.includes(studentId);
      const updated = isSelected 
        ? current.filter(id => id !== studentId) 
        : [...current, studentId];
      return { ...prev, students: updated };
    });
  };

  const handleSubmitBatch = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.batchName.trim()) {
      showToast('Batch Name is required.', 'warning');
      setIsSubmitting(false);
      return;
    }

    if (!formData.courseId) {
      showToast('Please select a course for this batch.', 'warning');
      setIsSubmitting(false);
      return;
    }

    try {
      const cleanBase = (API_BASE || '/api').replace(/\/$/, '');
      const endpoint = editingBatch
        ? `${cleanBase}/v1/academy/batches/${editingBatch._id || editingBatch.id}`
        : `${cleanBase}/v1/academy/batches`;

      const method = editingBatch ? 'PUT' : 'POST';

      const payload = {
        batchCode: formData.batchCode?.trim() || undefined,
        batchName: formData.batchName.trim(),
        name: formData.batchName.trim(),
        courseId: formData.courseId,
        course: formData.courseId,
        students: Array.isArray(formData.students) ? formData.students.filter(id => id && String(id).length === 24) : [],
        studentIds: Array.isArray(formData.students) ? formData.students.filter(id => id && String(id).length === 24) : [],
        status: formData.status || 'UPCOMING'
      };

      const res = await fetch(endpoint, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchBatches();
        showToast(
          editingBatch ? "Batch updated successfully!" : "New Batch created successfully!",
          "success"
        );
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.message || errData.error || errData.detail || "Failed to save batch.", "error");
      }
    } catch (err) {
      showToast(err.message || "Network error occurred.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered student list inside modal search
  const filteredModalStudents = registeredStudents.filter(student => {
    const query = studentSearchText.toLowerCase();
    const name = (student.name || '').toLowerCase();
    const email = (student.email || '').toLowerCase();
    const phone = (student.phone || '').toLowerCase();
    const stId = (student.studentId || '').toLowerCase();
    return name.includes(query) || email.includes(query) || phone.includes(query) || stId.includes(query);
  });

  const totalEnrolledStudents = batches.reduce((acc, b) => acc + (b.studentCount || (Array.isArray(b.students) ? b.students.length : 0)), 0);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-10 pb-24 pt-4 max-w-7xl mx-auto px-4 font-sans text-slate-600 dark:text-slate-200 transition-colors duration-300"
    >
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tighter">
            <span className="text-indigo-600 dark:text-indigo-400">Batch</span> Management
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Academy Course Batches & Registered Student Allocation
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
            <Plus size={16} /> Create New Batch
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total Scheduled Batches', value: batches.length, icon: FolderKanban, color: 'text-indigo-600 dark:text-indigo-400', border: 'bg-indigo-600', sub: 'Academy Course Batches' },
          { label: 'Active Batches', value: batches.filter(b => b.status === 'UPCOMING' || b.status === 'ONGOING').length, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', border: 'bg-emerald-500', sub: 'Upcoming / Ongoing' },
          { label: 'Enrolled Students', value: totalEnrolledStudents, icon: Users, color: 'text-purple-600 dark:text-purple-400', border: 'bg-purple-600', sub: 'Registered Students' },
          { label: 'Available Courses', value: courses.length, icon: BookOpen, color: 'text-amber-600 dark:text-amber-400', border: 'bg-amber-500', sub: 'Active Curriculums' }
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

      {/* Filter Controls & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by batch code or batch name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-slate-100 text-xs font-bold outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-400 placeholder:font-semibold"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="ALL">Course: All Courses</option>
            {courses.map(c => (
              <option key={c._id || c.id} value={c._id || c.id} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">{c.courseName}</option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            {STATUSES.map(s => (
              <option key={s} value={s} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">Status: {s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Batch Directory Views */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="animate-spin text-indigo-500" size={44} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Loading Academy Batches...</p>
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-16 text-center shadow-sm">
          <FolderKanban className="mx-auto text-slate-400 mb-4 opacity-50" size={48} />
          <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100">No Batches Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto font-medium">
            No course batches match your search criteria. Create a batch to start allocating registered students.
          </p>
          <button 
            onClick={handleOpenAddModal}
            className="mt-6 px-6 py-3 rounded-2xl bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider cursor-pointer inline-flex items-center gap-2"
          >
            <Plus size={14} /> Create First Batch
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div key="grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {batches.map(b => {
                const batchId = b._id || b.id;
                const course = b.courseId || {};
                const studentCount = b.studentCount || (Array.isArray(b.students) ? b.students.length : 0);

                return (
                  <motion.div 
                    key={batchId}
                    className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-7 rounded-[2.5rem] hover:shadow-md transition-all relative flex flex-col justify-between shadow-sm"
                  >
                    <div>
                      {/* Code & Status */}
                      <div className="flex items-center justify-between mb-5">
                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700">
                          {b.batchCode}
                        </span>

                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          b.status === 'UPCOMING' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                          b.status === 'ONGOING' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                          b.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                          'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {b.status}
                        </span>
                      </div>

                      {/* Batch Title & Course */}
                      <div className="mb-6 cursor-pointer" onClick={() => navigate(`/academy/batches/${batchId}`)}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                          {course.courseName || 'Course'}
                        </span>
                        <h3 className="text-slate-900 dark:text-slate-100 font-extrabold text-xl leading-tight uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                          {b.batchName}
                        </h3>
                      </div>

                      {/* Quick Enrolled Student Metric */}
                      <div className="p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users size={18} className="text-indigo-500" />
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase">Registered Students</p>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{studentCount} Students Allocated</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800/40">
                          {studentCount} Enrolled
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => navigate(`/academy/batches/${batchId}`)}
                        className="flex-1 py-3 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
                      >
                        <Eye size={13} /> View Batch
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(b)}
                        className="p-3 bg-white dark:bg-slate-950 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-800"
                        title="Edit Batch"
                      >
                        <Edit size={14} />
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
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Batch Code & Name</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Course</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Registered Students</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map(b => {
                      const batchId = b._id || b.id;
                      const course = b.courseId || {};
                      const studentCount = b.studentCount || (Array.isArray(b.students) ? b.students.length : 0);

                      return (
                        <tr key={batchId} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                          <td className="px-6 py-5 cursor-pointer" onClick={() => navigate(`/academy/batches/${batchId}`)}>
                            <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 block mb-0.5">
                              {b.batchCode}
                            </span>
                            <p className="text-slate-900 dark:text-slate-100 font-bold text-sm uppercase tracking-tight hover:text-indigo-600">
                              {b.batchName}
                            </p>
                          </td>
                          <td className="px-6 py-5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {course.courseName || 'N/A'}
                          </td>
                          <td className="px-6 py-5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {studentCount} Registered Students
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              b.status === 'UPCOMING' ? 'bg-indigo-500/10 text-indigo-500' :
                              b.status === 'ONGOING' ? 'bg-emerald-500/10 text-emerald-500' :
                              'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center justify-end gap-2.5">
                              <button
                                onClick={() => navigate(`/academy/batches/${batchId}`)}
                                className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-xl transition-all cursor-pointer"
                                title="View Batch"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(b)}
                                className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-xl transition-all cursor-pointer"
                                title="Edit Batch"
                              >
                                <Edit size={15} />
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

      {/* Create / Edit Batch Modal without Instructor Selection */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 md:p-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden my-auto"
            >
              <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                    {editingBatch ? 'Edit' : 'Create'} <span className="text-indigo-600">Batch</span>
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Associate Course & Registered Students
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-4 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
              </header>

              <form onSubmit={handleSubmitBatch} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Batch Code (Auto-generated if blank)</label>
                    <input
                      type="text"
                      placeholder="e.g. BTC-2026-000001"
                      value={formData.batchCode}
                      onChange={(e) => setFormData({ ...formData, batchCode: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 outline-none text-sm font-medium focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Batch Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. MERN August Batch"
                      value={formData.batchName}
                      onChange={(e) => setFormData({ ...formData, batchName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 outline-none text-sm font-medium focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Course *</label>
                  <select
                    required
                    value={formData.courseId}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 outline-none text-sm font-medium cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">Select Course</option>
                    {courses.map(c => (
                      <option key={c._id || c.id} value={c._id || c.id} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                        {c.courseName} ({c.courseCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* REGISTERED STUDENT MULTI-SELECT SECTION */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                        Select Registered Students ({formData.students.length} Selected)
                      </h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                        Sourced exclusively from registered students in Student Attendance
                      </p>
                    </div>
                    {formData.students.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, students: [] })}
                        className="text-[9px] font-black text-rose-500 hover:underline uppercase tracking-wider cursor-pointer"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>

                  {/* Selected Student Chips */}
                  {formData.students.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-h-28 overflow-y-auto">
                      {formData.students.map(stId => {
                        const stObj = registeredStudents.find(s => String(s._id || s.id) === String(stId));
                        const stName = stObj ? stObj.name : `Student ${stId}`;
                        return (
                          <span 
                            key={stId}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40"
                          >
                            {stName}
                            <button
                              type="button"
                              onClick={() => handleToggleStudentSelection(stId)}
                              className="text-indigo-400 hover:text-rose-500 cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Registered Student Search & Selector List */}
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search registered students by name, email or student ID..."
                      value={studentSearchText}
                      onChange={(e) => setStudentSearchText(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl max-h-48 overflow-y-auto p-2 bg-white dark:bg-slate-950 space-y-1">
                    {filteredModalStudents.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-400 font-medium">
                        No registered students found matching search criteria.
                      </p>
                    ) : (
                      filteredModalStudents.map(student => {
                        const stId = student._id || student.id;
                        const isChecked = formData.students.includes(stId);

                        return (
                          <div
                            key={stId}
                            onClick={() => handleToggleStudentSelection(stId)}
                            className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                              isChecked 
                                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40' 
                                : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // Handled by div onClick
                                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                              />
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                                  {student.name}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {student.studentId || 'STU'} • {student.email} • {student.phone}
                                </p>
                              </div>
                            </div>
                            {isChecked && (
                              <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-indigo-700 hover:bg-indigo-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    {editingBatch ? 'Update Batch' : 'Create Batch'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default BatchManagement;
