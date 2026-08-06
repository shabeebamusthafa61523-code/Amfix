import mongoose from 'mongoose';

const projectDocumentSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    default: 'pdf'
  },
  fileSize: {
    type: Number,
    default: 0
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['NDA', 'Contract', 'Requirement Doc', 'UI Mockup', 'Architecture', 'Invoice', 'General'],
    default: 'General'
  }
}, {
  timestamps: true
});

projectDocumentSchema.index({ project: 1 });
projectDocumentSchema.index({ client: 1 });

const ProjectDocument = mongoose.model('ProjectDocument', projectDocumentSchema);
export default ProjectDocument;
