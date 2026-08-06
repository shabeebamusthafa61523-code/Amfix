import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  Target, 
  Zap, 
  ListChecks, 
  Timer, 
  Activity, 
  ChevronRight, 
  Loader2,
  LayoutDashboard,
  Users,
  TrendingUp,
  Building,
  ListTodo,
  Shield,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  FileText,
  BarChart2,
  FolderKanban,
  Briefcase
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const Dashboard = ({ isEmbedded = false, mdData = null }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Admin Dashboard States
  const [adminStats, setAdminStats] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [sourcePerformance, setSourcePerformance] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState([]);
  const [followupMetrics, setFollowupMetrics] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [clientsData, setClientsData] = useState({ clients: [], stats: {} });
  const [projectsData, setProjectsData] = useState({ projects: [], stats: {} });
  const [clientLeadsData, setClientLeadsData] = useState([]);

  // Filters & Search
  const [userSearch, setUserSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState("all");
  const [taskSearch, setTaskSearch] = useState("");
  const [taskCurrentPage, setTaskCurrentPage] = useState(1);
  const [userPerformanceSort, setUserPerformanceSort] = useState("completion");
  const [globalDepartment, setGlobalDepartment] = useState("all");

  const navigate = useNavigate();

  const getISTDate = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata'
    }).format(new Date());
  };

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem("token");
    const cleanToken = rawToken ? rawToken.replace(/"/g, "") : "";

    return {
      Authorization: cleanToken.startsWith("Bearer ")
        ? cleanToken
        : `Bearer ${cleanToken}`,
      accept: "application/json"
    };
  }, []);

  const parseAsUTC = (dateInput) => {
    if (!dateInput) return null;

    try {
      return new Date(
        dateInput.endsWith("Z")
          ? dateInput
          : `${dateInput}Z`
      );
    } catch {
      return null;
    }
  };

  // Live Working Hours for Operator Dashboard
  const liveWorkingHours = useMemo(() => {
    if (!attendanceRecord?.check_in_time) return "0.00";

    if (attendanceRecord?.check_out_time) {
      const start = parseAsUTC(attendanceRecord.check_in_time);
      const end = parseAsUTC(attendanceRecord.check_out_time);
      return Math.max(0, (end - start) / 3600000).toFixed(2);
    }

    const start = parseAsUTC(attendanceRecord.check_in_time);
    const diffMs = currentTime.getTime() - start.getTime();
    return Math.max(0, diffMs / 3600000).toFixed(2);
  }, [attendanceRecord, currentTime]);

  const fetchData = useCallback(async (userId, privilegedMode) => {
    try {
      setLoading(true);
      const todayStr = getISTDate();

      if (privilegedMode) {
        const deptParam = globalDepartment !== 'all' ? `?department=${encodeURIComponent(globalDepartment)}` : '';
        // Fetch Admin specific stats in parallel
        const [taskRes, userRes, summaryRes, funnelRes, sourceRes, staffRes, followupRes, clientsRes, projectsRes, clientLeadsRes] = await Promise.all([
          fetch(`${API_BASE}/tasks/all`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/v1/users`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/v1/analytics/summary${deptParam}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/v1/analytics/conversion-rate${deptParam}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/v1/analytics/source-performance${deptParam}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/v1/analytics/staff-performance${deptParam}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/v1/analytics/followup-metrics${deptParam}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/v1/clients?limit=10&sortBy=createdAt&sortOrder=desc`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/v1/projects?limit=10`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/v1/client-leads?limit=10`, { headers: getAuthHeaders() })
        ]);

        // TASKS
        if (taskRes.ok) {
          const taskData = await taskRes.json();
          const rawTasks = Array.isArray(taskData) ? taskData : taskData?.data || [];
          setTasks(rawTasks);
        }

        // USERS
        if (userRes.ok) {
          const userData = await userRes.json();
          const rawUsers = userData.data && Array.isArray(userData.data)
            ? userData.data
            : (Array.isArray(userData) ? userData : []);
          setAllUsers(rawUsers);
        }

        // SUMMARY METRICS
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          if (summaryData.success) {
            setAdminStats(summaryData.data);
          }
        }

        // FUNNEL
        if (funnelRes.ok) {
          const funnelData = await funnelRes.json();
          if (funnelData.success) {
            setFunnelData(funnelData.data);
          }
        }

        // SOURCE PERFORMANCE
        if (sourceRes.ok) {
          const sourceData = await sourceRes.json();
          if (sourceData.success) {
            setSourcePerformance(sourceData.data || []);
          }
        }

        // STAFF PERFORMANCE
        if (staffRes.ok) {
          const staffData = await staffRes.json();
          if (staffData.success) {
            setStaffPerformance(staffData.data || []);
          }
        }

        // WEEKLY TIMELINE
        if (followupRes.ok) {
          const followupData = await followupRes.json();
          if (followupData.success) {
            setFollowupMetrics(followupData.data || null);
          }
        }

        // CLIENTS
        if (clientsRes.ok) {
          const cd = await clientsRes.json();
          if (cd.success) {
            setClientsData({ clients: cd.data?.clients || [], stats: cd.data?.stats || {} });
          }
        }

        // PROJECTS
        if (projectsRes.ok) {
          const pd = await projectsRes.json();
          if (pd.success) {
            setProjectsData({ projects: pd.data?.projects || [], stats: pd.data?.stats || {} });
          }
        }

        // CLIENT LEADS
        if (clientLeadsRes.ok) {
          const cld = await clientLeadsRes.json();
          if (cld.success) {
            setClientLeadsData(Array.isArray(cld.data) ? cld.data : []);
          }
        }

      } else {
        // Standard User fetching
        const [taskRes, attRes] = await Promise.all([
          fetch(`${API_BASE}/tasks/all`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/attendance/${todayStr}`, { headers: getAuthHeaders() })
        ]);

        if (taskRes.ok) {
          const taskData = await taskRes.json();
          const rawTasks = Array.isArray(taskData) ? taskData : taskData?.data || [];
          const cleanedTasks = rawTasks.map(task => ({
            ...task,
            assigned_to: (task.assigned_to && typeof task.assigned_to === "object")
              ? (task.assigned_to.id || task.assigned_to._id)
              : task.assigned_to
          }));
          setTasks(cleanedTasks);
        }

        if (attRes.ok) {
          const attData = await attRes.json();
          setAttendanceRecord(attData || null);
        }
      }

    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, globalDepartment]);

  const handleSync = () => {
    if (user?.user_id) {
      fetchData(user.user_id, isAdmin);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const storedUserId = localStorage.getItem("user_id")?.replace(/"/g, '');

    if (savedUser && storedUserId) {
      const parsedUser = JSON.parse(savedUser);
      parsedUser.user_id = storedUserId;
      setUser(parsedUser);

      // Check if user is MD -> redirect to MD Dashboard
      const currentUserRole = String(parsedUser.role_id || parsedUser.roleId || parsedUser.role || '').toLowerCase().trim();
      const currentUserDesignation = String(parsedUser.designation || '').toLowerCase().trim();
      const currentUserDesignationId = String(parsedUser.designationId?._id || parsedUser.designationId || parsedUser.designation_id || '').trim();

      const isMd = currentUserDesignation.includes('md') || 
                   currentUserDesignation.includes('managing director') || 
                   currentUserDesignationId === '6a7187de0bdbef63c8658832' || 
                   ['md', 'coo', 'executive_director'].includes(currentUserRole);

      if (isMd && !isEmbedded) {
        navigate('/md-dashboard', { replace: true });
        return;
      }

      // Check if user is HR -> redirect to HR Dashboard
      const isHr = currentUserRole === 'hr' || 
                   currentUserDesignation.includes('hr') || 
                   currentUserDesignationId === '6a2f8efea2fe388770a38987';

      if (isHr && !isEmbedded) {
        navigate('/hr-dashboard', { replace: true });
        return;
      }

      // Check if user has administrative/privileged role
      let currentUserDept = '';
      if (parsedUser.departmentId) {
        if (typeof parsedUser.departmentId === 'object' && parsedUser.departmentId._id) {
          currentUserDept = String(parsedUser.departmentId._id).trim();
        } else {
          currentUserDept = String(parsedUser.departmentId).trim();
        }
      }
      const privileged = isEmbedded ||
                         ['1', '2', 'admin'].includes(currentUserRole) || 
                         currentUserDept === '6a3caed51194353cbc8a3686' || 
                         currentUserDept === '6a55c7e8b613a280003481d8';
      setIsAdmin(privileged);
    }

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user?.user_id) {
      fetchData(user.user_id, isAdmin);
    }
  }, [globalDepartment, user?.user_id, isAdmin, fetchData]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setTaskCurrentPage(1);
  }, [taskSearch, taskFilter]);

  // Operator specific filtered tasks
  const myTasks = useMemo(() => {
    if (!user?.user_id) return [];

    return tasks.filter(t => {
      const assignedId = (t.assigned_to && typeof t.assigned_to === "object")
        ? (t.assigned_to.id || t.assigned_to._id)
        : t.assigned_to;

      return String(assignedId).trim() === String(user.user_id).trim();
    });
  }, [tasks, user]);

  const operatorMetrics = useMemo(() => {
    const total = myTasks.length;
    const pending = myTasks.filter((t) => ["pending", "current"].includes(t.status?.toLowerCase())).length;
    const completed = myTasks.filter((t) => t.status?.toLowerCase() === "done").length;
    const rate = total ? Math.round((completed / total) * 100) : 0;
    return { total, pending, completed, rate };
  }, [myTasks]);

  // Helper to find operator name for tasks
  const getOperatorName = (assignedTo) => {
    if (!assignedTo) return "Unassigned";
    if (typeof assignedTo === "object") {
      return assignedTo.name || assignedTo.email || "Unknown Operator";
    }
    const found = allUsers.find(u => String(u.id || u._id) === String(assignedTo));
    return found ? found.name : `Operator ID: ${String(assignedTo).slice(0, 8)}`;
  };

  const uniqueDepartments = useMemo(() => {
    const depts = new Set();
    allUsers.forEach(u => {
      const deptName = u.departmentId?.name || u.department;
      if (deptName) depts.add(deptName);
    });
    return Array.from(depts).sort();
  }, [allUsers]);

  const getOperatorDept = useCallback((assignedTo) => {
    if (!assignedTo) return "";
    const userId = (typeof assignedTo === "object") ? (assignedTo.id || assignedTo._id) : assignedTo;
    const found = allUsers.find(u => String(u.id || u._id) === String(userId));
    return found ? (found.departmentId?.name || found.department || "") : "";
  }, [allUsers]);

  // Filtered operators list
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      if (globalDepartment !== "all") {
        const deptName = u.departmentId?.name || u.department || "";
        if (deptName.toLowerCase() !== globalDepartment.toLowerCase()) return false;
      }
      const search = userSearch.toLowerCase().trim();
      if (!search) return true;
      return (
        String(u.name || "").toLowerCase().includes(search) ||
        String(u.email || "").toLowerCase().includes(search) ||
        String(u.department || "").toLowerCase().includes(search) ||
        String(u.role || "").toLowerCase().includes(search)
      );
    });
  }, [allUsers, userSearch, globalDepartment]);

  // Filtered administrative tasks list
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (globalDepartment !== "all") {
        const dept = getOperatorDept(t.assigned_to);
        if (dept.toLowerCase() !== globalDepartment.toLowerCase()) return false;
      }
      const search = taskSearch.toLowerCase().trim();
      const statusMatch = taskFilter === "all" || String(t.status || "").toLowerCase() === taskFilter.toLowerCase();
      
      const searchMatch = !search || 
        String(t.title || "").toLowerCase().includes(search) ||
        getOperatorName(t.assigned_to).toLowerCase().includes(search);

      return statusMatch && searchMatch;
    });
  }, [tasks, taskSearch, taskFilter, allUsers, globalDepartment, getOperatorDept]);

  // System Task Monitor Pagination calculations
  const tasksPerPage = 5;
  const totalTaskPages = Math.ceil(filteredTasks.length / tasksPerPage);

  const paginatedTasks = useMemo(() => {
    const activePage = Math.min(taskCurrentPage, totalTaskPages || 1);
    const start = (activePage - 1) * tasksPerPage;
    return filteredTasks.slice(start, start + tasksPerPage);
  }, [filteredTasks, taskCurrentPage, totalTaskPages]);

  const taskPaginationItems = useMemo(() => {
    const pages = [];
    for (let i = 1; i <= totalTaskPages; i++) {
      if (i === 1 || i === totalTaskPages || (i >= taskCurrentPage - 1 && i <= taskCurrentPage + 1)) {
        pages.push(i);
      }
    }
    const rendered = [];
    for (let i = 0; i < pages.length; i++) {
      if (i > 0 && pages[i] - pages[i - 1] > 1) {
        rendered.push({ type: 'ellipsis' });
      }
      rendered.push({ type: 'page', value: pages[i] });
    }
    return rendered;
  }, [totalTaskPages, taskCurrentPage]);

  // Dynamic department list from allUsers
  const departmentsList = useMemo(() => {
    const depts = new Set();
    allUsers.forEach(u => {
      if (u.department) depts.add(u.department);
    });
    return Array.from(depts);
  }, [allUsers]);

  // Processed todo task metrics grouped by department and sorted (initialized for all departments)
  const processedTodoAnalytics = useMemo(() => {
    const groups = {};

    // Initialize every department from departmentsList
    departmentsList.forEach(dept => {
      groups[dept] = { department: dept, total: 0, completed: 0, pending: 0 };
    });

    tasks.forEach(t => {
      const assignedId = (t.assigned_to && typeof t.assigned_to === "object")
        ? (t.assigned_to.id || t.assigned_to._id)
        : t.assigned_to;
      
      const userObj = allUsers.find(u => String(u.id || u._id) === String(assignedId));
      const dept = userObj ? (userObj.department || "Unassigned") : "Unassigned";

      if (!groups[dept]) {
        groups[dept] = { department: dept, total: 0, completed: 0, pending: 0 };
      }

      groups[dept].total += 1;
      if (String(t.status).toLowerCase() === 'done') {
        groups[dept].completed += 1;
      } else {
        groups[dept].pending += 1;
      }
    });

    const list = Object.values(groups).map(g => ({
      ...g,
      completionRate: g.total ? Math.round((g.completed / g.total) * 100) : 0
    }));

    // Sorting alphabetically by default
    list.sort((a, b) => a.department.localeCompare(b.department));

    return list;
  }, [tasks, allUsers, departmentsList]);



  // Processed user todo performance list (filtered by department and sorted)
  const processedUserTodoPerformance = useMemo(() => {
    // Departments that belong to MD view only — excluded from admin Operational Task Analytics
    const MD_ONLY_DEPTS = ["academy", "hr analytics", "hr/admin", "hr", "daily task tracker"];

    let list = allUsers.map(u => {
      const userIdStr = String(u.id || u._id || "").trim();
      const userTasks = tasks.filter(t => {
        const assignedId = (t.assigned_to && typeof t.assigned_to === "object")
          ? (t.assigned_to.id || t.assigned_to._id)
          : t.assigned_to;
        return String(assignedId).trim() === userIdStr;
      });

      const total = userTasks.length;
      const completed = userTasks.filter(t => String(t.status).toLowerCase() === 'done').length;
      const completionRate = total ? Math.round((completed / total) * 100) : 0;

      return {
        ...u,
        total,
        completed,
        completionRate
      };
    });

    // Filter by active department selection
    if (globalDepartment !== "all") {
      list = list.filter(u => {
        const deptName = u.departmentId?.name || u.department || "";
        return deptName.toLowerCase().trim() === globalDepartment.toLowerCase().trim();
      });
    } else if (!isEmbedded) {
      // Admin "all" view: exclude MD-only departments from Operational Task Analytics
      list = list.filter(u => {
        const deptName = (u.departmentId?.name || u.department || "").toLowerCase().trim();
        return !MD_ONLY_DEPTS.includes(deptName);
      });
    }

    // Sort by selected criteria
    if (userPerformanceSort === "completion") {
      list.sort((a, b) => b.completionRate - a.completionRate);
    } else if (userPerformanceSort === "workload") {
      list.sort((a, b) => b.total - a.total);
    } else if (userPerformanceSort === "name") {
      list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    }

    return list;
  }, [allUsers, tasks, globalDepartment, userPerformanceSort, isEmbedded]);


  // SVG Bar Chart Generator for User Todo Performance (Premium Edition)
  const renderUserTodoPerformanceChart = () => {
    const data = processedUserTodoPerformance;

    if (data.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-[200px] text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
          <Users className="text-slate-355 dark:text-slate-655 mb-2 animate-bounce" size={24} />
          <p className="text-[10px] font-black text-slate-550 dark:text-slate-455 uppercase tracking-widest">
            No Operators Found in this Department
          </p>
        </div>
      );
    }

    const width = 500;
    const rowHeight = 35;
    const headerHeight = 20;
    const paddingLeft = 120; // for user names
    const paddingRight = 100; // for completion rate and ratio
    const chartWidth = width - paddingLeft - paddingRight;
    const height = headerHeight + (data.length * rowHeight) + 15;

    return (
      <div className="w-full h-full flex flex-col justify-between">
        <div className="relative flex-1" style={{ minHeight: `${height}px` }}>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="userTodoGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#442d82" />
                <stop offset="100%" stopColor="#b7d333" />
              </linearGradient>
              <filter id="shadow-user" x="-10%" y="-20%" width="120%" height="150%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#442d82" floodOpacity="0.25" />
              </filter>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const x = paddingLeft + ratio * chartWidth;
              return (
                <g key={idx} className="opacity-15 dark:opacity-[0.05]">
                  <line x1={x} y1={headerHeight} x2={x} y2={height - 15} stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" className="text-slate-400" />
                  <text x={x} y={headerHeight - 5} textAnchor="middle" className="text-[8px] font-black text-slate-550 fill-current">{ratio * 100}%</text>
                </g>
              );
            })}

            {/* Rows */}
            {data.map((user, idx) => {
              const y = headerHeight + (idx * rowHeight) + 10;
              const barWidth = (user.completionRate / 100) * chartWidth;

              return (
                <g key={user.id || user._id || `user-perf-${idx}`} className="group/row cursor-pointer transition-all duration-300 hover:opacity-90">
                  {/* User Name */}
                  <text
                    x={paddingLeft - 12}
                    y={y + 8}
                    textAnchor="end"
                    className="text-[9px] font-black text-slate-705 dark:text-slate-355 fill-current tracking-wide transition-colors group-hover/row:fill-indigo-500"
                  >
                    {user.name}
                  </text>

                  {/* Background Bar */}
                  <rect
                    x={paddingLeft}
                    y={y}
                    width={chartWidth}
                    height="10"
                    rx="3"
                    className="fill-slate-100 dark:fill-slate-900 transition-all duration-300"
                  />

                  {/* Progress Bar */}
                  <rect
                    x={paddingLeft}
                    y={y}
                    width={Math.max(barWidth, 0)}
                    height="10"
                    rx="3"
                    fill="url(#userTodoGrad)"
                    filter="url(#shadow-user)"
                    className="transition-all duration-500"
                  />

                  {/* Completed / Total Label */}
                  <text
                    x={paddingLeft + Math.max(barWidth, 2) + 8}
                    y={y + 8}
                    className="text-[9px] font-extrabold text-slate-500 dark:text-slate-455 fill-current"
                  >
                    {user.completed}/{user.total}
                  </text>

                  {/* Completion Rate Badge */}
                  <text
                    x={width - 5}
                    y={y + 8}
                    textAnchor="end"
                    className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 fill-current tracking-wider"
                  >
                    {user.completionRate}% Done
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  // Memoized completed tasks trend data for each user in selected department
  const completedUsersTrendData = useMemo(() => {
    const dates = [];
    const dateLabels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      dates.push(dateStr);
      
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateLabels.push({ dateStr, label });
    }

    const deptUsers = processedUserTodoPerformance;

    const trend = deptUsers.map(user => {
      const userIdStr = String(user.id || user._id || "").trim();
      const userTasks = tasks.filter(t => {
        const assignedId = (t.assigned_to && typeof t.assigned_to === "object")
          ? (t.assigned_to.id || t.assigned_to._id)
          : t.assigned_to;
        return String(assignedId).trim() === userIdStr;
      });

      const counts = dates.map(dStr => {
        return userTasks.filter(t => {
          const isDone = String(t.status).toLowerCase() === 'done';
          if (!isDone) return false;
          
          const taskDateVal = t.updatedAt || t.completedAt || t.createdAt || t.dueDate;
          if (!taskDateVal) return false;
          
          const taskDate = new Date(taskDateVal);
          const y = taskDate.getFullYear();
          const m = String(taskDate.getMonth() + 1).padStart(2, '0');
          const d = String(taskDate.getDate()).padStart(2, '0');
          const taskDateStr = `${y}-${m}-${d}`;
          
          return taskDateStr === dStr;
        }).length;
      });

      const totalCompletions = counts.reduce((a, b) => a + b, 0);

      return {
        name: user.name,
        counts,
        totalCompletions
      };
    });

    const activeUsers = trend
      .filter(u => u.totalCompletions > 0 || deptUsers.length <= 5)
      .slice(0, 5);

    return {
      dateLabels,
      usersTrend: activeUsers
    };
  }, [tasks, processedUserTodoPerformance]);

  // SVG Multi-Line Chart for User Completed Tasks Activity Trend (Premium Edition)
  const renderTasksTrendLineChart = () => {
    const { dateLabels, usersTrend } = completedUsersTrendData;

    if (usersTrend.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-[200px] text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
          <Activity className="text-slate-355 dark:text-slate-655 mb-2 animate-bounce" size={24} />
          <p className="text-[10px] font-black text-slate-550 dark:text-slate-455 uppercase tracking-widest">
            No Active User Trends Found
          </p>
        </div>
      );
    }

    let maxVal = 2;
    usersTrend.forEach(user => {
      const userMax = Math.max(...user.counts);
      if (userMax > maxVal) maxVal = userMax;
    });

    const width = 500;
    const height = 200;
    const paddingTop = 30;
    const paddingBottom = 30;
    const paddingLeft = 30;
    const paddingRight = 20;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const lineColors = [
      "#442d82", // indigo
      "#ec4899", // pink
      "#b7d333", // emerald
      "#f59e0b", // amber
      "#3b82f6", // blue
      "#a855f7", // purple
      "#06b6d4"  // cyan
    ];

    return (
      <div className="w-full h-full flex flex-col justify-between">
        <div className="relative flex-1" style={{ minHeight: `${height}px` }}>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            {/* Grid lines */}
            {[0, 0.5, 1].map((ratio, i) => {
              const y = paddingTop + chartHeight * ratio;
              const val = Math.round(maxVal * (1 - ratio));
              return (
                <g key={i} className="opacity-10 dark:opacity-[0.05]">
                  <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-slate-400" />
                  <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="text-[9px] font-black text-slate-500 fill-current">{val}</text>
                </g>
              );
            })}

            {/* X-axis date labels */}
            {dateLabels.map((d, i) => {
              const x = paddingLeft + (i * (chartWidth / (dateLabels.length - 1)));
              return (
                <text 
                  key={i}
                  x={x} 
                  y={paddingTop + chartHeight + 15} 
                  textAnchor="middle" 
                  className="text-[8px] font-extrabold text-slate-500 fill-current"
                >
                  {d.label}
                </text>
              );
            })}

            {/* Paths and Dots for each user */}
            {usersTrend.map((user, uIdx) => {
              const userColor = lineColors[uIdx % lineColors.length];
              const points = user.counts.map((count, i) => {
                const x = paddingLeft + (i * (chartWidth / (dateLabels.length - 1)));
                const y = paddingTop + chartHeight - ((count / maxVal) * chartHeight);
                return { x, y, count };
              });

              const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

              return (
                <g key={`trend-line-${user.name || uIdx}`}>
                  <defs>
                    <filter id={`glow-${uIdx}`} x="-10%" y="-20%" width="120%" height="150%">
                      <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor={userColor} floodOpacity="0.25" />
                    </filter>
                  </defs>

                  {/* Line path */}
                  {pathD && (
                    <path 
                      d={pathD} 
                      fill="none" 
                      stroke={userColor} 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      filter={`url(#glow-${uIdx})`}
                      className="transition-all duration-300 hover:stroke-[3px]"
                    />
                  )}

                  {/* Individual Point Circles */}
                  {points.map((p, idx) => (
                    <g key={idx} className="group/dot cursor-pointer">
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r="3.5" 
                        fill={userColor}
                        style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                        className="stroke-white dark:stroke-slate-900 stroke-2 transition-transform duration-300 group-hover/dot:scale-[1.35]" 
                      />
                      <text 
                        x={p.x} 
                        y={p.y - 8} 
                        textAnchor="middle" 
                        className="text-[9px] font-black text-slate-705 dark:text-slate-350 fill-current opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none"
                      >
                        {user.name}: {p.count} Done
                      </text>
                    </g>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 justify-center border-t border-slate-50 dark:border-slate-850 pt-3">
          {usersTrend.map((user, idx) => (
            <div key={`legend-${user.name || idx}`} className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-1.5 rounded-full" style={{ backgroundColor: lineColors[idx % lineColors.length] }} />
              <span>{user.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Processed staff performance list (sorted by conversion rate)
  const processedStaffPerformance = useMemo(() => {
    let list = [...staffPerformance];
    list.sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0));
    return list;
  }, [staffPerformance]);

  const leadSourceData = useMemo(() => {
    if (!sourcePerformance) return [];
    return sourcePerformance.slice(0, 6).map((src, i) => {
      const colors = ["#442d82", "#b7d333", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6"];
      return {
        label: src.source || "Unknown",
        value: src.totalLeads || 0,
        rate: src.conversionRate || 0,
        color: colors[i % colors.length]
      };
    });
  }, [sourcePerformance]);

  const operatorConversionData = useMemo(() => {
    if (!processedStaffPerformance) return [];
    return processedStaffPerformance.slice(0, 6).map((staff, i) => {
      const colors = ["#8b5cf6", "#3b82f6", "#b7d333", "#f59e0b", "#ec4899", "#06b6d4"];
      return {
        label: staff.name || "Unknown",
        value: Math.round(staff.conversionRate || 0),
        color: colors[i % colors.length]
      };
    });
  }, [processedStaffPerformance]);

  // SVG Pie/Donut Chart Generator for Staff Performance
  const renderStaffPerformanceChart = () => {
    const data = operatorConversionData;

    if (data.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-[200px] text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
          <Users className="text-slate-355 dark:text-slate-655 mb-2" size={24} />
          <p className="text-[10px] font-bold text-slate-550 dark:text-slate-455 uppercase tracking-widest">
            No Staff Performance Found
          </p>
        </div>
      );
    }

    const total = data.reduce((acc, curr) => acc + curr.value, 0);
    const avg = data.length ? Math.round(total / data.length) : 0;
    let accumulated = 0;

    return (
      <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
        <div className="relative w-40 h-40 shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
            {data.map((slice, i) => {
              const percent = total > 0 ? slice.value / total : 0;
              const strokeDasharray = `${percent * 314.159} ${314.159 - (percent * 314.159)}`;
              const strokeDashoffset = -((accumulated / total) * 314.159);
              accumulated += slice.value;
              return (
                <circle
                  key={i}
                  cx="60"
                  cy="60"
                  r="50"
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth="12"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300 hover:stroke-[14px] cursor-pointer"
                  title={`${slice.label}: ${slice.value}%`}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Avg Conv</span>
            <span className="text-xl font-black text-slate-800 dark:text-white">{avg}%</span>
          </div>
        </div>

        <div className="flex-1 min-w-0 w-full space-y-2">
          {data.map((slice, i) => (
            <div key={i} className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                <span className="truncate uppercase text-[10px] tracking-wide">{slice.label}</span>
              </div>
              <span className="font-mono text-indigo-500">{slice.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // SVG LINE/AREA CHART GENERATOR (Real Activity Timeline)
  // ----------------------------------------------------
  const renderWeeklyActivityChart = () => {
    const dataPoints = followupMetrics?.weeklyTimeline || [];

    if (dataPoints.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
          <Activity className="text-slate-350 dark:text-slate-650 mb-2" size={24} />
          <p className="text-[10px] font-bold text-slate-550 dark:text-slate-450 uppercase tracking-widest">No Activity Logged This Week</p>
        </div>
      );
    }

    const maxVal = Math.max(...dataPoints.map(d => d.count), 10);
    const width = 500;
    const height = 180;
    const paddingLeft = 35;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 25;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const points = dataPoints.map((d, i) => {
      const x = paddingLeft + (i / (dataPoints.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (d.count / maxVal) * chartHeight;
      const label = d.date.includes('-') ? d.date.split('-')[2] : d.date;
      return { x, y, label, count: d.count };
    });

    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, "");

    const areaD = points.length 
      ? `${pathD} L ${points[points.length-1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z` 
      : "";

    return (
      <div className="w-full h-full flex flex-col justify-between">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Operator Action Log
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              Lead follow-ups registered last 7 days
            </p>
          </div>
          <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/5 px-2 py-0.5 border border-indigo-500/10 rounded uppercase">
            Live Feed
          </span>
        </div>

        <div className="relative flex-1 min-h-[140px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#442d82" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#442d82" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.33, 0.66, 1].map((ratio, i) => {
              const y = paddingTop + chartHeight * ratio;
              const val = Math.round(maxVal * (1 - ratio));
              return (
                <g key={i} className="opacity-15 dark:opacity-[0.07]">
                  <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-slate-400" />
                  <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="text-[9px] font-bold text-slate-550 fill-current">{val}</text>
                </g>
              );
            })}

            {/* Area gradient under path */}
            {areaD && <path d={areaD} fill="url(#areaGrad)" />}

            {/* Solid line path */}
            {pathD && (
              <path 
                d={pathD} 
                fill="none" 
                stroke="#442d82" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                className="drop-shadow-[0_2px_6px_rgba(99,102,241,0.35)]" 
              />
            )}

            {/* Data point anchors */}
            {points.map((p, i) => (
              <g key={i} className="group/anchor">
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r="4" 
                  fill="#442d82" 
                  stroke="#fff" 
                  strokeWidth="1.5" 
                  className="cursor-pointer transition-all duration-300 group-hover/anchor:r-5 group-hover/anchor:fill-lime-400" 
                />
                
                {/* Micro-tooltip */}
                <g className="opacity-0 group-hover/anchor:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <rect x={p.x - 16} y={p.y - 25} width="32" height="16" rx="4" fill="#0f172a" className="dark:fill-slate-800 shadow-md" />
                  <text x={p.x} y={p.y - 14} textAnchor="middle" fill="#fff" className="text-[9px] font-black fill-white">{p.count}</text>
                </g>

                {/* X Axis Date labels */}
                <text x={p.x} y={height - 5} textAnchor="middle" className="text-[9px] font-bold text-slate-500 fill-current">{p.label}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // RENDER ADMIN VIEW
  // ----------------------------------------------------
  const renderAdminView = () => {
    const filteredUsersCount = allUsers.filter(u => {
      if (globalDepartment === "all") return true;
      const deptName = u.departmentId?.name || u.department || "";
      return deptName.toLowerCase() === globalDepartment.toLowerCase();
    });
    const activeStaffCount = filteredUsersCount.filter(u => u.isActive !== false).length;

    const tasksForDept = tasks.filter(t => {
      if (globalDepartment === "all") return true;
      const dept = getOperatorDept(t.assigned_to);
      return dept.toLowerCase() === globalDepartment.toLowerCase();
    });
    const doneTasksCount = tasksForDept.filter(t => String(t.status).toLowerCase() === "done").length;
    const totalTasksCount = tasksForDept.length;
    const taskCompletionRate = totalTasksCount ? Math.round((doneTasksCount / totalTasksCount) * 100) : 0;

    const stats = adminStats || {};
    const funnelList = funnelData?.funnel || [];
    const normalizedDept = String(globalDepartment || '').toLowerCase().replace(/\s+/g, '');
    const showLeadsArea = normalizedDept === "all" || 
                          normalizedDept.includes("marketing") || 
                          normalizedDept.includes("sales&growth") || 
                          normalizedDept.includes("salesandgrowth") || 
                          normalizedDept.includes("sales");

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-24 pt-4 max-w-7xl mx-auto px-4">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            {/* <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-indigo-500" />
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">
                System Control Console
              </p>
            </div> */}
            <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tighter">
               <span className="text-indigo-650 dark:text-indigo-400">Dashboard</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              className="px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all active:scale-95 shadow-sm cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Sync System</span>
            </button>
            <div className="px-5 py-3 bg-indigo-600/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-xs font-black text-white uppercase tracking-wider">
              {currentTime.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
            </div>
          </div>
        </div>

        {/* DEPARTMENT & EXECUTIVE VIEW FILTER PILLS */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-3.5 scrollbar-none border-b border-slate-100 dark:border-slate-800/80">
          <button
            onClick={() => setGlobalDepartment("all")}
            className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              globalDepartment === "all"
                ? "bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700"
            }`}
          >
            Admin Dashboard
          </button>

          {/* MD-only tabs — only shown when accessed via MdDashboard */}
          {isEmbedded && (
            <>
              <button
                onClick={() => setGlobalDepartment("Academy")}
                className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  globalDepartment.toLowerCase() === "academy"
                    ? "bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700"
                }`}
              >
                Academy
              </button>

              <button
                onClick={() => setGlobalDepartment("HR Analytics")}
                className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  globalDepartment.toLowerCase() === "hr analytics" || globalDepartment.toLowerCase() === "hr/admin" || globalDepartment.toLowerCase() === "hr"
                    ? "bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700"
                }`}
              >
                HR Analytics
              </button>

              <button
                onClick={() => setGlobalDepartment("Daily Task Tracker")}
                className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  globalDepartment.toLowerCase() === "daily task tracker"
                    ? "bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700"
                }`}
              >
                Daily Task Tracker
              </button>
            </>
          )}

          {uniqueDepartments
            .map(dept => (
              <button
                key={dept}
                onClick={() => setGlobalDepartment(dept)}
                className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  globalDepartment.toLowerCase() === dept.toLowerCase()
                    ? "bg-indigo-700 text-white shadow-md shadow-indigo-800/20"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700"
                }`}
              >
                {dept}
              </button>
            ))}
        </div>

        {/* METRICS GRID */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${showLeadsArea ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-5`}>
          {showLeadsArea && (
            <>
              <StatCard
                label="Leads Pipeline"
                value={stats.totalLeads?.value || 0}
                icon={TrendingUp}
                color="text-indigo-600 dark:text-indigo-400"
                borderColor="bg-indigo-600 dark:bg-indigo-500"
                bgColor="bg-indigo-50 dark:bg-indigo-950/20"
                trend={stats.totalLeads?.trend}
                subtext="Total Registered Leads"
              />
            </>
          )}
          <StatCard
            label="Total Clients"
            value={clientsData.stats?.total || clientsData.clients?.length || 0}
            icon={Building}
            color="text-blue-600 dark:text-blue-400"
            borderColor="bg-blue-600"
            bgColor="bg-blue-50 dark:bg-blue-950/20"
            subtext={`${clientsData.stats?.active || 0} Active Accounts`}
          />
          <StatCard
            label="Total Projects"
            value={projectsData.stats?.total || projectsData.projects?.length || 0}
            icon={FolderKanban}
            color="text-purple-600 dark:text-purple-400"
            borderColor="bg-purple-600"
            bgColor="bg-purple-50 dark:bg-purple-950/20"
            subtext={`${projectsData.stats?.completed || 0} Completed`}
          />
          <StatCard
            label="Active Staff"
            value={activeStaffCount}
            icon={Users}
            color="text-lime-600 dark:text-lime-400"
            borderColor="bg-lime-500"
            bgColor="bg-lime-50 dark:bg-lime-950/20"
            subtext={`${filteredUsersCount.length} Operators Enrolled`}
          />
          <StatCard
            label="Tasks Completed"
            value={`${taskCompletionRate}%`}
            icon={ListChecks}
            color="text-amber-600 dark:text-amber-400"
            borderColor="bg-amber-500"
            bgColor="bg-amber-50 dark:bg-amber-950/20"
            subtext={`${doneTasksCount}/${totalTasksCount} Missions Closed`}
          />
        </div>

        {/* CHARTS SECTION 1 - SVG TIMELINE & LEAD STAGE FUNNEL */}
        {!["academy", "hr analytics", "hr/admin", "daily task tracker"].includes(globalDepartment.toLowerCase()) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* UNIFIED DEPARTMENT & USER TODO ANALYTICS CONSOLE (Full-Width Premium Dashboard Card) */}
          <div className="lg:col-span-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-50 dark:border-slate-850 pb-4">
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Operational Task Analytics
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                  Select a department to view individual user completion rates and task trends
                </p>
              </div>
              
              <div className="flex items-center gap-3 flex-wrap">
                {/* Sort Users Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase text-slate-455 dark:text-slate-500">Sort Users:</span>
                  <select
                    value={userPerformanceSort}
                    onChange={(e) => setUserPerformanceSort(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-750 dark:text-slate-350 focus:outline-none cursor-pointer hover:border-indigo-500/50 transition-colors"
                  >
                    <option value="completion">Completion Rate</option>
                    <option value="workload">Total Workload</option>
                    <option value="name">Name</option>
                  </select>
                </div>
              </div>
            </div>

            {/* CHARTS CONTAINER (GRID 1:2) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
              {/* USER COMPLETION BAR CHART */}
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-widest mb-4 pb-1.5 border-b border-slate-50 dark:border-slate-850">
                  User Task Completions
                </p>
                <div className="flex-1 overflow-y-auto max-h-[250px] scrollbar-thin">
                  {renderUserTodoPerformanceChart()}
                </div>
              </div>

              {/* ACTIVITY TREND LINE CHART */}
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-widest mb-4 pb-1.5 border-b border-slate-50 dark:border-slate-850">
                  Department Activity Trend (Last 7 Days)
                </p>
                <div className="flex-1">
                  {renderTasksTrendLineChart()}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}


        {/* CHARTS SECTION 2 - LEADS FUNNEL, MARKETING SOURCES, AND OPERATOR PERFORMANCE */}
        {showLeadsArea && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEAD PIPELINE FUNNEL CHART */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Leads Funnel
                  </h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                    Lead stage distribution summary
                  </p>
                </div>
                <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-500/5 border border-indigo-500/10 px-2.5 py-0.5 rounded">
                  Funnel Stages
                </span>
              </div>

              {funnelList && funnelList.length > 0 ? (
                <div className="space-y-4">
                  {funnelList.map((item, index) => {
                    const colors = {
                      'New': 'from-blue-500 to-indigo-500 bg-blue-500',
                      'Contacted': 'from-indigo-500 to-violet-500 bg-indigo-500',
                      'Follow Up': 'from-violet-500 to-purple-500 bg-violet-500',
                      'Interested': 'from-amber-500 to-orange-500 bg-amber-500',
                      'Converted': 'from-emerald-500 to-lime-500 bg-emerald-500',
                      'Lost': 'from-rose-500 to-red-500 bg-rose-500'
                    };
                    const barColor = colors[item.stage] || 'from-slate-400 to-slate-500 bg-slate-400';

                    return (
                      <div key={item.stage} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-355">
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            {item.stage}
                          </span>
                          <span>{item.count} ({item.percentage}%)</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.percentage}%` }}
                            transition={{ duration: 0.8, delay: index * 0.05 }}
                            className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col justify-center items-center py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40 h-full">
                  <BarChart2 className="mx-auto text-slate-350 dark:text-slate-655 mb-2" size={24} />
                  <p className="text-[10px] font-bold text-slate-550 dark:text-slate-455 uppercase tracking-widest">
                    No Funnel Data Registered
                  </p>
                </div>
              )}
            </div>

            {/* LEAD SOURCE ATTRIBUTION */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Lead Sources Attribution
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                    Marketing channels comparison metrics and attribution
                  </p>
                </div>
                <span className="text-[9px] font-black text-lime-500 bg-lime-500/5 px-2 py-0.5 border border-lime-500/10 rounded uppercase">
                  Channels
                </span>
              </div>

              {sourcePerformance && sourcePerformance.length > 0 ? (() => {
                const totalLeads = leadSourceData.reduce((acc, curr) => acc + curr.value, 0);
                let accumulatedLeads = 0;
                return (
                  <div className="flex flex-col sm:flex-row items-center gap-6 py-2 flex-1">
                    <div className="relative w-36 h-36 shrink-0">
                      <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                        {leadSourceData.map((slice, i) => {
                          const percent = totalLeads > 0 ? slice.value / totalLeads : 0;
                          const strokeDasharray = `${percent * 314.159} ${314.159 - (percent * 314.159)}`;
                          const strokeDashoffset = -((accumulatedLeads / totalLeads) * 314.159);
                          accumulatedLeads += slice.value;
                          return (
                            <circle
                              key={i}
                              cx="60"
                              cy="60"
                              r="50"
                              fill="transparent"
                              stroke={slice.color}
                              strokeWidth="12"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              className="transition-all duration-300 hover:stroke-[14px] cursor-pointer"
                              title={`${slice.label}: ${slice.value} leads`}
                            />
                          );
                        })}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Leads</span>
                        <span className="text-xl font-black text-slate-800 dark:text-white">{totalLeads}</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 w-full space-y-2">
                      {leadSourceData.map((slice, i) => (
                        <div key={i} className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                            <span className="truncate uppercase text-[9px] tracking-wide">{slice.label}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                            <span>{slice.value}</span>
                            <span className="text-indigo-500">({slice.rate.toFixed(2)}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })() : (
                <div className="flex flex-col justify-center items-center py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40 h-full">
                  <TrendingUp className="mx-auto text-slate-350 dark:text-slate-655 mb-2" size={24} />
                  <p className="text-[10px] font-bold text-slate-550 dark:text-slate-455 uppercase tracking-widest">
                    No Lead Sources Registered
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MIDDLE SECTION - QUICK ACTIONS & OPERATORS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* QUICK ADMINISTRATIVE ACTIONS */}
          {/* QUICK ADMINISTRATIVE ACTIONS */}
          <div className="lg:col-span-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm">
            <h2 className="text-xs font-black text-slate-800 dark:text-slate-255 uppercase tracking-wider mb-6">
              Console Navigation
            </h2>
            <div className={`grid grid-cols-2 ${showLeadsArea ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4`}>
              <ActionCard
                title="Users Hub"
                desc="Enrolled staff list"
                icon={Users}
                onClick={() => navigate("/users")}
              />
              {showLeadsArea && (
                <ActionCard
                  title="Leads Hub"
                  desc="Directories index"
                  icon={TrendingUp}
                  onClick={() => navigate("/leads")}
                />
              )}
              <ActionCard
                title="Departments"
                desc="Corporate hierarchy"
                icon={Building}
                onClick={() => navigate("/departments")}
              />
              <ActionCard
                title="Tasks Console"
                desc="Operator mission logs"
                icon={ListTodo}
                onClick={() => navigate("/todo")}
              />
            </div>
          </div>
        </div>

        {/* TASKS SYSTEM MONITOR */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tight">
                System Task Monitor
              </h2>
              <p className="text-xs text-slate-550 dark:text-slate-450 font-medium">
                Track assigned missions and operational workloads
              </p>
            </div>

            {/* FILTERS & SEARCH */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-60">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="w-full pl-4 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-850 dark:text-slate-250 focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="flex bg-slate-500 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
                {["all", "pending", "done"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTaskFilter(filter)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
  taskFilter === filter
    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/20"
    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
                <ListTodo className="mx-auto text-slate-350 dark:text-slate-750 mb-2" size={28} />
                <p className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">
                  No system tasks registered for current filters
                </p>
              </div>
            ) : (
              paginatedTasks.map((task) => {
                const isDone = String(task.status).toLowerCase() === "done";
                return (
                  <div
                    key={task.id || task._id}
                    className="p-5 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 p-2 rounded-xl shrink-0 border ${
                        isDone 
                          ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/10" 
                          : "bg-amber-500/5 text-amber-500 border-amber-500/10"
                      }`}>
                        {isDone ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-850 dark:text-slate-250 leading-tight">
                          {task.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-550">
                          <span>Assigned To: <span className="text-indigo-500 dark:text-indigo-400 font-black">{getOperatorName(task.assigned_to)}</span></span>
                          <span className="hidden sm:inline">•</span>
                          <span>ID: {String(task.id || task._id || "").slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-tight ${
                        isDone
                          ? "text-emerald-550 bg-emerald-550/5 border border-emerald-550/10"
                          : "text-amber-550 bg-amber-550/5 border border-amber-550/10"
                      }`}>
                        {task.status || "Pending"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalTaskPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/50">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Showing <span className="text-slate-800 dark:text-slate-300">{(Math.min(taskCurrentPage, totalTaskPages || 1) - 1) * tasksPerPage + 1}</span> to{" "}
                <span className="text-slate-800 dark:text-slate-300">
                  {Math.min(Math.min(taskCurrentPage, totalTaskPages || 1) * tasksPerPage, filteredTasks.length)}
                </span>{" "}
                of <span className="text-slate-800 dark:text-slate-300">{filteredTasks.length}</span> tasks
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTaskCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={Math.min(taskCurrentPage, totalTaskPages || 1) === 1}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 dark:disabled:hover:border-slate-800 transition cursor-pointer"
                >
                  Prev
                </button>
                <div className="flex items-center gap-1">
                  {taskPaginationItems.map((item, idx) => {
                    if (item.type === 'ellipsis') {
                      return <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 text-[10px] font-bold">...</span>;
                    }
                    const activePage = Math.min(taskCurrentPage, totalTaskPages || 1);
                    return (
                      <button
                        key={`page-${item.value}`}
                        onClick={() => setTaskCurrentPage(item.value)}
                        className={`w-8 h-8 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                          activePage === item.value
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                            : "bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-500/50"
                        }`}
                      >
                        {item.value}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setTaskCurrentPage(prev => Math.min(prev + 1, totalTaskPages))}
                  disabled={Math.min(taskCurrentPage, totalTaskPages || 1) === totalTaskPages}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 dark:disabled:hover:border-slate-800 transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {tasks.length > 0 && (
            <button
              onClick={() => navigate("/todo")}
              className="mt-4 text-center w-full py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider transition-all"
            >
              Configure and Manage System Tasks ({tasks.length})
            </button>
          )}
        </div>

        {/* CLIENTS SECTION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tight flex items-center gap-2">
                <Building size={20} className="text-blue-500" />
                Clients
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-450 font-medium mt-0.5">Active accounts and client overview</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-4 text-[11px] font-black uppercase tracking-wider">
                <span className="px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20">
                  Total: {clientsData.stats?.total || clientsData.clients?.length || 0}
                </span>
                <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                  Active: {clientsData.stats?.active || 0}
                </span>
              </div>
              <button
                onClick={() => navigate("/clients")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-1.5"
              >
                View All <ChevronRight size={12} />
              </button>
            </div>
          </div>

          {clientsData.clients && clientsData.clients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left font-black uppercase tracking-wider text-slate-400 pb-3 pr-4">#</th>
                    <th className="text-left font-black uppercase tracking-wider text-slate-400 pb-3 pr-4">Client Name</th>
                    <th className="text-left font-black uppercase tracking-wider text-slate-400 pb-3 pr-4">Type</th>
                    <th className="text-left font-black uppercase tracking-wider text-slate-400 pb-3 pr-4">Status</th>
                    <th className="text-left font-black uppercase tracking-wider text-slate-400 pb-3 pr-4">Priority</th>
                    <th className="text-left font-black uppercase tracking-wider text-slate-400 pb-3">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {clientsData.clients.slice(0, 8).map((c, i) => (
                    <tr key={c._id || i} className="hover:bg-slate-50 dark:hover:bg-slate-950/30 transition-colors">
                      <td className="py-3 pr-4 font-black text-slate-400">{i + 1}</td>
                      <td className="py-3 pr-4 font-bold text-slate-800 dark:text-slate-200">{c.name || c.clientName || '—'}</td>
                      <td className="py-3 pr-4 font-bold text-slate-500">{c.clientType || c.type || '—'}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          String(c.status || '').toLowerCase() === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : String(c.status || '').toLowerCase() === 'inactive'
                            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          {c.status || '—'}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          String(c.priority || '').toLowerCase() === 'high'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : String(c.priority || '').toLowerCase() === 'medium'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}>
                          {c.priority || '—'}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-slate-500">{c.email || c.contactEmail || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No clients registered yet</p>
            </div>
          )}
        </div>

        {/* PROJECTS SECTION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tight flex items-center gap-2">
                <FolderKanban size={20} className="text-purple-500" />
                Projects
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-450 font-medium mt-0.5">Ongoing and completed project tracker</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-4 text-[11px] font-black uppercase tracking-wider">
                <span className="px-3 py-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-500/20">
                  Total: {projectsData.stats?.total || projectsData.projects?.length || 0}
                </span>
                <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                  Completed: {projectsData.stats?.completed || 0}
                </span>
              </div>
              <button
                onClick={() => navigate("/projects")}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-500/20 active:scale-95 flex items-center gap-1.5"
              >
                View All <ChevronRight size={12} />
              </button>
            </div>
          </div>

          {projectsData.projects && projectsData.projects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left font-black uppercase tracking-wider text-slate-400 pb-3 pr-4">#</th>
                    <th className="text-left font-black uppercase tracking-wider text-slate-400 pb-3 pr-4">Project Name</th>
                    <th className="text-left font-black uppercase tracking-wider text-slate-400 pb-3 pr-4">Stage</th>
                    <th className="text-left font-black uppercase tracking-wider text-slate-400 pb-3 pr-4">Status</th>
                    <th className="text-left font-black uppercase tracking-wider text-slate-400 pb-3 pr-4">Priority</th>
                    <th className="text-left font-black uppercase tracking-wider text-slate-400 pb-3">Client</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {projectsData.projects.slice(0, 8).map((p, i) => (
                    <tr key={p._id || i} className="hover:bg-slate-50 dark:hover:bg-slate-950/30 transition-colors">
                      <td className="py-3 pr-4 font-black text-slate-400">{i + 1}</td>
                      <td className="py-3 pr-4 font-bold text-slate-800 dark:text-slate-200">{p.name || p.projectName || '—'}</td>
                      <td className="py-3 pr-4 font-bold text-slate-500">{p.stage || p.currentStage || '—'}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          String(p.status || '').toLowerCase() === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : String(p.status || '').toLowerCase() === 'on-hold'
                            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                            : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {p.status || '—'}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          String(p.priority || '').toLowerCase() === 'high'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : String(p.priority || '').toLowerCase() === 'medium'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}>
                          {p.priority || '—'}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-slate-500">{p.clientId?.name || p.client?.name || p.clientName || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No projects registered yet</p>
            </div>
          )}
        </div>

        {/* CLIENT LEADS SECTION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tight flex items-center gap-2">
                <Briefcase size={20} className="text-amber-500" />
                Client Leads
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-450 font-medium mt-0.5">Latest incoming client lead pipeline</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20 text-[11px] font-black uppercase tracking-wider">
                Showing: {Math.min(clientLeadsData.length, 10)} leads
              </span>
              <button
                onClick={() => navigate("/client-leads")}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center gap-1.5"
              >
                View All <ChevronRight size={12} />
              </button>
            </div>
          </div>

          {clientLeadsData && clientLeadsData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left font-black uppercase tracking-wider text-slate-400 pb-3 pr-4">#</th>
                    <th className="text-left font-black uppercase tracking-wider text-slate-400 pb-3 pr-4">Lead Name</th>
                    <th className="text-left font-black uppercase tracking-wider text-slate-400 pb-3 pr-4">Company</th>
                    <th className="text-left font-black uppercase tracking-wider text-slate-400 pb-3 pr-4">Status</th>
                    <th className="text-left font-black uppercase tracking-wider text-slate-400 pb-3 pr-4">Priority</th>
                    <th className="text-left font-black uppercase tracking-wider text-slate-400 pb-3">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {clientLeadsData.slice(0, 10).map((l, i) => (
                    <tr key={l._id || i} className="hover:bg-slate-50 dark:hover:bg-slate-950/30 transition-colors">
                      <td className="py-3 pr-4 font-black text-slate-400">{i + 1}</td>
                      <td className="py-3 pr-4 font-bold text-slate-800 dark:text-slate-200">{l.leadName || l.name || '—'}</td>
                      <td className="py-3 pr-4 font-bold text-slate-500">{l.companyName || '—'}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          String(l.status || '').toLowerCase() === 'converted'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : String(l.status || '').toLowerCase() === 'lost'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : String(l.status || '').toLowerCase() === 'new'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {l.status || '—'}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          String(l.priority || '').toLowerCase() === 'high'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : String(l.priority || '').toLowerCase() === 'medium'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}>
                          {l.priority || '—'}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-slate-500">{l.phone || l.email || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No client leads registered yet</p>
            </div>
          )}
        </div>

      </motion.div>
    );
  };

  // ----------------------------------------------------
  // RENDER OPERATOR VIEW
  // ----------------------------------------------------
  const renderOperatorView = () => {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-20 pt-6 max-w-7xl mx-auto px-4">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-lg rounded-full" />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Operator Profile</p>
              <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tighter">{user?.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Shift start block */}
            <div
              onClick={() => navigate("/attendance")}
              className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-[2rem] flex items-center gap-4 hover:border-indigo-500/30 dark:hover:border-indigo-500/50 transition-all shadow-sm"
            >
              <div className="p-3 bg-white-500/10 dark:bg-indigo-100/20 rounded-xl text-indigo-500 dark:text-indigo-400"><Timer size={20} /></div>
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Shift Start</p>
                <p className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase">
                  {attendanceRecord?.check_in_time
                    ? parseAsUTC(attendanceRecord.check_in_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })
                    : 'OFFLINE'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard label="Success Rate" value={`${operatorMetrics.rate}%`} icon={Activity} color="text-indigo-600 dark:text-indigo-400" borderColor="bg-indigo-600" bgColor="bg-indigo-50 dark:bg-indigo-950/20" />
          <StatCard label="Live Work Hours" value={`${liveWorkingHours}h`} icon={Clock} color="text-lime-600 dark:text-lime-400" borderColor="bg-lime-500" bgColor="bg-lime-50 dark:bg-lime-950/20" />
          <StatCard label="Pending Tasks" value={operatorMetrics.pending} icon={Target} color="text-amber-600 dark:text-amber-400" borderColor="bg-amber-500" bgColor="bg-amber-50 dark:bg-amber-950/20" />
          <StatCard label="Completed" value={operatorMetrics.completed} icon={ListChecks} color="text-indigo-600 dark:text-indigo-400" borderColor="bg-indigo-500" bgColor="bg-indigo-50 dark:bg-indigo-950/20" />
        </div>

        {/* MISSIONS SECTION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tight">
                Personal <span className="text-indigo-500">Missions</span>
              </h2>
            </div>

            <button
              onClick={() => navigate("/todo")}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2"
            >
              Full Board <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {myTasks.filter(t => t.status === 'pending').length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                  No pending tasks found for operator
                </p>
              </div>
            ) : (
              myTasks
                .filter(t => t.status === 'pending')
                .slice(0, 5)
                .map((task) => (
                  <div
                    key={task.id}
                    className="group p-5 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/50 rounded-2xl flex items-center justify-between hover:border-indigo-500/20 dark:hover:border-indigo-500/50 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-1 h-6 bg-indigo-500/40 rounded-full" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{task.title}</h4>
                        <p className="text-[9px] text-slate-555 dark:text-slate-450 font-bold uppercase tracking-tighter mt-0.5">ID: {task.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[9px] font-black text-orange-500 bg-orange-500/5 border border-orange-500/10 px-3 py-1 rounded-lg uppercase tracking-tighter">
                        Pending
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-5"
      >
        <div className="relative">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <LayoutDashboard size={40} className="text-indigo-500" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-lime-400 border-2 border-white dark:border-slate-950 animate-bounce" />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="text-indigo-400 animate-spin" />
          <p className="text-[11px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">
            Loading Admin Dashboard
          </p>
        </div>
      </motion.div>
    </div>
  );

  return isAdmin ? renderAdminView() : renderOperatorView();
};

const StatCard = ({ label, value, icon: Icon, color, borderColor, bgColor, trend, subtext }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/50 p-6 rounded-[2rem] relative overflow-hidden group shadow-sm hover:shadow-md transition-all hover:border-slate-350 dark:hover:border-slate-700">
    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${borderColor}`} />

    <div className="flex justify-between items-start">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-555 dark:text-slate-455 uppercase tracking-[0.15em] mb-1">{label}</p>
        <h3 className={`text-3xl font-black italic tracking-tight ${color}`}>{value}</h3>
        {trend !== undefined && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`flex items-center text-[9px] font-black px-1.5 py-0.5 rounded ${
              trend >= 0 
                ? "text-emerald-500 bg-emerald-500/5 border border-emerald-500/10" 
                : "text-rose-500 bg-rose-500/5 border border-rose-500/10"
            }`}>
              {trend >= 0 ? <ArrowUpRight size={10} className="mr-0.5" /> : <ArrowDownRight size={10} className="mr-0.5" />}
              {Math.abs(trend)}%
            </span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">VS 24H AGO</span>
          </div>
        )}
        {subtext && (
          <p className="text-[9px] text-slate-400 dark:text-slate-450 font-bold uppercase tracking-wide">
            {subtext}
          </p>
        )}
      </div>
      <div className={`p-3.5 rounded-2xl ${bgColor} ${color} border border-slate-100 dark:border-slate-800/60 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
        <Icon size={20} />
      </div>
    </div>
  </div>
);

const ActionCard = ({ title, desc, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    className="group p-5 bg-slate-50/50 hover:bg-white dark:bg-slate-950/20 dark:hover:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-2xl flex flex-col text-left transition-all active:scale-95 shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-bl-full group-hover:bg-indigo-500/10 transition-all" />
    <div className="p-3 bg-indigo-500/5 dark:bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
      <Icon size={18} className="text-white" />
    </div>
    <div className="flex items-center gap-1">
      <h3 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-tight group-hover:text-indigo-500 transition-colors">
        {title}
      </h3>
      <ArrowUpRight size={12} className="text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
    </div>
    <p className="text-[9px] text-slate-550 dark:text-slate-455 font-medium uppercase mt-0.5 leading-tight">
      {desc}
    </p>
  </button>
);

export default Dashboard;