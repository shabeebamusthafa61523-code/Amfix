import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title: { type: String, default: 'Notification' },
  description: { type: String, required: true },
  image: { type: String, default: null },
  imageUrl: { type: String, default: null },
  category: { type: String, default: 'official' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: { type: String },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
