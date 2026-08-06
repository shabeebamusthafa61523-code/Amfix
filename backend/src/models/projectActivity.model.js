import mongoose from 'mongoose';

const projectActivitySchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: false
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['PROJECT_CREATED', 'CLIENT_CREATED', 'CLIENT_UPDATED', 'CLIENT_DELETED', 'STATUS_CHANGED', 'EMPLOYEE_ASSIGNED', 'EMPLOYEE_REMOVED', 'MILESTONE_COMPLETED', 'COMMENT_ADDED', 'DOCUMENT_UPLOADED', 'WORK_REASSIGNED', 'DEADLINE_UPDATED', 'PROJECT_COMPLETED']
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

projectActivitySchema.index({ project: 1, createdAt: -1 });
projectActivitySchema.index({ client: 1 });

const ProjectActivity = mongoose.model('ProjectActivity', projectActivitySchema);
export default ProjectActivity;
