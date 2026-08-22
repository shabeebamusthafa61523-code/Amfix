import mongoose from 'mongoose';
import ExpenseCategory from '../models/expenseCategory.model.js';
import Expense from '../models/expense.model.js';
import SalaryPayment from '../models/salaryPayment.model.js';
import User from '../models/user.model.js';
import { sendEmail } from '../services/emailService.js';

const DEFAULT_CATEGORIES = [
  'Salary',
  'Stationery',
  'Electricity',
  'Internet',
  'Rent',
  'Travel',
  'Maintenance',
  'Miscellaneous'
];

/**
 * Auto-seed default master expense categories if none exist
 */
const seedDefaultCategoriesIfNeeded = async () => {
  try {
    const count = await ExpenseCategory.countDocuments();
    if (count === 0) {
      const docs = DEFAULT_CATEGORIES.map(name => ({
        name,
        description: `Default category for ${name}`,
        isActive: true,
        isSystemDefault: true
      }));
      await ExpenseCategory.insertMany(docs);
      console.log('🌱 Successfully seeded default expense categories.');
    }
  } catch (err) {
    console.error('Error seeding default expense categories:', err.message);
  }
};

// ==========================================
// CATEGORY CONTROLLERS
// ==========================================

export const getCategories = async (req, res) => {
  try {
    await seedDefaultCategoriesIfNeeded();
    const categories = await ExpenseCategory.find().sort({ name: 1 });
    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('getCategories Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const existing = await ExpenseCategory.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category already exists.' });
    }

    const category = await ExpenseCategory.create({
      name: name.trim(),
      description: description ? description.trim() : ''
    });

    return res.status(201).json({
      success: true,
      message: 'Expense category created successfully.',
      data: category
    });
  } catch (error) {
    console.error('createCategory Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const category = await ExpenseCategory.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    if (name && name.trim() !== category.name) {
      const existing = await ExpenseCategory.findOne({ 
        _id: { $ne: id }, 
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Another category with this name already exists.' });
      }
      category.name = name.trim();
    }

    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully.',
      data: category
    });
  } catch (error) {
    console.error('updateCategory Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await ExpenseCategory.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    // Check if used in expenses
    const usedInExpenses = await Expense.countDocuments({ category: id });
    if (usedInExpenses > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete category because it is used in ${usedInExpenses} expense record(s).` 
      });
    }

    await ExpenseCategory.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully.'
    });
  } catch (error) {
    console.error('deleteCategory Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// EXPENSE CONTROLLERS
// ==========================================

export const getExpenses = async (req, res) => {
  try {
    const { category, type, startDate, endDate, search, paymentMode, status } = req.query;
    const query = {};

    if (category) {
      query.category = category;
    }

    if (paymentMode) {
      query.paymentMode = paymentMode;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    if (search) {
      query.$or = [
        { paidTo: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { categoryName: { $regex: search, $options: 'i' } }
      ];
    }

    const expenses = await Expense.find(query)
      .populate('category', 'name')
      .populate('addedBy', 'name email')
      .sort({ date: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: expenses
    });
  } catch (error) {
    console.error('getExpenses Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createExpense = async (req, res) => {
  try {
    const { date, category, amount, paymentMode, paidTo, description } = req.body;

    if (!category || !amount || !paymentMode || !paidTo) {
      return res.status(400).json({
        success: false,
        message: 'Expense Category, Amount, Payment Mode, and Paid To fields are required.'
      });
    }

    const catObj = await ExpenseCategory.findById(category);
    if (!catObj) {
      return res.status(400).json({ success: false, message: 'Invalid Expense Category selected.' });
    }

    let attachmentUrl = '';
    if (req.file) {
      // Base64 encoding or file path fallback for attachment display
      attachmentUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    let addedByName = req.user?.name || req.user?.email || 'System User';
    if (req.user?.id) {
      const user = await User.findById(req.user.id).select('name');
      if (user) addedByName = user.name;
    }

    const expAmount = Number(amount);
    const userRole = String(req.user?.role || '').toLowerCase();
    const isMdUser = req.user?.isSuperAdmin === true ||
      ['0', 'superadmin', 'md', 'coo', 'executive_director'].includes(userRole);
    const isSalary = catObj.name.toLowerCase() === 'salary';

    // Rule:
    // Expenses > 1,000 INR require MD approval -> PENDING
    // Expenses <= 1,000 INR do NOT require approval -> APPROVED
    let initialStatus = expAmount > 1000 ? 'PENDING' : 'APPROVED';
    if (req.body.status && isMdUser) {
      initialStatus = req.body.status;
    }

    const expense = await Expense.create({
      date: date ? new Date(date) : new Date(),
      category: catObj._id,
      categoryName: catObj.name,
      amount: expAmount,
      paymentMode,
      paidTo: paidTo.trim(),
      description: description ? description.trim() : '',
      attachment: attachmentUrl,
      addedBy: req.user?.id || null,
      addedByName,
      type: isSalary ? 'Salary' : 'Expense',
      status: initialStatus
    });

    return res.status(201).json({
      success: true,
      message: initialStatus === 'PENDING'
        ? (expAmount > 1000 
            ? 'Expense recorded successfully (Submitted for MD approval because amount exceeds ₹1,000).' 
            : 'Expense recorded successfully (Submitted for Managing Director approval).')
        : 'Expense added successfully.',
      data: expense
    });
  } catch (error) {
    console.error('createExpense Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, category, amount, paymentMode, paidTo, description } = req.body;

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    if (category) {
      const catObj = await ExpenseCategory.findById(category);
      if (catObj) {
        expense.category = catObj._id;
        expense.categoryName = catObj.name;
        expense.type = catObj.name.toLowerCase() === 'salary' ? 'Salary' : 'Expense';
      }
    }

    if (date) expense.date = new Date(date);
    if (amount !== undefined) expense.amount = Number(amount);
    if (paymentMode) expense.paymentMode = paymentMode;
    if (paidTo) expense.paidTo = paidTo.trim();
    if (description !== undefined) expense.description = description.trim();

    if (req.file) {
      expense.attachment = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    await expense.save();

    return res.status(200).json({
      success: true,
      message: 'Expense updated successfully.',
      data: expense
    });
  } catch (error) {
    console.error('updateExpense Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    // If linked to a salary payment, unlink or restrict delete
    if (expense.salaryPaymentId) {
      await SalaryPayment.findByIdAndDelete(expense.salaryPaymentId);
    }

    await Expense.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Expense deleted successfully.'
    });
  } catch (error) {
    console.error('deleteExpense Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// SALARY PAYMENT CONTROLLERS
// ==========================================

export const getSalaryPayments = async (req, res) => {
  try {
    const { month, employeeId } = req.query;
    const query = {};

    if (month) query.month = month;
    if (employeeId) query.employee = employeeId;

    const payments = await SalaryPayment.find(query)
      .populate('employee', 'name email designation salary employeeId')
      .populate('addedBy', 'name email')
      .sort({ paymentDate: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('getSalaryPayments Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createSalaryPayment = async (req, res) => {
  try {
    const {
      employeeId, month, basicSalary, paidAmount, paymentDate, paymentMode, remarks,
      kbEmployeeId, location, payPeriod, payDateStr, workingDays, daysWorked, daysInLeave,
      hra, medicalAllowance, specialAllowance, transportAllowance, otherAllowance, integrityAward, bonus, totalEarnings,
      pf, professionalTax, incomeTax, unpaidLeave, advanceSalary, otherDeductions, totalDeductions
    } = req.body;

    if (!employeeId || !month || (paidAmount === undefined && totalEarnings === undefined) || !paymentMode) {
      return res.status(400).json({
        success: false,
        message: 'Employee, Month, Paid Amount, and Payment Mode are required.'
      });
    }

    // Extract valid 24-character ObjectId if embedded in string
    let cleanEmployeeId = String(employeeId || '').trim();
    const hexMatch = cleanEmployeeId.match(/[a-fA-F0-9]{24}/);
    if (hexMatch) {
      cleanEmployeeId = hexMatch[0];
    }

    if (!cleanEmployeeId || !mongoose.Types.ObjectId.isValid(cleanEmployeeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Employee ID selected.'
      });
    }

    const employeeObj = await User.findById(cleanEmployeeId);
    if (!employeeObj) {
      return res.status(404).json({ success: false, message: 'Selected Employee not found in database.' });
    }

    let addedByName = req.user?.name || req.user?.email || 'System User';
    if (req.user?.id) {
      const adminUser = await User.findById(req.user.id).select('name');
      if (adminUser) addedByName = adminUser.name;
    }

    const computedBasic = Number(basicSalary || employeeObj.salary || 0);
    const computedTotalEarnings = Number(totalEarnings || (computedBasic + Number(hra || 0) + Number(medicalAllowance || 0) + Number(specialAllowance || 0) + Number(transportAllowance || 0) + Number(otherAllowance || 0) + Number(integrityAward || 0) + Number(bonus || 0)));
    const computedTotalDeductions = Number(totalDeductions || (Number(pf || 0) + Number(professionalTax || 0) + Number(incomeTax || 0) + Number(unpaidLeave || 0) + Number(advanceSalary || 0) + Number(otherDeductions || 0)));
    const finalPaidAmount = Number(paidAmount !== undefined ? paidAmount : Math.max(0, computedTotalEarnings - computedTotalDeductions));

    // 1. Create Salary Payment
    const salaryPayment = new SalaryPayment({
      employee: employeeObj._id,
      employeeName: employeeObj.name,
      month,
      basicSalary: computedBasic,
      paidAmount: finalPaidAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMode,
      remarks: remarks ? remarks.trim() : '',
      kbEmployeeId: kbEmployeeId || employeeObj.employeeId || `KB-${(employeeObj.name || '').slice(0, 2).toUpperCase()}-001`,
      location: location || 'HEAD OFFICE',
      payPeriod: payPeriod || `${month}`,
      payDateStr: payDateStr || `On or Before 10th ${month}`,
      workingDays: Number(workingDays || 27),
      daysWorked: Number(daysWorked || 27),
      daysInLeave: Number(daysInLeave || 0),
      hra: Number(hra || 0),
      medicalAllowance: Number(medicalAllowance || 0),
      specialAllowance: Number(specialAllowance || 0),
      transportAllowance: Number(transportAllowance || 0),
      otherAllowance: Number(otherAllowance || 0),
      integrityAward: Number(integrityAward || 0),
      bonus: Number(bonus || 0),
      totalEarnings: computedTotalEarnings,
      pf: Number(pf || 0),
      professionalTax: Number(professionalTax || 0),
      incomeTax: Number(incomeTax || 0),
      unpaidLeave: Number(unpaidLeave || 0),
      advanceSalary: Number(advanceSalary || 0),
      otherDeductions: Number(otherDeductions || 0),
      totalDeductions: computedTotalDeductions,
      addedBy: req.user?.id || null,
      addedByName
    });

    await salaryPayment.save();

    // 2. Automatically create corresponding Expense Entry under "Salary" Category!
    await seedDefaultCategoriesIfNeeded();
    let salaryCategory = await ExpenseCategory.findOne({ 
      name: { $regex: /^Salary$/i } 
    });

    if (!salaryCategory) {
      salaryCategory = await ExpenseCategory.create({
        name: 'Salary',
        description: 'Employee salary payments',
        isSystemDefault: true
      });
    }

    const autoExpense = await Expense.create({
      date: salaryPayment.paymentDate,
      category: salaryCategory._id,
      categoryName: 'Salary',
      amount: salaryPayment.paidAmount,
      paymentMode: salaryPayment.paymentMode,
      paidTo: employeeObj.name,
      description: `Employee Salary Payment for ${month}${remarks ? ' (' + remarks.trim() + ')' : ''}`,
      addedBy: req.user?.id || null,
      addedByName,
      type: 'Salary',
      salaryPaymentId: salaryPayment._id,
      status: salaryPayment.paidAmount > 1000 ? 'PENDING' : 'APPROVED'
    });

    // Link back expense ID to salary payment
    salaryPayment.expenseId = autoExpense._id;
    await salaryPayment.save();

    return res.status(201).json({
      success: true,
      message: 'Salary payment recorded and auto expense entry created successfully.',
      data: salaryPayment
    });
  } catch (error) {
    console.error('createSalaryPayment Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update a Salary Payment (edit payslip fields)
 * PUT /api/v1/accounts/salary-payments/:id
 */
export const updateSalaryPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await SalaryPayment.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Salary payment record not found.' });
    }

    // Fields that can be updated
    const allowedFields = [
      'month', 'payPeriod', 'payDateStr', 'location',
      'kbEmployeeId', 'employeeName', 'designation', 'department',
      'workingDays', 'daysWorked', 'daysInLeave',
      'basicSalary', 'hra', 'medicalAllowance', 'specialAllowance',
      'transportAllowance', 'otherAllowance', 'integrityAward', 'bonus',
      'totalEarnings', 'pf', 'professionalTax', 'incomeTax',
      'unpaidLeave', 'advanceSalary', 'otherDeductions', 'totalDeductions',
      'paidAmount', 'paymentMode', 'remarks'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        payment[field] = req.body[field];
      }
    });

    await payment.save();

    return res.status(200).json({
      success: true,
      message: 'Payslip updated successfully.',
      data: payment
    });
  } catch (error) {
    console.error('updateSalaryPayment Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSalaryPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await SalaryPayment.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Salary payment record not found.' });
    }

    // Automatically remove synced expense entry
    if (payment.expenseId) {
      await Expense.findByIdAndDelete(payment.expenseId);
    } else {
      await Expense.deleteMany({ salaryPaymentId: id });
    }

    await SalaryPayment.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Salary payment and synced expense record removed successfully.'
    });
  } catch (error) {
    console.error('deleteSalaryPayment Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// CASH BOOK CONTROLLER
// ==========================================

export const getCashBook = async (req, res) => {
  try {
    const { startDate, endDate, type, category, paymentMode } = req.query;
    const query = {};

    if (type) {
      query.type = type; // 'Expense' or 'Salary'
    }

    if (category) {
      query.category = category;
    }

    if (paymentMode) {
      if (paymentMode === 'UPI_BANK' || paymentMode === 'UPI/BANK') {
        query.paymentMode = { $in: ['UPI', 'Bank', 'upi', 'bank'] };
      } else {
        query.paymentMode = paymentMode;
      }
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    // Cash Book represents all money going out (from expenses collection which includes auto-created salary expenses)
    const cashBookEntries = await Expense.find(query)
      .populate('category', 'name')
      .populate('addedBy', 'name email')
      .sort({ date: -1, createdAt: -1 });

    const totalOutflow = cashBookEntries.reduce((sum, item) => sum + (item.amount || 0), 0);

    return res.status(200).json({
      success: true,
      summary: {
        totalOutflow,
        totalEntries: cashBookEntries.length
      },
      data: cashBookEntries
    });
  } catch (error) {
    console.error('getCashBook Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// EXPENSE REPORTS CONTROLLERS
// ==========================================

export const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const expenses = await Expense.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ date: -1 });

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const salaryTotal = expenses.filter(e => e.type === 'Salary').reduce((sum, e) => sum + e.amount, 0);
    const generalExpenseTotal = totalAmount - salaryTotal;

    return res.status(200).json({
      success: true,
      date: startOfDay.toISOString().split('T')[0],
      summary: {
        totalAmount,
        salaryTotal,
        generalExpenseTotal,
        count: expenses.length
      },
      data: expenses
    });
  } catch (error) {
    console.error('getDailyReport Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    const current = new Date();
    const targetYear = parseInt(year || current.getFullYear(), 10);
    const targetMonth = parseInt(month || current.getMonth() + 1, 10);

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const expenses = await Expense.find({
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).sort({ date: -1 });

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const salaryTotal = expenses.filter(e => e.type === 'Salary').reduce((sum, e) => sum + e.amount, 0);
    const generalExpenseTotal = totalAmount - salaryTotal;

    return res.status(200).json({
      success: true,
      period: `${targetYear}-${String(targetMonth).padStart(2, '0')}`,
      summary: {
        totalAmount,
        salaryTotal,
        generalExpenseTotal,
        count: expenses.length
      },
      data: expenses
    });
  } catch (error) {
    console.error('getMonthlyReport Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCategoryWiseReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const aggregation = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$categoryName',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    const grandTotal = aggregation.reduce((sum, item) => sum + item.totalAmount, 0);

    const formattedData = aggregation.map(item => ({
      category: item._id || 'Uncategorized',
      totalAmount: item.totalAmount,
      count: item.count,
      percentage: grandTotal > 0 ? ((item.totalAmount / grandTotal) * 100).toFixed(2) : 0
    }));

    return res.status(200).json({
      success: true,
      summary: {
        grandTotal,
        categoryCount: formattedData.length
      },
      data: formattedData
    });
  } catch (error) {
    console.error('getCategoryWiseReport Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSalaryReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const query = {};

    if (month) {
      query.month = { $regex: month, $options: 'i' };
    }

    const payments = await SalaryPayment.find(query)
      .populate('employee', 'name email designation department salary employeeId')
      .sort({ paymentDate: -1 });

    const totalPaid = payments.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalBasic = payments.reduce((sum, p) => sum + (p.basicSalary || 0), 0);

    return res.status(200).json({
      success: true,
      summary: {
        totalPaid,
        totalBasic,
        employeeCount: payments.length
      },
      data: payments
    });
  } catch (error) {
    console.error('getSalaryReport Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Approve or Reject a specific Salary Payment (MD / Admin action)
 * PUT /api/v1/accounts/salary-payments/:id/action
 */
export const approveOrRejectSalaryPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body; // action: 'APPROVED' | 'REJECTED'
    const actorId = req.user?.id || req.user?._id;

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be APPROVED or REJECTED.' });
    }

    const salaryPayment = await SalaryPayment.findById(id);
    if (!salaryPayment) {
      return res.status(404).json({ success: false, message: 'Salary payment record not found.' });
    }

    let actorName = req.user?.name || req.user?.email || 'Executive';
    if (actorId) {
      const u = await User.findById(actorId).select('name');
      if (u) actorName = u.name;
    }

    salaryPayment.status = action;
    salaryPayment.actionBy = actorId || null;
    salaryPayment.actionByName = actorName;
    salaryPayment.actionAt = new Date();

    if (action === 'REJECTED') {
      salaryPayment.rejectionReason = rejectionReason ? rejectionReason.trim() : '';
    } else {
      salaryPayment.rejectionReason = '';
    }

    await salaryPayment.save();

    // Sync status change to synced expense record in expenses collection
    await Expense.updateMany(
      { $or: [{ salaryPaymentId: id }, { _id: salaryPayment.expenseId }] },
      {
        $set: {
          status: action,
          actionBy: actorId || null,
          actionByName: actorName,
          actionAt: new Date(),
          rejectionReason: action === 'REJECTED' ? (rejectionReason ? rejectionReason.trim() : '') : ''
        }
      }
    );

    return res.status(200).json({
      success: true,
      message: `Salary payment ${action.toLowerCase()} successfully.`,
      data: salaryPayment
    });
  } catch (error) {
    console.error('approveOrRejectSalaryPayment Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Bulk Approve all pending Salary Payments in one click (MD / Executive action)
 * PUT /api/v1/accounts/salary-payments/approve-all
 */
export const approveAllSalaryPayments = async (req, res) => {
  try {
    const actorId = req.user?.id || req.user?._id;
    let actorName = req.user?.name || req.user?.email || 'Executive';
    if (actorId) {
      const u = await User.findById(actorId).select('name');
      if (u) actorName = u.name;
    }

    const pendingSalaries = await SalaryPayment.find({ status: 'PENDING' });
    const pendingIds = pendingSalaries.map(s => s._id);

    const result = await SalaryPayment.updateMany(
      { _id: { $in: pendingIds } },
      {
        $set: {
          status: 'APPROVED',
          actionBy: actorId || null,
          actionByName: actorName,
          actionAt: new Date(),
          rejectionReason: ''
        }
      }
    );

    await Expense.updateMany(
      { salaryPaymentId: { $in: pendingIds } },
      {
        $set: {
          status: 'APPROVED',
          actionBy: actorId || null,
          actionByName: actorName,
          actionAt: new Date(),
          rejectionReason: ''
        }
      }
    );

    return res.status(200).json({
      success: true,
      message: `Approved ${result.modifiedCount || 0} pending salary payment(s) successfully.`,
      modifiedCount: result.modifiedCount || 0
    });
  } catch (error) {
    console.error('approveAllSalaryPayments Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * MD Approval / Rejection for Expense (> 1000 INR)
 * PUT /api/v1/accounts/expenses/:id/action
 */
export const approveOrRejectExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body;

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found.' });
    }

    let actionByName = req.user?.name || req.user?.email || 'Managing Director';
    if (req.user?.id) {
      const u = await User.findById(req.user.id).select('name');
      if (u) actionByName = u.name;
    }

    if (action === 'APPROVED') {
      expense.status = 'APPROVED';
      expense.actionBy = req.user?.id || null;
      expense.actionByName = actionByName;
      expense.actionAt = new Date();
      expense.rejectionReason = '';
    } else if (action === 'REJECTED') {
      expense.status = 'REJECTED';
      expense.actionBy = req.user?.id || null;
      expense.actionByName = actionByName;
      expense.actionAt = new Date();
      expense.rejectionReason = rejectionReason ? rejectionReason.trim() : 'Rejected by MD';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be APPROVED or REJECTED.' });
    }

    await expense.save();

    return res.status(200).json({
      success: true,
      message: `Expense ${action.toLowerCase()} successfully.`,
      data: expense
    });
  } catch (error) {
    console.error('approveOrRejectExpense Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Send official Salary Payslip to employee via email
 * POST /api/v1/accounts/salary-payments/:id/send-email
 */
export const sendSalaryPayslipEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const payment = await SalaryPayment.findById(id).populate('employee', 'name email designation employeeId');
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Salary payment record not found.' });
    }

    const recipientEmail = (email && email.trim()) || payment.employee?.email;
    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: 'Recipient email address is required.' });
    }

    const empName = payment.employeeName || payment.employee?.name || 'Employee';
    const month = payment.month || 'Current Month';
    const netPay = (payment.paidAmount || 0).toLocaleString('en-IN');
    const empId = payment.kbEmployeeId || payment.employee?.employeeId || 'KB-EMP-001';
    const payDate = payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #4f46e5; color: #ffffff; padding: 24px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">KOD.BRAND</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Official Employee Salary Payslip — ${month}</p>
        </div>

        <div style="padding: 24px; color: #334155;">
          <p style="font-size: 14px; margin-top: 0;">Dear <strong>${empName}</strong>,</p>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            Your salary payslip statement for <strong>${month}</strong> has been generated. Please find the disbursal details below:
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #475569;">Employee Name</td>
              <td style="padding: 10px; text-align: right; font-weight: bold; color: #0f172a;">${empName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #475569;">Employee ID</td>
              <td style="padding: 10px; text-align: right; color: #0f172a;">${empId}</td>
            </tr>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #475569;">Pay Period</td>
              <td style="padding: 10px; text-align: right; color: #0f172a;">${payment.payPeriod || month}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #475569;">Disbursal Date</td>
              <td style="padding: 10px; text-align: right; color: #0f172a;">${payDate}</td>
            </tr>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #475569;">Payment Mode</td>
              <td style="padding: 10px; text-align: right; color: #0f172a;">${payment.paymentMode || 'Bank'}</td>
            </tr>
            <tr style="background-color: #e0e7ff; border-top: 2px solid #6366f1;">
              <td style="padding: 12px; font-weight: bold; color: #3730a3; font-size: 14px;">Net Salary Disbursed</td>
              <td style="padding: 12px; text-align: right; font-weight: bold; color: #3730a3; font-size: 16px;">₹${netPay}</td>
            </tr>
          </table>

          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            This is an official computer-generated salary advice statement issued by KOD.BRAND HR & Payroll Department.
          </p>
        </div>
      </div>
    `;

    const emailResult = await sendEmail({
      to: recipientEmail,
      subject: `Official Salary Payslip Statement — ${month} | ${empName}`,
      htmlContent,
      senderName: 'KOD.BRAND Payroll'
    });

    return res.status(200).json({
      success: true,
      message: `Payslip email sent successfully to ${recipientEmail}.`,
      data: emailResult
    });
  } catch (error) {
    console.error('sendSalaryPayslipEmail Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

