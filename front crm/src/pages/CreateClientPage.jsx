import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, ArrowLeft, Save, ShieldAlert } from 'lucide-react';
import { createClient } from '../services/clientService';

const CreateClientPage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    companyName: '',
    clientName: '',
    companyLogo: '',
    industry: 'Technology',
    website: '',
    gstNumber: '',
    email: '',
    phone: '',
    whatsapp: '',
    country: 'India',
    state: '',
    city: '',
    address: '',
    postalCode: '',
    primaryContact: { name: '', phone: '', email: '', designation: '' },
    secondaryContact: { name: '', phone: '', email: '', designation: '' },
    status: 'Active',
    clientType: 'SMB',
    leadSource: 'Direct',
    notes: '',
    priority: 'Medium',
    expectedMonthlyRevenue: 0,
    contractStart: '',
    contractEnd: '',
    ndaStatus: 'Signed',
    supportPlan: 'Standard 8/5'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = { ...formData };
      if (!payload.contractStart) delete payload.contractStart;
      if (!payload.contractEnd) delete payload.contractEnd;
      if (!payload.accountManager) delete payload.accountManager;
      if (!payload.assignedTeamLead) delete payload.assignedTeamLead;

      const res = await createClient(payload);
      if (res && res.success) {
        navigate('/clients');
      } else {
        setError(res.message || 'Failed to create client.');
      }
    } catch (err) {
      console.error("Create client error:", err);
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Server error creating client.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/clients')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </button>

        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Building className="w-5 h-5 text-indigo-600" />
          Add Enterprise Client Profile
        </h1>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="p-6 md:p-8 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-xl flex flex-col gap-8">
        
        {/* Section 1: Basic Company Info */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800/60 pb-2">
            1. Company Profile Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Company Name *</label>
              <input
                type="text"
                required
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Acme Corp International"
                className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Primary Contact Person Name *</label>
              <input
                type="text"
                required
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                placeholder="John Doe"
                className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Company Email *</label>
              <input
                type="email"
                required
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="contact@acme.com"
                className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number *</label>
              <input
                type="text"
                required
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Industry</label>
              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                placeholder="EdTech / FinTech / E-Commerce"
                className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Website URL</label>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://acme.com"
                className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Account Terms & Plan */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800/60 pb-2">
            2. Commercial Terms & Status
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Client Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Hold">On Hold</option>
                <option value="Lead">Lead</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Client Type</label>
              <select
                name="clientType"
                value={formData.clientType}
                onChange={handleChange}
                className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
              >
                <option value="Enterprise">Enterprise</option>
                <option value="SMB">SMB</option>
                <option value="Startup">Startup</option>
                <option value="Retainer">Retainer</option>
                <option value="One-Time">One-Time</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">NDA Status</label>
              <select
                name="ndaStatus"
                value={formData.ndaStatus}
                onChange={handleChange}
                className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
              >
                <option value="Signed">Signed</option>
                <option value="Pending">Pending</option>
                <option value="Not Applicable">Not Applicable</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Expected Monthly Revenue (₹)</label>
              <input
                type="number"
                name="expectedMonthlyRevenue"
                value={formData.expectedMonthlyRevenue}
                onChange={handleChange}
                className="px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Creating Profile...' : 'Save Client Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateClientPage;
