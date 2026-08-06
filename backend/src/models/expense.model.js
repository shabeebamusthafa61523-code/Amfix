import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpenseCategory',
    required: true
  },
  categoryName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Bank', 'UPI'],
    default: 'Cash',
    required: true
  },
  paidTo: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  attachment: {
    type: String,
    default: ''
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  addedByName: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['Expense', 'Salary'],
    default: 'Expense'
  },
  salaryPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryPayment'
  }
}, {
  timestamps: true,
  collection: 'expenses'
});

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ type: 1 });

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
