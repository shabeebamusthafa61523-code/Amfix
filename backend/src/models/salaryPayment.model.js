import mongoose from 'mongoose';

const salaryPaymentSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  month: {
    type: String, // e.g. "2026-08" or "August 2026"
    required: true
  },
  basicSalary: {
    type: Number,
    default: 0
  },
  paidAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Bank', 'UPI'],
    default: 'Bank',
    required: true
  },
  remarks: {
    type: String,
    default: ''
  },
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense'
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  addedByName: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'salary_payments'
});

salaryPaymentSchema.index({ paymentDate: -1 });
salaryPaymentSchema.index({ employee: 1, month: 1 });

const SalaryPayment = mongoose.model('SalaryPayment', salaryPaymentSchema);
export default SalaryPayment;
