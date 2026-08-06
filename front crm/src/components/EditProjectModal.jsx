import React, { useState, useEffect } from 'react';
import { X, Save, ShieldAlert, Loader2, FolderKanban, CheckCircle2 } from 'lucide-react';
import { updateProject, fetchActiveEmployees, fetchDepartments } from '../services/projectService';
import { getClients } from '../services/clientService';
import EmployeeMultiSelect from './EmployeeMultiSelect';

const EditProjectModal = ({ isOpen, onClose, project, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [clients, setClients] = useState([]);
  const [managers, setManagers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [formData, setFormData] = useState({
    projectName: '',
    client: '',
    description: '',
    projectCategory: 'Web Development',
    priority: 'Medium',
    status: 'Planning',
    estimatedBudget: 0,
    technologyStack: '',
    repositoryUrl: '',
    productionUrl: '',
    stagingUrl: '',
    startDate: '',
    deadline: '',
    projectManager: '',
    departmentId: '',
    department: '',
    assignedEmployees: []
  });

  useEffect(() => {
    if (isOpen) {
      loadDropdowns();
    }
  }, [isOpen]);

  useEffect(() => {
    if (project && isOpen) {
      const clientId = typeof project.client === 'object' ? (project.client?._id || project.client?.id) : project.client;
      const pmId = typeof project.projectManager === 'object' ? (project.projectManager?._id || project.projectManager?.id) : project.projectManager;
      const deptId = typeof project.departmentId === 'object' ? (project.departmentId?._id || project.departmentId?.id) : project.departmentId;

      let empIds = [];
      if (Array.isArray(project.assignedEmployees)) {
        empIds = project.assignedEmployees.map(e => typeof e === 'object' ? (e._id || e.id) : e).filter(Boolean);
      }

      setFormData({
        projectName: project.projectName || '',
        client: clientId || '',
        description: project.description || '',
        projectCategory: project.projectCategory || 'Web Development',
        priority: project.priority || 'Medium',
        status: project.status || 'Planning',
        estimatedBudget: project.estimatedBudget || 0,
        technologyStack: Array.isArray(project.technologyStack) ? project.technologyStack.join(', ') : (project.technologyStack || ''),
        repositoryUrl: project.repositoryUrl || '',
        productionUrl: project.productionUrl || '',
        stagingUrl: project.stagingUrl || '',
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
        deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '',
        projectManager: pmId || '',
        departmentId: deptId || '',
        department: project.department || '',
        assignedEmployees: empIds
      });
      setError('');
      setSuccessMsg('');
    }
  }, [project, isOpen]);

  const loadDropdowns = async () => {
    try {
      const [clientRes, empRes, deptRes] = await Promise.allSettled([
        getClients({ limit: 100 }),
        fetchActiveEmployees({ limit: 500 }),
        fetchDepartments()
      ]);

      if (clientRes.status === 'fulfilled' && clientRes.value?.success) {
        const clientList = Array.isArray(clientRes.value.data) ? clientRes.value.data : (clientRes.value.data?.clients || []);
        setClients(clientList);
      }
      if (empRes.status === 'fulfilled' && empRes.value) {
        const val = empRes.value;
        let empList = Array.isArray(val) ? val : (val.data?.users || val.data || val.users || []);
        setManagers(empList);
      }
      if (deptRes.status === 'fulfilled' && deptRes.value) {
        const val = deptRes.value;
        let deptList = Array.isArray(val) ? val : (val.data || []);
        setDepartments(deptList);
      }
    } catch (err) {
      console.error("Failed to load edit project dropdowns:", err);
    }
  };

  if (!isOpen || !project) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmployeesChange = (selectedIds) => {
    setFormData(prev => ({ ...prev, assignedEmployees: selectedIds }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!formData.projectName.trim()) {
      setError('Project Name is required.');
      return;
    }
    if (!formData.assignedEmployees || formData.assignedEmployees.length === 0) {
      setError('Assigned Team Members is mandatory. Please select at least one employee.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        technologyStack: typeof formData.technologyStack === 'string'
          ? formData.technologyStack.split(',').map(s => s.trim()).filter(Boolean)
          : formData.technologyStack
      };

      const projId = project._id || project.id;
      const res = await updateProject(projId, payload);
      if (res && (res.success || res.data)) {
        setSuccessMsg('Project updated successfully!');
        setTimeout(() => {
          if (onSuccess) onSuccess(res.data || res);
          onClose();
        }, 800);
      } else {
        setError(res?.message || 'Failed to update project.');
      }
    } catch (err) {
      console.error("Update project error:", err);
      setError(err.response?.data?.message || err.message || 'Server error updating project.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100">Edit Project Workspace</h2>
              <p className="text-xs text-slate-400 font-medium">Update project parameters, status, target department, and team members.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col gap-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Project Name *</label>
              <input
                type="text"
                required
                name="projectName"
                value={formData.projectName}
                onChange={handleChange}
                className="px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Client Account *</label>
              <select
                required
                name="client"
                value={formData.client}
                onChange={handleChange}
                className="px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
              >
                <option value="">Select Target Client...</option>
                {clients.map(c => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.companyName} ({c.clientId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Department & PM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Project Manager *</label>
              <select
                required
                name="projectManager"
                value={formData.projectManager}
                onChange={handleChange}
                className="px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
              >
                <option value="">Select Project Manager...</option>
                {managers.map(m => (
                  <option key={m._id || m.id} value={m._id || m.id}>
                    {m.name || m.username || 'Employee'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Department *</label>
              <select
                required
                name="departmentId"
                value={formData.departmentId}
                onChange={e => {
                  const deptId = e.target.value;
                  const selectedDept = departments.find(d => String(d._id || d.id) === String(deptId));
                  setFormData(prev => ({
                    ...prev,
                    departmentId: deptId,
                    department: selectedDept ? (selectedDept.name || selectedDept.department_name) : ''
                  }));
                }}
                className="px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
              >
                <option value="">Select Target Department...</option>
                {departments.map(d => (
                  <option key={d._id || d.id} value={d._id || d.id}>
                    {d.name || d.department_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
              >
                <option value="Planning">Planning</option>
                <option value="Requirement Gathering">Requirement Gathering</option>
                <option value="UI Design">UI Design</option>
                <option value="Development">Development</option>
                <option value="Testing">Testing</option>
                <option value="Client Review">Client Review</option>
                <option value="Changes">Changes</option>
                <option value="Deployment">Deployment</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Budget ($)</label>
              <input
                type="number"
                name="estimatedBudget"
                value={formData.estimatedBudget}
                onChange={handleChange}
                className="px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Deadline *</label>
              <input
                type="date"
                required
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Detailed project summary, objectives, and scope..."
              className="px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
            />
          </div>

          {/* Team Members */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col gap-2">
            <EmployeeMultiSelect
              selectedEmployeeIds={formData.assignedEmployees}
              onChange={handleEmployeesChange}
              required={true}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update Project</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectModal;
