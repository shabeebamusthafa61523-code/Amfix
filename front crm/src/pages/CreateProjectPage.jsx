import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FolderKanban, ArrowLeft, Save, ShieldAlert, Code, Bookmark, X, Loader2, CheckCircle2 } from 'lucide-react';
import { createProject, fetchActiveEmployees, fetchDepartments } from '../services/projectService';
import { getClients } from '../services/clientService';
import EmployeeMultiSelect from '../components/EmployeeMultiSelect';

const CreateProjectPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledClientId = searchParams.get('clientId') || '';
  const prefilledClientName = decodeURIComponent(searchParams.get('clientName') || '');

  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [error, setError] = useState('');
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
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    projectManager: '',
    departmentId: '',
    department: '',
    assignedEmployees: [] // MANDATORY ARRAY
  });

  useEffect(() => {
    loadDropdownData();
  }, []);

  // Auto-select client once list is loaded from URL params
  useEffect(() => {
    if (prefilledClientId && clients.length > 0) {
      setFormData(prev => ({ ...prev, client: prefilledClientId }));
    }
  }, [prefilledClientId, clients]);

  const getEmployeeTitle = (emp) => {
    if (!emp) return '';
    let desig = '';
    if (emp.designationId && typeof emp.designationId === 'object' && emp.designationId.name) {
      desig = emp.designationId.name;
    } else if (emp.designation && typeof emp.designation === 'string') {
      desig = emp.designation;
    } else if (emp.role) {
      desig = emp.role;
    }
    return desig ? ` - ${desig}` : '';
  };

  const loadDropdownData = async () => {
    try {
      const [clientRes, empRes, deptRes] = await Promise.allSettled([
        getClients({ limit: 100 }),
        fetchActiveEmployees({ limit: 200 }),
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
      console.error("Failed to load project creation dropdowns:", err);
    }
  };

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

      const res = await createProject(payload);
      if (res && res.success) {
        navigate('/projects');
      } else {
        setError(res.message || 'Failed to create project.');
      }
    } catch (err) {
      console.error("Create project submission error:", err);
      setError(err.response?.data?.message || err.message || 'Server error creating project.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      localStorage.setItem('project_draft', JSON.stringify(formData));
      setError('');
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save draft:", err);
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects Directory
        </button>

        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
            <FolderKanban className="w-4 h-4" />
          </div>
          <span>Create New Project Workspace</span>
        </h1>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-2 shadow-xs">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {draftSaved && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Project draft saved successfully in local storage.</span>
        </div>
      )}

      {/* Main Form Container - Removed overflow-hidden so absolute dropdowns render cleanly */}
      <form onSubmit={handleSubmit} className="rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/90 backdrop-blur-md shadow-xl flex flex-col">
        
        <div className="p-6 md:p-8 flex flex-col gap-8">
          {/* Section 1: Project & Client Definition */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800/60 pb-2">
              1. Project Definition & Client Link
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Project Name *</label>
                <input
                  type="text"
                  required
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleChange}
                  placeholder="e.g. Enterprise Mobile CRM Platform"
                  className="px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-semibold transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Client Account *</label>
                {prefilledClientId ? (
                  <div className="px-4 py-2.5 text-xs rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-between">
                    <span>🔗 {prefilledClientName || 'Selected Client'}</span>
                    <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-extrabold">Auto-linked</span>
                  </div>
                ) : (
                  <select
                    required
                    name="client"
                    value={formData.client}
                    onChange={handleChange}
                    className="px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden transition-all"
                  >
                    <option value="">Select Target Client Account...</option>
                    {clients.map(c => (
                      <option key={c._id || c.id} value={c._id || c.id}>
                        {c.companyName} ({c.clientId})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: REDESIGNED ASSIGNED TEAM MEMBERS SECTION (Z-Index fix applied) */}
          <div className="relative z-30 flex flex-col gap-4 p-6 rounded-3xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 shadow-xs">
            <h2 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center justify-between border-b border-indigo-100/60 dark:border-indigo-900/40 pb-2">
              <span>2. Team & Leadership Allocation</span>
              <span className="text-[10px] bg-indigo-600 text-white px-2.5 py-0.5 rounded-full font-extrabold">Mandatory</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Project Manager *</label>
                <select
                  required
                  name="projectManager"
                  value={formData.projectManager}
                  onChange={handleChange}
                  className="px-4 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
                >
                  <option value="">Select Project Manager...</option>
                  {managers.map(m => (
                    <option key={m._id || m.id} value={m._id || m.id}>
                      {m.name || m.username || 'Employee'}{getEmployeeTitle(m)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Department *</label>
                <select
                  required
                  name="departmentId"
                  value={formData.departmentId || ''}
                  onChange={e => {
                    const deptId = e.target.value;
                    const selectedDept = departments.find(d => String(d._id || d.id) === String(deptId));
                    setFormData(prev => ({
                      ...prev,
                      departmentId: deptId,
                      department: selectedDept ? (selectedDept.name || selectedDept.department_name) : ''
                    }));
                  }}
                  className="px-4 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
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

            {/* Redesigned EmployeeMultiSelect Component */}
            <EmployeeMultiSelect
              selectedEmployeeIds={formData.assignedEmployees}
              onChange={handleEmployeesChange}
              required={true}
            />
          </div>

          {/* Section 3: Technical Specifications & Deadlines */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800/60 pb-2">
              3. Scope, Tech Stack & Schedule
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Project Category</label>
                <select
                  name="projectCategory"
                  value={formData.projectCategory}
                  onChange={handleChange}
                  className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
                >
                  <option value="Web Development">Web Development</option>
                  <option value="Mobile App">Mobile App</option>
                  {/* <option value="UI/UX Design">UI/UX Design</option> */}
                  <option value="Digital Marketing">Digital Marketing</option>
                  {/* <option value="Cloud Infrastructure">Cloud Infrastructure</option> */}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Priority</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Estimated Budget (₹)</label>
                <input
                  type="number"
                  name="estimatedBudget"
                  value={formData.estimatedBudget}
                  onChange={handleChange}
                  className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Project Deadline *</label>
                <input
                  type="date"
                  required
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tech Stack (comma separated)</label>
                <input
                  type="text"
                  name="technologyStack"
                  value={formData.technologyStack}
                  onChange={handleChange}
                  placeholder="React, Node.js, MongoDB, Tailwind"
                  className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ISSUE 2 - REDESIGNED ENTERPRISE STICKY DIALOG FOOTER */}
        <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800/90 p-4 md:px-8 z-20 flex flex-col sm:flex-row items-center justify-end gap-3 shadow-2xl">
          {/* Cancel Button */}
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="w-full sm:w-auto h-11 px-6 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-700 focus:ring-2 focus:ring-slate-400 focus:outline-hidden transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>

          {/* Save Draft Button */}
          <button
            type="button"
            disabled={savingDraft}
            onClick={handleSaveDraft}
            className="w-full sm:w-auto h-11 px-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-700 focus:ring-2 focus:ring-slate-400 focus:outline-hidden transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}
            <span>{savingDraft ? 'Saving Draft...' : 'Save Draft'}</span>
          </button>

          {/* Create Project Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto h-11 px-7 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/25 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Project...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Create Project</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProjectPage;
