import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Lock, ShieldPlus, Phone, Briefcase, Building,
  ShieldCheck, CreditCard, IndianRupee, 
  Eye, EyeOff, MapPin, Calendar, Image as ImageIcon, Loader2, AlertTriangle, Sun, Moon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const [roles] = useState([
    { id: "1", name: "employee" },
    { id: "2", name: "admin" },
    // { id: "3", name: "employee" },
    // { id: "10", name: "student" }
  ]);

  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role_id: '3', // Explicitly set default
    status: 'active',
    designation_id: '', // Set empty initially, set dynamically once loaded
    department_id: '', // Set empty initially, set dynamically once loaded
    joining_date: new Date().toISOString().split('T')[0],
    salary: '',
    address: '',
    identityType: 'aadhaar', 
    identityNumber: '',
  });

  React.useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_URL || '';

    const fetchDesignations = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/auth/designations`);
        const data = await res.json();
        
        let loadedDesignations = [];
        if (data.success && Array.isArray(data.data)) {
          loadedDesignations = data.data;
        } else if (Array.isArray(data)) {
          loadedDesignations = data;
        }
        
        if (loadedDesignations.length > 0) {
          setDesignations(loadedDesignations);
          // Set first designation as default
          setFormData(prev => ({
            ...prev,
            designation_id: String(loadedDesignations[0].id || loadedDesignations[0]._id || '')
          }));
        } else {
          throw new Error('Empty designations list');
        }
      } catch (err) {
        console.error("Failed to fetch designations:", err);
        // Fallback on error
        const fallback = [
          { id: "1", name: "Hr Manager" },
          { id: "2", name: "Graphic Designer" },
          { id: "3", name: "Digital Marketer" },
          { id: "4", name: "React Developer" },
          { id: "5", name: "Node Developer" },
          { id: "6", name: "Flutter Developer" },
          { id: "7", name: "Fullstack Developer" },
          { id: "8", name: "Admin" },
          { id: "9", name: "Manager" },
          { id: "10", name: "Student" }
        ];
        setDesignations(fallback);
        setFormData(prev => ({
          ...prev,
          designation_id: "4"
        }));
      }
    };

    const fetchDepartments = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/auth/departments`);
        const data = await res.json();
        
        let loadedDepartments = [];
        // The department GET returns sendSuccess format
        if (data.success && Array.isArray(data.data)) {
          loadedDepartments = data.data;
        } else if (Array.isArray(data)) {
          loadedDepartments = data;
        }
        
        if (loadedDepartments.length > 0) {
          setDepartments(loadedDepartments);
          // Set first department as default
          setFormData(prev => ({
            ...prev,
            department_id: String(loadedDepartments[0].id || loadedDepartments[0]._id || '')
          }));
        } else {
          throw new Error('Empty departments list');
        }
      } catch (err) {
        console.error("Failed to fetch departments:", err);
        const fallback = [
          { id: "6a3caed51194353cbc8a3686", name: "HR & Admin" },
          { id: "6a26a7d72a56a1f9c49da8a3", name: "Marketing" },
          { id: "6a3caeb31194353cbc8a3683", name: "Development" },
          { id: "6a3caec01194353cbc8a3684", name: "Designing" }
        ];
        setDepartments(fallback);
        setFormData(prev => ({
          ...prev,
          department_id: fallback[0].id
        }));
      }
    };
    
    fetchDesignations();
    fetchDepartments();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Phone number validation
    if (!/^\d{10}$/.test(formData.phone || '')) {
      setError('Phone number must be exactly 10 digits.');
      setIsSubmitting(false);
      return;
    }

    // Pull Render backend target URL from env variables
    const apiBaseUrl = import.meta.env.VITE_API_URL || '';
    const finalPayload = {
      ...formData,
      salary: parseFloat(formData.salary) || 0,
      role_id: String(formData.role_id || "3"),
      designation_id: String(formData.designation_id || (designations[0] && (designations[0].id || designations[0]._id)) || "4"),
      department_id: String(formData.department_id || (departments[0] && (departments[0].id || departments[0]._id)) || "")
    };
    try {
      const response = await fetch(`${apiBaseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });

      const result = await response.json();

      if (response.ok) {
        showToast("Staff Registration Successful!", 'success');
        navigate('/login');
      } else {
        const errorMsg = Array.isArray(result.detail) 
          ? result.detail[0]?.msg 
          : result.detail || "Registration Failed";
        setError(errorMsg);
      }
    } catch (err) {
      setError("Network error. Please check if your API server is online.");
      console.error("Signup error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0b0c10] transition-colors duration-500 relative">
      {/* Floating Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <button
          type="button"
          onClick={() => setIsDark(!isDark)}
          className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 text-slate-500 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-lime-400 shadow-lg cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
          title="Toggle theme"
        >
          {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
        </button>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl border border-[#442d82] dark:border-[#35216b] shadow-xl transition-colors">
          <header className="mb-8">
            <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter italic uppercase">Create Staff Profile</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium uppercase tracking-widest">Enterprise Human Resources Portal</p>
          </header>
          
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }} 
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-500 text-xs font-mono overflow-hidden"
              >
                <AlertTriangle className="shrink-0" size={16} /> 
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <FormInput label="Full Name" name="name" icon={<User size={16}/>} onChange={handleChange} value={formData.name} />
            
            <FormInput label="Email" name="email" type="email" icon={<Mail size={16}/>} onChange={handleChange} value={formData.email} />
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">Password</label>
              <div className="relative">
<Lock
  className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 text-slate-500
  ${formData.password ? "opacity-0" : "opacity-100"}`}
  size={16}
/>                <input 
                  required 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl py-3 pl-12 pr-12 text-slate-900 dark:text-slate-100 outline-none focus:border-[#442d82] focus:ring-2 focus:ring-[#442d82] transition-all peer" 
                  onChange={handleChange} 
                  value={formData.password}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer">
                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">Role</label>
              <div className="relative">

  {/* ICON */}
  <ShieldCheck
    className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 text-slate-500
    ${formData.role_id ? "opacity-0" : "opacity-100"}`}
    size={16}
  />

  {/* SELECT */}
  <select
    name="role_id"
    value={formData.role_id}
    onChange={handleChange}
    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl py-3 pl-12 text-slate-900 dark:text-slate-100 outline-none appearance-none focus:border-[#442d82] focus:ring-2 focus:ring-[#442d82] transition-all cursor-pointer"
  >
    {roles.map(r => (
      <option key={r.id} value={r.id}>
        {r.name.toUpperCase()}
      </option>
    ))}
  </select>
</div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">Designation</label>
              <div className="relative">
                <Briefcase
                  className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 text-slate-500
                  ${formData.designation_id ? "opacity-0" : "opacity-100"}`}
                  size={16}
                />
                <select 
                  name="designation_id" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl py-3 pl-12 text-slate-900 dark:text-slate-100 outline-none appearance-none focus:border-[#442d82] focus:ring-2 focus:ring-[#442d82] transition-all cursor-pointer peer" 
                  onChange={handleChange} 
                  value={formData.designation_id}
                >
                  {designations.map(d => (
                    <option key={d.id || d._id} value={d.id || d._id} className="dark:bg-slate-900">
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">Department</label>
              <div className="relative">
                <Building
                  className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 text-slate-500
                  ${formData.department_id ? "opacity-0" : "opacity-100"}`}
                  size={16}
                />
                <select 
                  name="department_id" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl py-3 pl-12 text-slate-900 dark:text-slate-100 outline-none appearance-none focus:border-[#442d82] focus:ring-2 focus:ring-[#442d82] transition-all cursor-pointer peer" 
                  onChange={handleChange} 
                  value={formData.department_id}
                >
                  {departments.map(dept => (
                    <option key={dept.id || dept._id} value={dept.id || dept._id} className="dark:bg-slate-900">
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <FormInput label="Monthly Salary" name="salary" type="number" icon={<IndianRupee size={16}/>} onChange={handleChange} value={formData.salary} />

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">Phone</label>
              <div className="relative">
                <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 transition-all duration-200 ${formData.phone ? 'opacity-0' : 'opacity-100'}`} size={16} />
                <input
                  required
                  name="phone"
                  type="tel"
                  maxLength={10}
                  value={formData.phone}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData(prev => ({ ...prev, phone: digits }));
                  }}
                  className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-2xl py-3 pl-12 text-slate-900 dark:text-slate-100 outline-none transition-all ${
                    formData.phone && formData.phone.length !== 10
                      ? 'border-red-400 focus:border-red-400'
                      : 'border-slate-200 dark:border-slate-850 focus:border-indigo-500'
                  }`}
                  placeholder="10-digit number"
                />
              </div>
              {formData.phone && formData.phone.length !== 10 && (
                <p className="text-[10px] text-red-500 ml-2">Must be exactly 10 digits.</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">Identity Type</label>
              <div className="relative">
<ShieldPlus
  className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 text-slate-500
  ${formData.identityType ? "opacity-0" : "opacity-100"}`}
  size={16}
/>                <select name="identityType" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl py-3 pl-12 text-slate-900 dark:text-slate-100 outline-none appearance-none focus:border-[#442d82] focus:ring-2 focus:ring-[#442d82] transition-all cursor-pointer peer" onChange={handleChange} value={formData.identityType}>
                  <option value="aadhaar" className="dark:bg-slate-900">Aadhar</option>
                  <option value="pancard" className="dark:bg-slate-900">PAN</option>
                  <option value="passport" className="dark:bg-slate-900">Passport</option>
                </select>
              </div>
            </div>

            <FormInput label="ID Number" name="identityNumber" icon={<CreditCard size={16}/>} onChange={handleChange} value={formData.identityNumber} placeholder="XXXX-XXXX-XXXX" />

            <FormInput label="Joining Date" name="joining_date" type="date" icon={<Calendar size={16}/>} onChange={handleChange} value={formData.joining_date} />

            {/* <FormInput label="Profile Image URL" name="profile_image" icon={<ImageIcon size={16}/>} onChange={handleChange} value={formData.profile_image} placeholder="https://..." required={false} /> */}

            <div className="lg:col-span-3 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">Residential Address</label>
              <div className="relative">
<MapPin
  className={`absolute left-4 top-6 text-slate-500 pointer-events-none transition-all duration-200
  ${formData.address ? "opacity-0" : "opacity-100"}`}
  size={16}
/>                <textarea required name="address" rows="2" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl py-3 pl-12 text-slate-900 dark:text-slate-100 outline-none focus:border-[#442d82] focus:ring-2 focus:ring-[#442d82] transition-all peer" onChange={handleChange} value={formData.address}></textarea>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="lg:col-span-3 w-full py-4 bg-[#442d82] hover:bg-[#35216b] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[#442d82]/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Processing...</span>
                </>
              ) : (
                "Finalize Registration"
              )}
            </button>
            {/* Login Redirect Link */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center w-full lg:col-span-3">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-widest">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-indigo-400 hover:text-indigo-300 font-black transition-colors ml-1 cursor-pointer"
                >
                  Sign In Here
                </button>
              </p>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

// Fix 3: Updated Helper with proper value binding
const FormInput = ({
  label,
  name,
  type = "text",
  icon,
  onChange,
  value,
  placeholder = "",
  required = true
}) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">
      {label}
    </label>

    <div className="relative">

      {/* ICON */}
      <div
        className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none transition-all duration-200
        ${value ? "opacity-0" : "opacity-100"}`}
      >
        {icon}
      </div>

      {/* INPUT */}
      <input
        required={required}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl py-3 pl-12 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all"
      />

    </div>
  </div>
);

export default Register;
