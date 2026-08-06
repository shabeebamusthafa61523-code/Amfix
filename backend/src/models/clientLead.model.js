import mongoose from 'mongoose';

const clientLeadSchema = new mongoose.Schema({
  leadName: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    trim: true
  },
  interestedService: {
    type: String,
    trim: true
  },
  campaignName: {
    type: String,
    trim: true
  },
  leadPlatform: {
    type: String,
    trim: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['New', 'Contacted', 'Follow Up', 'Interested', 'Converted', 'Lost'],
    default: 'New'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  clientMeetingFixed: {
    type: String,
    enum: ['Yes', 'No', 'Pending', ''],
    default: ''
  },
  clientOnboarding: {
    type: String,
    enum: ['Yes', 'No', 'Pending', ''],
    default: ''
  },
  remarks: {
    type: String
  },
  nextFollowUpDate: {
    type: Date
  },
  leadsReceivedDate: {
    type: Date
  },
  followUpDate1: {
    type: Date
  },
  followUpDate2: {
    type: Date
  },
  followUpDate3: {
    type: Date
  },
  followUpDate4: {
    type: Date
  },
  followUpDate5: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  convertedAt: {
    type: Date
  },
  lostReason: {
    type: String
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
  },
  toObject: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Index searching support
clientLeadSchema.index({ leadName: 'text', email: 'text', phone: 'text', companyName: 'text' });

// Performance optimization indexes
clientLeadSchema.index({ status: 1 });
clientLeadSchema.index({ createdAt: -1 });
clientLeadSchema.index({ assignedTo: 1 });
clientLeadSchema.index({ priority: 1 });
clientLeadSchema.index({ city: 1 });

const ClientLead = mongoose.model('ClientLead', clientLeadSchema);
export default ClientLead;
