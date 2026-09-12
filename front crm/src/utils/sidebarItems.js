export const ALL_SIDEBAR_ITEMS = [
  // --- OVERVIEW ---
  { label: 'Approvals', path: '/approvals', category: 'Overview', desc: 'MD Executive approvals for leaves & salary payments' },
  { label: 'Leave Requests', path: '/leaves', category: 'Overview', desc: 'Leave request application & approvals' },
  { label: 'Notifications', path: '/notifications', category: 'Overview', desc: 'System alerts & messages' },

  // --- DASHBOARDS ---
  { label: 'Admin Dashboard', path: '/dashboard', category: 'Dashboards', desc: 'Admin panel with full CRM overview & controls' },
  { label: 'MD Dashboard', path: '/md-dashboard', category: 'Dashboards', desc: 'Managing Director executive overview & analytics' },
  { label: 'HR Dashboard', path: '/hr-dashboard', category: 'Dashboards', desc: 'HR overview dashboard & attendance stats' },
  { label: 'Lead Dashboard', path: '/lead-dashboard', category: 'Dashboards', desc: 'Lead generation & conversion metrics' },
  { label: 'Marketing Dashboard', path: '/marketing-dashboard', category: 'Dashboards', desc: 'Marketing campaigns & lead channels' },
  { label: 'Video Dashboard', path: '/videographer-dashboard', category: 'Dashboards', desc: 'Videography project & editing status' },
  { label: 'GD Dashboard', path: '/graphic-designer-dashboard', category: 'Dashboards', desc: 'Graphic design project & asset tracker' },
  { label: 'Dev Dashboard', path: '/developer-dashboard', category: 'Dashboards', desc: 'Developer task tracking & commit status' },
  { label: 'Counselor Dashboard', path: '/counselor-dashboard', category: 'Dashboards', desc: 'Academic counselor dashboard & student conversions' },
  { label: 'Accountant Dashboard', path: '/accountant-dashboard', category: 'Dashboards', desc: 'Accountant financial dashboard, cashbook & revenue metrics' },
  { label: 'Dashboard', path: '/common-dashboard', category: 'Dashboards', desc: 'Main CRM overview & key metrics' },

  // --- PEOPLE & HR ---
  { label: 'Recruitment', path: '/recruitment', category: 'People & HR', desc: 'Recruitment directory, candidate pipeline & offer letters' },
  { label: 'Users', path: '/users', category: 'People & HR', desc: 'Employee & user account management' },
  { label: 'Departments', path: '/departments', category: 'People & HR', desc: 'Department hierarchy & manager assignments' },
  { label: 'Attendance Logs', path: '/attendance-logs', category: 'People & HR', desc: 'Detailed everyday login/logout times & working hours' },
  { label: 'Sidebar Permissions', path: '/sidebar-permissions', category: 'People & HR', desc: 'Custom user menu permission configuration' },

  // --- SALES & CRM ---
  { label: 'Leads Directory', path: '/leads', category: 'Sales & CRM', desc: 'Full leads directory & sales pipeline' },
  { label: 'Student Leads', path: '/leads-telecaller', category: 'Sales & CRM', desc: 'Telecaller assigned lead calls' },
  { label: 'Lead Counselor', path: '/lead-counselor', category: 'Sales & CRM', desc: 'Academic counselor lead assignments' },
  { label: 'Client Leads', path: '/client-leads', category: 'Sales & CRM', desc: 'Client lead pipeline & inquiries' },
  { label: 'Clients', path: '/clients', category: 'Sales & CRM', desc: 'Client directory & company profiles' },

  // --- MARKETING & WORK ---
  { label: 'Content Calendar', path: '/calendar-work', category: 'Marketing & Work', desc: 'Social media & marketing content scheduling calendar' },
  { label: 'Projects', path: '/projects', category: 'Marketing & Work', desc: 'Project tracking & milestones' },

  // --- FINANCE & PAYROLL ---
  { label: 'Accounts', path: '/accounts', category: 'Finance & Payroll', desc: 'Expense management, salary & cash book overview' },
  { label: 'Sales', path: '/accounts/income', category: 'Finance & Payroll', desc: 'Revenue, client invoices & payment receipt records' },
  { label: 'Income', path: '/accounts/sales', category: 'Finance & Payroll', desc: 'Client sales deals, billing invoices & revenue tracking' },
  { label: 'Purchase', path: '/accounts/purchase', category: 'Finance & Payroll', desc: 'Vendor procurement, purchase orders & stock bills' },
  { label: 'Create Invoice', path: '/accounts/create-invoice', category: 'Finance & Payroll', desc: 'Itemized Zoho tax invoice & billing builder' },
  { label: 'Expense Categories', path: '/accounts/categories', category: 'Finance & Payroll', desc: 'Account expense categories' },
  { label: 'Expense', path: '/accounts/expenses', category: 'Finance & Payroll', desc: 'Record & upload expense vouchers' },
  { label: 'Salary Payment', path: '/accounts/salary', category: 'Finance & Payroll', desc: 'Salary payment processing & disbursal' },
  { label: 'Cash & Bank', path: '/accounts/cash-book', category: 'Finance & Payroll', desc: 'Cash & bank ledger & transaction history' },
  { label: 'Operation', path: '/accounts/operation', category: 'Finance & Payroll', desc: 'Operation amount ledger records' },
  { label: 'Financial Report', path: '/accounts/reports', category: 'Finance & Payroll', desc: 'Financial expense analytics & summaries' },
  { label: 'Payslips', path: '/payslips', category: 'Finance & Payroll', desc: 'Employee payslip generation & disbursal records' },
  { label: 'Personal Payslip', path: '/my-payslip', category: 'Finance & Payroll', desc: 'Personal salary slip portal for individual employees' },

  // --- ACADEMY & LMS ---
  { label: 'Course Management', path: '/academy/courses', category: 'Academy & LMS', desc: 'Course catalog & curriculum management' },
  { label: 'Batches', path: '/academy/batches', category: 'Academy & LMS', desc: 'Student batch creation & schedule tracking' },
  { label: 'Enrollment Tracking', path: '/academy/enrollments', category: 'Academy & LMS', desc: 'Student course enrollment & fee status' },
  { label: 'My LMS Learning', path: '/academy/learning', category: 'Academy & LMS', desc: 'Student LMS portal & course materials' },
  { label: 'Student Attendance', path: '/student-attendance', category: 'Academy & LMS', desc: 'Student batch attendance logs' },

  // --- REPORTS ---
  { label: 'HR Shift Report', path: '/hr-report', category: 'Reports', desc: 'HR shift reports' },
  { label: 'Accountant Shift Report', path: '/accountant-report', category: 'Reports', desc: 'Accountant shift reports' },
  { label: 'AI Reports', path: '/ai-report', category: 'Reports', desc: 'Automated AI reports & summaries' },
  { label: 'KPI Analytics', path: '/performance-dashboard', category: 'Reports', desc: 'Quantitative KPI score & performance' },
  { label: 'Employee Reports', path: '/employee-reports', category: 'Reports', desc: 'Employee activity & performance logs' },
  { label: 'Team Reports', path: '/team-reports', category: 'Reports', desc: 'Team lead department reports' },
  { label: 'Developer Report', path: '/developer-report', category: 'Reports', desc: 'Developer daily shift reports' },
  { label: 'HOD R&D Report', path: '/hod-rd-report', category: 'Reports', desc: 'HOD R&D shift reports' },
  { label: 'Graphic Designer Report', path: '/graphic-designer-report', category: 'Reports', desc: 'Graphic design shift reports' },
  { label: 'Videographer Report', path: '/videographer-report', category: 'Reports', desc: 'Videography shift reports' },
  { label: 'Academic Counselor Report', path: '/academic-counselor-report', category: 'Reports', desc: 'Academic counselor shift reports' },
  { label: 'Ops Shift Report', path: '/ops-report', category: 'Reports', desc: 'Operations shift reports' },
  { label: 'Marketing Shift Report', path: '/marketing-report', category: 'Reports', desc: 'Marketing shift reports' },
  { label: 'HOD Marketing Report', path: '/hod-marketing-report', category: 'Reports', desc: 'HOD Marketing consolidated shift reports' },
  { label: 'Daily Report', path: '/basic-report', category: 'Reports', desc: 'Common daily shift activity & report view' },

  // --- DAILY OPERATIONS ---
  { label: 'Attendance', path: '/attendance', category: 'Daily Operations', desc: 'Daily attendance clock-in/out logs' },
  { label: 'Task Assign', path: '/todo', category: 'Daily Operations', desc: 'Task assignment & attachment view' }
];

