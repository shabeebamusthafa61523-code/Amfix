/**
 * Dynamically resolves the primary dashboard path for any logged-in user.
 * Checks granted permissions array first for any item containing "dashboard",
 * then checks allowed menu items for any accessible dashboard, without hardcoded role switches.
 */

export const ALL_DASHBOARD_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', aliases: ['admin dashboard', 'main dashboard', 'superadmin dashboard'] },
  { label: 'MD Dashboard', path: '/md-dashboard', aliases: ['md dashboard', 'coo dashboard', 'executive dashboard'] },
  { label: 'HR Dashboard', path: '/hr-dashboard', aliases: ['hr dashboard', 'recruiter dashboard', 'hr'] },
  { label: 'Lead Dashboard', path: '/lead-dashboard', aliases: ['lead dashboard', 'sales dashboard', 'telecaller dashboard', 'lead'] },
  { label: 'Marketing Dashboard', path: '/marketing-dashboard', aliases: ['marketing dashboard', 'digital marketing dashboard', 'marketing', 'marketer'] },
  { label: 'Counselor Dashboard', path: '/counselor-dashboard', aliases: ['counselor dashboard', 'academic counselor dashboard', 'counselor', 'academic'] },
  { label: 'Dev Dashboard', path: '/developer-dashboard', aliases: ['dev dashboard', 'developer dashboard', 'r&d dashboard', 'developer', 'dev'] },
  { label: 'GD Dashboard', path: '/graphic-designer-dashboard', aliases: ['gd dashboard', 'graphic designer dashboard', 'ui/ux dashboard', 'graphic', 'designer'] },
  { label: 'Video Dashboard', path: '/videographer-dashboard', aliases: ['video dashboard', 'videographer dashboard', 'media dashboard', 'videographer', 'video'] },
  { label: 'Common Dashboard', path: '/common-dashboard', aliases: ['common dashboard', 'basic dashboard'] }
];

export const resolveUserDashboardPath = (userObj) => {
  if (!userObj) return '/dashboard';

  const userPermissions = Array.isArray(userObj.permissions) ? userObj.permissions : [];
  const cleanPermissions = userPermissions.map(p => String(p).toLowerCase().trim());

  // 1. Check custom user permissions for any entry containing "dashboard"
  const dashboardPerm = cleanPermissions.find(p => p.includes('dashboard'));
  if (dashboardPerm) {
    const matchedByPerm = ALL_DASHBOARD_ITEMS.find(item => 
      item.label.toLowerCase() === dashboardPerm ||
      item.path.toLowerCase().replace('/', '') === dashboardPerm.replace(/\s+/g, '-') ||
      item.aliases.some(alias => alias === dashboardPerm || dashboardPerm.includes(alias))
    );
    if (matchedByPerm) {
      return matchedByPerm.path;
    }
  }

  // 2. Dynamically match user's designation, department, or role against dashboard keywords
  const userRole = String(userObj.role_id || userObj.roleId || userObj.role || '').toLowerCase().trim();
  const userDesig = String(userObj.designation || userObj.designationId?.name || '').toLowerCase().trim();
  const userDept = String(userObj.department || userObj.departmentId?.name || '').toLowerCase().trim();

  // Combine user identity tokens
  const identityTokens = [userRole, userDesig, userDept].filter(Boolean);

  for (const item of ALL_DASHBOARD_ITEMS) {
    if (item.path === '/common-dashboard') continue; // reserve common dashboard as fallback

    const itemLabelLower = item.label.toLowerCase();
    const itemAliases = item.aliases;

    const matchesUser = identityTokens.some(token => 
      itemLabelLower.includes(token) || 
      itemAliases.some(alias => token.includes(alias) || alias.includes(token))
    );

    if (matchesUser) {
      return item.path;
    }
  }

  // 3. Fallback for Super Admin / Admin role
  if (userObj.isSuperAdmin === true || userObj.is_super_admin === true || ['0', '1', '2', 'admin', 'superadmin'].includes(userRole)) {
    return '/dashboard';
  }

  // 4. Default Fallback
  return '/common-dashboard';
};
