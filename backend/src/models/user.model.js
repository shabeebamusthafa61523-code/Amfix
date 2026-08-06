import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  role: { type: String, default: 'employee' },
  role_id: { type: String, default: '3' },
  designation: { type: String },
  designationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
  department: { type: String },
  reportingManager: { type: String },
  joining_date: { type: Date },
  salary: { type: Number, default: 0 },
  address: { type: String },
  identityType: { type: String },
  identityNumber: { type: String },
  profile_image: { type: String },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  employeeId: { type: String, unique: true, sparse: true },
  avatar: { type: String },
  password: { type: String },
  passwordHash: { type: String },
  isActive: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
  permissions: [{ type: String }],
  isSuperAdmin: { type: Boolean, default: false },
  lastLogin: { type: Date },
}, { timestamps: true });

// Case-insensitive index searching support for the controller search features
userSchema.index({ name: 'text', email: 'text', employeeId: 'text' });

const User = mongoose.model('User', userSchema);
export default User;
