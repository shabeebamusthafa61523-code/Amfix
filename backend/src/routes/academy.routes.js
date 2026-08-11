import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import courseController from '../controllers/course.controller.js';
import batchController from '../controllers/batch.controller.js';
import enrollmentController from '../controllers/enrollment.controller.js';

const router = Router();

// Protect all Academy Module endpoints
router.use(protectRoute);

// Eligible Instructors List
router.get('/instructors', courseController.getEligibleInstructors);

// Course Management Routes
router.get('/courses', courseController.getCourses);
router.post('/courses', courseController.createCourse);
router.get('/courses/:id', courseController.getCourseById);
router.put('/courses/:id', courseController.updateCourse);
router.patch('/courses/:id', courseController.updateCourse);
router.post('/courses/:id/archive', courseController.archiveCourse);
router.post('/courses/:id/activate', courseController.activateCourse);
router.put('/courses/:id/syllabus', courseController.updateSyllabus);

// Batch Management Routes
router.get('/batches', batchController.getBatches);
router.post('/batches', batchController.createBatch);
router.get('/batches/:id', batchController.getBatchById);
router.put('/batches/:id', batchController.updateBatch);
router.patch('/batches/:id', batchController.updateBatch);
router.patch('/batches/:id/students', batchController.addStudentsToBatch);
router.delete('/batches/:id/students/:studentId', batchController.removeStudentFromBatch);
router.post('/batches/:id/cancel', batchController.cancelBatch);

// Enrollment & Progress Tracking Routes (Module 4.3)
router.get('/enrollments', enrollmentController.getEnrollments);
router.post('/enrollments', enrollmentController.createEnrollment);
router.get('/enrollments/:id', enrollmentController.getEnrollmentById);
router.patch('/enrollments/:id/progress', enrollmentController.updateProgress);
router.patch('/enrollments/:id/status', enrollmentController.updateStatus);

export default router;
