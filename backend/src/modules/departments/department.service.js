// src/modules/departments/department.service.js

import Department from './department.model.js';
import UserDepartment from '../../models/userDepartment.model.js';
import User from '../../models/user.model.js';

export const departmentService = {
  /**
   * Fetch all departments with optional query filters
   * @param {Object} params - Query params (status, search)
   */
  async getAllDepartments(params = {}) {
    const { status, search } = params;
    const query = {};

    if (status !== undefined && status !== '') {
      query.status = status === 'true';
    }

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { code: regex }
      ];
    }

    const departments = await Department.find(query)
      .populate('managerId', 'name designation_id email avatar employeeId')
      .sort({ name: 1 });

    return Promise.all(departments.map(async d => {
      const dept = d.toObject();
      
      // Compute member counts from userDepartments and User model
      const udUsers = await UserDepartment.find({ departmentId: dept._id }).select('userId');
      const udIds = udUsers.map(u => u.userId ? u.userId.toString() : '');
      const nUsers = await User.find({ departmentId: dept._id }).select('_id');
      const nIds = nUsers.map(u => u._id.toString());
      const allIds = new Set([...udIds, ...nIds].filter(Boolean));
      dept.memberCount = allIds.size;

      if (dept.managerId) {
        const fullName = dept.managerId.name || '';
        const parts = fullName.trim().split(/\s+/);
        dept.managerId.firstName = parts[0] || '';
        dept.managerId.lastName = parts.slice(1).join(' ') || '';
        dept.managerId.designation = dept.managerId.designation_id || 'Staff';
      }

      return dept;
    }));
  },

  /**
   * Fetch single department by MongoDB _id
   * @param {String} id - Department ID
   */
  async getDepartmentById(id) {
    const department = await Department.findById(id).populate('managerId');
    if (!department) return null;

    const deptObj = department.toObject();
    
    // Compute member counts
    const memberCount = await UserDepartment.countDocuments({ departmentId: deptObj._id });
    deptObj.memberCount = memberCount;

    if (deptObj.managerId) {
      const fullName = deptObj.managerId.name || '';
      const parts = fullName.trim().split(/\s+/);
      deptObj.managerId.firstName = parts[0] || '';
      deptObj.managerId.lastName = parts.slice(1).join(' ') || '';
      deptObj.managerId.designation = deptObj.managerId.designation_id || 'Staff';
    }

    return deptObj;
  },

  /**
   * Create a new department
   * @param {Object} data - Department data
   */
  async createDepartment(data) {
    const { name, code, description, managerId, status } = data;
    const upperCode = String(code).toUpperCase().trim();
    const cleanName = String(name).trim();

    // Check uniqueness of name and code
    const existing = await Department.findOne({
      $or: [
        { name: cleanName },
        { code: upperCode }
      ]
    });

    if (existing) {
      const error = new Error('Department name or code already exists');
      error.statusCode = 409;
      throw error;
    }

    const newDept = await Department.create({
      name: cleanName,
      code: upperCode,
      description: description || '',
      managerId: managerId || null,
      status: status !== undefined ? status : true
    });

    return this.getDepartmentById(newDept._id);
  },

  /**
   * Update department by MongoDB _id
   * @param {Object} data - Department data to update
   */
  async updateDepartment(data) {
    const { id, name, code, description, managerId, status } = data;
    const upperCode = String(code).toUpperCase().trim();
    const cleanName = String(name).trim();

    // Check uniqueness excluding self
    const existing = await Department.findOne({
      _id: { $ne: id },
      $or: [
        { name: cleanName },
        { code: upperCode }
      ]
    });

    if (existing) {
      const error = new Error('Department name or code already exists');
      error.statusCode = 409;
      throw error;
    }

    const updated = await Department.findByIdAndUpdate(
      id,
      {
        name: cleanName,
        code: upperCode,
        description: description || '',
        managerId: managerId || null,
        status: status !== undefined ? status : true
      },
      { new: true }
    );

    if (!updated) return null;
    return this.getDepartmentById(updated._id);
  },

  /**
   * Delete department and its related userDepartments mappings
   * @param {String} id - Department ID
   */
  async deleteDepartment(id) {
    const deleted = await Department.findByIdAndDelete(id);
    if (!deleted) return null;

    // Hard delete related userDepartment mappings
    await UserDepartment.deleteMany({ departmentId: id });
    return deleted;
  },

  /**
   * Assign or reassign manager
   * @param {String} id - Department ID
   * @param {String} managerId - User ID of the new manager
   */
  async assignManager(id, managerId) {
    if (managerId) {
      const managerExists = await User.findById(managerId);
      if (!managerExists) {
        const error = new Error('Manager user not found in the users collection');
        error.statusCode = 404;
        throw error;
      }
    }

    const updated = await Department.findByIdAndUpdate(
      id,
      { managerId: managerId || null },
      { new: true }
    );

    if (!updated) return null;
    return this.getDepartmentById(updated._id);
  },

  /**
   * Get all users linked to a department
   * @param {String} id - Department ID
   */
  async getDepartmentUsers(id) {
    const userDepts = await UserDepartment.find({ departmentId: id })
      .populate('userId', 'employeeId name email designation_id status isActive createdAt');

    const mappedDict = {};

    userDepts.forEach(ud => {
      if (!ud.userId) return;
      const user = ud.userId.toObject();
      const fullName = user.name || '';
      const parts = fullName.trim().split(/\s+/);
      const uId = user._id.toString();
      mappedDict[uId] = {
        _id: user._id,
        employeeId: user.employeeId || user.email || '',
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '',
        email: user.email || '',
        designation: user.designation_id || 'Staff',
        status: user.status || (user.isActive ? 'active' : 'inactive') || 'active',
        roleInDepartment: ud.roleInDepartment || 'member',
        isPrimary: ud.isPrimary !== undefined ? ud.isPrimary : true,
        assignedAt: ud.assignedAt
      };
    });

    const nativeUsers = await User.find({ departmentId: id }).select('employeeId name email designation_id status isActive createdAt');
    nativeUsers.forEach(user => {
      const uId = user._id.toString();
      if (!mappedDict[uId]) {
        const fullName = user.name || '';
        const parts = fullName.trim().split(/\s+/);
        mappedDict[uId] = {
          _id: user._id,
          employeeId: user.employeeId || user.email || '',
          firstName: parts[0] || '',
          lastName: parts.slice(1).join(' ') || '',
          email: user.email || '',
          designation: user.designation_id || 'Staff',
          status: user.status || (user.isActive ? 'active' : 'inactive') || 'active',
          roleInDepartment: 'member',
          isPrimary: true,
          assignedAt: user.createdAt
        };
      }
    });

    return Object.values(mappedDict);
  },

  /**
   * Add a user to a department
   * @param {Object} data - { departmentId, userId, roleInDepartment, isPrimary }
   */
  async addUserToDepartment(data) {
    const { departmentId, userId, roleInDepartment, isPrimary } = data;

    // Check if department exists and is active
    const dept = await Department.findById(departmentId);
    if (!dept || dept.status === false) {
      const error = new Error('Department not found or is inactive');
      error.statusCode = 404;
      throw error;
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if user is already in department
    const existing = await UserDepartment.findOne({ userId, departmentId });
    if (existing) {
      const error = new Error('User is already assigned to this department');
      error.statusCode = 409;
      throw error;
    }

    const newUserDept = await UserDepartment.create({
      userId,
      departmentId,
      roleInDepartment: roleInDepartment || 'member',
      isPrimary: isPrimary !== undefined ? isPrimary : true
    });

    return newUserDept;
  },

  /**
   * Remove a user from a department
   * @param {String} departmentId - Department ID
   * @param {String} userId - User ID
   */
  async removeUserFromDepartment(departmentId, userId) {
    const deleted = await UserDepartment.findOneAndDelete({ userId, departmentId });
    if (!deleted) {
      const error = new Error('User is not assigned to this department');
      error.statusCode = 404;
      throw error;
    }
    return deleted;
  },

  /**
   * Toggle only status field
   * @param {String} id - Department ID
   * @param {Boolean} status - New status
   */
  async updateDepartmentStatus(id, status) {
    const updated = await Department.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) return null;
    return this.getDepartmentById(updated._id);
  },

  /**
   * Gather analytical statistics for a department
   * @param {String} id - Department ID
   */
  async getDepartmentAnalytics(id) {
    const department = await Department.findById(id);
    if (!department) return null;

    const totalUsers = await UserDepartment.countDocuments({ departmentId: id });
    const userDepts = await UserDepartment.find({ departmentId: id })
      .populate('userId', 'status isActive');

    const activeUsers = userDepts.filter(ud => {
      if (!ud.userId) return false;
      const status = ud.userId.status || (ud.userId.isActive ? 'active' : 'inactive');
      return status === 'active';
    }).length;

    let managerName = 'Unassigned';
    let managerId = null;

    if (department.managerId) {
      const manager = await User.findById(department.managerId, 'name');
      if (manager) {
        managerName = manager.name;
        managerId = manager._id;
      }
    }

    return {
      departmentId: department._id,
      departmentName: department.name,
      totalUsers,
      activeUsers,
      managerId,
      managerName
    };
  }
};
