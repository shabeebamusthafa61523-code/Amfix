import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Route Imports
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import attendanceRoutes from './src/routes/attendance.routes.js';
import taskRoutes from './src/routes/task.routes.js';
import studentRoutes from './src/routes/student.routes.js';
import crmRoutes from './src/routes/index.js';
import apiRoutes from './src/routes/api.js';
import aiRoutes from './src/routes/ai.routes.js';
import mdDashboardRoutes from './src/routes/mdDashboard.routes.js';
import accountRoutes from './src/routes/account.routes.js';
import Designation from './src/models/designation.model.js';
import Department from './src/modules/departments/department.model.js';
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['https://crm-test.vercel.app', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    // Support wildcard '*' in ALLOWED_ORIGINS env
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Dynamically allow common hosting platforms (Vercel, Netlify, Render) and localhost variants
    const isAllowedDynamic =
      /\.vercel\.app$/.test(origin) ||
      /\.netlify\.app$/.test(origin) ||
      /\.onrender\.com$/.test(origin) ||
      /^http:\/\/localhost(:\d+)?$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);

    if (isAllowedDynamic) {
      return callback(null, true);
    }

    console.log(`❌ Blocked CORS request from: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.options('*', cors());

// 2. Parsers Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Specific/Dedicated API Routers
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes); 
app.use('/api/user', userRoutes); 
app.use('/api/tasks', taskRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/md-dashboard', mdDashboardRoutes);
app.use('/api/md-dashboard', mdDashboardRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/accounts', accountRoutes);

// 4. Broad, Versioned, & Catch-all Fallbacks (Broadest matching paths go lower)
app.use('/api/v1', crmRoutes);
app.use('/api', studentRoutes); 
app.use('/api', apiRoutes);      // Legacy base fallback route handler

// Welcome / Root Health Check Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: "CRM Backend Server is running successfully."
  });
});

// 5. Global 404 Route Catch-All
// Prevents missing endpoints from crashing headers or responding with standard Express HTML
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route Not Found: ${req.method} ${req.originalUrl}`
  });
});

import logger from './src/utils/logger.util.js';

// 6. Global 500 Error Catch-All
// Intercepts unhandled synchronous crashes, preserving correct headers and standard JSON feedback
app.use((err, req, res, next) => {
  console.error('🚨 Global Server Exception Error:', err.message);
  if (logger && typeof logger.error === 'function') {
    logger.error('Global Server Exception Error', { errorStack: err.stack, message: err.message });
  }

  // Handle Multer file size errors specifically
  if (err.code === 'LIMIT_FILE_SIZE' || (err.name === 'MulterError' && err.message === 'File too large')) {
    return res.status(413).json({
      success: false,
      message: `File too large. Maximum allowed size is 50MB. Please reduce the file size and try again.`
    });
  }

  const statusCode = (typeof err.statusCode === 'number' && err.statusCode >= 100 && err.statusCode < 600)
    ? err.statusCode
    : ((typeof err.status === 'number' && err.status >= 100 && err.status < 600) ? err.status : 500);

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error Fallback',
    message: err.message || 'Internal Server Error Fallback'
  });
});

// 7. Database Connection Section
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student_attendance_db';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log(' ✅ Successfully connected to MongoDB.');
    try {
      const count = await Designation.countDocuments();
      if (count === 0) {
        const defaultDesignations = [
          "HR Manager",
          "Graphic Designer",
          "Digital Marketer",
          "React Developer",
          "Node Developer",
          "Flutter Developer",
          "Fullstack",
          "Admin",
          "Manager"
        ];
        await Designation.insertMany(defaultDesignations.map(name => ({ name, isActive: true })));
        console.log(' 🌱 Successfully seeded default designations.');
      }
    } catch (seedErr) {
      console.error(' ❌ Failed to seed default designations:', seedErr.message);
    }

    try {
      const deptCount = await Department.countDocuments();
      if (deptCount === 0) {
        const defaultDepartments = [
          { name: "HR & Admin", code: "HR" },
          { name: "Marketing", code: "MKT" },
          { name: "Development", code: "DEV" },
          { name: "Designing", code: "DSN" }
        ];
        await Department.insertMany(defaultDepartments.map(d => ({ 
          name: d.name, 
          code: d.code, 
          status: true 
        })));
        console.log(' 🌱 Successfully seeded default departments.');
      }
    } catch (seedErr) {
      console.error(' ❌ Failed to seed default departments:', seedErr.message);
    }
  })
  .catch((error) => {
    console.error(' ❌ CRITICAL DATABASE CONNECTION ERROR:', error.message);
    process.exit(1); 
  });

export default app;
