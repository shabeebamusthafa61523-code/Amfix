import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  UserCheck, 
  ListCheck, 
  Users, 
  GraduationCap,
  Settings, 
  LogOut,
  Building,
  Building2,
  TrendingUp,
  BarChart3,
  BarChart2,
  FileText,
  Sparkles,
  Award,
  Bell,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Briefcase,
  ShieldCheck,
  Wallet,
  PlusCircle,
  DollarSign,
  BookOpen,
  Tag,
  ChevronDown,
  Calendar,
  CheckCircle2,
  Receipt,
  CreditCard,
  Target,
  Megaphone,
  Magnet,
  PhoneCall,
  Contact,
  Code2,
  Palette,
  FileCode,
  Lightbulb,
  Paintbrush,
  BookOpenCheck,
  Video,
  FileVideo,
  ClipboardCheck,
  Sliders,
  Calculator,
  PieChart,
  ClipboardList,
  Clock,
  Clipboard,
  Layers,
  School,
  UsersRound,
  UserCog,
  BookCheck,
  X
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', allowedRoles: ['1', '2', '10', 'admin', 'superadmin', 'MD', 'COO', 'EXECUTIVE_DIRECTOR'], allowedDepartmentNames: ['hr', 'admin', 'hr/admin', 'hr & admin'] },
  {
    icon: CheckCircle2,
    label: 'Approvals',
    path: '/approvals',
    allowedRoles: ['0', '1', '2', '10', 'admin', 'superadmin', 'MD', 'COO', 'EXECUTIVE_DIRECTOR'],
    allowedDepartmentNames: ['hr', 'admin', 'management']
  },
  {
    icon: Calendar,
    label: 'Leave Requests',
    path: '/leaves'
  },
  {
    icon: UserCog,
    label: 'HR Dashboard',
    path: '/hr-dashboard',
    allowedDesignationNames: ['hr', 'recruiter'],
  },
  {
    icon: UserCheck,
    label: 'Recruitment',
    path: '/recruitment',
    allowedRoles: ['0', '1', '2', '3', '10', 'hr', 'admin', 'superadmin', 'manager', 'team_lead', 'teamlead', 'recruiter'],
    allowedDesignationNames: ['hr', 'recruiter', 'admin', 'manager']
  },
  {
    icon: Target,
    label: 'Lead Dashboard',
    path: '/lead-dashboard',
    allowedRoles: ['1', '2', '3', '10', 'hr', 'admin', 'superadmin', 'manager', 'team_lead', 'teamlead', 'tl'],
    allowedDepartmentNames: ['counselor', 'sales', 'ops', 'marketing'],
    allowedDesignationNames: ['counselor', 'telecaller', 'ops']
  },
  {
    icon: Megaphone,
    label: 'Marketing Dashboard',
    path: '/marketing-dashboard',
    allowedRoles: ['1', '2', '3', '10', 'hr', 'admin', 'superadmin', 'marketing', 'manager', 'team_lead', 'teamlead', 'tl'],
    allowedDepartmentNames: ['marketing', 'digital']
  },
  {
    icon: Building2,
    label: 'Clients',
    path: '/clients',
    allowedRoles: ['1', '2', '10', 'hr', 'admin', 'superadmin', 'manager', 'team_lead', 'teamlead']
  },
  {
    icon: FolderKanban,
    label: 'Projects',
    path: '/projects',
    allowedRoles: ['1', '2', '10', 'hr', 'admin', 'superadmin', 'manager', 'team_lead', 'teamlead']
  },
  {
    icon: Calendar,
    label: 'Content Calendar',
    path: '/calendar-work',
    allowedRoles: ['1', '2', '3', '10', 'hr', 'admin', 'superadmin', 'manager', 'team_lead', 'teamlead'],
    allowedDesignationNames: ['designer', 'graphic', 'marketer', 'marketing', 'digital', 'social']
  },
  { 
    icon: Briefcase, 
    label: 'Client Leads', 
    path: '/client-leads',
    allowedRoles: ['1', '2', '10', 'hr', 'admin', 'superadmin', 'manager', 'team_lead', 'teamlead']
  },
  { 
    icon: Users, 
    label: 'Users', 
    path: '/users', 
    allowedRoles: ['1', '2', 'hr', 'admin'],
    allowedDepartmentNames: ['hr', 'admin']
  },
  { 
    icon: ShieldCheck, 
    label: 'Sidebar Permissions', 
    path: '/sidebar-permissions', 
    allowedRoles: ['0', 'superadmin'],
    allowedDepartmentNames: ['hr', 'admin', 'hr/admin', 'hr & admin']
  },
  { 
    icon: Magnet, 
    label: 'Leads Directory', 
    path: '/leads',
    allowedDepartmentNames: ['marketing', 'digital', 'counselor', 'sales'],
    allowedRoles: ['1', '2', 'hr', 'admin', 'superadmin'],
  },
  { 
    icon: PhoneCall, 
    label: 'Telecaller Leads', 
    path: '/leads-telecaller',
    allowedDesignationNames: ['counselor', 'telecaller', 'ops'],
    allowedRoles: ['1', '2', 'hr', 'admin', 'superadmin'],
    allowedDepartmentNames: ['hr', 'admin']
  },
  { 
    icon: Contact, 
    label: 'Lead Counselor', 
    path: '/lead-counselor',
    allowedDesignationNames: ['ops', 'counselor', 'sales'],
    allowedRoles: ['1', '2', '3', 'hr', 'admin', 'superadmin']
  },
  {
    icon: Code2,
    label: 'Dev Dashboard',
    path: '/developer-dashboard',
    allowedDepartmentNames: ['r&d', 'dev', 'developer', 'development'],
  },
  {
    icon: Palette,
    label: 'GD Dashboard',
    path: '/graphic-designer-dashboard',
    allowedDesignationNames: ['graphic', 'designer', 'ui', 'ux'],
  },
  {
    icon: FileCode,
    label: 'Developer Report',
    path: '/developer-report',
    allowedDesignationNames: ['developer', 'dev'],
  },
  {
    icon: Lightbulb,
    label: 'HOD R&D Report',
    path: '/hod-rd-report',
    allowedDesignationNames: ['hod', 'r&d', 'research'],
  },
  {
    icon: Paintbrush,
    label: 'Graphic Designer Report',
    path: '/graphic-designer-report',
    allowedDesignationNames: ['graphic', 'designer', 'ui', 'ux'],
  },
  {
    icon: BookOpenCheck,
    label: 'Academic Counselor Report',
    path: '/academic-counselor-report',
    allowedDesignationNames: ['counselor', 'academic', 'tele'],
  },
  {
    icon: GraduationCap,
    label: 'Counselor Dashboard',
    path: '/counselor-dashboard',
    allowedDesignationNames: ['counselor', 'academic', 'tele'],
  },
  {
    icon: Video,
    label: 'Video Dashboard',
    path: '/videographer-dashboard',
    allowedDesignationNames: ['video', 'editor', 'media'],
  },
  {
    icon: FileVideo,
    label: 'Videographer Report',
    path: '/videographer-report',
    allowedDesignationNames: ['video', 'editor', 'media'],
  },
  {
    icon: ClipboardCheck,
    label: 'HR Shift Report',
    path: '/hr-report',
    allowedDesignationNames: ['hr', 'recruiter'],
  },
  {
    icon: Sparkles,
    label: 'AI Reports',
    path: '/ai-report'
  },
  {
    icon: Award,
    label: 'KPI Analytics',
    path: '/performance-dashboard',
    allowedRoles: ['1', '2', '10', 'hr', 'admin', 'superadmin', 'manager', 'team_lead', 'teamlead', 'tl']
  },
  {
    icon: Sliders,
    label: 'Ops Shift Report',
    path: '/ops-report',
    allowedDesignationNames: ['ops', 'operation', 'sales'],
  },
  {
    icon: Wallet,
    label: 'Accounts',
    path: '/accounts',
    children: [
      { icon: Tag, label: 'Expense Categories', path: '/accounts/categories' },
      { icon: PlusCircle, label: 'Add Expense', path: '/accounts/expenses' },
      { icon: DollarSign, label: 'Salary Payment', path: '/accounts/salary' },
      { icon: BookCheck, label: 'Cash Book', path: '/accounts/cash-book' },
      { icon: BarChart3, label: 'Expense Report', path: '/accounts/reports' }
    ]
  },
  {
    icon: Receipt,
    label: 'Payslips',
    path: '/payslips',
    allowedRoles: ['0', '1', '2', '10', 'hr', 'admin', 'accountant', 'superadmin', 'MD', 'COO', 'EXECUTIVE_DIRECTOR'],
    allowedDepartmentNames: ['hr', 'admin', 'accounts', 'finance'],
    allowedDesignationNames: ['hr', 'recruiter', 'accountant', 'finance', 'accounts']
  },
  {
    icon: CreditCard,
    label: 'Personal Payslip',
    path: '/my-payslip'
  },
  {
    icon: Calculator,
    label: 'Accountant Shift Report',
    path: '/accountant-report',
    allowedDesignationNames: ['accountant', 'accounts', 'finance'],
  },
  {
    icon: PieChart,
    label: 'Marketing Shift Report',
    path: '/marketing-report',
    allowedDesignationNames: ['marketing', 'marketer', 'digital'],
  },
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    path: '/common-dashboard',
    isCommonDashboardFallback: true
  },
  {
    icon: ClipboardList,
    label: 'Daily Report',
    path: '/basic-report',
    isBasicReportFallback: true
  },
  { icon: Clock, label: 'Attendance', path: '/attendance', excludeRoles: ['1', '2', 'hr', 'admin'] },
  { icon: ListCheck, label: 'Task Assign', path: '/todo' },
  { icon: Clipboard, label: 'Student Attendance', path: '/student-attendance', allowedRoles: ['1', '2', 'hr', 'admin'] },
  { icon: BookOpen, label: 'Course Management', path: '/academy/courses', allowedRoles: ['1', '2', 'hr', 'admin'], allowedDepartments: ['6a3caed51194353cbc8a3686'] },
  { icon: Layers, label: 'Batches', path: '/academy/batches', allowedRoles: ['1', '2', 'hr', 'admin'], allowedDepartments: ['6a3caed51194353cbc8a3686'] },
  { icon: School, label: 'Enrollment Tracking', path: '/academy/enrollments', allowedRoles: ['1', '2', 'hr', 'admin'], allowedDepartments: ['6a3caed51194353cbc8a3686'] },
  { icon: GraduationCap, label: 'My LMS Learning', path: '/academy/learning', allowedRoles: ['10', 'student', '1', '2', 'admin', 'superadmin'] },
  { icon: Building, label: 'Departments', path: '/departments', allowedRoles: ['1', '2', 'hr', 'admin'] },
  { icon: BarChart2, label: 'Employee Reports', path: '/employee-reports', allowedRoles: [ 'hr', 'admin'] },

  { icon: UsersRound, label: 'Team Reports', path: '/team-reports', isTeamLeadOnly: true },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
];

