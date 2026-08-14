import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  moduleId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  contentType: {
    type: String,
    enum: ['VIDEO', 'PDF', 'DOCUMENT', 'LINK', 'TEXT'],
    default: 'TEXT',
    index: true
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
  externalUrl: {
    type: String,
    default: ''
  },
  textContent: {
    type: String,
    default: ''
  },
  durationMinutes: {
    type: Number,
    default: 0,
    min: 0
  },
  order: {
    type: Number,
    default: 1
  },
  isPublished: {
    type: Boolean,
    default: true,
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

lessonSchema.index({ courseId: 1, moduleId: 1, isPublished: 1, order: 1 });

const Lesson = mongoose.models.Lesson || mongoose.model('Lesson', lessonSchema);

export default Lesson;
