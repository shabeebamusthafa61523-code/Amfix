import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx'; 
import { 
  Search, Calendar as CalendarIcon, GraduationCap, Loader2, LayoutGrid, List, 
  ChevronLeft, ChevronRight, UserCheck, UserPlus, ShieldCheck, AlertCircle, 
  CheckCircle2, XCircle, X, User, Mail, Lock, Phone, ShieldPlus, CreditCard,
  Download, FileSpreadsheet
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 
import { useToast } from '../components/ToastProvider';

const API_BASE = import.meta.env.VITE_API_URL;
const STUDENT_ROLE_ID = "10"; 

const FormInput = ({ label, name, type = "text", icon, onChange, value, placeholder = "" }) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">{label}</label>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
      <input 
        required 
        name={name} 
        type={type} 
        value={value} 
        placeholder={placeholder}
        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all text-sm" 
        onChange={onChange} 
      />
    </div>
  </div>
);

const StudentAttendance = () => {
  const [students, setStudents] = useState([]);
  const { showToast } = useToast();
  const [totalStudents, setTotalStudents] = useState(0);
  const [attendanceData, setAttendanceData] = useState({}); 
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); 
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const PAGE_SIZE = 20;

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '', status: 'active',
    designation_id: '10', joining_date: new Date().toISOString().split('T')[0],
    address: '', identityType: 'aadhaar', identityNumber: '', profile_image: ''
  });

  const getHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`,
      'Content-Type': 'application/json'
    };
  }, []);

  const syncAttendance = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/attendance/student/${selectedDate}`, {
        headers: getHeaders(),
      });

      if (!res.ok) return;

      const data = await res.json();
      const records = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

      const map = {};
      records.forEach((record) => {
        if (record.user_id) {
          map[record.user_id] = {
            status: record.status?.toUpperCase() || "UNMARKED",
            id: record._id || record.id,
          };
        }
      });

      setAttendanceData(map);
    } catch (e) {
      console.error("Sync Error", e);
    }
  }, [selectedDate, getHeaders]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const cleanBase = (API_BASE || '/api').replace(/\/$/, '');
      const endpoint = cleanBase.endsWith('/v1')
        ? `${cleanBase}/users?role=student&limit=500`
        : `${cleanBase}/v1/users?role=student&limit=500`;

      const res = await fetch(endpoint, { headers: getHeaders() });
      
      if (!res.ok) {
        // Fallback to legacy endpoint
        const fallbackRes = await fetch(`${cleanBase}/user/?role=student&limit=500`, { headers: getHeaders() });
        if (!fallbackRes.ok) return;
        const fbData = await fallbackRes.json();
        const fbUsers = fbData?.users || fbData?.data?.users || fbData?.data || fbData?.results || [];
        setStudents(fbUsers);
        setTotalStudents(fbData?.pagination?.total || fbData?.total || fbUsers.length);
        await syncAttendance();
        return;
      }
      
      const responseData = await res.json();
      const allUsers = responseData?.users || responseData?.data?.users || responseData?.data || responseData?.results || (Array.isArray(responseData) ? responseData : []);
      
      const studentList = Array.isArray(allUsers) ? allUsers.filter(u => {
        const rawRole = u.role_id ?? u.role ?? u.role?.id ?? u.role?.role_id;
        const roleId = String(rawRole || '').toLowerCase();
        return roleId === '10' || roleId === '4' || roleId === 'student';
      }) : [];

      setStudents(studentList);
      setTotalStudents(responseData?.pagination?.total || responseData?.total || studentList.length);
      await syncAttendance();
    } catch (e) {
      console.error("Fetch Error", e);
    } finally {
      setLoading(false);
    }
  }, [getHeaders, syncAttendance]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    syncAttendance();
  }, [selectedDate, syncAttendance]);

  // Combined selector rule to isolate matching entries safely
  const getFilteredStudents = () => {
    return students.filter(s => s.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const exportToExcel = () => {
    const dataToExport = getFilteredStudents().map(s => ({
      'Student Name': s.name.toUpperCase(),
      'Email': s.email,
      'Date': selectedDate,
      'Attendance Status': (attendanceData[s._id || s.id]?.status || 'UNMARKED')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AttendanceReport");
    XLSX.writeFile(workbook, `Attendance_Report_${selectedDate}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const tableColumn = ["Student Name", "Email", "Date", "Status"];
    const tableRows = [];

    getFilteredStudents().forEach(s => {
      const studentData = [
        s.name.toUpperCase(),
        s.email,
        selectedDate,
        (attendanceData[s._id || s.id]?.status || 'UNMARKED')
      ];
      tableRows.push(studentData);
    });

    doc.setFontSize(18);
    doc.text("ATTENDANCE CONTROL REPORT", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Report Date: ${selectedDate}`, 14, 30);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { 
        fillColor: [79, 70, 229], 
        halign: 'center' 
      },
      styles: { fontSize: 8, cellPadding: 4 },
    });

    doc.save(`Attendance_Report_${selectedDate}.pdf`);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsAddingStudent(true);

    // Phone number validation
    if (!/^\d{10}$/.test(formData.phone || '')) {
      showToast('Phone number must be exactly 10 digits.', 'warning');
      setIsAddingStudent(false);
      return;
    }

    // ID Document Number validation
    const idType = formData.identityType;
    const idNum = (formData.identityNumber || '').trim();

    if (!idNum) {
      showToast('ID Document Number is required.', 'warning');
      setIsAddingStudent(false);
      return;
    }

    let cleanIdentityNumber = idNum;
    if (idType === 'aadhaar') {
      const cleanAadhaar = idNum.replace(/[\s-]/g, '');
      if (!/^\d{12}$/.test(cleanAadhaar)) {
        showToast('Aadhaar Card number must be exactly 12 digits.', 'warning');
        setIsAddingStudent(false);
        return;
      }
      cleanIdentityNumber = cleanAadhaar;
    } else if (idType === 'pancard') {
      const cleanPAN = idNum.toUpperCase();
      if (!/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(cleanPAN)) {
        showToast('Invalid PAN Card format. E.g. ABCDE1234F', 'warning');
        setIsAddingStudent(false);
        return;
      }
      cleanIdentityNumber = cleanPAN;
    }

    const finalPayload = { 
      ...formData, 
      identityNumber: cleanIdentityNumber,
      salary: 1, 
      role_id: STUDENT_ROLE_ID 
    };

    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });

      if (response.ok) {
        setIsModalOpen(false);
        fetchStudents();
        setFormData({
          name: '', email: '', password: '', phone: '', status: 'active',
          designation_id: '10', joining_date: new Date().toISOString().split('T')[0],
          address: '', identityType: 'aadhaar', identityNumber: '', profile_image: ''
        });
        showToast("Student Added successfully!", "success");
      } else {
        let errMsg = "Enrollment failed.";
        try {
          const result = await response.json();
          errMsg = result.detail || result.message || result.error || "Please check registration fields.";
        } catch (parseErr) {
          errMsg = response.statusText || "Please check registration fields.";
        }
        showToast(errMsg, 'error');
      }
    } catch (error) {
      showToast(error.message || "Database connection timeout.", 'error');
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleAction = async (studentId, type) => {
    const targetStatus = type.toUpperCase(); 
    const previousState = { ...attendanceData };
    
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: { 
        ...prev[studentId], 
        status: targetStatus 
      }
    }));

    try {
      const res = await fetch(`${API_BASE}/attendance/mark`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ 
          user_id: studentId, 
          date: selectedDate, 
          status: targetStatus 
        }),
      });
      
      if (res.ok) {
        await syncAttendance(); 
      } else {
        setAttendanceData(previousState); 
        showToast("Action failed to write on cluster logs.", 'error');
      }
    } catch (e) { 
      setAttendanceData(previousState);
      showToast("Network disruption detected.", 'error'); 
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      window.scrollTo(0, 0); 
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  // Aggregate current view analytics context securely
  const activePresenceCount = Object.values(attendanceData).filter(v => v.status === 'PRESENT').length;
  const unresolvedAbsentCount = Object.values(attendanceData).filter(v => v.status === 'ABSENT').length;

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-600 dark:text-slate-200 font-sans selection:bg-white-500/30 transition-colors duration-300">
      <div className="relative max-w-[1600px] mx-auto px-4 md:px-8 py-12">
        
        <nav className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgb(79,70,229,0.3)]">
              <ShieldCheck className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight uppercase">Students <span className="text-indigo-600 italic">Attendance</span></h1>
              {/* <p className="text-[10px] font-black tracking-[0.2em] text-slate-500 dark:text-slate-400 uppercase mt-1 italic">Verified Student Administration Session</p> */}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <button onClick={() => setViewMode('grid')} className={`p-3 rounded-xl transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><LayoutGrid size={20} /></button>
            <button onClick={() => setViewMode('table')} className={`p-3 rounded-xl transition-all cursor-pointer ${viewMode === 'table' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><List size={20} /></button>
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block" />
            
            <div className="relative flex items-center gap-1 px-4 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 group">
              <CalendarIcon size={16} className="text-indigo-400" />
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-indigo-900 dark:text-indigo-400 outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark] tracking-widest"
              />
            </div>
          </div>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { label: 'Total Students', value: totalStudents, icon: GraduationCap },
            { label: 'Verified Present Today', value: activePresenceCount, icon: UserCheck },
            { label: 'Confirmed Absent Today', value: unresolvedAbsentCount, icon: AlertCircle },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl flex items-center justify-between group hover:border-indigo-500/20 dark:hover:border-indigo-500/50 transition-all duration-500 shadow-sm">
              <div>
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                <p className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tighter">{stat.value}</p>
              </div>
              <div className="p-5 rounded-2xl bg-white-500/5 dark:bg-indigo-950/20 text-indigo-500 border border-indigo-500/10 dark:border-indigo-500/20 group-hover:scale-110 transition-transform">
                <stat.icon size={28} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-4 mb-10">
          <div className="relative flex-1 group">
            <input 
              placeholder="Search active page student profiles..." 
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500/40 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={exportToPDF} className="flex-1 lg:flex-none bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer">
              <FileSpreadsheet size={16} /> PDF Report
            </button>
            <button onClick={exportToExcel} className="flex-1 lg:flex-none bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer">
              <Download size={16} /> Excel Report
            </button>
            <button onClick={() => setIsModalOpen(true)} className="flex-1 lg:flex-none bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 cursor-pointer">
              <UserPlus size={16} /> Add Student
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="animate-spin text-indigo-500" size={48} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Retrieving Encrypted Class Records...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              <motion.div key="grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {getFilteredStudents().map(s => {
                  const studentId = s._id || s.id;
                  const status = attendanceData[studentId]?.status || 'UNMARKED';
                  const isPresent = status === 'PRESENT';
                  const isAbsent = status === 'ABSENT';

                  return (
                    <motion.div 
                      layout
                      key={studentId} 
                      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-7 rounded-[2.5rem] hover:shadow-md transition-all relative overflow-hidden shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-8">
                        <div className="w-14 h-14 bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xl font-black italic border border-slate-200 dark:border-slate-800">
                          {s.name ? s.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-500 ${
                          isPresent ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 
                          isAbsent ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 
                          'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}>
                          {status}
                        </div>
                      </div>

                      <div className="mb-8">
                        <h3 className="text-slate-900 dark:text-slate-100 font-bold text-lg leading-tight truncate uppercase tracking-tight">{s.name}</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1 truncate lowercase opacity-60 tracking-wider">{s.email}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => handleAction(studentId, 'present')}
                          className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            isPresent 
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10' 
                            : 'bg-slate-50 dark:bg-slate-950 text-emerald-600 border border-slate-100 dark:border-slate-850 hover:bg-emerald-500 hover:text-green hover:border-emerald-500'
                          }`}
                        >
                          <CheckCircle2 size={14} /> {isPresent ? 'Saved' : 'Present'}
                        </button>
                        <button 
                          onClick={() => handleAction(studentId, 'absent')}
                          className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            isAbsent 
                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/10' 
                            : 'bg-slate-50 dark:bg-slate-950 text-red-600 border border-slate-100 dark:border-slate-850 hover:bg-red-500 hover:text-red hover:border-red-500'
                          }`}
                        >
                          <XCircle size={14} /> {isAbsent ? 'Saved' : 'Absent'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]"> 
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-850">
                        <th className="px-8 py-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Full Student Profile</th>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] text-right">Database Controls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredStudents().map((s) => {
                        const studentId = s._id || s.id;
                        const status = attendanceData[studentId]?.status || 'UNMARKED';
                        return (
                          <tr key={studentId} className="border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-950/20 transition-colors group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-5">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 flex-shrink-0">
                                  {s.name ? s.name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-slate-900 dark:text-slate-100 font-bold text-sm uppercase tracking-tight truncate">{s.name}</p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase truncate">{s.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-center">
                               <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${status === 'PRESENT' ? 'text-emerald-500 bg-emerald-500/10' : status === 'ABSENT' ? 'text-red-500 bg-red-500/10' : 'text-slate-500 dark:text-slate-400 bg-slate-500/10 dark:bg-slate-500/20'}`}>
                                {status}
                               </span>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex justify-end gap-3">
                                <button 
                                  onClick={() => handleAction(studentId, 'present')} 
                                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${status === 'PRESENT' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white'}`}
                                >
                                  Present
                                </button>
                                <button 
                                  onClick={() => handleAction(studentId, 'absent')} 
                                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${status === 'ABSENT' ? 'bg-red-600 text-white shadow-md' : 'bg-red-500/10 dark:bg-red-800 text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white'}`}
                                >
                                  Absent
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

        <div className="mt-16 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xl">
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
          >
            <ChevronLeft size={18} /> Previous Sequence
          </button>
          
          <div className="hidden md:flex gap-3">
            {[...Array(Math.ceil(totalStudents / PAGE_SIZE))].map((_, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentPage(i + 1)}
                className={`w-12 h-12 rounded-xl text-[10px] font-black transition-all border cursor-pointer ${currentPage === i + 1 ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/20' : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-indigo-200 hover:text-indigo-600'}`}
              >
                {String(i + 1).padStart(2, '0')}
              </button>
            ))}
          </div>

          <button 
            disabled={currentPage * PAGE_SIZE >= totalStudents} 
            onClick={() => setCurrentPage(p => p + 1)}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
          >
            Next Iteration <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-xl">
            <div className="flex min-h-full items-start justify-center p-4 sm:p-8 md:p-12">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setIsModalOpen(false)} 
                className="fixed inset-0 cursor-pointer z-0" 
              />

              <motion.div 
                initial={{ y: -20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                exit={{ y: -20, opacity: 0 }} 
                className="relative z-10 w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-12 rounded-[3rem] shadow-2xl mb-10"
              >
                <header className="mb-10 flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tighter">
                      Add <span className="text-indigo-600">Student</span>
                    </h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">
                      Verified Institutional Student Registration Node
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="p-4 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-all bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500"
                  >
                    <X size={24}/>
                  </button>
                </header>
                <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormInput label="Full Name" name="name" icon={<User size={14}/>} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  <FormInput label="Email Address" name="email" type="email" icon={<Mail size={14}/>} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  <FormInput label="Account Password" name="password" type="password" icon={<Lock size={14}/>} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                  <div>
                    <FormInput label="Contact Phone" name="phone" icon={<Phone size={14}/>} value={formData.phone}
                      onChange={e => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({...formData, phone: digits});
                      }}
                    />
                    {formData.phone && formData.phone.length !== 10 && (
                      <p className="text-[10px] text-red-500 mt-1 ml-2">Must be exactly 10 digits.</p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">ID Type</label>
                    <div className="relative">
                      <ShieldPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                      <select 
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-slate-100 outline-none appearance-none text-sm focus:border-indigo-500 transition-all cursor-pointer" 
                        value={formData.identityType} 
                        onChange={(e) => setFormData({...formData, identityType: e.target.value})}
                      >
                        <option value="aadhaar">Aadhar Card</option>
                        <option value="pancard">PAN Card</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <FormInput label="ID Document Number" name="identityNumber" icon={<CreditCard size={14}/>} value={formData.identityNumber} onChange={(e) => setFormData({...formData, identityNumber: e.target.value})} />
                    {formData.identityNumber && formData.identityType === 'aadhaar' && !/^\d{12}$/.test(formData.identityNumber.replace(/[\s-]/g, '')) && (
                      <p className="text-[10px] text-red-500 mt-1 ml-2">Aadhaar must be exactly 12 digits.</p>
                    )}
                    {formData.identityNumber && formData.identityType === 'pancard' && !/^[A-Za-z]{5}\d{4}[A-Za-z]{1}$/.test(formData.identityNumber) && (
                      <p className="text-[10px] text-red-500 mt-1 ml-2">Invalid PAN format (E.g. ABCDE1234F).</p>
                    )}
                  </div>

                  <div className="lg:col-span-3 mt-6">
                    <button 
                      type="submit" 
                      disabled={isAddingStudent} 
                      className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                      {isAddingStudent ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                      Confirm 
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentAttendance;
