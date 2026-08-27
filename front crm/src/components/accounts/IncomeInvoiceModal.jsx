import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, Building2, GraduationCap, Coins, ShieldCheck, FileText, CheckCircle2, Pencil, Loader2, Save, History, Receipt } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'UPI', 'Credit Card', 'Cheque', 'Other'];

const IncomeInvoiceModal = ({ isOpen, onClose, incomeRecord, initialMode = 'invoice', onUpdateSuccess, onSaveTransient, showToast }) => {
  const invoiceRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [viewMode, setViewMode] = useState(initialMode); // 'invoice' or 'receipt'
  const [editReceiptNo, setEditReceiptNo] = useState('');
  const [editReceiptDate, setEditReceiptDate] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('Bank Transfer');
  const [editNotes, setEditNotes] = useState('');
  const [editAmount, setEditAmount] = useState(0);
  const [isEditingReceipt, setIsEditingReceipt] = useState(false);
  const [savingReceipt, setSavingReceipt] = useState(false);

  useEffect(() => {
    if (incomeRecord) {
      if (isOpen && initialMode) setViewMode(initialMode);
      const rawSourceType = incomeRecord.sourceType || 'General';
      const clientNameStr = incomeRecord.clientName || incomeRecord.client?.name || incomeRecord.client?.companyName || '';
      const titleStr = incomeRecord.title || 'Income Record';

      const resolvedSourceType = (rawSourceType === 'Client' || clientNameStr || incomeRecord.client || titleStr.toLowerCase().includes('client'))
        ? 'Client'
        : (rawSourceType === 'Academy' || incomeRecord.department === 'Academy & LMS' || titleStr.toLowerCase().includes('academy') || titleStr.toLowerCase().includes('lms'))
        ? 'Academy'
        : 'General';

      const mongoIdNum = String(incomeRecord._id || '').slice(-4).toUpperCase() || '1001';
      const defaultRecNo = incomeRecord.receiptNo && incomeRecord.receiptNo.trim()
        ? incomeRecord.receiptNo.trim()
        : (resolvedSourceType === 'Client' ? `REC-KB-C${mongoIdNum}` : resolvedSourceType === 'Academy' ? `REC-KB-A${mongoIdNum}` : `REC-KB-G${mongoIdNum}`);

      setEditReceiptNo(defaultRecNo);
      setEditReceiptDate(
        incomeRecord.receiptDate
          ? new Date(incomeRecord.receiptDate).toISOString().split('T')[0]
          : (incomeRecord.date ? new Date(incomeRecord.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
      );
      setEditPaymentMethod(incomeRecord.paymentMethod || 'Bank Transfer');
      const recPaid = parseFloat(incomeRecord.receiptAmount || 0);
      setEditAmount((incomeRecord.status === 'Paid' || incomeRecord.status === 'Partially Paid') && recPaid > 0 ? recPaid : 0);
    }
  }, [incomeRecord, isOpen, initialMode]);

  if (!isOpen || !incomeRecord) return null;

  const rawSourceType = incomeRecord.sourceType || 'General';
  const clientNameStr = incomeRecord.clientName || incomeRecord.client?.name || incomeRecord.client?.companyName || '';
  const titleStr = incomeRecord.title || 'Income Record';

  // Infer category if not explicitly saved on legacy records
  const resolvedSourceType = (rawSourceType === 'Client' || clientNameStr || incomeRecord.client || titleStr.toLowerCase().includes('client'))
    ? 'Client'
    : (rawSourceType === 'Academy' || incomeRecord.department === 'Academy & LMS' || titleStr.toLowerCase().includes('academy') || titleStr.toLowerCase().includes('lms'))
    ? 'Academy'
    : 'General';

  const {
    title = 'Income Record',
    amount = 0,
    department = 'General',
    paymentMethod = 'Bank Transfer',
    date,
    referenceNo,
    description = '',
    taxOption = 'No GST',
    gstCategory = 'NONE',
    gstRate = 0,
    gstAmount = 0,
    cgstAmount = 0,
    sgstAmount = 0,
    igstAmount = 0,
    totalAmount = amount,
    createdByName = 'Accountant',
    status = 'Paid',
    receiptNo,
    receiptDate,
    lineItems = [],
    notes = 'Thank you for your business!',
    terms = 'Payment due within 15 days.'
  } = incomeRecord;

  const finalClientName = clientNameStr || title;

  // Auto-generate display reference number if blank
  const getInvoiceNumber = () => {
    if (referenceNo && referenceNo.trim()) return referenceNo.trim();
    const mongoIdNum = String(incomeRecord._id || '').slice(-4).toUpperCase() || '1001';
    if (resolvedSourceType === 'Client') return `INV-KB-C${mongoIdNum}`;
    if (resolvedSourceType === 'Academy') return `INV-KB-A${mongoIdNum}`;
    return `INV-KB-G${mongoIdNum}`;
  };

  const invoiceNo = getInvoiceNumber();
  const mongoIdNum = String(incomeRecord._id || '').slice(-4).toUpperCase() || '1001';
  const defaultRecNo = receiptNo && receiptNo.trim()
    ? receiptNo.trim()
    : (resolvedSourceType === 'Client' ? `REC-KB-C${mongoIdNum}` : resolvedSourceType === 'Academy' ? `REC-KB-A${mongoIdNum}` : `REC-KB-G${mongoIdNum}`);
  const recNo = editReceiptNo || defaultRecNo;

  const formattedDate = date ? new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) : new Date().toLocaleDateString('en-IN');

  const formattedReceiptDate = editReceiptDate ? new Date(editReceiptDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) : formattedDate;

  const baseAmt = taxOption === 'Inclusive GST' 
    ? (amount / (1 + (gstRate / 100))) 
    : (taxOption === 'Exclusive GST' ? amount : (totalAmount || amount));
  
  const calcGstAmt = gstAmount || (totalAmount - baseAmt);

  const rawLineItems = Array.isArray(lineItems) && lineItems.length > 0 ? lineItems : [];
  const finalLineItems = rawLineItems.length > 0
    ? rawLineItems.map((item, idx) => {
        const qty = parseFloat(item.quantity || 1) || 1;
        const itemAmt = parseFloat(item.amount || 0) > 0 
          ? parseFloat(item.amount) 
          : (parseFloat(item.unitPrice || 0) * qty || baseAmt);
        const itemUnitPrice = parseFloat(item.unitPrice || 0) > 0 
          ? parseFloat(item.unitPrice) 
          : itemAmt / qty;
        return {
          description: item.description && item.description.trim() ? item.description.trim() : (title || `Item #${idx + 1}`),
          quantity: qty,
          unitPrice: itemUnitPrice,
          amount: itemAmt
        };
      })
    : [{ description: title || 'Professional Services', quantity: 1, unitPrice: baseAmt, amount: baseAmt }];

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current) return;
    setIsEditingReceipt(false);
    setDownloading(true);

    const filename = viewMode === 'receipt' 
      ? `${recNo || 'REC'}_Payment_Receipt.pdf`
      : `${invoiceNo || 'INV'}_${resolvedSourceType}_Invoice.pdf`;

    try {
      const element = invoiceRef.current;
      const opt = {
        margin: [5, 5, 5, 5],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          onclone: (clonedDoc) => {
            const styleElements = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
            styleElements.forEach((style) => {
              try {
                if (style.textContent && style.textContent.includes('oklch')) {
                  style.textContent = style.textContent.replace(/oklch\([^)]+\)/g, '#475569');
                }
              } catch (e) {
                console.warn('CSS oklch replacement warning:', e);
              }
            });
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const html2pdfFunc = typeof html2pdf === 'function' ? html2pdf : (html2pdf.default || window.html2pdf);
      if (typeof html2pdfFunc === 'function') {
        await html2pdfFunc().set(opt).from(element).save();
      } else {
        throw new Error('html2pdf function unavailable');
      }
    } catch (err) {
      console.warn('html2pdf save failed, executing direct html2canvas + jsPDF auto-download:', err);
      try {
        const element = invoiceRef.current;
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          onclone: (clonedDoc) => {
            const styleElements = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
            styleElements.forEach((style) => {
              try {
                if (style.textContent && style.textContent.includes('oklch')) {
                  style.textContent = style.textContent.replace(/oklch\([^)]+\)/g, '#475569');
                }
              } catch (e) {}
            });
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(filename);
      } catch (fallbackErr) {
        console.error('Direct PDF export failed:', fallbackErr);
        if (showToast) showToast('Opening print dialog to save PDF.', 'info');
        window.print();
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveReceipt = async () => {
    const numPaid = parseFloat(editAmount) || 0;
    if (numPaid <= 0) {
      if (showToast) showToast('Please enter a valid amount received.', 'error');
      return;
    }

    const settlementPayload = {
      amount: numPaid,
      receiptNo: editReceiptNo,
      receiptDate: editReceiptDate,
      paymentMethod: editPaymentMethod,
      notes: editNotes
    };

    if (onSaveTransient) {
      onSaveTransient(settlementPayload);
    }

    if (!incomeRecord._id || incomeRecord._id === 'PREVIEW') {
      if (showToast) showToast('Payment Receipt recorded!', 'success');
      setIsEditingReceipt(false);
      return;
    }

    try {
      setSavingReceipt(true);
      const rawToken = localStorage.getItem('token');
      const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}` 
      };

      const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
      const getApiEndpoint = (path) => {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        if (API_BASE.endsWith('/v1')) return `${API_BASE}${cleanPath}`;
        if (API_BASE.endsWith('/api')) return `${API_BASE}/v1${cleanPath}`;
        return `${API_BASE}/api/v1${cleanPath}`;
      };

      const res = await fetch(getApiEndpoint(`/accounts/income/${incomeRecord._id}/payment`), {
        method: 'POST',
        headers,
        body: JSON.stringify(settlementPayload)
      });

      const data = await res.json();
      if (data.success) {
        if (showToast) showToast('Payment settlement logged successfully!', 'success');
        setEditAmount(0);
        if (onUpdateSuccess) onUpdateSuccess(data.data);
        setIsEditingReceipt(false);
        setViewMode('logs');
      } else {
        if (showToast) showToast(data.message || 'Failed to record payment settlement.', 'error');
      }
    } catch (err) {
      console.error('Error saving receipt:', err);
      if (showToast) showToast('Error recording payment settlement.', 'error');
    } finally {
      setSavingReceipt(false);
    }
  };

  const displayTotalInvoiceAmt = parseFloat(totalAmount || amount || 0) || 0;

  const totalSettlementPaid = Array.isArray(incomeRecord?.payments) && incomeRecord.payments.length > 0
    ? incomeRecord.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    : parseFloat(incomeRecord?.receiptAmount || 0);

  const rawEditAmt = parseFloat(editAmount);
  const displayPaidAmt = !isNaN(rawEditAmt) && rawEditAmt > 0 && viewMode === 'receipt' && isEditingReceipt
    ? rawEditAmt
    : totalSettlementPaid;

  const displayBalanceDue = Math.max(0, displayTotalInvoiceAmt - displayPaidAmt);

  const dynamicStatus = totalSettlementPaid <= 0
    ? 'Pending'
    : (displayTotalInvoiceAmt - totalSettlementPaid <= 0.01 || totalSettlementPaid >= (displayTotalInvoiceAmt - 0.01) ? 'Paid' : 'Partially Paid');

  const allSettlementList = Array.isArray(incomeRecord?.payments) && incomeRecord.payments.length > 0
    ? incomeRecord.payments
    : (displayPaidAmt > 0 ? [{
        receiptNo: editReceiptNo || recNo,
        receiptDate: editReceiptDate || incomeRecord.receiptDate || date,
        amount: displayPaidAmt,
        paymentMethod: editPaymentMethod || paymentMethod,
        notes: editNotes || notes
      }] : []);

  const totalPaymentsCount = allSettlementList.length;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 overflow-y-auto">
      <div className="relative z-10 w-full max-w-3xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header Action Bar (Hidden during Print & PDF export) */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 shrink-0 gap-2 print:hidden">
          {/* Mode Switcher Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('invoice')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'invoice'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText size={13} />
              <span>Tax Invoice</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('receipt')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'receipt'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 size={13} />
              <span>Payment Receipt</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('logs')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'logs'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History size={13} />
              <span>Payment Logs</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'receipt' && (
              <button
                type="button"
                onClick={() => setIsEditingReceipt(!isEditingReceipt)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  isEditingReceipt
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <Pencil size={13} />
                <span>{isEditingReceipt ? 'Close Editor' : 'Edit Receipt'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download size={14} />
              <span>{downloading ? 'Exporting...' : 'Download PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Editable Receipt Bar inside Modal (Hidden during Print) */}
        {viewMode === 'receipt' && isEditingReceipt && (
          <div className="bg-emerald-50/90 border-b border-emerald-200 p-3.5 shrink-0 space-y-2 print:hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                <Pencil size={12} /> Edit Payment Receipt Details
              </span>
              <button
                type="button"
                onClick={handleSaveReceipt}
                disabled={savingReceipt}
                className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
              >
                {savingReceipt ? <Loader2 className="animate-spin" size={13} /> : <CheckCircle2 size={13} />}
                <span>Save Receipt</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 text-xs">
              <div>
                <label className="block text-[9px] font-extrabold uppercase text-emerald-800 mb-0.5">Receipt No</label>
                <input
                  type="text"
                  value={editReceiptNo}
                  onChange={(e) => setEditReceiptNo(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
              <div>
                <label className="block text-[9px] font-extrabold uppercase text-emerald-800 mb-0.5">Receipt Date</label>
                <input
                  type="date"
                  value={editReceiptDate}
                  onChange={(e) => setEditReceiptDate(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-lg px-2 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer font-medium"
                />
              </div>
              <div>
                <label className="block text-[9px] font-extrabold uppercase text-emerald-800 mb-0.5">Amount Received (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full bg-white border border-emerald-300 rounded-lg px-2 py-1 font-black text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
              <div>
                <label className="block text-[9px] font-extrabold uppercase text-amber-800 mb-0.5">Balance Due (₹)</label>
                <div className="w-full bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 font-black text-amber-700">
                  ₹{Math.round(displayBalanceDue).toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-extrabold uppercase text-emerald-800 mb-0.5">Payment Mode</label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-lg px-2 py-1 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-extrabold uppercase text-emerald-800 mb-0.5">Remarks / Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-lg px-2 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-medium"
                />
              </div>
            </div>
          </div>
        )}

        {/* Printable Document Container */}
        <div className="p-6 overflow-y-auto font-sans" ref={invoiceRef}>
          {/* ─────────────────────────────────────────────────────────────
              VIEW MODE: PAYMENT RECEIPT (ZOHO STYLE RECEIPT)
             ───────────────────────────────────────────────────────────── */}
          {viewMode === 'receipt' && (
            <div className="space-y-6 text-slate-800 relative">
              {/* PAID Watermark Badge */}
              <div className="absolute top-2 right-2 border-4 border-emerald-500/40 text-emerald-600 text-2xl font-black px-6 py-2 rounded-2xl transform rotate-[-12deg] tracking-widest pointer-events-none select-none">
                {displayBalanceDue === 0 ? 'PAID' : 'PARTIAL PAYMENT'}
              </div>

              {/* Top Header Branding */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-emerald-600 pb-5">
                <div>
                  <img src="/logo3.png" alt="Logo" className="h-12 w-auto object-contain mb-1" />
                  <p className="text-[11px] text-slate-500 font-medium">Finance & Accounts Division</p>
                  <p className="text-[10px] text-slate-400">GSTIN: 32ABCDE1234F1Z5</p>
                </div>

                <div className="sm:text-right">
                  <span className="inline-block px-3.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black uppercase rounded-lg tracking-wider mb-1">
                    PAYMENT RECEIPT
                  </span>
                  <p className="text-xs font-bold text-slate-900">Receipt No: <span className="font-mono text-emerald-600">{recNo}</span></p>
                  <p className="text-[11px] text-slate-500">Payment Date: {formattedReceiptDate}</p>
                </div>
              </div>

              {/* Payer & Payment Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1.5">
                  <h4 className="font-extrabold uppercase text-[10px] text-emerald-700 tracking-wider">Payment Received From</h4>
                  <p className="font-black text-slate-900 text-sm">{finalClientName}</p>
                  <p className="text-slate-600 text-[11px]">Payment Mode: <strong className="text-slate-900">{editPaymentMethod || paymentMethod}</strong></p>
                  <p className="text-slate-500 text-[10px]">Reference / Inv No: <strong className="font-mono text-slate-800">{invoiceNo}</strong></p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-right flex flex-col justify-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Amount Received</span>
                  <span className="text-2xl font-black text-emerald-600">₹{Math.round(displayPaidAmt).toLocaleString('en-IN')}</span>
                  <span className="text-[10px] font-bold text-slate-500">Balance Due: <strong className="text-slate-900">₹{Math.round(displayBalanceDue).toLocaleString('en-IN')}</strong></span>
                </div>
              </div>

              {/* Payment Details Table */}
              <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-emerald-50 text-emerald-950 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Invoice Number</th>
                    <th className="p-3">Invoice Date</th>
                    <th className="p-3 text-right">Invoice Amount (₹)</th>
                    <th className="p-3 text-right">Amount Paid (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr>
                    <td className="p-3 font-mono font-bold text-slate-900">{invoiceNo}</td>
                    <td className="p-3 text-slate-600">{formattedDate}</td>
                    <td className="p-3 text-right font-semibold">₹{Math.round(displayTotalInvoiceAmt).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right font-black text-emerald-600 text-sm">₹{Math.round(displayPaidAmt).toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>

              {/* Receipt Footer */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-xs">
                  <ShieldCheck size={20} />
                  <div>
                    <p className="text-slate-800 font-bold">Official Payment Voucher</p>
                    <p className="text-[10px] text-slate-400 font-normal">Thank you for your prompt payment!</p>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-400">
                  <p className="font-bold text-slate-800 uppercase">Accounts Officer Stamp</p>
                  <p>Authorized Signature ({createdByName})</p>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              VIEW MODE: TAX INVOICE
             ───────────────────────────────────────────────────────────── */}
          {viewMode === 'invoice' && (
            <div className="space-y-6 text-slate-800">
              {/* Top Header Branding */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-indigo-600 pb-5">
                <div>
                  <div className="flex items-center gap-3">
                    <img src="/logo3.png" alt="Logo" className="h-12 w-auto object-contain" />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">Enterprise Software & CRM Solutions</p>
                  <p className="text-[10px] text-slate-400">GSTIN: 32ABCDE1234F1Z5 | HSN/SAC: 998314</p>
                </div>

                <div className="sm:text-right">
                  <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black uppercase rounded-lg tracking-wider mb-1">
                    {taxOption !== 'No GST' ? 'TAX INVOICE' : 'INVOICE'}
                  </span>
                  <p className="text-xs font-bold text-slate-900">Invoice No: <span className="font-mono text-indigo-600">{invoiceNo}</span></p>
                  <p className="text-[11px] text-slate-500">Date: {formattedDate}</p>
                </div>
              </div>

              {/* Billed From & Billed To Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <h4 className="font-extrabold uppercase text-[10px] text-slate-400 tracking-wider">Billed From (Provider)</h4>
                  <p className="font-bold text-slate-900">KOD.BRAND Tech Pvt Ltd</p>
                  <p className="text-slate-600 text-[11px]">Head Office, Corporate Tower, Tech Park</p>
                  <p className="text-slate-600 text-[11px]">Kerala, India — 682001</p>
                  <p className="text-slate-500 text-[10px]">Email: accounts@kodbrand.com</p>
                </div>

                <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1">
                  <h4 className="font-extrabold uppercase text-[10px] text-indigo-500 tracking-wider">Billed To (Customer / Client)</h4>
                  <p className="font-bold text-indigo-950 text-sm">{finalClientName}</p>
                  <p className="text-slate-600 text-[11px]">Department: {department}</p>
                  <p className="text-slate-500 text-[11px]">Payment Mode: <strong className="text-slate-800">{paymentMethod}</strong></p>
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Item / Service Description</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price (₹)</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {finalLineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 text-slate-400">{idx + 1}</td>
                      <td className="p-3">
                        <strong className="text-slate-900 block">{item.description}</strong>
                        {description && idx === 0 && <span className="text-[11px] text-slate-500">{description}</span>}
                      </td>
                      <td className="p-3 text-center">{Math.round(item.quantity || 1)}</td>
                      <td className="p-3 text-right">₹{Math.round(parseFloat(item.unitPrice || baseAmt)).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-bold text-slate-900">₹{Math.round(parseFloat(item.amount || baseAmt)).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tax Breakdown & Summary Box */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
                <div className="text-[11px] text-slate-500 space-y-1 max-w-sm">
                  <p className="font-bold text-slate-700">Tax Breakdown & Terms:</p>
                  {gstCategory === 'CGST_SGST' ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-[10px] text-emerald-900 space-y-0.5 font-medium">
                      <p>• CGST ({gstRate / 2}%): ₹{Math.round(cgstAmount || calcGstAmt / 2).toLocaleString('en-IN')}</p>
                      <p>• SGST ({gstRate / 2}%): ₹{Math.round(sgstAmount || calcGstAmt / 2).toLocaleString('en-IN')}</p>
                      <p className="font-bold border-t border-emerald-200 pt-0.5">Intra-State GST Applied</p>
                    </div>
                  ) : gstCategory === 'IGST' ? (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 text-[10px] text-indigo-900 space-y-0.5 font-medium">
                      <p>• IGST ({gstRate}%): ₹{Math.round(igstAmount || calcGstAmt).toLocaleString('en-IN')}</p>
                      <p className="font-bold border-t border-indigo-200 pt-0.5">Inter-State Integrated GST Applied</p>
                    </div>
                  ) : (
                    <p className="italic text-slate-400">Non-GST / Exempt Invoice</p>
                  )}
                  {notes && <p className="text-[10px] text-slate-500 italic mt-1">{notes}</p>}
                </div>

                <div className="w-full sm:w-64 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Base:</span>
                    <span>₹{Math.round(baseAmt).toLocaleString('en-IN')}</span>
                  </div>
                  {calcGstAmt > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Total GST Tax:</span>
                      <span>+ ₹{Math.round(calcGstAmt).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-extrabold text-slate-900">
                    <span>Total Amount (₹):</span>
                    <span>₹{Math.round(totalAmount || amount).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Signatory Footer */}
              <div className="border-t border-slate-200 pt-4 flex justify-between items-center text-[10px] text-slate-400">
                <div>
                  <p>Computer Generated Invoice</p>
                  <p>Issued By: {createdByName}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-700 uppercase">Authorized Signatory</p>
                  <p className="text-[9px] text-slate-400">Finance Division</p>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'logs' && (
            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    Payment Logs & Audit History
                  </h3>
                  <p className="text-xs text-slate-500">Transaction history and audit trail for <strong className="font-mono text-slate-800">{invoiceNo}</strong></p>
                </div>
                <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                  dynamicStatus === 'Paid'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : dynamicStatus === 'Partially Paid'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  Status: {dynamicStatus}
                </span>
              </div>

              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total Billed</span>
                  <span className="text-base font-black text-slate-900">₹{Math.round(displayTotalInvoiceAmt).toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <span className="text-[10px] font-extrabold uppercase text-emerald-600 block">Amount Received</span>
                  <span className="text-base font-black text-emerald-700">₹{Math.round(displayPaidAmt).toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <span className="text-[10px] font-extrabold uppercase text-amber-600 block">Balance Due</span>
                  <span className="text-base font-black text-amber-700">₹{Math.round(displayBalanceDue).toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
                  <span className="text-[10px] font-extrabold uppercase text-indigo-600 block">Settlements Logged</span>
                  <span className="text-base font-black text-indigo-700">{totalPaymentsCount} Logged</span>
                </div>
              </div>

              {/* Timeline Audit Logs */}
              <div className="relative border-l-2 border-indigo-200 ml-4 space-y-6 pt-2">
                {/* Entry 1: Invoice Generation */}
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-600 ring-4 ring-indigo-100 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">Tax Invoice Created & Saved</span>
                      <span className="text-[11px] text-slate-500">{formattedDate}</span>
                    </div>
                    <p className="text-xs text-slate-600">Reference: <strong className="font-mono text-slate-800">{invoiceNo}</strong> — Initial Billed Amount: <strong className="text-slate-900">₹{Math.round(displayTotalInvoiceAmt).toLocaleString('en-IN')}</strong></p>
                    <p className="text-[11px] text-slate-400">Recorded By: {createdByName}</p>
                  </div>
                </div>

                {/* Individual Payment Settlement Entries */}
                {allSettlementList.map((st, idx) => (
                  <div key={st._id || idx} className="relative pl-6">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-100 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Payment Settlement #{idx + 1} Logged
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-emerald-800 font-medium">
                            {st.receiptDate ? new Date(st.receiptDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : formattedDate}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditReceiptNo(st.receiptNo || editReceiptNo);
                              if (st.receiptDate) setEditReceiptDate(new Date(st.receiptDate).toISOString().split('T')[0]);
                              setEditPaymentMethod(st.paymentMethod || 'Bank Transfer');
                              setEditAmount(st.amount || 0);
                              setEditNotes(st.notes || '');
                              setViewMode('receipt');
                            }}
                            className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs flex items-center gap-1 transition cursor-pointer"
                            title="View & Download Receipt for this settlement"
                          >
                            <Receipt size={11} />
                            <span>View Receipt</span>
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-emerald-900 space-y-1 pt-1">
                        <p>Receipt Voucher: <strong className="font-mono">{st.receiptNo || editReceiptNo}</strong></p>
                        <p>Settlement Amount: <strong className="text-emerald-700 font-black text-sm">₹{Math.round(parseFloat(st.amount || 0)).toLocaleString('en-IN')}</strong></p>
                        <p>Payment Mode: <strong>{st.paymentMethod || editPaymentMethod || paymentMethod}</strong></p>
                        {st.notes && <p className="text-[11px] italic text-emerald-800">Notes: "{st.notes}"</p>}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Entry 3: Status Summary Entry */}
                {displayBalanceDue <= 0.01 && displayPaidAmt > 0 ? (
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-100 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                    <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5">
                      <div className="flex items-center justify-between text-xs text-emerald-950 font-bold">
                        <span>Invoice Fully Settled (Balance Due: ₹0)</span>
                        <span className="text-emerald-700 font-black">Status: Paid</span>
                      </div>
                      <p className="text-[11px] text-emerald-800 mt-0.5">All billed payments have been received and verified.</p>
                    </div>
                  </div>
                ) : displayBalanceDue > 0 && displayPaidAmt > 0 ? (
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-amber-500 ring-4 ring-amber-100 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
                      <div className="flex items-center justify-between text-xs text-amber-950 font-bold">
                        <span>Outstanding Balance Remaining</span>
                        <span className="text-amber-800 font-black">₹{Math.round(displayBalanceDue).toLocaleString('en-IN')}</span>
                      </div>
                      <p className="text-[11px] text-amber-800 mt-0.5">Status set to Partially Paid. Awaiting final settlement.</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-rose-500 ring-4 ring-rose-100 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                    <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5">
                      <div className="flex items-center justify-between text-xs text-rose-950 font-bold">
                        <span>No Payments Received (Amount Received: ₹0)</span>
                        <span className="text-rose-700 font-black">Status: Pending</span>
                      </div>
                      <p className="text-[11px] text-rose-800 mt-0.5">Payment is pending. Awaiting collection.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default IncomeInvoiceModal;
