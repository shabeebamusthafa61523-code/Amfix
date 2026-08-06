import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getSalaryPayments,
  createSalaryPayment,
  deleteSalaryPayment,
  getCashBook,
  getDailyReport,
  getMonthlyReport,
  getCategoryWiseReport,
  getSalaryReport
} from '../controllers/account.controller.js';
import protectRoute from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = Router();

// Protect all account routes
router.use(protectRoute);

// ── Categories Routes ──
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// ── Expenses Routes ──
router.get('/expenses', getExpenses);
router.post('/expenses', upload.single('attachment'), createExpense);
router.put('/expenses/:id', upload.single('attachment'), updateExpense);
router.delete('/expenses/:id', deleteExpense);

// ── Salary Payments Routes ──
router.get('/salary-payments', getSalaryPayments);
router.post('/salary-payments', createSalaryPayment);
router.delete('/salary-payments/:id', deleteSalaryPayment);

// ── Cash Book Routes ──
router.get('/cash-book', getCashBook);

// ── Reports Routes ──
router.get('/reports/daily', getDailyReport);
router.get('/reports/monthly', getMonthlyReport);
router.get('/reports/category-wise', getCategoryWiseReport);
router.get('/reports/salary', getSalaryReport);

export default router;
