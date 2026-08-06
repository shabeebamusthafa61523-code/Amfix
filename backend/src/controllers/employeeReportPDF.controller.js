import https from 'https';
import http from 'http';
import EmployeeReports from '../models/employeeReports.model.js';
import User from '../models/user.model.js';
import DeveloperReport from '../models/developerReport.model.js';
import GraphicDesignerReport from '../models/graphicDesignerReport.model.js';
import HodRdReport from '../models/hodRdReport.model.js';
import HrReport from '../models/hrReport.model.js';
import MarketingReport from '../models/marketingReport.model.js';
import OpsReport from '../models/opsReport.model.js';
import VideographerReport from '../models/videographerReport.model.js';
import AcademicCounselorReport from '../models/academicCounselorReport.model.js';
import AccountantReport from '../models/accountantReport.model.js';
import { generateReportPDFBuffer } from '../utils/pdfGenerator.js';
import { v2 as cloudinary } from 'cloudinary';
import { sendSuccess, sendError } from '../utils/response.helper.js';

// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper: Upload PDF buffer to Cloudinary
// Uses chunked upload for large files (> 9MB) to bypass the 10MB single-request limit
const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks
const LARGE_FILE_THRESHOLD = 9 * 1024 * 1024; // 9MB threshold

const uploadToCloudinary = (fileBuffer, userId, filenameKey) => {
  const uploadOptions = {
    folder: `admin-reports/employee_${userId}`,
    public_id: `report_${filenameKey}`,
    resource_type: 'raw', // Critical for PDF uploads
    format: 'pdf',
    overwrite: true
  };

  return new Promise((resolve, reject) => {
    // Use chunked upload for large files to avoid the 10MB Cloudinary limit
    if (fileBuffer.length > LARGE_FILE_THRESHOLD) {
      console.log(`[Cloudinary] Large file detected (${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB) - using chunked upload`);
      const stream = cloudinary.uploader.upload_chunked_stream(
        { ...uploadOptions, chunk_size: CHUNK_SIZE },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(fileBuffer);
    } else {
      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(fileBuffer);
    }
  });
};

// Helper: Check if logged-in user is authorized to access a target user's reports
const isAuthorizedToAccessUser = async (reqUser, targetUserId) => {
  if (!reqUser) return false;
  
  const loggedInUserId = reqUser.id || reqUser._id;
  const loggedInUserRole = String(reqUser.role || reqUser.role_id || '').toLowerCase().trim();
  
  let isNonOperational = false;
  if (loggedInUserId) {
    const currentUserObj = await User.findById(loggedInUserId).populate('departmentId', 'name');
    const deptName = currentUserObj?.departmentId?.name || currentUserObj?.department || '';
    isNonOperational = String(deptName).toLowerCase().trim() === 'non-operational';
  }

  const isPrivileged = ['1', 'admin', 'hr', 'superadmin'].includes(loggedInUserRole) || isNonOperational;

  // Privileged roles can see everything
  if (isPrivileged) return true;

  // Users can see their own reports
  if (loggedInUserId && String(loggedInUserId) === String(targetUserId)) return true;

  if (loggedInUserId) {
    // Check if the logged-in user is a Team Lead or Manager of the target user's department
    const Department = (await import('../modules/departments/department.model.js')).default;
    const UserDepartment = (await import('../models/userDepartment.model.js')).default;

    const currentUserObj = await User.findById(loggedInUserId).select('departmentId department designation');
    const designationName = String(currentUserObj?.designation || '').toLowerCase();
    let userDeptId = reqUser.departmentId || currentUserObj?.departmentId;
    let userDeptName = currentUserObj?.department;

    const isRoleBasedTeamLead = (
      loggedInUserRole.includes('manager') ||
      loggedInUserRole.includes('lead') ||
      loggedInUserRole.includes('hod') ||
      designationName.includes('manager') ||
      designationName.includes('lead') ||
      designationName.includes('hod') ||
      loggedInUserRole === '2'
    );

    const ledDepartments = await Department.find({ managerId: loggedInUserId }).select('_id name');
    let deptIds = ledDepartments.map(d => d._id);
    let deptNames = ledDepartments.map(d => d.name).filter(Boolean);

    if (isRoleBasedTeamLead && deptIds.length === 0) {
       if (userDeptId) {
         deptIds.push(userDeptId);
         try {
           const fallbackDept = await Department.findById(userDeptId).select('name');
           if (fallbackDept && fallbackDept.name) {
             deptNames.push(fallbackDept.name);
           }
         } catch (err) {}
       }
       if (userDeptName) {
         deptNames.push(userDeptName);
       }
    }

    if (deptIds.length > 0 || deptNames.length > 0) {
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) return false;

      const ledDeptIdsStr = deptIds.map(d => String(d));
      
      // Direct departmentId match
      if (targetUser.departmentId && ledDeptIdsStr.includes(String(targetUser.departmentId))) {
        return true;
      }
      
      // Department string match
      if (targetUser.department && deptNames.includes(targetUser.department)) {
        return true;
      }

      // UserDepartment mapping check
      const userDeptMapping = await UserDepartment.findOne({
        userId: targetUserId,
        departmentId: { $in: deptIds }
      });
      if (userDeptMapping) return true;
    }
  }

  return false;
};

