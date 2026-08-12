import mongoose from 'mongoose';

const StudentAttendanceSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  date: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['PRESENT', 'ABSENT', 'LEAVE', 'LATE', 'UNMARKED'],
    default: 'UNMARKED'
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Compound unique constraint: 1 attendance record per student + batch + course + date
StudentAttendanceSchema.index(
  { user_id: 1, batchId: 1, courseId: 1, date: 1 },
  { unique: true }
);

// Performance optimization indexes
StudentAttendanceSchema.index({ batchId: 1, courseId: 1, date: 1 });
StudentAttendanceSchema.index({ user_id: 1, date: 1 });

const StudentAttendance = mongoose.models.StudentAttendance || mongoose.model(
  'StudentAttendance',
  StudentAttendanceSchema
);

export default StudentAttendance;