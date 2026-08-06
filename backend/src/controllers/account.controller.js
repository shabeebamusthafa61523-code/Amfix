import mongoose from 'mongoose';
import ExpenseCategory from '../models/expenseCategory.model.js';
import Expense from '../models/expense.model.js';
import SalaryPayment from '../models/salaryPayment.model.js';
import User from '../models/user.model.js';

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
    const { category, paymentMode, startDate, endDate, search } = req.query;
    const query = {};

    if (category) {
      query.category = category;
    }

    if (paymentMode) {
      query.paymentMode = paymentMode;
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

    const expense = await Expense.create({
      date: date ? new Date(date) : new Date(),
      category: catObj._id,
      categoryName: catObj.name,
      amount: Number(amount),
      paymentMode,
      paidTo: paidTo.trim(),
      description: description ? description.trim() : '',
      attachment: attachmentUrl,
      addedBy: req.user?.id || null,
      addedByName,
      type: catObj.name.toLowerCase() === 'salary' ? 'Salary' : 'Expense'
    });

    return res.status(201).json({
      success: true,
      message: 'Expense added successfully.',
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
    const { employeeId, month, basicSalary, paidAmount, paymentDate, paymentMode, remarks } = req.body;

    if (!employeeId || !month || !paidAmount || !paymentMode) {
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

    // 1. Create Salary Payment
    const salaryPayment = new SalaryPayment({
      employee: employeeObj._id,
      employeeName: employeeObj.name,
      month,
      basicSalary: Number(basicSalary || employeeObj.salary || 0),
      paidAmount: Number(paidAmount),
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMode,
      remarks: remarks ? remarks.trim() : '',
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
      salaryPaymentId: salaryPayment._id
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
    const { startDate, endDate, type, category } = req.query;
    const query = {};

    if (type) {
      query.type = type; // 'Expense' or 'Salary'
    }

    if (category) {
      query.category = category;
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
