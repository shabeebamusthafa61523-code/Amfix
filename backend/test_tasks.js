import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import Task from './src/models/task.model.js';
import Department from './src/modules/departments/department.model.js';

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://shabeeba:9995982324@cluster0.i23tzbf.mongodb.net/crm?appName=Cluster0');
    
    // Pick Liyana
    const user = await User.findOne({ name: /Liyana/i });
    if (!user) return console.log('Liyana not found');
    const userId = user._id;
    console.log('User:', user.name, 'Role:', user.role, 'Desig:', user.designation);

    const ledDepartments = await Department.find({ managerId: userId }).select('_id name');
    let deptIds = ledDepartments.map(d => d._id);
    let deptNames = ledDepartments.map(d => d.name);
    console.log('ledDepts:', deptIds, deptNames);
    
    const roleName = String(user.role || '').toLowerCase();
    const designationName = String(user.designation || '').toLowerCase();
    const roleId = String(user.role_id || '');

    const isRoleBasedTeamLead = (
      roleName.includes('manager') ||
      roleName.includes('lead') ||
      roleName.includes('hod') ||
      designationName.includes('manager') ||
      designationName.includes('lead') ||
      designationName.includes('hod') ||
      roleId === '2'
    );
    console.log('isRoleBasedTeamLead:', isRoleBasedTeamLead);

    if (isRoleBasedTeamLead && deptIds.length === 0) {
       if (user.departmentId) deptIds.push(user.departmentId);
       if (user.department) deptNames.push(user.department);
    }
    console.log('Final DeptIds:', deptIds);
    console.log('Final DeptNames:', deptNames);

    if (deptIds.length > 0 || deptNames.length > 0) {
      const usersInDept = await User.find({
        $or: [
          { departmentId: { $in: deptIds } },
          { department: { $in: deptNames, $ne: '' } }
        ]
      }).select('_id name');
      
      console.log('Found', usersInDept.length, 'users in this department.');
      usersInDept.forEach(u => console.log(' ->', u.name));

      const directUserIds = usersInDept.map(u => u._id);
      const allUserIds = [...new Set([...directUserIds.map(String), String(userId)])];
      
      const query = {
        $or: [
          { assigned_to: { $in: allUserIds } },
          { created_by: { $in: allUserIds } }
        ]
      };
      
      const tasks = await Task.find(query).populate('assigned_to created_by');
      console.log('Tasks fetched:', tasks.length);
      tasks.forEach(t => console.log(`- Task: "${t.title}" (Status: ${t.status}) | Assigned To: ${t.assigned_to?.name} | Created By: ${t.created_by?.name}`));
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
