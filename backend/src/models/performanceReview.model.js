import mongoose from 'mongoose';

const performanceReviewSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  month: {
    type: String, // Format: YYYY-MM, e.g. "2026-07"
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'completed', 'Very Bad', 'Bad', 'Good', 'Better', 'Excellent', 'Needs Improvement', 'Active Evaluation', 'Pending Review'],
    default: 'Good'
  },
  overallKPIScore: {
    type: Number,
    default: 0
  },
  grade: {
    type: String,
    enum: ['Outstanding', 'Excellent', 'Very Good', 'Good', 'Better', 'Bad', 'Very Bad', 'Needs Improvement', 'Critical'],
    default: 'Good'
  },
  hrRemarkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PerformanceRemark'
  },
  teamLeadRemarkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PerformanceRemark'
  },
  kpiScoreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KPIScore'
  },
  hrRating: {
    type: Number,
    default: 5
  },
  hrRemark: {
    type: String,
    default: ''
  },
  tlRating: {
    type: Number,
    default: 5
  },
  tlRemark: {
    type: String,
    default: ''
  },
  remarks: {
    type: String,
    default: ''
  },
  aiSummary: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

performanceReviewSchema.index({ employeeId: 1, month: 1 }, { unique: true });

const PerformanceReview = mongoose.model('PerformanceReview', performanceReviewSchema);
export default PerformanceReview;
