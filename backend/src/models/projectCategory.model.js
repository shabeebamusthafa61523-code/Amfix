import mongoose from 'mongoose';

const projectCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
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

projectCategorySchema.index({ departmentId: 1, name: 1 }, { unique: true });
projectCategorySchema.index({ departmentId: 1 });

const ProjectCategory = mongoose.model('ProjectCategory', projectCategorySchema);
export default ProjectCategory;
