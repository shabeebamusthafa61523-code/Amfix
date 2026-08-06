import mongoose from 'mongoose';
import User from './src/models/user.model.js';

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://shabeeba:9995982324@cluster0.i23tzbf.mongodb.net/crm?appName=Cluster0');
    
    const users = await User.find({}).select('name role designation department departmentId isActive email');
    
    console.log(`Found ${users.length} users. Looking for anyone related to R&D...`);
    const rdUsers = users.filter(u => 
      String(u.department).toLowerCase().includes('r&d') || 
      String(u.designation).toLowerCase().includes('r&d') ||
      String(u.departmentId) === '6a1d5d3ea35c97490f38b383'
    );
    
    console.log(`\nUsers in R&D:`);
    rdUsers.forEach(u => {
      console.log(`- ${u.name} | Role: ${u.role} | Desig: ${u.designation} | Dept: ${u.department} | ID: ${u._id}`);
    });
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};
run();
