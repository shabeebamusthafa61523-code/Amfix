import React, { useState, useEffect } from 'react';
import { getExpenseCategories, getExpenses, createExpense, deleteExpense } from '../../services/accountsService';
import { PlusCircle, Search, Calendar, CreditCard, UserCheck, FileText, Paperclip, Trash2, Eye, X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const AddExpenseTab = () => {
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paidTo, setPaidTo] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreviewName, setAttachmentPreviewName] = useState('');

  // Filter State
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // View Attachment Modal
  const [previewFile, setPreviewFile] = useState(null);

  const currentUserStr = localStorage.getItem('user');
  let currentUserName = 'Current User';
  try {
    if (currentUserStr) {
      const u = JSON.parse(currentUserStr);
      currentUserName = u.name || u.email || 'Current User';
    }
  } catch (e) {}

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [catRes, expRes] = await Promise.all([
        getExpenseCategories(),
        getExpenses({ category: filterCategory, paymentMode: filterMode, search: searchTerm })
      ]);
      if (catRes.success) setCategories(catRes.data || []);
      if (expRes.success) setExpenses(expRes.data || []);
    } catch (err) {
      console.error('Data load error:', err);
      setError('Failed to load expense records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterCategory, filterMode]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachment(file);
      setAttachmentPreviewName(file.name);
    } else {
      setAttachment(null);
      setAttachmentPreviewName('');
    }
  };

  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    if (!categoryId || !amount || !paymentMode || !paidTo.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('date', date);
      formData.append('category', categoryId);
      formData.append('amount', amount);
      formData.append('paymentMode', paymentMode);
      formData.append('paidTo', paidTo.trim());
      formData.append('description', description.trim());
      if (attachment) {
        formData.append('attachment', attachment);
      }

      const res = await createExpense(formData);
      if (res.success) {
        setSuccessMsg('Expense added successfully!');
        setAmount('');
        setPaidTo('');
        setDescription('');
        setAttachment(null);
        setAttachmentPreviewName('');
        loadData();
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error recording expense.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense entry?')) return;
    try {
      const res = await deleteExpense(id);
      if (res.success) {
        setSuccessMsg('Expense entry deleted.');
        loadData();
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting expense.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
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

      {/* Add Expense Form Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Add Expense Entry
          </h3>
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <UserCheck size={14} /> Added By: <strong className="text-slate-700 dark:text-slate-300">{currentUserName}</strong>
          </span>
        </div>

        <form onSubmit={handleSubmitExpense} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Date *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Expense Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Expense Category *</label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">-- Select Category --</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Amount (₹) *</label>
            <input
              type="number"
              required
              min="0"
              step="any"
              placeholder="e.g. 2500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
              <option value="Cash">Cash</option>
              <option value="Bank">Bank Transfer</option>
              <option value="UPI">UPI / QR</option>
            </select>
          </div>

          {/* Paid To */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Paid To *</label>
            <input
              type="text"
              required
              placeholder="Vendor or Receiver Name"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Attachment */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Attachment (Optional)</label>
            <div className="relative">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="expense-attachment-input"
              />
              <label
                htmlFor="expense-attachment-input"
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              >
                <span className="truncate">{attachmentPreviewName || 'Choose image or PDF...'}</span>
                <Paperclip size={14} className="shrink-0 text-slate-400" />
              </label>
            </div>
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Description / Notes</label>
            <input
              type="text"
              placeholder="e.g. Purchased monthly printer paper & cartridges"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
                  <span>Saving Expense...</span>
                </>
              ) : (
                <>
                  <PlusCircle size={16} />
                  <span>Save Expense Entry</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Expenses Table Header & Search Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Recent Expense Records
          </h3>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Filter Category */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>

            {/* Filter Mode */}
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs"
            >
              <option value="">All Payment Modes</option>
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
              <option value="UPI">UPI</option>
            </select>

            <button
              onClick={loadData}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="Refresh List"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-y border-slate-200/60 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3 font-semibold">Date</th>
                <th className="py-3 px-3 font-semibold">Category</th>
                <th className="py-3 px-3 font-semibold">Paid To</th>
                <th className="py-3 px-3 font-semibold">Mode</th>
                <th className="py-3 px-3 font-semibold text-right">Amount (₹)</th>
                <th className="py-3 px-3 font-semibold">Added By</th>
                <th className="py-3 px-3 font-semibold text-center">Attachment</th>
                <th className="py-3 px-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 whitespace-nowrap font-medium">
                      {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px]">
                        {exp.categoryName || exp.category?.name || 'Expense'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                      {exp.paidTo}
                      {exp.description && (
                        <p className="text-[11px] text-slate-400 font-normal line-clamp-1">{exp.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {exp.paymentMode}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      ₹{(exp.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {exp.addedByName || exp.addedBy?.name || 'System'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {exp.attachment ? (
                        <button
                          onClick={() => setPreviewFile(exp.attachment)}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-semibold text-[11px]"
                        >
                          <Eye size={14} /> View
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDeleteExpense(exp._id)}
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

      {/* Attachment Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Attachment Preview</h4>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto border border-slate-100 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
              {previewFile.startsWith('data:application/pdf') ? (
                <iframe src={previewFile} title="PDF Attachment" className="w-full h-[500px] rounded-lg" />
              ) : (
                <img src={previewFile} alt="Attachment" className="max-w-full max-h-[500px] object-contain rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddExpenseTab;
