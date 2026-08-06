import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  clientId: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    trim: true
  },
  companyLogo: {
    type: String,
    default: ''
  },
  industry: {
    type: String,
    default: 'Technology',
    trim: true
  },
  website: {
    type: String,
    trim: true,
    default: ''
  },
  gstNumber: {
    type: String,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  whatsapp: {
    type: String,
    trim: true,
    default: ''
  },
  country: {
    type: String,
    default: 'India',
    trim: true
  },
  state: {
    type: String,
    trim: true,
    default: ''
  },
  city: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  postalCode: {
    type: String,
    trim: true,
    default: ''
  },
  primaryContact: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    designation: { type: String, default: '' }
  },
  secondaryContact: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    designation: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'On Hold', 'Lead', 'Archived'],
    default: 'Active'
  },
  clientType: {
    type: String,
    enum: ['Enterprise', 'SMB', 'Startup', 'Government', 'Retainer', 'One-Time'],
    default: 'SMB'
  },
  leadSource: {
    type: String,
    default: 'Direct'
  },
  accountManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedTeamLead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }],
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'VIP'],
    default: 'Medium'
  },
  expectedMonthlyRevenue: {
    type: Number,
    default: 0
  },
  contractStart: {
    type: Date,
    default: null
  },
  contractEnd: {
    type: Date,
    default: null
  },
  ndaStatus: {
    type: String,
    enum: ['Signed', 'Pending', 'Not Applicable'],
    default: 'Pending'
  },
  supportPlan: {
    type: String,
    default: 'Standard 8/5'
  },
  attachments: [{
    name: { type: String },
    url: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
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

// Indexes for high performance lookup & enterprise search
clientSchema.index({ companyName: 'text', clientName: 'text', email: 'text', clientId: 'text' });
clientSchema.index({ status: 1 });
clientSchema.index({ priority: 1 });
clientSchema.index({ accountManager: 1 });
clientSchema.index({ createdAt: -1 });

const Client = mongoose.model('Client', clientSchema);
export default Client;
