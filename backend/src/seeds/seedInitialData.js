// backend/src/seeds/seedInitialData.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import Department from '../modules/departments/department.model.js';
import Designation from '../modules/departments/designation.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crm_db';

const DEPARTMENTS = [
  { name: 'ACCOUNTS', description: 'Accountant & Financial Management' },
  { name: 'DESIGNERS', description: 'Graphic Design & Creative Team' },
  { name: 'HR/ADMIN', description: 'Human Resources & Administration' },
  { name: 'MARKETING', description: 'Digital Marketing & Growth Team' },
  { name: 'Non-Operational', description: 'Non-Operational Department' },
  { name: 'R&D', description: 'Research & Software Development' },
  { name: 'SALES&GROWTH', description: 'Operations, Sales & Growth' },
  { name: 'TELECALLER', description: 'Telecalling & Student Counseling' },
  { name: 'VIDEO/EDITOR', description: 'Videography & Video Editing' }
];

const DESIGNATIONS = [
  'ACADEMIC COUNSELOR',
  'ADMIN',
  'CMO',
  'CMOO',
  'DIGITAL MARKETER',
  'GRAPHIC DESIGNER',
  'HOD R&D',
  'HR',
  'JUNIOR ACCOUNTANT',
  'JUNIOR DEVELOPER',
  'MD',
  'Non-Operational',
  'OPERATION MANAGER',
  'VIDEOGRAPHER CUM EDITOR'
];

export const seedInitialData = async () => {
  try {
    console.log('🌱 Connecting to MongoDB for initial seeding...');
    await mongoose.connect(MONGO_URI);

    // 1. Seed Departments
    console.log('📦 Seeding 9 standard departments...');
    const deptMap = {};
    for (const d of DEPARTMENTS) {
      const doc = await Department.findOneAndUpdate(
        { name: d.name },
        d,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      deptMap[d.name] = doc._id;
    }

    // 2. Seed Designations
    console.log('🏷️ Seeding 14 standard designations...');
    for (const title of DESIGNATIONS) {
      await Designation.findOneAndUpdate(
        { name: title },
        { name: title },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // 3. Seed Default Super Admin Account
    console.log('👑 Checking default Super Admin account...');
    const existingSuperAdmin = await User.findOne({ 
      $or: [{ role: 'superadmin' }, { isSuperAdmin: true }] 
    });

    if (!existingSuperAdmin) {
      const hashedPassword = await bcrypt.hash('Admin@1234', 10);
      await User.create({
        name: 'Super Admin',
        email: 'superadmin@gmail.com',
        password: hashedPassword,
        role: 'superadmin',
        role_id: '0',
        isSuperAdmin: true,
        departmentId: deptMap['HR/ADMIN'],
        department: 'HR/ADMIN',
        status: 'active',
        isActive: true
      });
      console.log('✅ Created Default Super Admin Account: superadmin@gmail.com / Admin@1234');
    } else {
      console.log('ℹ️ Super Admin account already exists.');
    }

    console.log('🎉 Initial Database Seeding Complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
};

seedInitialData();
