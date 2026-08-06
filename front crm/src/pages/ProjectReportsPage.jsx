import React, { useState, useEffect } from 'react';
import { 
  BarChart3, PieChart, TrendingUp, DollarSign, CheckCircle2, AlertTriangle, 
  Users, Building, FileSpreadsheet, Download, FileText, RefreshCw, Calendar
} from 'lucide-react';
import { getProjectReports } from '../services/projectService';
import StatsCard from '../components/StatsCard';

const ProjectReportsPage = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await getProjectReports();
      if (res && res.success) {
        setReports(res.data);
      }
    } catch (err) {
      console.error("Failed to compile project reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!reports) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Projects', reports.totalProjects || 0],
      ['Completed Projects', reports.completedProjects || 0],
      ['Overdue Projects', reports.overdueProjects || 0],
      ['Total Portfolio Value', reports.totalBudget || 0],
      ['Average Budget Value', reports.avgBudget || 0]
    ];

    (reports.categoryDistribution || []).forEach(cat => {
      rows.push([`Category: ${cat._id || 'Uncategorized'}`, cat.count]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Project_Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400 font-semibold flex flex-col items-center gap-3">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <span>Compiling enterprise project & resource intelligence reports...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            Project & Resource Intelligence Reports
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Consolidated analytics for client accounts, delivery deadlines, budget variance, and employee utilization.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Projects"
          value={reports?.totalProjects || 0}
          icon={Building}
          description="Active & Completed"
        />
        <StatsCard
          title="Completed Projects"
          value={reports?.completedProjects || 0}
          icon={CheckCircle2}
          description="Successfully Delivered"
        />
        <StatsCard
          title="Overdue Projects"
          value={reports?.overdueProjects || 0}
          icon={AlertTriangle}
          description="Deadline Exceeded"
        />
        <StatsCard
          title="Total Budget Value"
          value={`₹${(reports?.totalBudget || 0).toLocaleString()}`}
          icon={DollarSign}
          description="Cumulative Portfolio Value"
        />
      </div>

      {/* Analytics Breakdown Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution Breakdown */}
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-xl flex flex-col gap-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
            <span>Project Category Breakdown</span>
            <PieChart className="w-4 h-4 text-indigo-600" />
          </h2>

          <div className="flex flex-col gap-3">
            {(reports?.categoryDistribution || []).map((cat) => (
              <div key={cat._id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{cat._id || 'Uncategorized'}</span>
                <span className="px-3 py-1 rounded-full bg-indigo-600 text-white font-extrabold text-xs">
                  {cat.count} {cat.count === 1 ? 'Project' : 'Projects'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio Budget Variance */}
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-xl flex flex-col gap-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
            <span>Portfolio Financial Overview</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </h2>

          <div className="flex flex-col gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/50 flex justify-between items-center">
              <span className="font-bold text-slate-600 dark:text-slate-400">Total Portfolio Value</span>
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400">₹{(reports?.totalBudget || 0).toLocaleString()}</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50 flex justify-between items-center">
              <span className="font-bold text-slate-600 dark:text-slate-400">Average Project Budget</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">₹{Math.round(reports?.avgBudget || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectReportsPage;
