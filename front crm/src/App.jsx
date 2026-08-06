import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';

// Page Imports
import { UserProvider } from './contexts/UserContext'; 
import Dashboard from './pages/Dashboard';
import LeadDashboard from './pages/LeadDashboard';
import MarketingDashboard from './pages/Marketing Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Attendance from './pages/Attendance';
import Todo from './pages/Todo';
import Users from './pages/Users';
import Leads from './pages/Leads';
import LeadsTelecaller from './pages/LeadsTelecaller';
import LeadCounselor from './pages/LeadCounselor';
import ClientLeads from './pages/ClientLeads';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import StudentAttendance from './pages/StudentAttendance';
import DepartmentsPage from './modules/departments/DepartmentsPage';
import DeveloperReportPage from './pages/DeveloperReportPage';
import DeveloperDashboard from './pages/DeveloperDashboard';
import HodRdReportPage from './pages/HodRdReportPage';
import GraphicDesignerReportPage from './pages/GraphicDesignerReportPage';
import GraphicDesignerDashboard from './pages/GraphicDesignerDashboard';
import VideographerDashboard from './pages/VideographerDashboard';
import AcademicCounselorReportPage from './pages/AcademicCounselorReportPage';
import HrReportPage from './pages/HrReportPage';
import HrDashboard from './pages/HrDashboard';
import OpsReportPage from './pages/OpsReportPage';
import AccountantReportPage from './pages/AccountantReportPage';
import MarketingReportPage from './pages/MarketingReportPage';
import VideographerReportPage from './pages/VideographerReportPage';
import EmployeeReports from './pages/EmployeeReports';
import CounselorDashboard from './pages/CounselorDashboard';

import AiReport from './pages/AiReport';
import CommonDashboard from './pages/CommonDashboard';
import BasicReportPage from './pages/BasicReportPage';
import NotificationPage from './pages/NotificationPage';
import PerformanceDashboard from './pages/PerformanceDashboard';
import UserPermissionsPage from './pages/UserPermissionsPage';
import MdDashboard from './pages/MdDashboard';
import AccountsPage from './pages/AccountsPage';



// Client & Project Management Module Pages
import ClientsPage from './pages/ClientsPage';
import CreateClientPage from './pages/CreateClientPage';
import ClientDetailsPage from './pages/ClientDetailsPage';
import ProjectsPage from './pages/ProjectsPage';
import CreateProjectPage from './pages/CreateProjectPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import VisibleWorkPage from './pages/VisibleWorkPage';
import ProjectReportsPage from './pages/ProjectReportsPage';




