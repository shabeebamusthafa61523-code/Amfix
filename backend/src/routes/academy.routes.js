import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import courseController from '../controllers/course.controller.js';
import batchController from '../controllers/batch.controller.js';

const router = Router();

// Protect all Academy Module 4.2 endpoints
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

export default router;
