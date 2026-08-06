import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Eye, ArrowLeft, Clock, CheckCircle, AlertCircle, FileText, Image as ImageIcon,
  MessageSquare, GitCommit, UserCheck, ShieldCheck, User
} from 'lucide-react';
import { getVisibleWork } from '../services/projectService';

const VisibleWorkPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkData();
  }, [id]);

  const fetchWorkData = async () => {
    setLoading(true);
    try {
      const res = await getVisibleWork(id);
      if (res && res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch visible work:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400 font-semibold">
        Loading project employee visible work tracker...
      </div>
    );
  }

  if (!data || !data.project) {
    return (
      <div className="py-20 text-center text-xs text-slate-400 font-semibold flex flex-col items-center gap-3">
        <Eye className="w-10 h-10 text-slate-300 dark:text-slate-700" />
        <span>Project record not found.</span>
      </div>
    );
  }

  const { project, tasks = [], comments = [] } = data;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate(`/projects/${id}`)}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project Overview
        </button>

        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Eye className="w-5 h-5 text-indigo-600" />
          Employee Visible Work Dashboard ({project.projectName})
        </h1>
      </div>

      {/* Overview Card */}
      <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-xl flex flex-col md:flex-row justify-between gap-4 items-center">
        <div>
          <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase">{project.projectCode}</span>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">{project.projectName}</h2>
          <p className="text-xs text-slate-500 font-semibold">
            Tracking active task assignments across {(project.assignedEmployees || []).length} assigned employees.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Stage:</span>
          <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 font-extrabold text-xs">
            {project.status}
          </span>
        </div>
      </div>

      {/* Task Visibility Table */}
      <div className="rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Assigned Employee Work Tracker
          </h3>
          <span className="text-xs font-bold text-slate-400">Total Tasks: {tasks.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="p-4">Assigned Employee</th>
                <th className="p-4">Task & Title</th>
                <th className="p-4">Current Status</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Time Logged</th>
                <th className="p-4">Deadline</th>
                <th className="p-4">Manager / Lead Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-semibold">
                    No active tasks assigned to employees for this project yet.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task._id || task.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={task.assignedTo?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${task.assignedTo?.name || 'Staff'}`} 
                          alt="" 
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/20" 
                        />
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 dark:text-slate-100">{task.assignedTo?.name || 'Unassigned'}</span>
                          <span className="text-[10px] text-slate-400">{task.assignedTo?.designation || 'Employee'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                      {task.title}
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        task.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
                        task.status === 'In Progress' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' :
                        'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>
                        {task.status || 'Pending'}
                      </span>
                    </td>

                    <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                      {task.priority || 'Medium'}
                    </td>

                    <td className="p-4 font-mono font-semibold text-slate-600 dark:text-slate-400">
                      {task.timeLogged || '4.5 hrs'}
                    </td>

                    <td className="p-4 font-semibold text-slate-600 dark:text-slate-400">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="p-4 max-w-xs text-[11px] text-slate-500 line-clamp-2">
                      {task.remarks || task.description || 'No manager comments recorded.'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VisibleWorkPage;
