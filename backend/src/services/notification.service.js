import nodemailer from 'nodemailer';
import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';

// Create SMTP Transporter using .env credentials
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || user.includes('smtp_username_here') || !pass || pass.includes('smtp_password_here')) {
    return null;
  }

  // Handle Gmail service shortcut automatically
  if (host.includes('gmail') || (user && user.endsWith('@gmail.com'))) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass
      }
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Generic email sender tool
 */
export const sendEmail = async (to, subject, htmlContent, textFallback = '') => {
  try {
    if (!to || typeof to !== 'string') return { success: false, message: 'Invalid recipient email' };

    const fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || '"KOD.BRAND CRM" <no-reply@kodbrand.com>';
    const transporter = createTransporter();

    if (!transporter) {
      console.log(`\n================== 📧 SIMULATED MAIL DELIVERY 💾 ==================`);
      console.log(`TO:      ${to}`);
      console.log(`FROM:    ${fromAddress}`);
      console.log(`SUBJECT: ${subject}`);
      console.log(`BODY:\n${textFallback || htmlContent}`);
      console.log(`=================================================================\n`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      html: htmlContent,
      text: textFallback || subject
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP Mailer] 🚀 Email sent successfully to ${to} | Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[SMTP Mailer Error] Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Sends a rich HTML task assignment email to a staff member
 */
export const sendTaskAssignmentEmail = async ({ recipientEmail, recipientName, taskTitle, taskDescription, dueDate, creatorName }) => {
  if (!recipientEmail) return;

  const subject = `📋 New Task Assigned: "${taskTitle}"`;
  const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'No Deadline';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0 0; opacity: 0.9; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        .body { padding: 32px 24px; }
        .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .task-card { background: #f1f5f9; border-left: 4px solid #6366f1; border-radius: 12px; padding: 20px; margin: 20px 0; }
        .task-title { font-size: 18px; font-weight: 800; color: #1e1b4b; margin: 0 0 8px 0; }
        .task-desc { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px 0; }
        .badge { display: inline-block; padding: 4px 10px; background: #e0e7ff; color: #4338ca; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>KOD.BRAND Command HQ</h1>
          <p>New Task Assignment</p>
        </div>
        <div class="body">
          <div class="greeting">Hello ${recipientName || 'Team Member'}, 👋</div>
          <p style="font-size: 14px; color: #334155; line-height: 1.5;">You have been assigned a new task by <strong>${creatorName || 'a Manager'}</strong>. Please review the task details below:</p>
          
          <div class="task-card">
            <div class="task-title">${taskTitle}</div>
            ${taskDescription ? `<div class="task-desc">${taskDescription}</div>` : ''}
            <div style="margin-top: 12px;">
              <span class="badge">Due Date: ${formattedDueDate}</span>
            </div>
          </div>

          <p style="font-size: 13px; color: #64748b;">Log into your CRM workspace to view full attachments, progress notes, and start working on this task.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} KOD.BRAND Command HQ. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(recipientEmail, subject, htmlContent, `New Task Assigned: ${taskTitle}. Due: ${formattedDueDate}. Creator: ${creatorName}`);
};

/**
 * Sends a task status update email
 */
export const sendTaskStatusUpdateEmail = async ({ recipientEmail, recipientName, taskTitle, oldStatus, newStatus, updatedByName }) => {
  if (!recipientEmail) return;

  const subject = `🔄 Task Status Updated: "${taskTitle}" -> ${newStatus.toUpperCase()}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
        .body { padding: 28px 24px; }
        .status-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 16px; margin: 16px 0; text-align: center; }
        .status-badge { display: inline-block; padding: 6px 14px; background: #0284c7; color: #ffffff; border-radius: 20px; font-weight: 800; font-size: 13px; text-transform: uppercase; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Task Progress Notification</h1>
        </div>
        <div class="body">
          <p style="font-size: 15px; font-weight: 700; color: #0f172a;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 14px; color: #334155;">The status of task <strong>"${taskTitle}"</strong> was updated by <strong>${updatedByName || 'a team member'}</strong>.</p>
          
          <div class="status-box">
            <span style="font-size: 12px; color: #64748b; font-weight: 700;">NEW STATUS</span><br/>
            <span class="status-badge" style="margin-top: 6px;">${newStatus.toUpperCase()}</span>
          </div>
        </div>
        <div class="footer">
          KOD.BRAND CRM System Notification
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(recipientEmail, subject, htmlContent, `Task Status Updated: ${taskTitle} is now ${newStatus}`);
};

/**
 * Creates in-app notification AND triggers email notification automatically
 */
export const sendNotification = async (userId, message, type = 'info', title = 'Notification', createdBy = null, createdByName = 'System') => {
  try {
    let userEmail = null;
    let userName = null;

    if (userId) {
      const recipient = await User.findById(userId).select('name email');
      if (recipient) {
        userEmail = recipient.email;
        userName = recipient.name;
      }
    }

    // 1. Create In-App Notification in DB
    const newNotification = new Notification({
      title,
      description: message,
      assignedTo: userId,
      createdBy,
      createdByName,
      isRead: false
    });
    await newNotification.save();

    // 2. If recipient has an email, trigger email delivery
    if (userEmail) {
      await sendEmail(
        userEmail,
        `🔔 ${title}`,
        `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', sans-serif; background-color: #f8fafc; padding: 20px; }
            .card { background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 550px; margin: 0 auto; }
            .title { font-size: 16px; font-weight: 800; color: #4338ca; margin-bottom: 8px; }
            .desc { font-size: 14px; color: #334155; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="title">🔔 ${title}</div>
            <div class="desc">${message}</div>
            <hr style="border: none; border-top: 1px solid #f1f5f9; margin-top: 16px;"/>
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">Sent via KOD.BRAND CRM HQ</p>
          </div>
        </body>
        </html>
        `,
        message
      );
    }

    return { success: true, notification: newNotification };
  } catch (error) {
    console.error('Error in sendNotification service:', error);
    return { success: false, error: error.message };
  }
};

const notificationService = {
  sendNotification,
  sendEmail,
  sendTaskAssignmentEmail,
  sendTaskStatusUpdateEmail
};

export default notificationService;