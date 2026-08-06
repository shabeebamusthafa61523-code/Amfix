import mongoose from 'mongoose';

const performanceRemarkSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: String, // YYYY-MM
    required: true
  },
  type: {
    type: String,
    enum: ['HR', 'TEAM_LEAD'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'submitted'],
    default: 'draft'
  },
  // HR Specific Fields
  performanceRemark: { type: String, default: '' },
  strengths: { type: String, default: '' },
  weaknesses: { type: String, default: '' },
  trainingRecommendation: { type: String, default: '' },
  promotionRecommendation: { type: String, default: '' },
  improvementAreas: { type: String, default: '' },
  generalNotes: { type: String, default: '' },

  // Team Lead Specific Fields
  technicalPerformance: { type: Number, min: 1, max: 10, default: 7 },
  taskQuality: { type: Number, min: 1, max: 10, default: 7 },
  communication: { type: Number, min: 1, max: 10, default: 7 },
  teamCollaboration: { type: Number, min: 1, max: 10, default: 7 },
  deadlineManagement: { type: Number, min: 1, max: 10, default: 7 },
  learningAbility: { type: Number, min: 1, max: 10, default: 7 },
  codeQuality: { type: Number, min: 1, max: 10, default: 7 },
  problemSolving: { type: Number, min: 1, max: 10, default: 7 },
  attendanceBehaviour: { type: Number, min: 1, max: 10, default: 7 },
  discipline: { type: Number, min: 1, max: 10, default: 7 },
  additionalRemarks: { type: String, default: '' },

  overallRating: { type: Number, min: 1, max: 10, default: 7 }
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

performanceRemarkSchema.index({ employeeId: 1, month: 1, type: 1 }, { unique: true });

const PerformanceRemark = mongoose.model('PerformanceRemark', performanceRemarkSchema);
export default PerformanceRemark;
