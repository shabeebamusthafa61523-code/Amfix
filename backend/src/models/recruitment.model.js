// ── src/models/recruitment.model.js ──
import mongoose from 'mongoose';

const recruitmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Candidate name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Candidate phone number is required'],
      trim: true
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    resume_url: {
      type: String,
      default: ''
    },
    resume_name: {
      type: String,
      default: ''
    },
    resume_public_id: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['New', 'In Progress', 'Shortlisted', 'Interviewing', 'Selected', 'Rejected', 'Hired'],
      default: 'New'
    },
    interview_1: {
      type: String,
      enum: ['N/A', 'Pending', 'Scheduled', 'Passed', 'Failed'],
      default: 'Pending'
    },
    interview_2: {
      type: String,
      enum: ['N/A', 'Pending', 'Scheduled', 'Passed', 'Failed'],
      default: 'N/A'
    },
    interview_3: {
      type: String,
      enum: ['N/A', 'Pending', 'Scheduled', 'Passed', 'Failed'],
      default: 'N/A'
    },
    selected: {
      type: String,
      enum: ['Pending', 'Selected', 'Not Selected'],
      default: 'Pending'
    },
    approval_status: {
      type: String,
      enum: ['N/A', 'Pending', 'Approved', 'Rejected'],
      default: 'N/A'
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approved_at: {
      type: Date
    },
    rejection_reason: {
      type: String,
      trim: true,
      default: ''
    },
    offer_letter: {
      type: String,
      enum: ['N/A', 'Pending', 'Sent', 'Accepted', 'Declined'],
      default: 'N/A'
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
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
  }
);

const Recruitment = mongoose.models.Recruitment || mongoose.model('Recruitment', recruitmentSchema);

export default Recruitment;