export const DEFAULT_ALLOWED_ITEMS = [
  'Task Assign',
  'Notifications',
  'Attendance',
  'Attendance Logs',
  '/todo',
  '/notifications',
  '/attendance',
  '/attendance-logs'
];

/**
 * Checks if user is Super Admin
 */
export const isSuperAdminUser = (u) => {
  if (!u) return false;
  const role = String(u.role_id || u.roleId || u.role || '').toLowerCase().trim();
  return (
    u.isSuperAdmin === true ||
    u.is_super_admin === true ||
    role === 'superadmin' ||
    role === 'super_admin' ||
    role === 'super admin' ||
    role === '0' ||
    String(u.role || '').toLowerCase() === 'superadmin' ||
    String(u.role || '').toLowerCase() === '0'
  );
};

/**
 * Computes available sidebar items that a logged-in user can see and assign to other staff members.
 * - Super Admin: returns ALL_SIDEBAR_ITEMS
 * - Non-Super Admin: returns ONLY items present in their own permissions (or DEFAULT_ALLOWED_ITEMS if permissions empty)
 */
export const getAvailableSidebarItemsForUser = (loggedInUser) => {
  if (isSuperAdminUser(loggedInUser)) {
    return ALL_SIDEBAR_ITEMS;
  }

  const userPerms = Array.isArray(loggedInUser?.permissions) ? loggedInUser.permissions : [];

  if (userPerms.length === 0) {
    return ALL_SIDEBAR_ITEMS.filter(item => {
      const labelLower = item.label.toLowerCase().trim();
      const pathLower = item.path ? item.path.toLowerCase().trim() : '';
      return DEFAULT_ALLOWED_ITEMS.some(d => d.toLowerCase() === labelLower || d.toLowerCase() === pathLower);
    });
  }

  const allowedSet = userPerms.map(p => String(p).toLowerCase().trim());

  const extraPathMappings = {
    'admin dashboard': '/dashboard',
    'md dashboard': '/md-dashboard',
    'accountant dashboard': '/accountant-dashboard',
    'income': '/accounts/income',
    'sales': '/accounts/sales',
    'capital': '/accounts/capital',
    'purchase': '/accounts/purchase',
    'create invoice': '/accounts/create-invoice',
  };

  const extraAllowedPaths = [];
  for (const perm of allowedSet) {
    if (extraPathMappings[perm]) {
      extraAllowedPaths.push(extraPathMappings[perm].toLowerCase());
    }
  }

  return ALL_SIDEBAR_ITEMS.filter(item => {
    const labelLower = item.label.toLowerCase().trim();
    const pathLower = item.path ? item.path.toLowerCase().trim() : '';
    return (
      allowedSet.includes(labelLower) ||
      allowedSet.includes(pathLower) ||
      extraAllowedPaths.includes(pathLower)
    );
  });
};
