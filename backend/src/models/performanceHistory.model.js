import mongoose from 'mongoose';

const performanceHistorySchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  month: {
    type: String, // YYYY-MM
    required: true,
    index: true
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewerName: {
    type: String,
    default: 'System Administrator'
  },
  role: {
    type: String,
    enum: ['HR Manager', 'Team Lead', 'Admin', 'System'],
    required: true
  },
  remark: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    default: 0
  },
  kpiScore: {
    type: Number,
    default: 0
  },
  grade: {
    type: String,
    default: 'N/A'
  },
  aiSummary: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
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

const PerformanceHistory = mongoose.model('PerformanceHistory', performanceHistorySchema);
export default PerformanceHistory;
