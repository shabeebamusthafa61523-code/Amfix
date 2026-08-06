import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import jwt from 'jsonwebtoken';

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://shabeeba:9995982324@cluster0.i23tzbf.mongodb.net/crm?appName=Cluster0');
    
    // Find Athira and Liyana
    const users = await User.find({ name: /Liyana|Athira/i });
    
    for (const u of users) {
      console.log(`\n======================================`);
      console.log(`Testing for ${u.name}`);
      const token = jwt.sign(
        {
          id: u._id,
          role_id: u.role_id,
          role: u.role,
          departmentId: u.departmentId || null
        },
        process.env.JWT_SECRET || 'secret_key_123',
        { expiresIn: '7d' }
      );

      const res = await fetch('http://localhost:5000/api/v1/tasks/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          console.log(`Success! Fetched ${data.length} tasks.`);
          data.forEach(t => {
             console.log(`- ${t.title} | Assigned To: ${t.assigned_to?.name} | Created By: ${t.created_by?.name}`);
          });
        } else {
          console.log(`Fetched object keys:`, Object.keys(data));
        }
      } catch (e) {
        console.error('Failed to parse:', text.slice(0, 200));
      }
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

run();
