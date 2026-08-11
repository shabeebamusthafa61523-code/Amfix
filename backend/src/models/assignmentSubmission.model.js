import mongoose from 'mongoose';

const assignmentSubmissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  enrollmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true,
    index: true
  },
  submissionType: {
    type: String,
    enum: ['FILE', 'TEXT', 'LINK'],
    default: 'FILE'
  },
  fileUrl: {
    type: String,
    default: ''
  },
  fileMetadata: {
    publicId: { type: String, default: '' },
    originalName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 }
  },
  textAnswer: {
    type: String,
    default: '',
    trim: true
  },
  externalUrl: {
    type: String,
    default: '',
    trim: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['SUBMITTED', 'UNDER_REVIEW', 'GRADED', 'RETURNED'],
    default: 'SUBMITTED',
    index: true
  },
  grade: {
    type: Number,
    default: null,
    min: 0
  },
  maxMarks: {
    type: Number,
    default: 100
  },
  feedback: {
    type: String,
    default: '',
    trim: true
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  gradedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

assignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 });
assignmentSubmissionSchema.index({ courseId: 1, status: 1 });

const AssignmentSubmission = mongoose.models.AssignmentSubmission || mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);

export default AssignmentSubmission;
