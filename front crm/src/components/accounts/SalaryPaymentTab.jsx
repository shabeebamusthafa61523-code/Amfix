import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getSalaryPayments, createSalaryPayment, deleteSalaryPayment } from '../../services/accountsService';
import { Users, DollarSign, Calendar, CreditCard, FileText, CheckCircle, AlertCircle, Trash2, RefreshCw, Sparkles } from 'lucide-react';

const SalaryPaymentTab = () => {
  const [employees, setEmployees] = useState([]);
  const [salaryPayments, setSalaryPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  });
  const [basicSalary, setBasicSalary] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('Bank');
  const [remarks, setRemarks] = useState('');

  // Fetch Employees List
  const fetchEmployees = async () => {
    try {
      let token = localStorage.getItem('token') || '';
      token = token.replace(/^"(.*)"$/, '$1').trim();
      if (token.startsWith('Bearer ')) token = token.slice(7).trim();

      const host = import.meta.env.VITE_API_URL || '/api';
      const apiUrl = `${host.replace(/\/+$/, '')}/v1/users`;

      const res = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const userList = res.data?.data || res.data || [];
      if (Array.isArray(userList)) {
        setEmployees(userList.filter(u => u.isActive !== false));
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchSalaryPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSalaryPayments();
      if (res.success) {
        setSalaryPayments(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching salary payments:', err);
      setError('Failed to fetch salary payment records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchSalaryPayments();
  }, []);

  // When Employee is selected, auto-populate basic salary if present in user record
  const handleEmployeeChange = (e) => {
    const empId = e.target.value;
    setSelectedEmployeeId(empId);

    const emp = employees.find(u => String(u._id || u.id) === String(empId));
    if (emp && emp.salary !== undefined) {
      setBasicSalary(emp.salary || 0);
      setPaidAmount(emp.salary || 0);
    }
  };

  const handleSubmitSalary = async (e) => {
    e.preventDefault();
    if (!selectedEmployeeId || !month || !paidAmount || !paymentMode) {
      setError('Please fill in Employee, Month, Paid Amount, and Payment Mode.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await createSalaryPayment({
        employeeId: selectedEmployeeId,
        month,
        basicSalary: Number(basicSalary || 0),
        paidAmount: Number(paidAmount),
        paymentDate,
        paymentMode,
        remarks: remarks.trim()
      });

      if (res.success) {
        setSuccessMsg('Salary payment recorded & expense entry created automatically!');
        setSelectedEmployeeId('');
        setBasicSalary('');
        setPaidAmount('');
        setRemarks('');
        fetchSalaryPayments();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error recording salary payment.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSalary = async (id) => {
    if (!window.confirm('Are you sure you want to delete this salary payment? This will also remove the automatically created expense entry.')) return;
    try {
      const res = await deleteSalaryPayment(id);
      if (res.success) {
        setSuccessMsg('Salary payment and synced expense entry removed.');
        fetchSalaryPayments();
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting salary payment.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Salary Payment Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Employee Salary Payment
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-500" />
              Paying salary will automatically create a corresponding expense entry in Cash Book.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitSalary} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Employee */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Employee *</label>
            <select
              required
              value={selectedEmployeeId}
              onChange={handleEmployeeChange}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">-- Select Employee --</option>
              {employees.map((emp) => {
                const idVal = String(emp._id || emp.id || '');
                return (
                  <option key={idVal} value={idVal}>
                    {emp.name} ({emp.designation || 'Staff'}) — {emp.email}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Month *</label>
            <input
              type="text"
              required
              placeholder="e.g. August 2026"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Payment Date *</label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Basic Salary */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Basic Salary (₹)</label>
            <input
              type="number"
              min="0"
              placeholder="Base Salary"
              value={basicSalary}
              onChange={(e) => setBasicSalary(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Paid Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Paid Amount (₹) *</label>
            <input
              type="number"
              required
              min="0"
              step="any"
              placeholder="Disbursed Salary Amount"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-emerald-600 dark:text-emerald-400"
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Payment Mode *</label>
            <select
              required
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="Bank">Bank Transfer</option>
              <option value="UPI">UPI / GPay</option>
              <option value="Cash">Cash</option>
            </select>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Remarks (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Includes performance incentive"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Submit Button */}
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-md shadow-indigo-500/20 disabled:opacity-50 transition cursor-pointer flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Salary...</span>
                </>
              ) : (
                <>
                  <DollarSign size={16} />
                  <span>Process Salary Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Salary Payments History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Salary Payment History
          </h3>
          <button
            onClick={fetchSalaryPayments}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Refresh List"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-y border-slate-200/60 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3 font-semibold">Payment Date</th>
                <th className="py-3 px-3 font-semibold">Employee</th>
                <th className="py-3 px-3 font-semibold">Month</th>
                <th className="py-3 px-3 font-semibold">Basic Salary</th>
                <th className="py-3 px-3 font-semibold text-right">Paid Amount (₹)</th>
                <th className="py-3 px-3 font-semibold">Mode</th>
                <th className="py-3 px-3 font-semibold">Remarks</th>
                <th className="py-3 px-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading salary payment records...
                  </td>
                </tr>
              ) : salaryPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No salary payment records found.
                  </td>
                </tr>
              ) : (
                salaryPayments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 whitespace-nowrap font-medium">
                      {new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {p.employeeName || p.employee?.name || 'Employee'}
                      {p.employee?.designation && (
                        <span className="block text-[10px] text-slate-400 font-normal">{p.employee.designation}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-medium">
                      {p.month}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      ₹{(p.basicSalary || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      ₹{(p.paidAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {p.paymentMode}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {p.remarks || '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDeleteSalary(p._id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Delete Record"
                      >
                        <Trash2 size={14} />
                      </button>
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

export default SalaryPaymentTab;
