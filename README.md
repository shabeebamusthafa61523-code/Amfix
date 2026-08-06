# KODBRAND Enterprise CRM & Operations Management System

A full-stack, enterprise-grade Customer Relationship Management (CRM) and Operations Tracking System built with **React 19**, **Vite 8**, **Node.js/Express**, and **MongoDB Atlas**. Designed for multi-department organizations with role-based access control (RBAC), executive analytics, lead pipeline management, task tracking, and automated shift reporting.

---

## 🌟 Key Features

### 📊 Role-Based Dashboards & Analytics
- **Admin Dashboard**: Core metrics, project statistics, lead funnels, and department workload analytics.
- **MD / Executive Dashboard**: Executive-level overview and high-level KPIs.
- **HR Dashboard**: Real-time employee attendance, task completion rates, and workforce analytics.
- **Specialized Department Dashboards**: Custom views for Developers, Graphic Designers, Videographers, Telecallers, and Counselors.

### 🎯 Lead Pipeline & Management
- **Telecaller & Client Lead Directories**: Track leads across stages (*New, Contacted, Follow Up, Interested, Converted, Lost*).
- **Lead Classification**: Filter leads by temperature rating (*Hot Lead, Warm Lead, Cold Lead, RNT, Switched Off, Call Back*).
- **Import / Export Engine**: Bulk import/export using Excel (`.xlsx`) and formatted PDF report downloads.
- **Inline Editing & Activity Tracking**: Real-time status updates, assignment shifts, and follow-up logging.

### 📋 Task & Attendance Tracking
- **Task Management**: Assign tasks, monitor progress, attach documents, and view real-time completion status.
- **Employee & Student Attendance**: Clock-in/clock-out tracking and attendance history.

### 📄 Shift Reporting & AI Intelligence
- **Shift Reports**: Automated reporting for Developers, Designers, Videographers, Counselors, Ops, HR, and Accountants.
- **AI-Powered Insights**: AI summary reports integrated with the **Groq API**.

### 🔐 Granular Role-Based Access Control (RBAC)
- **Roles**: Super Admin, Admin, MD, HR, Manager, Team Lead, Employee.
- **Custom Sidebar Permissions**: Dynamically toggle sidebar module access per user.
- **View-Only Safeguards**: Restrict sensitive operational modifications for HR and Admin views on specific directories.

---

## 🛠️ Technology Stack

### Frontend (`front crm`)
- **Core**: React 19, Vite 8, JavaScript (ES6+)
- **Styling**: Tailwind CSS v4, Framer Motion
- **Icons**: Lucide React
- **Document Processing**: `xlsx`, `jspdf`, `jspdf-autotable`, `html2pdf.js`

### Backend (`backend`)
- **Runtime & Server**: Node.js, Express.js
- **Database**: MongoDB Atlas (via Mongoose ORM)
- **Authentication**: JSON Web Tokens (JWT), Bcrypt password hashing
- **File & Media Storage**: Cloudinary CDN Engine
- **Mailing Engine**: Nodemailer / SMTP
- **AI Engine**: Groq SDK (`groq-sdk`)

---

## 📁 Repository Structure

```
crm-test/
├── backend/                  # Express.js REST API Server
│   ├── src/
│   │   ├── controllers/      # Route controllers (Auth, Leads, Tasks, Users, Reports)
│   │   ├── models/           # Mongoose Database Schemas
│   │   ├── routes/           # API Endpoint Route Handlers
│   │   └── middleware/       # JWT Auth & Upload Middlewares
│   ├── app.js                # Express App Setup & CORS Configuration
│   ├── server.js             # HTTP Server Entry Point
│   └── .env                  # Backend Environment Variables
│
├── front crm/                # React Vite SPA Frontend
│   ├── src/
│   │   ├── components/       # Reusable UI (Sidebar, Navbar, Toast, Modals)
│   │   ├── pages/            # Page Views (Dashboards, Leads, Tasks, Users)
│   │   ├── services/         # API Service Fetch Layers
│   │   ├── contexts/         # User Context Provider
│   │   ├── App.jsx           # App Routes & Protected Guards
│   │   └── main.jsx          # App Entry Point
│   ├── vite.config.js        # Vite Build & Reverse Proxy Settings
│   └── .env                  # Frontend Environment Variables
│
└── README.md                 # Project Documentation
```

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB Atlas** account (or local MongoDB server)

---

### 1. Clone the Repository
```bash
git clone https://github.com/your-organization/crm-project.git
cd crm-project
```

---

### 2. Configure Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend/` directory:

```env
# Server Core Settings
PORT=5000
NODE_ENV=development

# Security & CORS Origins
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174

# Database Connection (MongoDB Atlas)
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/crm

# Security Token Key
JWT_SECRET=your_jwt_secret_key_here

# Cloudinary Storage CDN
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AI Engine
Groq_API_KEY=your_groq_api_key
```

Run the backend server:
```bash
npm run dev
# Server will start at http://localhost:5000
```

---

### 3. Configure Frontend Setup

Open a new terminal window:

```bash
cd "front crm"
npm install
```

Create a `.env` file inside the `front crm/` directory:

```env
VITE_API_URL=/api
```

Run the Vite development server:
```bash
npm run dev
# Frontend will start at http://localhost:5173
```

---

## 📡 API Endpoint Overview

| Method | Endpoint | Description | Access |
|---|---|---|---|
| **POST** | `/api/auth/login` | User authentication & JWT issuance | Public |
| **GET** | `/api/v1/users` | List all system users | Admin / HR |
| **PUT** | `/api/v1/users/:id/permissions` | Configure user sidebar permissions | Admin |
| **GET** | `/api/v1/client-leads` | Fetch client lead directory | Authorized Roles |
| **POST** | `/api/v1/client-leads` | Create new client lead | Authorized Roles |
| **GET** | `/api/v1/leads` | Fetch telecaller leads | Authorized Roles |
| **GET** | `/api/v1/tasks` | List operational tasks | All Users |
| **GET** | `/api/v1/md-dashboard` | Fetch MD executive summary metrics | MD / Admin |
| **GET** | `/api/v1/attendance` | Get attendance logs | All Users |

---

## 🌐 Production Deployment

### Building for Production
To build the frontend SPA for production deployment:

```bash
cd "front crm"
npm run build
```

This creates an optimized production bundle in `front crm/dist`.

### Deployment Instructions
- **Frontend**: Deploy `front crm/dist` to **Vercel**, **Netlify**, or an **Nginx** static server with React SPA fallback enabled (`try_files $uri $uri/ /index.html`).
- **Backend**: Deploy `backend/` to **Render**, **DigitalOcean**, **AWS EC2**, or **Heroku**.
- Refer to `domain_migration_guide.md` for detailed instructions on domain transfers, SSL setup, and CORS configuration.

---

## 📄 License
Privately developed for **KODBRAND Command HQ**. All rights reserved.
