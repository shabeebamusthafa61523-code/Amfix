import mongoose from 'mongoose';

const courseCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id ? ret._id.toString() : ret.id;
      delete ret.__v;
      return ret;
    }
  }
});

if (mongoose.models.CourseCategory) {
  delete mongoose.models.CourseCategory;
}

const CourseCategory = mongoose.model('CourseCategory', courseCategorySchema);
export default CourseCategory;
