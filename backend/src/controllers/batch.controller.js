import mongoose from 'mongoose';
import Batch from '../models/batch.model.js';
import Course from '../models/course.model.js';
import User from '../models/user.model.js';
import Counter from '../models/counter.model.js';
import { AppError } from '../middleware/errorHandler.js';
import { recordAudit } from '../middleware/audit.middleware.js';

const generateBatchCode = async () => {
  const year = new Date().getFullYear();
  const counterId = `batch_${year}`;
  const counter = await Counter.findOneAndUpdate(
    { id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const sequenceStr = String(counter.seq).padStart(6, '0');
  return `BTC-${year}-${sequenceStr}`;
};

/**
 * Validate that student IDs belong to registered students in the CRM
 */
const validateRegisteredStudents = async (studentIds = []) => {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return [];
  }

  // De-duplicate & clean incoming student IDs
  const rawUnique = [...new Set(studentIds.map(id => String(id).trim()).filter(Boolean))];

  // Validate ObjectId format for every item
  const validObjectIds = [];
  for (const id of rawUnique) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Student ID '${id}' is not a valid ObjectId.`, 400);
    }
    validObjectIds.push(id);
  }

  // Query User collection for registered student accounts
  const registeredStudents = await User.find({
    _id: { $in: validObjectIds },
    $or: [
      { role_id: "10" },
      { role: "student" },
      { studentId: { $exists: true, $ne: null } }
    ]
  }).select('_id name email phone studentId profile_image').lean();

  if (registeredStudents.length !== validObjectIds.length) {
    const validMap = new Set(registeredStudents.map(s => String(s._id)));
    const invalidId = validObjectIds.find(id => !validMap.has(id));
    throw new AppError(`User ID '${invalidId}' is not a registered student in the Student Attendance registry.`, 400);
  }

  return validObjectIds;
};

export const batchController = {

  /**
   * GET /api/v1/academy/batches
   */
  getBatches: async (req, res, next) => {
    try {
      const { search, courseId, status, page = 1, limit = 50 } = req.query;
      const query = {};

      if (search) {
        query.$or = [
          { batchName: { $regex: search, $options: 'i' } },
          { batchCode: { $regex: search, $options: 'i' } }
        ];
      }

      if (courseId && courseId !== 'ALL') {
        if (mongoose.Types.ObjectId.isValid(courseId)) {
          query.courseId = courseId;
        }
      }

      if (status && status !== 'ALL') {
        query.status = status;
      }

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 50;
      const skip = (pageNum - 1) * limitNum;

      const [batches, total] = await Promise.all([
        Batch.find(query)
          .populate('courseId', 'courseName courseCode category durationValue durationUnit')
          .populate('students', 'name email phone studentId profile_image coursePreference status')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Batch.countDocuments(query)
      ]);

      const formattedBatches = batches.map(b => ({
        ...b,
        studentCount: Array.isArray(b.students) ? b.students.length : 0
      }));

      return res.status(200).json({
        success: true,
        data: formattedBatches,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum) || 1
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/academy/batches/:id
   */
  getBatchById: async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError('Invalid batch ID format provided.', 400);
      }

      const batch = await Batch.findById(id)
        .populate('courseId')
        .populate('students', 'name email phone studentId profile_image coursePreference status qualification institution')
        .lean();

      if (!batch) {
        throw new AppError('Batch record not found.', 404);
      }

      return res.status(200).json({
        success: true,
        data: {
          ...batch,
          studentCount: Array.isArray(batch.students) ? batch.students.length : 0
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/academy/batches
   */
  createBatch: async (req, res, next) => {
    try {
      const {
        batchCode,
        batchName,
        name,
        courseId,
        course,
        students = [],
        studentIds = [],
        status,
        startDate,
        endDate,
        daysOfWeek,
        startTime,
        endTime,
        timezone,
        capacity,
        instructorId
      } = req.body;

      const finalBatchName = (batchName || name || '').trim();
      const finalCourseId = courseId || course;
      const rawStudents = Array.isArray(students) && students.length > 0 
        ? students 
        : (Array.isArray(studentIds) ? studentIds : []);

      if (!finalBatchName) {
        throw new AppError('Batch name is required.', 400);
      }

      if (!finalCourseId) {
        throw new AppError('Associated course selection is required.', 400);
      }

      if (!mongoose.Types.ObjectId.isValid(finalCourseId)) {
        throw new AppError('Invalid course ID format provided.', 400);
      }

      const courseExists = await Course.findById(finalCourseId);
      if (!courseExists) {
        throw new AppError('Associated course was not found.', 404);
      }

      if (instructorId && !mongoose.Types.ObjectId.isValid(instructorId)) {
        throw new AppError('Invalid instructor ID format provided.', 400);
      }

      // Validate that all assigned students are registered in Student Attendance registry
      const validatedStudentIds = await validateRegisteredStudents(rawStudents);

      let finalBatchCode = (batchCode || '').trim();
      if (!finalBatchCode) {
        finalBatchCode = await generateBatchCode();
      } else {
        const existing = await Batch.findOne({ batchCode: finalBatchCode });
        if (existing) {
          throw new AppError(`Batch code '${finalBatchCode}' is already in use.`, 409);
        }
      }

      const newBatch = await Batch.create({
        batchCode: finalBatchCode,
        batchName: finalBatchName,
        courseId: finalCourseId,
        students: validatedStudentIds,
        instructorId: instructorId || null,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek : [],
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        timezone: timezone || 'IST (UTC+5:30)',
        capacity: capacity ? parseInt(capacity, 10) : 30,
        status: status || 'UPCOMING',
        createdBy: req.user?.id || req.user?._id
      });

      await recordAudit(req, {
        action: 'CREATE',
        entity: 'Batch',
        entityId: newBatch._id,
        newValue: newBatch
      });

      const populatedBatch = await Batch.findById(newBatch._id)
        .populate('courseId', 'courseName courseCode')
        .populate('students', 'name email phone studentId profile_image')
        .populate('instructorId', 'name email phone role profile_image avatar')
        .lean();

      return res.status(201).json({
        success: true,
        message: 'Batch created successfully.',
        data: populatedBatch
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT/PATCH /api/v1/academy/batches/:id
   */
  updateBatch: async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError('Invalid batch ID format provided.', 400);
      }

      const existingBatch = await Batch.findById(id);
      if (!existingBatch) {
        throw new AppError('Batch record not found.', 404);
      }

      const {
        batchName,
        name,
        courseId,
        course,
        students,
        studentIds,
        status,
        startDate,
        endDate,
        daysOfWeek,
        startTime,
        endTime,
        timezone,
        capacity,
        instructorId
      } = req.body;

      const finalBatchName = batchName !== undefined ? batchName : name;
      const finalCourseId = courseId !== undefined ? courseId : course;
      const rawStudents = students !== undefined ? students : studentIds;

      if (finalCourseId) {
        if (!mongoose.Types.ObjectId.isValid(finalCourseId)) {
          throw new AppError('Invalid course ID format provided.', 400);
        }
        const courseExists = await Course.findById(finalCourseId);
        if (!courseExists) {
          throw new AppError('Selected course was not found.', 404);
        }
      }

      if (instructorId && !mongoose.Types.ObjectId.isValid(instructorId)) {
        throw new AppError('Invalid instructor ID format provided.', 400);
      }

      const oldValue = existingBatch.toObject();

      if (finalBatchName !== undefined && finalBatchName !== null) {
        existingBatch.batchName = String(finalBatchName).trim();
      }
      if (finalCourseId !== undefined && finalCourseId !== null) {
        existingBatch.courseId = finalCourseId;
      }
      if (status !== undefined) existingBatch.status = status;
      if (instructorId !== undefined) existingBatch.instructorId = instructorId || null;
      if (startDate !== undefined) existingBatch.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) existingBatch.endDate = endDate ? new Date(endDate) : null;
      if (daysOfWeek !== undefined) existingBatch.daysOfWeek = Array.isArray(daysOfWeek) ? daysOfWeek : [];
      if (startTime !== undefined) existingBatch.startTime = startTime;
      if (endTime !== undefined) existingBatch.endTime = endTime;
      if (timezone !== undefined) existingBatch.timezone = timezone;
      if (capacity !== undefined) existingBatch.capacity = parseInt(capacity, 10) || 30;

      if (Array.isArray(rawStudents)) {
        existingBatch.students = await validateRegisteredStudents(rawStudents);
      }

      existingBatch.updatedBy = req.user?.id || req.user?._id;
      await existingBatch.save();

      await recordAudit(req, {
        action: 'UPDATE',
        entity: 'Batch',
        entityId: id,
        oldValue,
        newValue: existingBatch
      });

      const updatedBatch = await Batch.findById(id)
        .populate('courseId', 'courseName courseCode')
        .populate('students', 'name email phone studentId profile_image')
        .lean();

      return res.status(200).json({
        success: true,
        message: 'Batch updated successfully.',
        data: updatedBatch
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/v1/academy/batches/:id/students
   * Add / append registered students to an existing batch
   */
  addStudentsToBatch: async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError('Invalid batch ID format provided.', 400);
      }

      const { studentIds = [], students = [] } = req.body;
      const rawStudents = studentIds.length > 0 ? studentIds : students;

      const batch = await Batch.findById(id);
      if (!batch) {
        throw new AppError('Batch record not found.', 404);
      }

      const validatedIds = await validateRegisteredStudents(rawStudents);
      const existingStudentIds = (batch.students || []).map(sId => String(sId));
      const combined = [...new Set([...existingStudentIds, ...validatedIds])];

      batch.students = combined;
      batch.updatedBy = req.user?.id || req.user?._id;
      await batch.save();

      const updatedBatch = await Batch.findById(id)
        .populate('courseId', 'courseName courseCode')
        .populate('students', 'name email phone studentId profile_image')
        .lean();

      return res.status(200).json({
        success: true,
        message: 'Students added to batch successfully.',
        data: updatedBatch
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/academy/batches/:id/students/:studentId
   * Remove a student from a batch (Removes relation ONLY - does not delete student profile)
   */
  removeStudentFromBatch: async (req, res, next) => {
    try {
      const { id, studentId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError('Invalid batch ID format provided.', 400);
      }

      const batch = await Batch.findById(id);
      if (!batch) {
        throw new AppError('Batch record not found.', 404);
      }

      const targetId = String(studentId).trim();
      batch.students = (batch.students || []).filter(sId => String(sId) !== targetId);
      batch.updatedBy = req.user?.id || req.user?._id;
      await batch.save();

      const updatedBatch = await Batch.findById(id)
        .populate('courseId', 'courseName courseCode')
        .populate('students', 'name email phone studentId profile_image')
        .lean();

      return res.status(200).json({
        success: true,
        message: 'Student removed from batch successfully.',
        data: updatedBatch
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/academy/batches/:id/cancel
   */
  cancelBatch: async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError('Invalid batch ID format provided.', 400);
      }

      const batch = await Batch.findById(id);
      if (!batch) {
        throw new AppError('Batch record not found.', 404);
      }

      const oldValue = batch.toObject();
      batch.status = 'CANCELLED';
      batch.updatedBy = req.user?.id || req.user?._id;
      await batch.save();

      await recordAudit(req, {
        action: 'CANCEL',
        entity: 'Batch',
        entityId: id,
        oldValue,
        newValue: batch
      });

      return res.status(200).json({
        success: true,
        message: 'Batch cancelled successfully.',
        data: batch
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/academy/batches/:id
   * Delete a batch record permanently
   */
  deleteBatch: async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError('Invalid batch ID format provided.', 400);
      }

      const batch = await Batch.findById(id);
      if (!batch) {
        throw new AppError('Batch record not found.', 404);
      }

      const oldValue = batch.toObject();
      await Batch.findByIdAndDelete(id);

      await recordAudit(req, {
        action: 'DELETE',
        entity: 'Batch',
        entityId: id,
        oldValue,
        newValue: null
      });

      return res.status(200).json({
        success: true,
        message: 'Batch deleted successfully.'
      });
    } catch (error) {
      next(error);
    }
  }
};

export default batchController;
