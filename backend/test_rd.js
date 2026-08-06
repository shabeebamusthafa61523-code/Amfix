import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import Department from './src/modules/departments/department.model.js';

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://shabeeba:9995982324@cluster0.i23tzbf.mongodb.net/crm?appName=Cluster0');
    console.log('Connected to DB');

    // Find the R&D department
    const rdDept = await Department.findOne({ $or: [{ name: /R&D/i }, { name: /R & D/i }, { code: 'RD' }] });
    console.log('R&D Department:', rdDept);

    if (rdDept) {
      if (rdDept.managerId) {
        const manager = await User.findById(rdDept.managerId);
        console.log('Manager according to Department.managerId:', manager?.name, manager?.role, manager?.designation);
      } else {
        console.log('No managerId assigned to R&D department in DB.');
      }
    }

    // Find any user with "lead" or "hod" in name, role, or designation
    const leads = await User.find({
      $or: [
        { role: /lead|hod|manager/i },
        { designation: /lead|hod|manager/i }
      ]
    });
    console.log(`\nFound ${leads.length} potential leads:`);
    leads.forEach(l => {
      console.log(`- ${l.name} (Role: ${l.role}, Designation: ${l.designation}, DeptId: ${l.departmentId}, DeptName: ${l.department})`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
