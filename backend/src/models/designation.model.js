import mongoose from 'mongoose';

const designationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const Designation = mongoose.model('Designation', designationSchema);
export default Designation;
