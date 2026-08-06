import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/user.model.js';

dotenv.config();

async function run() {
  try {
    const mongoUri = process.env.DATABASE_URL || process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected!');

    // Revert all users except superadmin@gmail.com back to standard admin / hr roles
    const superAdminEmail = 'superadmin@gmail.com';

    const usersToRevert = await User.find({
      email: { $ne: superAdminEmail },
      role: 'superadmin'
    });

    console.log(`Reverting ${usersToRevert.length} users back to standard Admin/HR roles:`);
    for (const u of usersToRevert) {
      // Revert based on their email or original role
      if (u.email.includes('salwa') || u.email.includes('jasna')) {
        u.role = 'hr';
        u.role_id = '1';
      } else {
        u.role = 'admin';
        u.role_id = '2';
      }
      u.isSuperAdmin = false;
      await u.save();
      console.log(` - Reverted: ${u.name} (${u.email}) -> role: ${u.role}, isSuperAdmin: false`);
    }

    // Ensure superadmin@gmail.com remains the ONLY default Super Admin
    const mainSuperAdmin = await User.findOne({ email: superAdminEmail });
    if (mainSuperAdmin) {
      mainSuperAdmin.role = 'superadmin';
      mainSuperAdmin.role_id = '0';
      mainSuperAdmin.isSuperAdmin = true;
      await mainSuperAdmin.save();
      console.log(`✅ ${mainSuperAdmin.email} confirmed as ONLY default Super Admin!`);
    }

    console.log('\n======================================================');
    console.log('✅ REVERTED ALL OTHER USERS TO STANDARD ROLES!');
    console.log('👑 ONLY superadmin@gmail.com CAN SEE EVERY MENU ITEM!');
    console.log('======================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error reverting admins:', err);
    process.exit(1);
  }
}

run();
