import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Eye, ArrowLeft, AlertCircle, User, RefreshCw
} from 'lucide-react';
import { getVisibleWork } from '../services/projectService';
import { formatApiError } from '../utils/errorUtils';

const getValue = (...values) => values.find(value => value !== undefined && value !== null && String(value).trim() !== '') || '';

const getAssignedUser = task => {
  const candidate = getValue(task?.assignedTo, task?.assigned_to, task?.assignedUser, task?.employee);
  return candidate && typeof candidate === 'object' ? candidate : {};
};

const getEmployeeName = task => getValue(
  getAssignedUser(task).name,
  getAssignedUser(task).username,
  getAssignedUser(task).employeeName,
  task?.employeeName,
  task?.assignedToName
);

const getInitials = name => String(name || 'N/A').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

const formatDateTime = value => {
  if (!value) return 'N/A';
  // Date-only strings are displayed as provided so the browser cannot shift them by timezone.
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
};

const normalizeStatus = status => {
  const value = String(status || '').trim().toLowerCase();
  if (['done', 'completed'].includes(value)) return 'Completed';
  if (['current', 'in progress', 'in-progress'].includes(value)) return 'In Progress';
  if (value === 'preview') return 'Preview';
  if (value === 'pending') return 'Pending';
  return status || 'N/A';
};

const EmployeeAvatar = ({ task }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const employee = getAssignedUser(task);
  const name = getEmployeeName(task);
  const avatar = getValue(employee.avatar, employee.avatarUrl, employee.profileImage, task?.avatar);

  if (!avatar || imageFailed) {
    return <span className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 inline-flex items-center justify-center text-[10px] font-black ring-2 ring-indigo-500/20">{getInitials(name)}</span>;
  }

  return <img src={avatar} alt={name ? `${name} avatar` : 'Employee avatar'} onError={() => setImageFailed(true)} className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/20" />;
};

const VisibleWorkPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWorkData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getVisibleWork(id);
      const payload = res?.data && !Array.isArray(res.data) && (res.success !== false || res.data.project) ? res.data : res;
      if (res?.success === false) throw new Error(res.message || 'Unable to load visible work.');
      setData(payload && typeof payload === 'object' ? payload : null);
    } catch (err) {
      setData(null);
      setError(formatApiError(err, 'Unable to load visible work. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchWorkData(); }, [fetchWorkData]);

  if (loading) {
    return (
      <div className="py-12 animate-pulse space-y-5" aria-label="Loading project employee visible work tracker">
        <div className="h-8 w-64 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-72 rounded-3xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (error) {
    return <div className="py-20 text-center text-xs text-slate-400 font-semibold flex flex-col items-center gap-3"><AlertCircle className="w-10 h-10 text-rose-400" /><span>{error}</span><button type="button" onClick={fetchWorkData} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"><RefreshCw className="w-4 h-4" />Retry</button></div>;
  }

  if (!data || !data.project) {
    return (
      <div className="py-20 text-center text-xs text-slate-400 font-semibold flex flex-col items-center gap-3">
        <Eye className="w-10 h-10 text-slate-300 dark:text-slate-700" />
        <span>Project record not found.</span>
      </div>
    );
  }

  const project = data.project;
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];

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
          Employee Visible Work Dashboard ({getValue(project.projectName, project.name, 'N/A')})
        </h1>
      </div>

      {/* Overview Card */}
      <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-xl flex flex-col md:flex-row justify-between gap-4 items-center">
        <div>
          <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase">{getValue(project.projectCode, project.code, 'N/A')}</span>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">{getValue(project.projectName, project.name, 'N/A')}</h2>
          <p className="text-xs text-slate-500 font-semibold">
            Tracking active task assignments across {Array.isArray(project.assignedEmployees) ? project.assignedEmployees.length : 0} assigned employees.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Stage:</span>
          <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 font-extrabold text-xs">
            {getValue(project.status, 'N/A')}
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
                tasks.map((task, index) => {
                  const employee = getAssignedUser(task);
                  const employeeName = getEmployeeName(task);
                  const status = normalizeStatus(task?.status);
                  return <tr key={task?._id || task?.id || `${task?.title || 'task'}-${index}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar task={task} />
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 dark:text-slate-100">{employeeName || 'N/A'}</span>
                          <span className="text-[10px] text-slate-400">{getValue(employee.designation, task?.designation, 'N/A')}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                      {getValue(task?.title, task?.taskTitle, 'N/A')}
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        status === 'Completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
                        status === 'In Progress' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' :
                        'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>
                        {status}
                      </span>
                    </td>

                    <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                      {getValue(task?.priority, 'N/A')}
                    </td>

                    <td className="p-4 font-mono font-semibold text-slate-600 dark:text-slate-400">
                      {getValue(task?.timeLogged, task?.loggedTime, task?.time_logged, 'N/A')}
                    </td>

                    <td className="p-4 font-semibold text-slate-600 dark:text-slate-400">
                      {formatDateTime(getValue(task?.dueDate, task?.deadline))}
                    </td>

                    <td className="p-4 max-w-xs text-[11px] text-slate-500 line-clamp-2">
                      {getValue(task?.remarks, task?.managerComments, task?.manager_comments, task?.leadNotes, task?.description, 'N/A')}
                    </td>
                  </tr>
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VisibleWorkPage;
