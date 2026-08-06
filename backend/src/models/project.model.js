import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true,
    trim: true
  },
  projectCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  projectCategory: {
    type: String,
    enum: ['Web Development', 'Mobile App', 'UI/UX Design', 'Digital Marketing', 'Cloud Infrastructure', 'Maintenance & Support', 'Consulting'],
    default: 'Web Development'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Planning', 'Requirement Gathering', 'UI Design', 'Development', 'Testing', 'Client Review', 'Changes', 'Deployment', 'Completed', 'On Hold', 'Cancelled'],
    default: 'Planning'
  },
  estimatedBudget: {
    type: Number,
    default: 0
  },
  technologyStack: [{
    type: String,
    trim: true
  }],
  repositoryUrl: {
    type: String,
    default: ''
  },
  productionUrl: {
    type: String,
    default: ''
  },
  stagingUrl: {
    type: String,
    default: ''
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  deadline: {
    type: Date,
    required: true
  },
  expectedDelivery: {
    type: Date
  },
  projectManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  department: {
    type: String,
    default: ''
  },
  assignedTeamLead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // MANDATORY ASSIGNED EMPLOYEES FIELD
  assignedEmployees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  // Categorized Team Roles
  teamStructure: {
    designer: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    developer: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    qa: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    marketing: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    operations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    hrCoordinator: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  currentSprint: {
    type: String,
    default: 'Sprint 1'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
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

// Indexes for high performance lookup & filtering
projectSchema.index({ projectName: 'text', projectCode: 'text' });
projectSchema.index({ client: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ priority: 1 });
projectSchema.index({ projectManager: 1 });
projectSchema.index({ assignedTeamLead: 1 });
projectSchema.index({ assignedEmployees: 1 });
projectSchema.index({ deadline: 1 });
projectSchema.index({ createdAt: -1 });

const Project = mongoose.model('Project', projectSchema);
export default Project;