// Route Guards
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const RestrictedRoute = ({ children }) => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userObj = JSON.parse(userStr);
      const deptName = userObj.department || userObj.departmentId?.name || '';
      const isNonOperational = String(deptName).toLowerCase().trim() === 'non-operational';
      if (isNonOperational) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Access Denied</h1>
            <p className="text-xs font-semibold text-slate-400 max-w-sm mb-6">
              Your department does not have permission to view this section. Please contact your administrator.
            </p>
          </div>
        );
      }
    }
  } catch (e) {
    console.error("Restricted route check failed:", e);
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        const role = String(userObj.role_id || userObj.roleId || userObj.role || '').toLowerCase().trim();
        const designation = String(userObj.designation || '').toLowerCase().trim();
        const designationId = String(userObj.designationId?._id || userObj.designationId || userObj.designation_id || '').trim();
        const isHr = role === 'hr' || designation.includes('hr') || designationId === '6a2f8efea2fe388770a38987';
        const isAdmin = ['1', '2', 'admin'].includes(role) || designation.includes('admin');
        
        if (isHr) {
          return <Navigate to="/hr-dashboard" replace />;
        }
        if (isAdmin) {
          return <Navigate to="/dashboard" replace />;
        }
        return <Navigate to="/attendance" replace />;
      }
    } catch (e) {
      console.error("Public redirect role parse failed:", e);
    }
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const LandingRoute = () => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userObj = JSON.parse(userStr);
      const role = String(userObj.role_id || userObj.roleId || userObj.role || '').toLowerCase().trim();
      const designation = String(userObj.designation || '').toLowerCase().trim();
      const designationId = String(userObj.designationId?._id || userObj.designationId || userObj.designation_id || '').trim();
      const isHr = role === 'hr' || designation.includes('hr') || designationId === '6a2f8efea2fe388770a38987';
      const isAdmin = ['1', '2', 'admin'].includes(role) || designation.includes('admin');

      if (isHr) {
        return <Navigate to="/hr-dashboard" replace />;
      }
      if (isAdmin) {
        return <Navigate to="/dashboard" replace />;
      }
      return <Navigate to="/attendance" replace />;
    }
  } catch (e) {
    console.error("Landing redirect role parse failed:", e);
  }

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <UserProvider><Router>
      <Routes>
        {/* Auth Routes - No Sidebar */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Protected Routes - Wrapped in MainLayout */}
        <Route path="/dashboard" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/lead-dashboard" element={<ProtectedRoute><MainLayout><LeadDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/marketing-dashboard" element={<ProtectedRoute><MainLayout><MarketingDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><MainLayout><Attendance /></MainLayout></ProtectedRoute>} />
        <Route path="/todo" element={<ProtectedRoute><MainLayout><RestrictedRoute><Todo /></RestrictedRoute></MainLayout></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><MainLayout><RestrictedRoute><Users /></RestrictedRoute></MainLayout></ProtectedRoute>} />
        <Route path="/permissions/:userId" element={<ProtectedRoute><MainLayout><RestrictedRoute><UserPermissionsPage /></RestrictedRoute></MainLayout></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><MainLayout><RestrictedRoute><Leads /></RestrictedRoute></MainLayout></ProtectedRoute>} />
        <Route path="/leads-telecaller" element={<ProtectedRoute><MainLayout><RestrictedRoute><LeadsTelecaller /></RestrictedRoute></MainLayout></ProtectedRoute>} />
        <Route path="/client-leads" element={<ProtectedRoute><MainLayout><RestrictedRoute><ClientLeads /></RestrictedRoute></MainLayout></ProtectedRoute>} />
        <Route path="/lead-counselor" element={<ProtectedRoute><MainLayout><RestrictedRoute><LeadCounselor /></RestrictedRoute></MainLayout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
        <Route path="/student-attendance" element={<ProtectedRoute><MainLayout><StudentAttendance /></MainLayout></ProtectedRoute>} />
        <Route path="/departments" element={<ProtectedRoute><MainLayout><RestrictedRoute><DepartmentsPage /></RestrictedRoute></MainLayout></ProtectedRoute>} />
        <Route path="/developer-report" element={<ProtectedRoute><MainLayout><DeveloperReportPage /></MainLayout></ProtectedRoute>} />
        <Route path="/developer-dashboard" element={<ProtectedRoute><MainLayout><DeveloperDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/hod-rd-report" element={<ProtectedRoute><MainLayout><HodRdReportPage /></MainLayout></ProtectedRoute>} />
        <Route path="/graphic-designer-report" element={<ProtectedRoute><MainLayout><GraphicDesignerReportPage /></MainLayout></ProtectedRoute>} />
        <Route path="/graphic-designer-dashboard" element={<ProtectedRoute><MainLayout><GraphicDesignerDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/videographer-dashboard" element={<ProtectedRoute><MainLayout><VideographerDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/academic-counselor-report" element={<ProtectedRoute><MainLayout><AcademicCounselorReportPage /></MainLayout></ProtectedRoute>} />
        <Route path="/counselor-dashboard" element={<ProtectedRoute><MainLayout><CounselorDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/hr-report" element={<ProtectedRoute><MainLayout><HrReportPage /></MainLayout></ProtectedRoute>} />
        <Route path="/hr-dashboard" element={<ProtectedRoute><MainLayout><HrDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/ops-report" element={<ProtectedRoute><MainLayout><OpsReportPage /></MainLayout></ProtectedRoute>} />
        <Route path="/accountant-report" element={<ProtectedRoute><MainLayout><AccountantReportPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketing-report" element={<ProtectedRoute><MainLayout><MarketingReportPage /></MainLayout></ProtectedRoute>} />
        <Route path="/videographer-report" element={<ProtectedRoute><MainLayout><VideographerReportPage /></MainLayout></ProtectedRoute>} />
        <Route path="/employee-reports" element={<ProtectedRoute><MainLayout><EmployeeReports /></MainLayout></ProtectedRoute>} />
        <Route path="/team-reports" element={<ProtectedRoute><MainLayout><EmployeeReports /></MainLayout></ProtectedRoute>} />
        <Route path="/ai-report" element={<ProtectedRoute><MainLayout><AiReport /></MainLayout></ProtectedRoute>} />
        <Route path="/common-dashboard" element={<ProtectedRoute><MainLayout><CommonDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/md-dashboard" element={<ProtectedRoute><MainLayout><RestrictedRoute><MdDashboard /></RestrictedRoute></MainLayout></ProtectedRoute>} />
        <Route path="/basic-report" element={<ProtectedRoute><MainLayout><BasicReportPage /></MainLayout></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><MainLayout><NotificationPage /></MainLayout></ProtectedRoute>} />
        <Route path="/performance-dashboard" element={<ProtectedRoute><MainLayout><PerformanceDashboard /></MainLayout></ProtectedRoute>} />

        {/* Accounts Department Module Routes */}
        <Route path="/accounts" element={<ProtectedRoute><MainLayout><AccountsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/accounts/categories" element={<ProtectedRoute><MainLayout><AccountsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/accounts/expenses" element={<ProtectedRoute><MainLayout><AccountsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/accounts/salary" element={<ProtectedRoute><MainLayout><AccountsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/accounts/cash-book" element={<ProtectedRoute><MainLayout><AccountsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/accounts/reports" element={<ProtectedRoute><MainLayout><AccountsPage /></MainLayout></ProtectedRoute>} />

        {/* Client & Project Management Module Routes */}
        <Route path="/clients" element={<ProtectedRoute><MainLayout><RestrictedRoute><ClientsPage /></RestrictedRoute></MainLayout></ProtectedRoute>} />
        <Route path="/clients/new" element={<ProtectedRoute><MainLayout><RestrictedRoute><CreateClientPage /></RestrictedRoute></MainLayout></ProtectedRoute>} />
        <Route path="/clients/:id" element={<ProtectedRoute><MainLayout><RestrictedRoute><ClientDetailsPage /></RestrictedRoute></MainLayout></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><MainLayout><RestrictedRoute><ProjectsPage /></RestrictedRoute></MainLayout></ProtectedRoute>} />
        <Route path="/projects/new" element={<ProtectedRoute><MainLayout><RestrictedRoute><CreateProjectPage /></RestrictedRoute></MainLayout></ProtectedRoute>} />
        <Route path="/projects/reports" element={<ProtectedRoute><MainLayout><RestrictedRoute><ProjectReportsPage /></RestrictedRoute></MainLayout></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute><MainLayout><RestrictedRoute><ProjectDetailsPage /></RestrictedRoute></MainLayout></ProtectedRoute>} />
        <Route path="/projects/:id/visible-work" element={<ProtectedRoute><MainLayout><RestrictedRoute><VisibleWorkPage /></RestrictedRoute></MainLayout></ProtectedRoute>} />

        {/* Default Landing Route */}
        <Route path="/" element={<LandingRoute />} />

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" />} />
      </Routes>
    </Router></UserProvider>
  );
}


export default App;