// Helper: Map report type slug to Mongoose model
const getReportModel = (type) => {
  const normalized = String(type || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  switch (normalized) {
    case 'developer':
      return DeveloperReport;
    case 'graphicdesigner':
      return GraphicDesignerReport;
    case 'hodrd':
    case 'hodrnd':
      return HodRdReport;
    case 'hr':
      return HrReport;
    case 'marketing':
      return MarketingReport;
    case 'ops':
      return OpsReport;
    case 'videographer':
      return VideographerReport;
    case 'academiccounselor':
      return AcademicCounselorReport;
    case 'accountant':
      return AccountantReport;
    default:
      return null;
  }
};

export const employeeReportPDFController = {
  /**
   * 1. Generate Daily PDF on the server, upload to Cloudinary,
   * and serve back to browser as downloadable attachment.
   */
  async generatePDFReport(req, res, next) {
    try {
      const { userId, dateString, reportType } = req.query;

      if (!userId || !dateString) {
        return res.status(400).json({
          success: false,
          message: 'userId and dateString are required query parameters'
        });
      }

      // Check authorization
      const isAuthorized = await isAuthorizedToAccessUser(req.user, userId);
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to view this report.'
        });
      }

      // Fetch the employee details
      const employee = await User.findById(userId).populate('designationId');
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Determine the report model dynamically
      let finalReportType = reportType;
      if (!finalReportType) {
        const desig = (employee.designation || employee.designationId?.name || '').toLowerCase();
        if (desig.includes('developer')) finalReportType = 'developer';
        else if (desig.includes('graphic')) finalReportType = 'graphicdesigner';
        else if (desig.includes('hod') || desig.includes('r&d')) finalReportType = 'hodrd';
        else if (desig.includes('hr')) finalReportType = 'hr';
        else if (desig.includes('marketing')) finalReportType = 'marketing';
        else if (desig.includes('ops') || desig.includes('operations')) finalReportType = 'ops';
        else if (desig.includes('video')) finalReportType = 'videographer';
        else if (desig.includes('counselor')) finalReportType = 'academiccounselor';
        else if (desig.includes('accountant')) finalReportType = 'accountant';
      }

      const ReportModel = getReportModel(finalReportType);
      if (!ReportModel) {
        return res.status(400).json({
          success: false,
          message: `Unable to map report type '${finalReportType || 'unknown'}' to a daily report template.`
        });
      }

      // Query the daily report document
      const report = await ReportModel.findOne({ userId, dateString });
      if (!report) {
        return res.status(404).json({
          success: false,
          message: `Daily report not found for employee on date ${dateString}.`
        });
      }

      const designationName = employee.designation || employee.designationId?.name || finalReportType;

      // Generate the PDF using pdfkit utility
      const pdfBuffer = await generateReportPDFBuffer(report, employee.name, designationName);

      const cleanFilename = `${finalReportType || 'Report'}_Daily_${employee.name.replace(/[^a-zA-Z0-9]/g, '_')}_${dateString}.pdf`;

      // Upload the PDF to Cloudinary dynamically using employee ID folder
      // Wrap in a try-catch block so network/Cloudinary failures don't block the download
      let uploadResult = null;
      try {
        uploadResult = await uploadToCloudinary(pdfBuffer, userId, `${dateString}_daily`);
      } catch (uploadError) {
        console.error('Error uploading PDF to Cloudinary (ignoring to allow local download):', uploadError.message);
      }

      if (uploadResult) {
        // Save or update the record in EmployeeReports model
        await EmployeeReports.findOneAndUpdate(
          { employee_id: userId, report_date: dateString, report_period: 'daily' },
          {
            pdf_url: uploadResult.secure_url,
            pdf_public_id: uploadResult.public_id,
            filename: cleanFilename,
            employee_id: userId,
            report_date: dateString,
            report_type: finalReportType || 'daily',
            report_period: 'daily',
            created_at: new Date()
          },
          { upsert: true, new: true }
        );
      }

      // Serve the PDF back to the browser as a downloadable attachment
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.end(pdfBuffer);
    } catch (error) {
      console.error('Error in generatePDFReport:', error.message);
      next(error);
    }
  },

  /**
   * 2. Upload compiled PDF report (for weekly/monthly) to Cloudinary and register in database
   */
  async uploadPDFReport(req, res, next) {
    try {
      const { userId, reportDate, reportType, reportPeriod } = req.body;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'PDF file is required'
        });
      }

      if (!userId || !reportDate || !reportType || !reportPeriod) {
        return res.status(400).json({
          success: false,
          message: 'userId, reportDate, reportType, and reportPeriod are required fields'
        });
      }

      // Generate filename based on details
      const cleanFilename = `${reportType}_${reportPeriod}_${reportDate}.pdf`;

      // Upload to Cloudinary under the employee folder
      const uploadResult = await uploadToCloudinary(req.file.buffer, userId, `${reportDate.replace(/[^a-zA-Z0-9_-]/g, '_')}_${reportPeriod}`);

      // Save to database
      const reportRecord = await EmployeeReports.findOneAndUpdate(
        { employee_id: userId, report_date: reportDate, report_period: reportPeriod },
        {
          pdf_url: uploadResult.secure_url,
          pdf_public_id: uploadResult.public_id,
          filename: req.file.originalname || cleanFilename,
          employee_id: userId,
          report_date: reportDate,
          report_type: reportType,
          report_period: reportPeriod,
          created_at: new Date()
        },
        { upsert: true, new: true }
      );

      return sendSuccess(res, 'PDF Report uploaded successfully', reportRecord, 201);
    } catch (error) {
      console.error('Error in uploadPDFReport:', error.message);
      next(error);
    }
  },

  /**
   * 3. Get all PDF reports uploaded for a user with sorting by date (newest/oldest)
   */
  async getPDFReportsByUser(req, res, next) {
    try {
      const { userId, sort } = req.query;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId is required query parameter'
        });
      }

      // Check authorization
      const isAuthorized = await isAuthorizedToAccessUser(req.user, userId);
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to view these reports.'
        });
      }

      // Determine sort order: descending (newest first) by default
      const sortOrder = sort === 'oldest' ? 1 : -1;

      const list = await EmployeeReports.find({ employee_id: userId })
        .sort({ report_date: sortOrder, created_at: sortOrder });

      return sendSuccess(res, 'PDF Reports retrieved successfully', list, 200);
    } catch (error) {
      console.error('Error in getPDFReportsByUser:', error.message);
      next(error);
    }
  },

  /**
   * 4. Stream a saved PDF report (weekly/monthly/daily) from Cloudinary by its DB record _id.
   *    Uses cloudinary.utils.private_download_url to generate a signed URL so that
   *    Cloudinary's raw-delivery auth is satisfied (plain URLs return 401 for raw resources).
   */
  async streamSavedPDFReport(req, res, next) {
    try {
      const { reportId } = req.params;

      if (!reportId) {
        return res.status(400).json({ success: false, message: 'reportId is required' });
      }

      const record = await EmployeeReports.findById(reportId);
      if (!record) {
        return res.status(404).json({ success: false, message: 'Report not found in database' });
      }

      // Check authorization
      const isAuthorized = await isAuthorizedToAccessUser(req.user, record.employee_id);
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to stream this report.'
        });
      }

      if (!record.pdf_public_id && !record.pdf_url) {
        return res.status(404).json({ success: false, message: 'No PDF file stored for this report' });
      }

      // Build an authenticated signed download URL using the Cloudinary SDK.
      // This avoids the 401 that plain URLs get for resource_type:'raw' files.
      let fetchUrl;
      if (record.pdf_public_id) {
        fetchUrl = cloudinary.utils.private_download_url(
          record.pdf_public_id,
          'pdf',
          { resource_type: 'raw', type: 'upload' }   // must match how it was uploaded
        );
      } else {
        fetchUrl = record.pdf_url;
      }

      const filename = record.filename || 'report.pdf';

      // Helper: fetch URL with redirect-following (Cloudinary signed URLs can redirect)
      const fetchAndPipe = (url, redirectsLeft) => {
        const mod   = url.startsWith('https') ? https : http;

        mod.get(url, (cloudRes) => {
          const { statusCode, headers } = cloudRes;

          // Follow redirects
          if ([301, 302, 303, 307, 308].includes(statusCode) && headers.location && redirectsLeft > 0) {
            cloudRes.resume(); // drain body so socket is freed
            return fetchAndPipe(headers.location, redirectsLeft - 1);
          }

          if (statusCode !== 200) {
            console.error(`[stream] Cloudinary returned ${statusCode} for ${url}`);
            if (!res.headersSent) {
              res.status(502).json({ success: false, message: `Storage returned status ${statusCode}` });
            }
            return;
          }

          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          if (headers['content-length']) res.setHeader('Content-Length', headers['content-length']);
          cloudRes.pipe(res);
        }).on('error', (err) => {
          console.error('[stream] Error fetching from Cloudinary:', err.message);
          if (!res.headersSent) {
            res.status(502).json({ success: false, message: 'Failed to stream PDF from storage' });
          }
        });
      };

      fetchAndPipe(fetchUrl, 5);

    } catch (error) {
      console.error('Error in streamSavedPDFReport:', error.message);
      if (!res.headersSent) next(error);
    }
  }
};
