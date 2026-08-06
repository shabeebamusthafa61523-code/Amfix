import mongoose from 'mongoose';
import Department from './src/modules/departments/department.model.js';
import User from './src/models/user.model.js';
import Task from './src/models/task.model.js';

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://shabeeba:9995982324@cluster0.i23tzbf.mongodb.net/crm?appName=Cluster0');
    
    const depts = await Department.find({});
    console.log(`Found ${depts.length} departments.`);
    
    for (const d of depts) {
      if (d.managerId) {
        const manager = await User.findById(d.managerId).select('name');
        console.log(`- ${d.name} has manager: ${manager ? manager.name : 'Unknown User'} (${d.managerId})`);
        
        // Find users in this department
        const usersInDept = await User.find({ departmentId: d._id }).select('_id name');
        const userIds = usersInDept.map(u => u._id);
        
        // Check tasks assigned to these users
        const tasks = await Task.find({ assigned_to: { $in: userIds } }).select('title assigned_to');
        console.log(`  -> Users in dept: ${usersInDept.length}, Tasks assigned to them: ${tasks.length}`);
      } else {
        console.log(`- ${d.name} has NO managerId set.`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
