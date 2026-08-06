import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const StudentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  phone: { 
    type: String,
    required: true 
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  },
  class_id: { 
    type: String, 
    default: '8' // Replaced designation_id with class_id
  },
  role_id: { 
    type: String, 
    required: true // e.g., "57db5d1e-0117-4e89-aed7-e6667946cf79"
  },
  admission_date: { 
    type: String, 
    default: () => new Date().toISOString().split('T')[0] // Replaced joining_date
  },
  address: { 
    type: String, 
    default: '' 
  },
  identityType: { 
    type: String, 
    enum: ['aadhaar', 'pancard'], 
    default: 'aadhaar' 
  },
  identityNumber: { 
    type: String, 
    required: true 
  },
  profile_image: { 
    type: String, 
    default: '' 
  }
}, { timestamps: true });

// Password hashing pre-save hook
StudentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);
export default Student;