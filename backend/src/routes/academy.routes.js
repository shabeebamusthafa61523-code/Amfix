import { Router } from 'express';
import protectRoute, { requireAdminOrStaff } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';
import courseController from '../controllers/course.controller.js';
import batchController from '../controllers/batch.controller.js';
import enrollmentController from '../controllers/enrollment.controller.js';
import lmsController from '../controllers/lms.controller.js';

const router = Router();

// Protect all Academy Module endpoints
router.use(protectRoute);

// Eligible Instructors List
router.get('/instructors', courseController.getEligibleInstructors);

// Course Management Routes (Module 4.2)
router.get('/courses', courseController.getCourses);
router.post('/courses', requireAdminOrStaff, courseController.createCourse);
router.get('/courses/:id', courseController.getCourseById);
router.put('/courses/:id', requireAdminOrStaff, courseController.updateCourse);
router.patch('/courses/:id', requireAdminOrStaff, courseController.updateCourse);
router.post('/courses/:id/archive', requireAdminOrStaff, courseController.archiveCourse);
router.post('/courses/:id/activate', requireAdminOrStaff, courseController.activateCourse);
router.put('/courses/:id/syllabus', requireAdminOrStaff, courseController.updateSyllabus);

// Batch Management Routes (Module 4.2)
router.get('/batches', batchController.getBatches);
router.post('/batches', requireAdminOrStaff, batchController.createBatch);
router.get('/batches/:id', batchController.getBatchById);
router.put('/batches/:id', requireAdminOrStaff, batchController.updateBatch);
router.patch('/batches/:id', requireAdminOrStaff, batchController.updateBatch);
router.patch('/batches/:id/students', requireAdminOrStaff, batchController.addStudentsToBatch);
router.delete('/batches/:id/students/:studentId', requireAdminOrStaff, batchController.removeStudentFromBatch);
router.post('/batches/:id/cancel', requireAdminOrStaff, batchController.cancelBatch);

// Enrollment & Progress Tracking Routes (Module 4.3)
router.get('/enrollments', enrollmentController.getEnrollments);
router.post('/enrollments', requireAdminOrStaff, enrollmentController.createEnrollment);
router.get('/enrollments/:id', enrollmentController.getEnrollmentById);
router.patch('/enrollments/:id/progress', requireAdminOrStaff, enrollmentController.updateProgress);
router.patch('/enrollments/:id/status', requireAdminOrStaff, enrollmentController.updateStatus);

// ============================================================
// LMS LEARNING MANAGEMENT SYSTEM ROUTES (Module 4.4)
// ============================================================

// Student Enrolled Courses Catalog
router.get('/student/enrolled-courses', lmsController.getStudentEnrolledCourses);

// Course LMS Content Delivery
router.get('/courses/:courseId/lms-content', lmsController.getCourseLmsContent);

// Lesson Management
router.post('/courses/:courseId/lessons', requireAdminOrStaff, lmsController.createLesson);
router.patch('/lessons/:lessonId', requireAdminOrStaff, lmsController.updateLesson);
router.delete('/lessons/:lessonId', requireAdminOrStaff, lmsController.deleteLesson);
router.post('/lessons/:lessonId/complete', lmsController.completeLesson);

// Assignment Management
router.post('/courses/:courseId/assignments', requireAdminOrStaff, lmsController.createAssignment);
router.patch('/assignments/:assignmentId', requireAdminOrStaff, lmsController.updateAssignment);
router.delete('/assignments/:assignmentId', requireAdminOrStaff, lmsController.deleteAssignment);
router.get('/assignments/:assignmentId/submissions', requireAdminOrStaff, lmsController.getAssignmentSubmissions);
router.post('/assignments/:assignmentId/submit', lmsController.submitAssignment);
router.patch('/submissions/:submissionId/grade', requireAdminOrStaff, lmsController.gradeSubmission);

// LMS Upload Service Endpoint
router.post('/lms/upload', requireAdminOrStaff, upload.single('file'), lmsController.uploadLmsFile);

export default router;
