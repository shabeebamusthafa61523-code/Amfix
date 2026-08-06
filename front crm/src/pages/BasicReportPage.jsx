import React, { useState, useEffect, useCallback } from 'react';
import { uploadCompiledPDFReport } from '../services/departmentService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Calendar, Plus, Trash2, Save, Download, 
  CheckCircle, HelpCircle, Loader2, User, ChevronLeft, ArrowLeft,
  X, Maximize2, Trash, ClipboardList, PenTool, BookOpen
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import SignatureUpload from '../components/SignatureUpload';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const DEFAULT_BLOCKERS_PLAN = {
  blockersToday: '',
  priority: 'Medium',
  tomorrowMainTask: '',
  notes: ''
};

const BasicReportPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Form states
  const [basicDetails, setBasicDetails] = useState({
    employeeName: '',
    employeeId: '',
    designation: '',
    department: '',
    date: '',
    shiftTiming: '9:00 AM – 6:00 PM',
    preparedTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  });

  const [taskSummary, setTaskSummary] = useState([]);
  const [blockersTomorrowPlan, setBlockersTomorrowPlan] = useState(DEFAULT_BLOCKERS_PLAN);
  const [staffSignature, setStaffSignature] = useState('');

  const getAuthHeaders = useCallback(() => {
    const raw = localStorage.getItem('token');
    const tk  = raw ? raw.replace(/"/g, '') : '';
    return { Authorization: tk.startsWith('Bearer ') ? tk : `Bearer ${tk}`, 'Content-Type': 'application/json' };
  }, []);

  // Fetch tasks and initialize report form
  useEffect(() => {
    const loadUserDataAndTasks = async () => {
      setLoading(true);
      try {
        const saved = localStorage.getItem('user');
        const userId = (localStorage.getItem('user_id') || '').replace(/"/g, '').trim();
        let userObj = {};
        if (saved) {
          userObj = JSON.parse(saved);
          userObj.user_id = userId;
          setCurrentUser(userObj);
        }

        const deptName = userObj.departmentId?.name || userObj.department || 'General';
        const desigName = userObj.designationId?.name || userObj.designation || 'Staff';

        setBasicDetails({
          employeeName: userObj.name || 'Employee',
          employeeId: userObj.employeeId || 'N/A',
          designation: desigName,
          department: deptName,
          date: selectedDate,
          shiftTiming: '9:00 AM – 6:00 PM',
          preparedTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        });

        // Try load draft from localStorage
        const draftKey = `basic_report_draft_${userId}_${selectedDate}`;
        const savedDraft = localStorage.getItem(draftKey);

        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft);
            setTaskSummary(parsed.taskSummary || []);
            setBlockersTomorrowPlan(parsed.blockersTomorrowPlan || DEFAULT_BLOCKERS_PLAN);
            setStaffSignature(parsed.staffSignature || '');
            showToast('Loaded draft from local storage', 'success');
            setLoading(false);
            return;
          } catch (e) {
            console.error('Failed parsing draft:', e);
          }
        }

        // No draft: fetch tasks assigned to user
        const res = await fetch(`${API_BASE}/tasks/all`, { headers: getAuthHeaders() });
        if (res.ok) {
          const d = await res.json();
          const allTasks = Array.isArray(d) ? d : d?.data || [];
          
          // Filter tasks for current user
          const myTasks = allTasks.filter(t => {
            const aId = t.assigned_to && typeof t.assigned_to === 'object' ? (t.assigned_to.id || t.assigned_to._id) : t.assigned_to;
            return String(aId).trim() === String(userId).trim();
          });

          // Map to report task summary format
          const formattedTasks = myTasks.map(t => ({
            task: t.title || '',
            detailsNotes: '',
            status: t.status || 'pending',
            startDate: t.startDate ? new Date(t.startDate).toISOString().split('T')[0] : '',
            endDate: t.endDate ? new Date(t.endDate).toISOString().split('T')[0] : '',
            dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : '',
            remarks: t.remarks || '',
            isBackendTask: true,
            backendTaskId: t._id
          }));

          // Fallback if no tasks
          if (formattedTasks.length === 0) {
            setTaskSummary([{ task: '', detailsNotes: '', status: 'pending', startDate: '', endDate: '', dueDate: '', remarks: '' }]);
          } else {
            setTaskSummary(formattedTasks);
          }
        } else {
          setTaskSummary([{ task: '', detailsNotes: '', status: 'pending', startDate: '', endDate: '', dueDate: '', remarks: '' }]);
        }
      } catch (err) {
        console.error('Error fetching data for basic report:', err);
        setTaskSummary([{ task: '', detailsNotes: '', status: 'pending', startDate: '', endDate: '', dueDate: '', remarks: '' }]);
      } finally {
        setLoading(false);
      }
    };

    loadUserDataAndTasks();
  }, [selectedDate, getAuthHeaders, showToast]);

  // Save draft locally
  const handleSaveDraft = () => {
    const draftKey = `basic_report_draft_${currentUser.user_id || 'guest'}_${selectedDate}`;
    const draftData = {
      taskSummary,
      blockersTomorrowPlan,
      staffSignature
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
    showToast('Draft saved to browser storage', 'success');
  };

  // Add a new manual activity row
  const handleAddRow = () => {
    setTaskSummary([
      ...taskSummary,
      { task: '', detailsNotes: '', status: 'pending', startDate: '', endDate: '', dueDate: '', remarks: '' }
    ]);
  };

  // Delete activity row
  const handleDeleteRow = (index) => {
    const next = [...taskSummary];
    next.splice(index, 1);
    setTaskSummary(next.length ? next : [{ task: '', detailsNotes: '', status: 'pending', startDate: '', endDate: '', dueDate: '', remarks: '' }]);
  };

  // Update cell values
  const handleUpdateCell = (index, field, value) => {
    const next = [...taskSummary];
    next[index][field] = value;
    setTaskSummary(next);
  };

  // Generate jsPDF instance
  const buildPDFDoc = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();

    // Clean brand accents
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, pageW, 40, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('DAILY WORK REPORT', 15, 25);

    // Meta details on header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`DATE: ${basicDetails.date}`, pageW - 75, 20);
    doc.text(`TIMING: ${basicDetails.shiftTiming}`, pageW - 75, 26);
    doc.text(`PREPARED TIME: ${basicDetails.preparedTime}`, pageW - 75, 32);

    // Employee profile cards block
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(15, 48, pageW - 30, 28, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(15, 48, pageW - 30, 28, 'S');

    doc.setTextColor(71, 85, 105); // slate-600
    doc.setFont('helvetica', 'bold');
    doc.text('EMPLOYEE DETAILS', 18, 54);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(`Name: ${basicDetails.employeeName}`, 18, 62);
    doc.text(`Employee ID: ${basicDetails.employeeId}`, 18, 68);
    
    doc.text(`Department: ${basicDetails.department}`, pageW / 2 + 10, 62);
    doc.text(`Designation: ${basicDetails.designation}`, pageW / 2 + 10, 68);

    // Tasks Table
    const tableBody = taskSummary.map((t, i) => [
      i + 1,
      t.task || '—',
      t.startDate || '—',
      t.endDate || '—',
      t.dueDate || '—',
      t.detailsNotes || '—',
      String(t.status).toUpperCase(),
      t.remarks || '—'
    ]);

    autoTable(doc, {
      startY: 84,
      head: [['#', 'Activity / Task', 'Start Date', 'End Date', 'Due Date', 'Details / Progress Notes', 'Status', 'Remarks']],
      body: tableBody,
      headStyles: {
        fillColor: [79, 70, 229], // Indigo-600
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [15, 23, 42],
        valign: 'top'
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 40 }, // Expanded activity field
        2: { cellWidth: 18 },
        3: { cellWidth: 18 },
        4: { cellWidth: 18 },
        5: { cellWidth: 50 }, // Details column width
        6: { cellWidth: 20 },
        7: { cellWidth: 18 }
      },
      margin: { left: 15, right: 15 },
      theme: 'grid',
      styles: { overflow: 'linebreak' }
    });

    let currentY = doc.lastAutoTable.finalY + 12;

    // Check pagination room
    if (currentY > 230) {
      doc.addPage();
      currentY = 25;
    }

    // Blocker / Tomorrow main task section
    doc.setFillColor(253, 244, 245); // light reddish background
    doc.rect(15, currentY, pageW - 30, 36, 'F');
    doc.setDrawColor(254, 226, 226);
    doc.rect(15, currentY, pageW - 30, 36, 'S');

    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('BLOCKERS & TOMORROW\'S PLAN', 18, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Blockers Today: ${blockersTomorrowPlan.blockersToday || 'None'}`, 18, currentY + 14);
    doc.text(`Priority Level: ${blockersTomorrowPlan.priority}`, 18, currentY + 20);
    doc.text(`Main Task Tomorrow: ${blockersTomorrowPlan.tomorrowMainTask || 'Same as today / Continue ongoing tasks'}`, 18, currentY + 26);
    doc.text(`Notes: ${blockersTomorrowPlan.notes || '—'}`, 18, currentY + 32);

    currentY += 46;

    // Check pagination room
    if (currentY > 240) {
      doc.addPage();
      currentY = 25;
    }

    // Signatures
    doc.setDrawColor(226, 232, 240);
    doc.line(15, currentY, pageW - 15, currentY);

    currentY += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('PREPARED BY (STAFF)', 15, currentY);
    doc.text('REVIEWED BY (MANAGER)', pageW - 65, currentY);

    if (staffSignature) {
      try {
        doc.addImage(staffSignature, 'PNG', 15, currentY + 2, 35, 14);
      } catch (err) {
        console.error('Error rendering signature to PDF:', err);
      }
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(basicDetails.employeeName, 15, currentY + 20);
    doc.text('Date signed: ' + basicDetails.date, 15, currentY + 24);

    doc.text('Status: Awaiting Review', pageW - 65, currentY + 20);

    return doc;
  };

  // Local PDF download
  const handleDownloadPDF = () => {
    try {
      const doc = buildPDFDoc();
      const fn = `daily_report_${currentUser.name?.replace(/\s+/g, '_') || 'employee'}_${selectedDate}.pdf`;
      doc.save(fn);
      showToast('PDF downloaded successfully', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate PDF', 'error');
    }
  };

  // Submit report to server
  const handleSubmitReport = async () => {
    // Basic verification
    const hasNotes = taskSummary.some(t => t.detailsNotes && t.detailsNotes.trim().length > 0);
    if (!hasNotes) {
      showToast('Please add progress details / notes in at least one activity row before submitting.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const doc = buildPDFDoc();
      const pdfBlob = doc.output('blob');
      const filename = `daily_report_${currentUser.name?.replace(/\s+/g, '_') || 'employee'}_${selectedDate}.pdf`;
      const reportType = String(basicDetails.department).toLowerCase().replace(/[^a-z0-9]/g, '') || 'basic';

      const response = await uploadCompiledPDFReport(
        currentUser.user_id,
        selectedDate,
        pdfBlob,
        filename,
        reportType,
        'daily'
      );

      if (response.status === 201 || response.status === 200 || response.data?.success) {
        // Clear local draft
        const draftKey = `basic_report_draft_${currentUser.user_id}_${selectedDate}`;
        localStorage.removeItem(draftKey);

        showToast('Daily Report submitted successfully!', 'success');
        navigate('/common-dashboard');
      } else {
        showToast('Failed to upload report to server', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error uploading report: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-5">
        <div className="relative">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <ClipboardList size={40} className="text-indigo-500 animate-bounce" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="text-indigo-400 animate-spin" />
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Preparing Report Sheet...</p>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* ══ HEADER ══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/common-dashboard')}
            className="p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-slate-500 hover:text-indigo-500 transition-all shadow-sm">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
              <FileText size={20} className="text-indigo-500" />
              Daily Work Report
            </h1>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Submit and log your work activities for today</p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl shadow-sm self-start sm:self-auto">
          <Calendar size={14} className="text-slate-400 ml-2" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-xs font-black text-slate-700 dark:text-slate-350 focus:outline-none pr-2"
          />
        </div>
      </div>

      {/* ══ DETAILS CARD ══ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 rounded-3xl p-6 shadow-sm">
        <h2 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <User size={12} /> Employee Profile Details
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">Employee Name</label>
            <p className="text-xs font-black text-slate-700 dark:text-slate-200 mt-0.5">{basicDetails.employeeName}</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">Employee ID</label>
            <p className="text-xs font-black text-slate-700 dark:text-slate-200 mt-0.5">{basicDetails.employeeId}</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">Department</label>
            <p className="text-xs font-black text-slate-700 dark:text-slate-200 mt-0.5">{basicDetails.department}</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">Designation</label>
            <p className="text-xs font-black text-slate-700 dark:text-slate-200 mt-0.5">{basicDetails.designation}</p>
          </div>
        </div>
      </div>

      {/* ══ ACTIVITIES TABLE ══ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Activity Logs</h2>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">List of tasks worked on with descriptions</p>
          </div>
          <button onClick={handleAddRow}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-indigo-500/30 text-indigo-500 hover:bg-indigo-500 hover:text-white text-[10px] font-black uppercase transition-all">
            <Plus size={11} /> Add Row
          </button>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-2xl">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="py-3.5 px-4 w-[5%]">#</th>
                <th className="py-3.5 px-4 w-[22%]">Activity / Task Title</th>
                <th className="py-3.5 px-4 w-[11%]">Start Date</th>
                <th className="py-3.5 px-4 w-[11%]">End Date</th>
                <th className="py-3.5 px-4 w-[11%]">Due Date</th>
                <th className="py-3.5 px-4 w-[24%]">Details / Progress Notes</th>
                <th className="py-3.5 px-4 w-[11%]">Status</th>
                <th className="py-3.5 px-4 w-[5%] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {taskSummary.map((t, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <td className="py-3 px-4 text-xs font-black text-slate-400">{idx + 1}</td>
                  
                  {/* Task Title */}
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={t.task}
                      readOnly={t.isBackendTask}
                      onChange={(e) => handleUpdateCell(idx, 'task', e.target.value)}
                      placeholder="e.g. Code feature deployment"
                      className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-semibold focus:outline-none ${
                        t.isBackendTask
                          ? 'bg-slate-50 dark:bg-slate-800/30 border-transparent text-slate-500 cursor-not-allowed'
                          : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:border-indigo-500'
                      }`}
                    />
                  </td>

                  {/* Start Date */}
                  <td className="py-3 px-4">
                    <input
                      type="date"
                      value={t.startDate || ''}
                      onChange={(e) => handleUpdateCell(idx, 'startDate', e.target.value)}
                      className="w-full bg-transparent border border-slate-200 dark:border-slate-700 py-1.5 px-2 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </td>

                  {/* End Date */}
                  <td className="py-3 px-4">
                    <input
                      type="date"
                      value={t.endDate || ''}
                      onChange={(e) => handleUpdateCell(idx, 'endDate', e.target.value)}
                      className="w-full bg-transparent border border-slate-200 dark:border-slate-700 py-1.5 px-2 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </td>

                  {/* Due Date */}
                  <td className="py-3 px-4">
                    <input
                      type="date"
                      value={t.dueDate || ''}
                      onChange={(e) => handleUpdateCell(idx, 'dueDate', e.target.value)}
                      className="w-full bg-transparent border border-slate-200 dark:border-slate-700 py-1.5 px-2 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </td>

                  {/* Progress Notes */}
                  <td className="py-3 px-4">
                    <textarea
                      value={t.detailsNotes || ''}
                      onChange={(e) => handleUpdateCell(idx, 'detailsNotes', e.target.value)}
                      placeholder="What did you achieve today? Include details..."
                      rows={2}
                      className="w-full bg-transparent border border-slate-200 dark:border-slate-700 py-1.5 px-2.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none resize-none placeholder:text-slate-400"
                    />
                  </td>

                  {/* Status dropdown */}
                  <td className="py-3 px-4">
                    <select
                      value={t.status || 'pending'}
                      onChange={(e) => handleUpdateCell(idx, 'status', e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 px-2 rounded-lg text-xs font-black text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none uppercase tracking-wider"
                    >
                      <option value="pending">Pending</option>
                      <option value="current">In Progress</option>
                      <option value="preview">In Review</option>
                      <option value="done">Completed</option>
                    </select>
                  </td>

                  {/* Delete Button */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDeleteRow(idx)}
                      disabled={t.isBackendTask}
                      className={`p-1.5 rounded-lg border text-rose-500 transition-all ${
                        t.isBackendTask
                          ? 'border-transparent text-rose-300 dark:text-rose-900 cursor-not-allowed opacity-30'
                          : 'border-rose-100 hover:bg-rose-50 dark:border-rose-900/30 dark:hover:bg-rose-950/20'
                      }`}
                    >
                      <Trash size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ BLOCKERS & TOMORROW'S PLAN ══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Blocker & Tomorrow Inputs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-0.5">Addons & Notes</h2>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Submit plans and document issues</p>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Blockers Faced Today</label>
              <input
                type="text"
                placeholder="e.g. API down, waiting for assets..."
                value={blockersTomorrowPlan.blockersToday || ''}
                onChange={(e) => setBlockersTomorrowPlan({...blockersTomorrowPlan, blockersToday: e.target.value})}
                className="w-full mt-1 py-2 px-3 rounded-xl bg-transparent border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:outline-none text-xs font-semibold text-slate-700 dark:text-slate-250 placeholder:text-slate-400"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Work Priority</label>
                <select
                  value={blockersTomorrowPlan.priority || 'Medium'}
                  onChange={(e) => setBlockersTomorrowPlan({...blockersTomorrowPlan, priority: e.target.value})}
                  className="w-full mt-1 py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:outline-none text-xs font-black text-slate-700 dark:text-slate-250 uppercase tracking-wider"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Main Task Tomorrow</label>
                <input
                  type="text"
                  placeholder="e.g. Deploy dashboard module"
                  value={blockersTomorrowPlan.tomorrowMainTask || ''}
                  onChange={(e) => setBlockersTomorrowPlan({...blockersTomorrowPlan, tomorrowMainTask: e.target.value})}
                  className="w-full mt-1 py-2 px-3 rounded-xl bg-transparent border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:outline-none text-xs font-semibold text-slate-700 dark:text-slate-250 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Extra Comments</label>
              <textarea
                placeholder="Any other comments or feedback..."
                value={blockersTomorrowPlan.notes || ''}
                rows={2}
                onChange={(e) => setBlockersTomorrowPlan({...blockersTomorrowPlan, notes: e.target.value})}
                className="w-full mt-1 py-2 px-3 rounded-xl bg-transparent border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:outline-none text-xs font-semibold text-slate-700 dark:text-slate-250 resize-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Signature & Confirm Block */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/70 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-0.5">Sign & Verify</h2>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Provide signature to authenticate your report</p>
          </div>

          <div className="space-y-4 my-4">
            <SignatureUpload
              value={staffSignature}
              onChange={setStaffSignature}
              placeholder="Sign here (Upload PNG signature)"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/15 text-[10px] font-medium text-amber-600/90 dark:text-amber-500/95 leading-relaxed">
            <strong>Verification Notice:</strong> Submitting this report compiled will upload a signed PDF to the employee records department. Your direct team lead will be notified to review status.
          </div>
        </div>

      </div>

      {/* ══ ACTIONS BAR ══ */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to clear this entire form draft?')) {
              setTaskSummary([{ task: '', detailsNotes: '', status: 'pending', startDate: '', endDate: '', dueDate: '', remarks: '' }]);
              setBlockersTomorrowPlan(DEFAULT_BLOCKERS_PLAN);
              setStaffSignature('');
            }
          }}
          className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-wider transition-all"
        >
          Clear Draft
        </button>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 hover:border-slate-300 text-slate-600 dark:text-slate-400 hover:text-indigo-500 text-xs font-black uppercase tracking-wider transition-all shadow-sm"
          >
            <Save size={13} />
            Save Draft
          </button>
          
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 hover:border-slate-300 text-slate-600 dark:text-slate-400 hover:text-indigo-500 text-xs font-black uppercase tracking-wider transition-all shadow-sm"
          >
            <Download size={13} />
            Download PDF
          </button>

          <button
            onClick={handleSubmitReport}
            disabled={submitting}
            className="flex items-center gap-1.5 px-6 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20"
          >
            {submitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle size={13} />
                Submit Report
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
};

export default BasicReportPage;
