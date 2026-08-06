import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check, Filter, User as UserIcon, Building, Briefcase, CheckSquare, Square } from 'lucide-react';
import { fetchActiveEmployees, fetchDepartments, fetchDesignations } from '../services/projectService';

const EmployeeMultiSelect = ({ selectedEmployeeIds = [], onChange, label = "Assigned Team Members", required = true, error }) => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadEmployees();
  }, [search, departmentFilter]);

  useEffect(() => {
    loadMetaDropdowns();
  }, []);

  const loadMetaDropdowns = async () => {
    try {
      const [deptRes, desigRes] = await Promise.allSettled([
        fetchDepartments(),
        fetchDesignations()
      ]);

      if (deptRes.status === 'fulfilled' && deptRes.value) {
        const dList = Array.isArray(deptRes.value) ? deptRes.value : (deptRes.value.data || []);
        setDepartments(dList);
      }
      if (desigRes.status === 'fulfilled' && desigRes.value) {
        const desList = Array.isArray(desigRes.value) ? desigRes.value : (desigRes.value.data || []);
        setDesignations(desList);
      }
    } catch (err) {
      console.error("Failed to load metadata dropdowns:", err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getEmpDesignation = (emp) => {
    if (!emp) return 'Staff';
    if (emp.designationId && typeof emp.designationId === 'object' && emp.designationId.name) {
      return emp.designationId.name;
    }
    if (emp.designation && typeof emp.designation === 'string') {
      return emp.designation;
    }
    if (emp.role) {
      return emp.role;
    }
    return 'Staff';
  };

  const getEmpDepartment = (emp) => {
    if (!emp) return 'Operations';
    if (emp.departmentId && typeof emp.departmentId === 'object' && emp.departmentId.name) {
      return emp.departmentId.name;
    }
    if (emp.department && typeof emp.department === 'string') {
      return emp.department;
    }
    return 'Operations';
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetchActiveEmployees({
        search,
        department: departmentFilter,
        limit: 500
      });
      if (res && res.data) {
        setEmployees(Array.isArray(res.data) ? res.data : (res.data.users || []));
      } else if (Array.isArray(res)) {
        setEmployees(res);
      }
    } catch (err) {
      console.error("Failed to load employees for multi-select:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (empId) => {
    const isAlreadySelected = selectedEmployeeIds.includes(empId);
    let updated;
    if (isAlreadySelected) {
      updated = selectedEmployeeIds.filter(id => id !== empId);
    } else {
      updated = [...selectedEmployeeIds, empId];
    }
    onChange(updated);
  };

  const removeChip = (empId, e) => {
    e.stopPropagation();
    onChange(selectedEmployeeIds.filter(id => id !== empId));
  };

  const selectAll = (e) => {
    e.stopPropagation();
    const allIds = filteredEmployees.map(emp => emp._id || emp.id);
    const combined = Array.from(new Set([...selectedEmployeeIds, ...allIds]));
    onChange(combined);
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  const filteredEmployees = employees.filter(emp => {
    if (search) {
      const q = search.toLowerCase().trim();
      const empName = String(emp.name || '').toLowerCase();
      const empEmail = String(emp.email || '').toLowerCase();
      const empDesig = String(getEmpDesignation(emp)).toLowerCase();
      const empDept = String(getEmpDepartment(emp)).toLowerCase();
      const matchesSearch = empName.includes(q) || empEmail.includes(q) || empDesig.includes(q) || empDept.includes(q);
      if (!matchesSearch) return false;
    }
    if (designationFilter) {
      const desig = String(getEmpDesignation(emp)).toLowerCase();
      if (!desig.includes(designationFilter.toLowerCase())) return false;
    }
    return true;
  });

  const selectedEmployeesList = employees.filter(e => selectedEmployeeIds.includes(e._id || e.id));

  return (
    <div className="relative flex flex-col gap-2 w-full" ref={dropdownRef}>
      {/* Header & Subtitle */}
      <div className="flex flex-col gap-0.5">
        <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            {label} {required && <span className="text-rose-500">*</span>}
          </span>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
            {selectedEmployeeIds.length} Selected
          </span>
        </label>
        <p className="text-[11px] text-slate-400 font-medium">
          Select one or more employees who will work on this project.
        </p>
      </div>

      {/* Selected Chips Container & Trigger */}
      <div 
        tabIndex={0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen(prev => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(prev => !prev);
          }
        }}
        className={`min-h-[54px] p-3 rounded-2xl border bg-slate-50 dark:bg-slate-800/90 cursor-pointer flex flex-wrap gap-2 items-center transition-all duration-200 shadow-xs hover:shadow-md focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 ${
          error 
            ? 'border-rose-500 ring-2 ring-rose-500/20' 
            : isOpen 
            ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-white dark:bg-slate-800 shadow-indigo-500/10' 
            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-slate-600'
        }`}
      >
        {selectedEmployeeIds.length === 0 ? (
          <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold pl-1 flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span>Search and select team members (Developers, Designers, Managers)...</span>
          </span>
        ) : (
          selectedEmployeesList.map((emp) => {
            const empId = emp._id || emp.id;
            return (
              <div 
                key={empId}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-100 border border-indigo-300/80 dark:border-indigo-800 text-xs font-black shadow-xs transition-all hover:scale-[1.02]"
              >
                <div className="relative">
                  {emp.avatar || emp.profile_image ? (
                    <img src={emp.avatar || emp.profile_image} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-indigo-400 dark:ring-indigo-600" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-indigo-300 dark:bg-indigo-800 text-[10px] flex items-center justify-center font-black text-indigo-950 dark:text-indigo-100">
                      {emp.name?.[0]}
                    </div>
                  )}
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 ring-1 ring-white dark:ring-slate-900" />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-black">{emp.name}</span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-300 font-bold max-w-[110px] truncate hidden sm:inline">
                    ({emp.designation || emp.role || 'Staff'})
                  </span>
                </div>

                <button 
                  type="button"
                  aria-label={`Remove ${emp.name}`}
                  onClick={(e) => removeChip(empId, e)}
                  className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-0.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/80 ml-0.5"
                >
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {error && <span className="text-[11px] text-rose-500 font-semibold">{error}</span>}

      {/* Enterprise Searchable Dropdown Popup */}
      {isOpen && (
        <div 
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl shadow-2xl p-4 flex flex-col gap-3.5 max-h-[420px] overflow-hidden ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Quick Actions Header Bar */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">
              Available Directory ({filteredEmployees.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Select All</span>
              </button>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                type="button"
                onClick={clearSelection}
                className="text-[11px] font-bold text-rose-500 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Clear Selection</span>
              </button>
            </div>
          </div>

          {/* Multi-Criteria Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative col-span-1 sm:col-span-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:outline-hidden"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id || dept.id || dept.name} value={dept.name || dept._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {dept.name || dept.department_name}
                </option>
              ))}
            </select>

            <select
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
              className="px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:outline-hidden"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Designations</option>
              {designations.map((desig) => (
                <option key={desig._id || desig.id || desig.title} value={desig.title || desig.name || desig.designation_name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {desig.title || desig.name || desig.designation_name}
                </option>
              ))}
            </select>
          </div>

          {/* Employees List */}
          <div className="overflow-y-auto max-h-64 flex flex-col gap-1.5 pr-1 custom-scrollbar">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 font-bold">Loading active employees...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-bold">No active employees found matching query.</div>
            ) : (
              filteredEmployees.map((emp) => {
                const empId = emp._id || emp.id;
                const isSelected = selectedEmployeeIds.includes(empId);
                return (
                  <div
                    key={empId}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleSelect(empId)}
                    className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-150 border ${
                      isSelected 
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-800' 
                        : 'hover:bg-indigo-500/10 dark:hover:bg-indigo-950/40 hover:border-indigo-300 dark:hover:border-indigo-800/60 border-transparent bg-slate-50/50 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        {emp.avatar || emp.profile_image ? (
                          <img src={emp.avatar || emp.profile_image} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-400/40 dark:ring-indigo-600/40" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 flex items-center justify-center font-black text-xs">
                            {emp.name?.[0]}
                          </div>
                        )}
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute bottom-0 right-0 ring-2 ring-white dark:ring-slate-900" title="Active Staff" />
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 dark:text-slate-100">{emp.name}</span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{getEmpDesignation(emp)}</span>
                          <span>•</span>
                          <span>{getEmpDepartment(emp)}</span>
                        </div>
                      </div>
                    </div>

                    <div className={`w-6 h-6 rounded-xl flex items-center justify-center transition-all ${
                      isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'border border-slate-300 dark:border-slate-700 hover:border-indigo-500'
                    }`}>
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeMultiSelect;