// Simple Portal implementation to render the badge safely outside of parent overflow cropping
const PortalTooltip = ({ children }) => {
  return ReactDOM.createPortal(children, document.body);
};

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const location = useLocation();
  const activePath = location.pathname;
  const { user: liveUser } = useUser() || {};
  const [, setPermissionsVersion] = React.useState(0);

  React.useEffect(() => {
    const handleStorageChange = () => {
      setPermissionsVersion(v => v + 1);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const getVisibleMenuItems = () => {
    try {
      let userObj = liveUser;
      if (!userObj) {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          try { userObj = JSON.parse(savedUser); } catch (e) {}
        }
      }

      if (!userObj) {
        return menuItems.filter(item => !item.allowedRoles && !item.allowedDepartments && !item.allowedDesignations);
      }

      const currentUserRole = String(userObj.role_id || userObj.roleId || userObj.role || '').toLowerCase().trim();
      const isSuperAdminUser = 
        userObj.isSuperAdmin === true ||
        userObj.is_super_admin === true ||
        currentUserRole === 'superadmin' || 
        currentUserRole === 'super_admin' || 
        currentUserRole === 'super admin' || 
        currentUserRole === '0' || 
        String(userObj.role || '').toLowerCase() === 'superadmin' ||
        String(userObj.role || '').toLowerCase() === '0';

      // 1. Super Admin access: Full access to all sidebar items for Super Admin
      if (isSuperAdminUser) {
        return menuItems.filter(item => !item.isCommonDashboardFallback && !item.isBasicReportFallback);
      }

      // 2. Custom Sidebar Permissions set by Super Admin for this user
      if (Array.isArray(userObj.permissions) && userObj.permissions.length > 0) {
        const allowedSet = userObj.permissions.map(p => String(p).toLowerCase().trim());
        
        // Map extra permission labels to sidebar paths
        const extraPathMappings = {
          'admin dashboard': '/dashboard',
          'md dashboard': '/md-dashboard',
        };
        const extraAllowedPaths = [];
        for (const perm of allowedSet) {
          if (extraPathMappings[perm]) {
            extraAllowedPaths.push(extraPathMappings[perm].toLowerCase());
          }
        }
        
        let customVisible = menuItems
          .map(item => {
            const itemLabelLower = item.label.toLowerCase().trim();
            const itemPathLower = item.path ? item.path.toLowerCase().trim() : '';

            const isParentAllowed = 
              item.path === '/leaves' ||
              allowedSet.includes(itemLabelLower) || 
              allowedSet.includes(itemPathLower) ||
              extraAllowedPaths.includes(itemPathLower);

            if (item.children) {
              const allowedChildren = item.children.filter(child => {
                const childLabelLower = child.label.toLowerCase().trim();
                const childPathLower = child.path ? child.path.toLowerCase().trim() : '';
                return isParentAllowed || allowedSet.includes(childLabelLower) || allowedSet.includes(childPathLower);
              });

              if (allowedChildren.length > 0) {
                return { ...item, children: allowedChildren };
              }
              return isParentAllowed ? item : null;
            }

            return isParentAllowed ? item : null;
          })
          .filter(Boolean);

        // If MD Dashboard permission is granted, override Dashboard path to /md-dashboard
        if (allowedSet.includes('md dashboard') && !allowedSet.includes('dashboard') && !allowedSet.includes('admin dashboard')) {
          customVisible = customVisible.map(item => {
            if (item.label === 'Dashboard' && item.path === '/dashboard') {
              return { ...item, path: '/md-dashboard' };
            }
            return item;
          });
        }

        if (customVisible.length > 0) {
          // Fallback dashboard: if user has no dashboard in custom permissions
          const hasDashboard = customVisible.some(item => item.label.toLowerCase().includes('dashboard'));
          if (!hasDashboard) {
            const fallbackDashboard = menuItems.find(item => item.isCommonDashboardFallback);
            if (fallbackDashboard) customVisible.unshift(fallbackDashboard);
          }

          // Fallback report: if user has no report page in custom permissions
          const hasReport = customVisible.some(item => item.label.toLowerCase().includes('report'));
          if (!hasReport) {
            const fallbackReport = menuItems.find(item => item.isBasicReportFallback);
            if (fallbackReport) customVisible.push(fallbackReport);
          }

          return customVisible;
        }
      }
      
      const deptName = userObj.department || userObj.departmentId?.name || '';
      const isNonOperational = String(deptName).toLowerCase().trim() === 'non-operational';
      if (isNonOperational) {
        return menuItems.filter(item => item.label === 'Employee Reports' || item.label === 'Dashboard' || item.path === '/leaves');
      }

      let currentUserDept = '';
      if (userObj.departmentId) {
        if (typeof userObj.departmentId === 'object' && userObj.departmentId._id) {
          currentUserDept = String(userObj.departmentId._id).trim();
        } else {
          currentUserDept = String(userObj.departmentId).trim();
        }
      }

      let currentUserDesignation = '';
      if (userObj.designationId) {
        if (typeof userObj.designationId === 'object' && userObj.designationId._id) {
          currentUserDesignation = String(userObj.designationId._id).trim();
        } else {
          currentUserDesignation = String(userObj.designationId).trim();
        }
      } else if (userObj.designation_id) {
        currentUserDesignation = String(userObj.designation_id).trim();
      }
      
      const visible = menuItems.filter(item => {
        if (item.excludeRoles && item.excludeRoles.includes(currentUserRole)) {
          return false;
        }
        // Show Team Reports page only for non-HR department team leads
        if (item.isTeamLeadOnly) {
          const desigName = String(userObj.designation || userObj.designationId?.name || '').toLowerCase().trim();
          const isHrUser = currentUserRole === 'hr' || desigName.includes('hr');
          if (isHrUser) return false;
          return !!userObj.isTeamLead;
        }
        if (item.isCommonDashboardFallback || item.isBasicReportFallback) {
          return false;
        }
        if (item.label === 'Clients' || item.label === 'Projects' || item.label === 'Client Leads' || item.label === 'KPI Analytics' || item.label === 'Lead Dashboard' || item.label === 'Marketing Dashboard') {
          const isAdminHrOrTeamLead = ['1', '2', '3', '10', 'admin', 'hr', 'superadmin', 'team_lead', 'teamlead', 'manager', 'tl', 'marketing'].includes(currentUserRole) || !!userObj.isTeamLead;
          return isAdminHrOrTeamLead;
        }
        if (!item.allowedRoles && !item.allowedDepartments && !item.allowedDesignations && !item.allowedDepartmentNames && !item.allowedDesignationNames) return true;
        const roleMatch = item.allowedRoles && item.allowedRoles.includes(currentUserRole);
        const deptMatch = item.allowedDepartments && item.allowedDepartments.includes(currentUserDept);
        const designationMatch = item.allowedDesignations && item.allowedDesignations.includes(currentUserDesignation);
        
        // Name-based department matching (works across environments)
        const currentDeptName = String(deptName).toLowerCase().trim();
        const deptNameMatch = item.allowedDepartmentNames && item.allowedDepartmentNames.some(name => 
          currentDeptName.includes(name) || name.includes(currentDeptName)
        );

        // Name-based designation matching (works across environments)
        const currentDesigName = String(userObj.designation || userObj.designationId?.name || '').toLowerCase().trim();
        const desigNameMatch = item.allowedDesignationNames && item.allowedDesignationNames.some(name => 
          currentDesigName.includes(name) || name.includes(currentDesigName)
        );
        
        const matches = [];
        if (item.allowedRoles) matches.push(roleMatch);
        if (item.allowedDepartments) matches.push(deptMatch);
        if (item.allowedDesignations) matches.push(designationMatch);
        if (item.allowedDepartmentNames) matches.push(deptNameMatch);
        if (item.allowedDesignationNames) matches.push(desigNameMatch);
        
        return matches.some(m => m === true);
      });

      // Fallback dashboard: if user has no other dashboard in visible items
      const hasOtherDashboard = visible.some(item => item.label.toLowerCase().includes('dashboard'));
      if (!hasOtherDashboard) {
        const fallbackDashboard = menuItems.find(item => item.isCommonDashboardFallback);
        if (fallbackDashboard) visible.unshift(fallbackDashboard);
      }

      // Fallback report: if user has no other report page in visible items
      const hasOtherReport = visible.some(item => item.label.toLowerCase().includes('report'));
      if (!hasOtherReport) {
        const fallbackReport = menuItems.find(item => item.isBasicReportFallback);
        if (fallbackReport) {
          visible.push(fallbackReport);
        }
      }

      const desigName = String(userObj.designation || userObj.designationId?.name || '').toLowerCase().trim();
      const isMd = desigName.includes('md') || desigName.includes('managing director') || ['md', 'coo', 'executive_director'].includes(currentUserRole);
      const isHr = currentUserRole === 'hr' || desigName.includes('hr');

      if (isMd) {
        return visible.map(item => {
          if (item.label === 'Dashboard') {
            return { ...item, path: '/md-dashboard' };
          }
          return item;
        });
      }

      if (isHr) {
        const filtered = visible.filter(item => item.label !== 'Dashboard' && item.label !== 'Team Reports');
        const hasHrDash = filtered.some(item => item.label === 'HR Dashboard' || item.path === '/hr-dashboard');
        if (!hasHrDash) {
          const hrDashItem = menuItems.find(item => item.path === '/hr-dashboard');
          if (hrDashItem) filtered.unshift(hrDashItem);
        }
        return filtered;
      }

      return visible;
    } catch (e) {
      console.error("Error reading operator authorization layout paths:", e);
      return menuItems.filter(item => !item.allowedRoles && !item.allowedDepartments && !item.allowedDesignations);
    }
  };

  const visibleMenuItems = getVisibleMenuItems();

  return (
    <>
      {/* 1. Desktop Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 hidden lg:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/50 dark:border-slate-800/50 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo header */}
        <div className="h-16 flex items-center justify-between px-5 shrink-0 overflow-hidden border-b border-slate-100 dark:border-slate-800/40">
          <div className="flex items-center gap-3">
            {!isCollapsed ? (
              <img src="/logo3.png" alt="StaffHQ Logo" className="h-8 w-auto object-contain" />
            ) : (
              <img src="/logo2.png" alt="StaffHQ Logo Icon" className="h-8 w-8 object-contain shrink-0" />
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setIsCollapsed(prev => {
                const nextState = !prev;
                localStorage.setItem('sidebarCollapsed', JSON.stringify(nextState));
                return nextState;
              });
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Menu Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleMenuItems.map((item) => (
            <NavItem 
              key={`${item.path}-${item.label}`}
              icon={<item.icon size={20} />} 
              label={item.label} 
              to={item.path} 
              active={activePath === item.path || (item.children && item.children.some(c => activePath === c.path))} 
              isCollapsed={isCollapsed}
              childrenItems={item.children}
            />
          ))}
        </div>

        {/* Logout (Bottom-aligned) */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
          <NavItem 
            icon={<LogOut size={20} />} 
            label="Logout" 
            to="/" 
            active={false} 
            isLogout={true}
            isCollapsed={isCollapsed}
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              localStorage.removeItem('user_id');
            }}
          />
        </div>
      </aside>

      {/* 2. Mobile Sidebar Slide-over Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* 3. Mobile Sidebar Slide-over Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col transition-transform duration-300 lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <img src="/logo3.png" alt="StaffHQ Logo" className="h-8 w-auto object-contain" />
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {visibleMenuItems.map((item) => (
            <React.Fragment key={`${item.path}-${item.label}`}>
              <Link
                to={item.children ? item.children[0].path : item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  activePath === item.path || (item.children && item.children.some(c => activePath === c.path))
                    ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <item.icon size={20} className="shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
              {item.children && (
                <div className="pl-6 space-y-1 my-1">
                  {item.children.map(child => (
                    <Link
                      key={child.path}
                      to={child.path}
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                        activePath === child.path
                          ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <child.icon size={14} />
                      <span>{child.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
          <Link
            to="/"
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              localStorage.removeItem('user_id');
              setIsMobileOpen(false);
            }}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all font-medium"
          >
            <LogOut size={20} className="shrink-0" />
            <span className="text-sm font-medium">Logout</span>
          </Link>
        </div>
      </aside>
    </>
  );
};

const NavItem = ({ icon, label, to, active, isLogout, isCollapsed, onClick, childrenItems }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(() => {
    if (childrenItems && childrenItems.some(c => location.pathname.startsWith(c.path))) {
      return true;
    }
    return false;
  });

  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const itemRef = useRef(null);

  const handleMouseEnter = () => {
    if (itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      });
    }
    setIsHovered(true);
  };

  const isParentActive = active || (childrenItems && childrenItems.some(c => location.pathname.startsWith(c.path)));

  if (childrenItems && childrenItems.length > 0) {
    return (
      <div className="w-full space-y-1 select-none">
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setIsHovered(false)}
          ref={itemRef}
          className="relative w-full flex items-center justify-between group"
        >
          <Link
            to={to}
            onClick={(e) => {
              setIsOpen(true);
              if (onClick) onClick(e);
            }}
            className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 
              ${isParentActive 
                ? 'text-white bg-indigo-600 shadow-md shadow-indigo-500/15 font-semibold' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'
              }`}
          >
            <span className="flex items-center justify-center shrink-0">
              {icon}
            </span>
            <span className={`text-sm transition-all duration-200 whitespace-nowrap overflow-hidden ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
              {label}
            </span>
          </Link>

          {!isCollapsed && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className={`p-2 rounded-xl transition-colors ${
                isParentActive
                  ? 'text-white/80 hover:text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title={isOpen ? "Collapse Submenu" : "Expand Submenu"}
            >
              <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Floating label badge when collapsed */}
        <AnimatePresence>
          {isHovered && isCollapsed && (
            <PortalTooltip>
              <motion.span 
                initial={{ opacity: 0, x: -10, y: '-50%' }}
                animate={{ opacity: 1, x: 0, y: '-50%' }}
                exit={{ opacity: 0, x: -10, y: '-50%' }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  top: `${coords.top}px`,
                  left: `${coords.left}px`,
                }}
                className="fixed pointer-events-none z-[9999] px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[11px] font-semibold rounded-lg shadow-md border border-slate-200 dark:border-slate-800 whitespace-nowrap -translate-y-1/2"
              >
                {label}
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-1.5 bg-white dark:bg-slate-900 rotate-45 border-l border-b border-slate-200 dark:border-slate-800" />
              </motion.span>
            </PortalTooltip>
          )}
        </AnimatePresence>

        {/* Child Items */}
        <AnimatePresence>
          {isOpen && !isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pl-3 space-y-1 border-l-2 border-slate-100 dark:border-slate-800 ml-4 mt-1"
            >
              {childrenItems.map(child => {
                const childActive = location.pathname === child.path;
                const ChildIcon = child.icon;
                return (
                  <Link
                    key={child.path}
                    to={child.path}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      childActive
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <ChildIcon size={14} className="shrink-0" />
                    <span className="truncate">{child.label}</span>
                  </Link>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <Link 
      to={to} 
      onClick={onClick} 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      ref={itemRef}
      className="relative flex items-center justify-start shrink-0 group select-none w-full"
    >
      <div
        className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 
          ${active 
            ? 'text-white bg-indigo-600 shadow-md shadow-indigo-500/15' 
            : isLogout 
              ? 'text-rose-500 hover:bg-rose-500/10'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
      >
        <span className="flex items-center justify-center shrink-0">
          {icon}
        </span>
        <span className={`text-sm font-medium transition-all duration-200 whitespace-nowrap overflow-hidden ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
          {label}
        </span>
      </div>
      
      {/* Portalled Floating Label Badge to make sure it bypasses all overflow constraints */}
      <AnimatePresence>
        {isHovered && isCollapsed && (
          <PortalTooltip>
            <motion.span 
              initial={{ opacity: 0, x: -10, y: '-50%' }}
              animate={{ opacity: 1, x: 0, y: '-50%' }}
              exit={{ opacity: 0, x: -10, y: '-50%' }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
              }}
              className="fixed pointer-events-none z-[9999] px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[11px] font-semibold rounded-lg shadow-md border border-slate-200 dark:border-slate-800 whitespace-nowrap -translate-y-1/2"
            >
              {label}
              
              {/* Desktop Side Arrow Pin Indicator */}
              <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-1.5 bg-white dark:bg-slate-900 rotate-45 border-l border-b border-slate-200 dark:border-slate-800" />
            </motion.span>
          </PortalTooltip>
        )}
      </AnimatePresence>
    </Link>
  );
};

export default Sidebar;