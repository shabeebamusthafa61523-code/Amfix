import mongoose from 'mongoose';

const projectCommentSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  commentType: {
    type: String,
    enum: ['General', 'Manager Comment', 'Team Lead Comment', 'Approval', 'Rejection', 'Commit', 'Screenshot'],
    default: 'General'
  },
  comment: {
    type: String,
    required: true
  },
  attachments: [{
    name: String,
    url: String,
    fileType: String
  }]
}, {
  timestamps: true
});

projectCommentSchema.index({ project: 1, createdAt: -1 });

const ProjectComment = mongoose.model('ProjectComment', projectCommentSchema);
export default ProjectComment;
