import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, Calendar, Sparkles, AlertCircle, Download, Filter, 
  Copy, Check, FileText, Printer, Zap, Trophy, ShieldCheck, 
  ChevronDown, ChevronUp, Cpu, Award
} from 'lucide-react';
import AiChatWidget from '../components/AiChatWidget';

const API_URL = import.meta.env?.VITE_API_URL || import.meta.env?.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const QUICK_PROMPT_CHIPS = [
  '⚡ Focus on Development Bottlenecks',
  '📊 Highlight Top KPI Performers',
  '🎯 Analyze Pending & Overdue Tasks',
  '🏆 Evaluate Team Lead & HR Ratings'
];

const AiReport = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('all');
  const [reportStats, setReportStats] = useState(null);
  const [customNotes, setCustomNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [showGuideBox, setShowGuideBox] = useState(true);

  const reportRef = useRef(null);
  const exportRef = useRef(null);

  useEffect(() => {
    // Fetch departments for the filter dropdown
    const fetchDepartments = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/v1/departments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          setDepartments(data.data.filter(dept => dept.status === true));
        }
      } catch (err) {
        console.error("Failed to fetch departments", err);
      }
    };
    fetchDepartments();
  }, []);

  const fetchReport = async (force = false) => {
    setLoading(true);
    setError(null);
    setReportData(null);
    setReportStats(null);
    
    try {
      const token = localStorage.getItem('token');
      const notesParam = customNotes ? `&customNotes=${encodeURIComponent(customNotes)}` : '';
      const response = await fetch(`${API_URL}/v1/ai/${activeTab}?department=${selectedDept}${force ? '&force=true' : ''}${notesParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setReportData(data.report);
        setReportStats(data.stats || null);
      } else {
        setError(data.message || 'Failed to fetch AI report.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while communicating with the AI service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(false);
  }, [activeTab, selectedDept]);

  const handleCopyReport = () => {
    if (!reportData) return;
    navigator.clipboard.writeText(reportData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = async () => {
    if (!exportRef.current || !reportData) return;
    
    try {
      const element = exportRef.current;
      const opt = {
        margin:       0.5,
        filename:     `Executive_AI_Report_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      const html2pdfModule = await import('html2pdf.js');
      const html2pdfInstance = html2pdfModule.default || html2pdfModule;
      
      html2pdfInstance().set(opt).from(element).save();
    } catch (err) {
      console.error("Direct PDF Export failed, trying fallback print:", err);
      window.print();
    }
  };

  const handleChipClick = (chipText) => {
    if (customNotes.includes(chipText)) return;
    setCustomNotes(prev => prev ? `${prev}. ${chipText}` : chipText);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-7 pb-20 relative">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-2">
            <Cpu size={13} className="animate-pulse" /> Groq Llama 3.3 Intelligence Engine
          </div> */}
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-700 dark:from-white dark:via-slate-200 dark:to-indigo-300 bg-clip-text text-transparent tracking-tight flex items-center gap-3">
            AI Operations & KPI Analytics Report
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs md:text-sm mt-1">
            Real-time automated performance synthesis analyzing KPI scores, ratings, tasks, and department reports.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap self-stretch sm:self-auto justify-end">
          {/* Department Filter */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 shadow-xs backdrop-blur-md">
            <Filter size={14} className="text-indigo-500 mr-2" />
            <select 
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer uppercase tracking-wider"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportPDF}
            disabled={!reportData || loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 font-bold text-xs shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 tracking-wider uppercase cursor-pointer"
          >
            <Download size={14} className="text-indigo-500" />
            <span>PDF Export</span>
          </button>

          {/* Regenerate Button */}
          <button
            onClick={() => fetchReport(true)}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 tracking-wider uppercase cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Regenerate</span>
          </button>
        </div>
      </div>

      {/* Mode Tabs (Daily / Monthly) */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex bg-slate-200/60 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 p-1.5 rounded-2xl w-full max-w-xs shadow-xs">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all tracking-wider uppercase cursor-pointer ${
              activeTab === 'daily' 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Calendar size={13} />
            <span>Daily Insights</span>
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all tracking-wider uppercase cursor-pointer ${
              activeTab === 'monthly' 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Trophy size={13} />
            <span>Monthly KPI</span>
          </button>
        </div>

        <button
          onClick={() => setShowGuideBox(prev => !prev)}
          className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles size={13} className="text-indigo-500" />
          <span>{showGuideBox ? 'Hide Custom Guidelines' : 'Guide the AI Report'}</span>
          {showGuideBox ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Collapsible Guidelines & Instructions Input */}
      <AnimatePresence>
        {showGuideBox && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs backdrop-blur-md space-y-3"
          >
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest flex items-center gap-1.5">
                <Sparkles size={13} className="animate-pulse" /> Guide the AI Analysis (Optional)
              </label>
              {customNotes && (
                <button
                  onClick={() => setCustomNotes('')}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Clear Notes
                </button>
              )}
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPT_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(chip)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-[11px] font-semibold transition-all cursor-pointer"
                >
                  + {chip}
                </button>
              ))}
            </div>

            <textarea
              placeholder="Type specific instructions (e.g. 'Focus on developer task delays, highlight HR ratings for Q3')..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              rows={2}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-xs font-semibold placeholder:text-slate-400 focus:border-indigo-500 outline-none transition-all resize-none text-slate-800 dark:text-slate-200"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bento Grid Executive KPI Cards */}
      {reportStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Team Sentiment */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Team Operational Sentiment</span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2.5 tracking-tight">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                {reportStats.teamVibe || '⚡ Active & Focused'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 font-medium leading-relaxed">
              Synthesized from real-time task board velocity, attendance, and submitted department logs.
            </p>
          </motion.div>

          {/* Card 2: Executive Summary */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/40 shadow-xs flex flex-col justify-between md:col-span-2 relative overflow-hidden"
          >
            <div>
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-1">Executive Summary</span>
              <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed italic">
                "{reportStats.summary || 'Summary processing...'}"
              </p>
            </div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black mt-3 tracking-wider flex items-center gap-1.5 uppercase">
              <Zap size={13} /> Automated Llama 3.3 Operations Synthesis
            </div>
          </motion.div>

          {/* Card 3: Employee of the Month Spotlight */}
          {activeTab === 'monthly' && reportStats.employeeOfTheMonth?.name && reportStats.employeeOfTheMonth?.name !== 'N/A' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 shadow-xs md:col-span-3 flex flex-col sm:flex-row items-center gap-5"
            >
              <div className="h-14 w-14 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-2xl shadow-md shadow-amber-500/20 flex items-center justify-center text-white shrink-0">
                <Award size={30} />
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block">🏆 Monthly Performance Winner</span>
                <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{reportStats.employeeOfTheMonth.name}</h4>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl mt-0.5">{reportStats.employeeOfTheMonth.reason}</p>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Main Report Document Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl rounded-3xl min-h-[420px] relative overflow-hidden">
        
        {/* Document Header Bar */}
        {reportData && !loading && (
          <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <FileText size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  {activeTab === 'daily' ? 'Daily Executive Operations Report' : 'Monthly Performance Insights & KPI Analysis'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Generated for {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyReport}
                className="px-3 py-1.5 rounded-xl bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-xl bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={13} />
                <span>Print</span>
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center space-y-4 min-h-[400px]"
            >
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30"></div>
                <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider animate-pulse text-center px-4">
                Analyzing KPI scores, ratings, tasks, and department reports...
              </p>
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center space-y-3 p-8 text-center min-h-[400px]"
            >
              <AlertCircle className="text-rose-500" size={44} />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Analysis Failed</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{error}</p>
              <button onClick={() => fetchReport(true)} className="text-indigo-600 hover:underline text-xs font-bold mt-2 cursor-pointer">
                Try Again
              </button>
            </motion.div>
          ) : reportData ? (
            <motion.div 
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-6 md:p-10 prose dark:prose-invert prose-indigo max-w-none"
            >
              <div ref={reportRef} className="pdf-container bg-transparent print:absolute print:left-0 print:top-0 print:w-full print:bg-white print:text-black print:p-8">
                <style>
                  {`
                    @media print {
                      body * { visibility: hidden; }
                      .pdf-container, .pdf-container * { visibility: visible; }
                      .pdf-container { margin: 0; padding: 0; box-shadow: none; border: none; }
                      .pdf-container * { color: black !important; }
                    }
                  `}
                </style>
                <ReactMarkdown
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-800 pb-4 tracking-tight" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-8 mb-4 flex items-center gap-2.5 border-l-4 border-indigo-600 pl-3 tracking-tight" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mt-6 mb-3 tracking-tight" {...props} />,
                    p: ({node, ...props}) => <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4 text-xs md:text-sm font-medium" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-extrabold text-indigo-600 dark:text-indigo-400" {...props} />,
                    ul: ({node, ...props}) => <ul className="space-y-2 mb-6 pl-1" {...props} />,
                    li: ({node, ...props}) => (
                      <li className="flex items-start mb-2">
                        <span className="mr-3 text-indigo-550 dark:text-indigo-400 mt-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 block" />
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 text-xs md:text-sm font-medium leading-relaxed" {...props} />
                      </li>
                    ),
                    blockquote: ({node, ...props}) => (
                      <blockquote className="border-l-4 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-r-2xl text-indigo-950 dark:text-indigo-200 my-6 italic text-xs font-medium leading-relaxed" {...props} />
                    ),
                    table: ({node, ...props}) => (
                      <div className="overflow-x-auto my-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs" {...props} />
                      </div>
                    ),
                    thead: ({node, ...props}) => <thead className="bg-slate-50 dark:bg-slate-950" {...props} />,
                    th: ({node, ...props}) => <th className="px-4 py-3 text-left font-black text-slate-900 dark:text-white uppercase tracking-wider text-[10px]" {...props} />,
                    td: ({node, ...props}) => <td className="px-4 py-3 text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/60 font-medium" {...props} />,
                  }}
                >
                  {reportData}
                </ReactMarkdown>
              </div>
            </motion.div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center min-h-[400px]">
              <p className="text-xs text-slate-400 font-semibold">No AI report data available.</p>
            </div>
          )}
        </AnimatePresence>
        
      </div>

      {/* AI Chat Assistant Widget */}
      <AiChatWidget reportContext={reportData} />

      {/* Off-screen container for PDF export */}
      {reportData && (
        <div style={{ position: 'absolute', left: '-9999px', top: '0', width: '800px', zIndex: -1000 }}>
          <div ref={exportRef} style={{ padding: '40px', backgroundColor: '#ffffff', color: '#1a1a1a', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ fontSize: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px', fontWeight: 'bold', color: '#111827' }}>
              Executive AI Report - {activeTab === 'daily' ? 'Daily Summary' : 'Monthly Performance & KPI Insights'}
            </h1>
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '24px', marginBottom: '12px', color: '#1f2937', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }} {...props} />,
                h2: ({node, ...props}) => <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '20px', marginBottom: '10px', color: '#374151' }} {...props} />,
                p: ({node, ...props}) => <p style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '14px', color: '#4b5563' }} {...props} />,
                ul: ({node, ...props}) => <ul style={{ paddingLeft: '20px', marginBottom: '14px', listStyleType: 'disc' }} {...props} />,
                li: ({node, ...props}) => <li style={{ fontSize: '13px', marginBottom: '6px', color: '#4b5563' }} {...props} />,
                strong: ({node, ...props}) => <strong style={{ fontWeight: 'bold', color: '#111827' }} {...props} />,
                blockquote: ({node, ...props}) => <blockquote style={{ borderLeft: '4px solid #d1d5db', paddingLeft: '16px', fontStyle: 'italic', margin: '20px 0', color: '#6b7280' }} {...props} />
              }}
            >
              {reportData}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiReport;
