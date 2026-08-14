import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  batchCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  batchName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  daysOfWeek: [{
    type: String
  }],
  startTime: {
    type: String
  },
  endTime: {
    type: String
  },
  timezone: {
    type: String,
    default: 'IST (UTC+5:30)'
  },
  capacity: {
    type: Number,
    default: 30
  },
  status: {
    type: String,
    enum: ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED', 'INACTIVE'],
    default: 'UPCOMING',
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

batchSchema.index({ courseId: 1, status: 1 });

const Batch = mongoose.models.Batch || mongoose.model('Batch', batchSchema);

export default Batch;
