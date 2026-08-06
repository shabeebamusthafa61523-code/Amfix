import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Building, ArrowLeft, Mail, Phone, Globe, MapPin, Calendar, 
  ShieldCheck, FolderKanban, FileText, Clock, Plus, ChevronRight, User as UserIcon
} from 'lucide-react';
import { getClientById } from '../services/clientService';

const ClientDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchClientDetails();
  }, [id]);

  const fetchClientDetails = async () => {
    setLoading(true);
    try {
      const res = await getClientById(id);
      if (res && res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch client details:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400 font-semibold">
        Loading enterprise client profile...
      </div>
    );
  }

  if (!data || !data.client) {
    return (
      <div className="py-20 text-center text-xs text-slate-400 font-semibold flex flex-col items-center gap-3">
        <Building className="w-10 h-10 text-slate-300 dark:text-slate-700" />
        <span>Client profile not found.</span>
        <button onClick={() => navigate('/clients')} className="text-indigo-600 font-bold hover:underline">
          Return to Directory
        </button>
      </div>
    );
  }

  const { client, projects = [], activities = [] } = data;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/clients')}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Directory
      </button>

      {/* Profile Header Hero Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-xl flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
        <div className="flex items-center gap-5">
          {client.companyLogo ? (
            <img src={client.companyLogo} alt="" className="w-16 h-16 rounded-2xl object-cover ring-4 ring-indigo-500/20 shadow-md" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              {client.companyName?.[0]}
            </div>
          )}

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">{client.companyName}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-mono text-[11px] font-bold">
                {client.clientId}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1 flex items-center gap-3">
              <span>Primary Contact: <strong className="text-slate-700 dark:text-slate-300">{client.clientName}</strong></span>
              <span>•</span>
              <span>{client.industry || 'Technology'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <Link
            to={`/projects/new?clientId=${client._id || client.id}&clientName=${encodeURIComponent(client.companyName || '')}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Client Project</span>
          </Link>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-1 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview & Info', icon: Building },
          { id: 'projects', label: `Projects (${projects.length})`, icon: FolderKanban },
          // { id: 'documents', label: `Documents (${documents.length})`, icon: FileText },
          { id: 'timeline', label: 'Activity Timeline', icon: Clock }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md flex flex-col gap-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
              Commercial & Account Parameters
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400">Account Type</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">{client.clientType}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400">NDA Status</span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{client.ndaStatus}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400">Expected Revenue</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">₹{(client.expectedMonthlyRevenue || 0).toLocaleString()}/mo</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400">Lead Source</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">{client.leadSource || 'Direct'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400">Support SLA</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">{client.supportPlan || 'Standard'}</span>
              </div>
            </div>

            {client.notes && (
              <div className="flex flex-col gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400">Internal Account Notes</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
                  {client.notes}
                </p>
              </div>
            )}
          </div>

          <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md flex flex-col gap-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
              Contact & Location
            </h2>

            <div className="flex flex-col gap-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-indigo-500" />
                <span>{client.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-indigo-500" />
                <span>{client.phone}</span>
              </div>
              {client.website && (
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  <a href={client.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                    {client.website}
                  </a>
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>{client.address}, {client.city}, {client.country}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-xs text-slate-400">
              No projects created for this client yet.
            </div>
          ) : (
            projects.map((prj) => (
              <div key={prj._id || prj.id} className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">{prj.projectName}</h3>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-[10px] font-bold text-indigo-600">
                      {prj.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{prj.description || 'No description provided.'}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-mono text-slate-400">{prj.projectCode}</span>
                  <Link to={`/projects/${prj._id || prj.id}`} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                    Manage Project <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md flex flex-col gap-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-2">
            Client Activity Log
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activities.length === 0 ? (
              <span className="text-xs text-slate-400 col-span-2">No activity recorded yet.</span>
            ) : (
              activities.map((act) => (
                <div key={act._id || act.id} className="flex gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{act.title}</span>
                    <span className="text-slate-400 text-[10px]">{new Date(act.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetailsPage;
