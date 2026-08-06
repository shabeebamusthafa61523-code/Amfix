import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/user.model.js';

dotenv.config();

async function run() {
  try {
    const mongoUri = process.env.DATABASE_URL || process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm';
    console.log('Connecting to MongoDB at:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected!');

    // 1. Promote all existing Admin / HR users to Super Admin
    const admins = await User.find({
      $or: [
        { role: 'admin' },
        { role: 'hr' },
        { role_id: '1' },
        { role_id: '2' }
      ]
    });

    console.log(`Found ${admins.length} Admin/HR users to promote to Super Admin:`);
    for (const a of admins) {
      a.isSuperAdmin = true;
      a.role = 'superadmin';
      a.role_id = '0';
      await a.save();
      console.log(` - Updated user: ${a.name} (${a.email}) -> role: superadmin`);
    }

    // 2. Also ensure a dedicated Super Admin user account exists: superadmin@gmail.com
    let superAdmin = await User.findOne({ email: 'superadmin@gmail.com' });
    if (!superAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('SuperAdmin@123', salt);
      superAdmin = new User({
        name: 'Super Admin',
        email: 'superadmin@gmail.com',
        phone: '9999999999',
        role: 'superadmin',
        role_id: '0',
        isSuperAdmin: true,
        password: hashedPassword,
        passwordHash: hashedPassword,
        status: 'active',
        isActive: true
      });
      await superAdmin.save();
      console.log('✨ Created NEW dedicated Super Admin account: superadmin@gmail.com / SuperAdmin@123');
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('SuperAdmin@123', salt);
      superAdmin.isSuperAdmin = true;
      superAdmin.role = 'superadmin';
      superAdmin.role_id = '0';
      superAdmin.password = hashedPassword;
      superAdmin.passwordHash = hashedPassword;
      superAdmin.status = 'active';
      superAdmin.isActive = true;
      await superAdmin.save();
      console.log('✨ Reset Super Admin account credentials: superadmin@gmail.com / SuperAdmin@123');
    }

    console.log('\n======================================================');
    console.log('✅ ALL ADMIN ACCOUNTS ARE NOW SUPER ADMINS!');
    console.log('🔑 DEDICATED SUPER ADMIN CREDENTIALS:');
    console.log('   Email:    superadmin@gmail.com');
    console.log('   Password: SuperAdmin@123');
    console.log('======================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding Super Admin:', err);
    process.exit(1);
  }
}

run();
