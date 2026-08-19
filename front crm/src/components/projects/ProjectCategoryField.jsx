import React, { useEffect, useRef, useState } from 'react';
import { Plus, X, Save, ShieldAlert, Loader2 } from 'lucide-react';
import { getProjectCategories, createProjectCategory } from '../../services/projectService';
import { formatApiError } from '../../utils/errorUtils';

const ProjectCategoryField = ({
  departmentId,
  value,
  onChange,
  selectClassName
}) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const requestSeq = useRef(0);

  const loadCategories = async (deptId, preferredName = '') => {
    const seq = ++requestSeq.current;

    if (!deptId) {
      setCategories([]);
      setLoadError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');

    try {
      const res = await getProjectCategories(deptId);
      if (seq !== requestSeq.current) return;

      if (res && res.success) {
        const list = Array.isArray(res.data) ? res.data : [];
        setCategories(list);

        const stillValid = list.some((c) => c.name === value);
        const preferred = preferredName
          ? list.find((c) => c.name === preferredName)
          : null;

        if (preferred) {
          onChange(preferred.name);
        } else if (value && !stillValid) {
          onChange('');
        }
      } else {
        setCategories([]);
        setLoadError(formatApiError(res, 'Failed to load categories for this department.'));
        if (value) onChange('');
      }
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setCategories([]);
      setLoadError(formatApiError(err, 'Failed to load categories for this department.'));
      if (value) onChange('');
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadCategories(departmentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId]);

  const openCreateModal = () => {
    if (!departmentId) {
      setCreateError('Please select a department first.');
      setModalOpen(true);
      return;
    }
    setCreateError('');
    setNewName('');
    setModalOpen(true);
  };

  const handleCreate = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!departmentId) {
      setCreateError('Please select a department first.');
      return;
    }

    const trimmed = newName.trim();
    if (!trimmed) {
      setCreateError('Category name is required.');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      const res = await createProjectCategory({
        name: trimmed,
        departmentId
      });

      if (res && res.success && res.data) {
        const newCategory = res.data;

        setCategories((prev) => {
          const exists = prev.some((c) => c.name === newCategory.name);
          return exists ? prev : [...prev, newCategory];
        });

        onChange(newCategory.name || trimmed);
        setModalOpen(false);
        setNewName('');
      } else {
        setCreateError(formatApiError(res, 'Failed to create category.'));
      }
    } catch (err) {
      setCreateError(formatApiError(err, 'Failed to create category.'));
    } finally {
      setCreating(false);
    }
  };

  const selectCls = selectClassName
    || 'px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden disabled:opacity-60';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Project Category</label>
        <button
          type="button"
          onClick={openCreateModal}
          title="Add new project category"
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <select
        name="projectCategory"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={!departmentId || loading}
        className={selectCls}
      >
        <option value="">
          {!departmentId
            ? 'Select a department first...'
            : loading
              ? 'Loading categories...'
              : categories.length === 0
                ? 'No categories for this department'
                : 'Select Category...'}
        </option>
        {categories.map((cat) => (
          <option key={cat._id || cat.id} value={cat.name}>
            {cat.name}
          </option>
        ))}
      </select>

      {loadError && (
        <span className="text-[11px] font-semibold text-rose-500">{loadError}</span>
      )}
      {departmentId && !loading && !loadError && categories.length === 0 && (
        <span className="text-[11px] font-semibold text-slate-400">
          No categories found. Use + to add one for this department.
        </span>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Add New Project Category</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Changed from <form> to <div> to stop nested form submission */}
            <div className="p-5 flex flex-col gap-4">
              {createError && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCreate();
                    }
                  }}
                  disabled={!departmentId || creating}
                  placeholder="e.g. Social Media"
                  className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !departmentId}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{creating ? 'Saving...' : 'Create Category'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCategoryField;