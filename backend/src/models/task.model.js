// ── src/models/task.model.js ──
import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'current', 'preview', 'done'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  file_url: {
    type: String
  },
  file_public_id: {
    type: String
  },
  designation_id: {
    type: String
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    default: null
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  dueDate: {
    type: Date
  },
  attachments: [{
    url: { type: String },
    name: { type: String },
    public_id: { type: String },
    fileType: { type: String, default: 'file' }
  }],
  links: [{
    title: { type: String },
    url: { type: String }
  }]
}, {
  timestamps: true,
  toJSON: {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();

    if (ret.created_by) {
      if (typeof ret.created_by === 'object') {
        const idVal = ret.created_by._id || ret.created_by.id || ret.created_by;
        ret.user_id = idVal ? idVal.toString() : undefined;
      } else {
        ret.user_id = ret.created_by.toString();
      }
    }

    if (ret.file_url) {
      ret.file = ret.file_url;
      ret.image = ret.file_url;
    }

    delete ret._id;
    delete ret.file_public_id;
    delete ret.__v;

    return ret;
  }
},

toObject: {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();

    if (ret.created_by) {
      if (typeof ret.created_by === 'object') {
        const idVal = ret.created_by._id || ret.created_by.id || ret.created_by;
        ret.user_id = idVal ? idVal.toString() : undefined;
      } else {
        ret.user_id = ret.created_by.toString();
      }
    }

    if (ret.file_url) {
      ret.file = ret.file_url;
      ret.image = ret.file_url;
    }

    delete ret._id;
    delete ret.file_public_id;
    delete ret.__v;

    return ret;
  }
}
});

const Task = mongoose.model('Task', taskSchema);
export default Task;
