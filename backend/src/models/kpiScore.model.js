import mongoose from 'mongoose';

const kpiScoreSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  month: {
    type: String, // Format: YYYY-MM
    required: true
  },
  attendanceScore: {
    type: Number,
    default: 0
  },
  taskScore: {
    type: Number,
    default: 0
  },
  projectScore: {
    type: Number,
    default: 0
  },
  managerRatingScore: {
    type: Number,
    default: 0
  },
  hrRatingScore: {
    type: Number,
    default: 0
  },
  statusScore: {
    type: Number,
    default: 0
  },
  deptReportScore: {
    type: Number,
    default: 0
  },
  learningScore: {
    type: Number,
    default: 0
  },
  overallScore: {
    type: Number,
    default: 0
  },
  grade: {
    type: String,
    enum: ['Outstanding', 'Excellent', 'Better', 'Very Good', 'Good', 'Bad', 'Very Bad', 'Needs Improvement', 'Critical'],
    default: 'Good'
  },
  weights: {
    attendance: { type: Number, default: 20 },
    task: { type: Number, default: 20 },
    project: { type: Number, default: 20 },
    managerRating: { type: Number, default: 15 },
    hrRating: { type: Number, default: 15 },
    deptReport: { type: Number, default: 5 },
    learning: { type: Number, default: 5 }
  },
  metaStats: {
    attendancePercentage: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    workingDays: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    tasksPending: { type: Number, default: 0 },
    totalTasks: { type: Number, default: 0 }
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

kpiScoreSchema.index({ employeeId: 1, month: 1 }, { unique: true });

const KPIScore = mongoose.model('KPIScore', kpiScoreSchema);
export default KPIScore;
