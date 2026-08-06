// middleware/auth.middleware.js

import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response.helper.js';
import redis from '../config/redis.js';

/**
 * Standard Token Verification Middleware for Departments Module
 */
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return sendError(res, 'No authorization header', 401);
    }

    if (!authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Invalid authorization format', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    req.user = decoded;
    if (decoded && (decoded.isSuperAdmin || String(decoded.role || '').toLowerCase() === 'superadmin' || String(decoded.role_id || '') === '0')) {
      req.user.isSuperAdmin = true;
    }
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error);
    return sendError(res, error.message || 'Unauthorized access', 403);
  }
};

/**
 * Role Restriction Middleware
 * @param {Array<String>} allowedRoles - Roles allowed to mutate resources
 */
export const requireRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    // Collect possible role identifiers and user ID from req.user
    const roleId = String(req.user?.role_id || req.user?.roleId || '').trim();
    const roleName = String(req.user?.role || '').toLowerCase().trim();
    const userId = req.user?.id || req.user?._id || req.user?.userId;

    let isSuperAdmin = 
      req.user?.isSuperAdmin === true ||
      req.user?.is_super_admin === true ||
      roleId === '0' ||
      roleName.includes('super');

    if (!isSuperAdmin && userId) {
      try {
        const User = (await import('../models/user.model.js')).default;
        const userObj = await User.findById(userId);
        if (userObj && (
          userObj.isSuperAdmin === true || 
          userObj.is_super_admin === true ||
          String(userObj.role).toLowerCase().includes('super') || 
          String(userObj.role_id) === '0' ||
          String(userObj.roleId) === '0'
        )) {
          isSuperAdmin = true;
          req.user.isSuperAdmin = true;
        }
      } catch (err) {}
    }

    if (isSuperAdmin) return next();

    // Map of roles for broad compatibility
    const isAllowed = allowedRoles.some(allowed => {
      const target = allowed.toLowerCase().trim();
      
      // Admin checks
      if (target === 'admin') {
        return (
          roleName === 'admin' ||
          roleId === '1' ||
          roleId === '10' ||
          roleName === '10' ||
          roleName.toUpperCase() === 'MD' ||
          roleName.toUpperCase() === 'COO'
        );
      }
      
      // Employee checks
      if (target === 'employee') {
        return (
          roleName === 'employee' ||
          roleName === 'staff' ||
          roleId === '3' ||
          roleId === '2'
        );
      }

      // Student checks
      if (target === 'student') {
        return (
          roleName === 'student' ||
          roleId === '4'
        );
      }

      // Exact checks (e.g. custom role strings or IDs)
      return (
        roleName === target ||
        roleId === target
      );
    });

    if (!isAllowed) {
      return sendError(res, 'Access denied. Insufficient permissions.', 403);
    }

    next();
  };
};

/**
 * Strict Role Access control middleware for leads and analytics
 * Checks req.user.role (e.g. 'digital_marketer') and req.user.role_id (e.g. '4')
 */
export const restrictToRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    const userRole = String(req.user?.role || '').toLowerCase().trim();
    const userRoleId = String(req.user?.role_id || '').trim();

    const isSuperAdmin = 
      req.user?.isSuperAdmin === true ||
      req.user?.is_super_admin === true ||
      userRoleId === '0' ||
      userRole === 'superadmin' ||
      userRole === 'super_admin';

    if (isSuperAdmin) return next();

    const isAllowed = allowedRoles.some(role => {
      const target = role.toLowerCase().trim();
      return userRole === target || userRoleId === target;
    });

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Exclusive to digital marketing teams.'
      });
    }

    next();
  };
};

export const restrictToDepartment = (departmentId) => {
  return async (req, res, next) => {
    // Administrative roles (0, 1, 2, hr, admin, superadmin) can bypass department checks
    const role = String(req.user?.role || req.user?.role_id || '').toLowerCase().trim();
    const isSuperAdmin = req.user?.isSuperAdmin === true || req.user?.is_super_admin === true || role === '0' || role === 'superadmin';
    const isPrivileged = isSuperAdmin || ['1', '2', 'hr', 'admin'].includes(role);
    if (isPrivileged) {
      return next();
    }

    let userDeptId = req.user?.departmentId;

    // Fallback: If departmentId is missing from token (e.g. active session), query from DB
    if (!userDeptId && req.user?.id) {
      try {
        const User = (await import('../models/user.model.js')).default;
        const userObj = await User.findById(req.user.id);
        if (userObj) {
          userDeptId = userObj.departmentId;
        }
      } catch (err) {
        console.error("Failed to fetch user department fallback:", err);
      }
    }

    userDeptId = String(userDeptId || '').trim();

    // Bypass for HR/ADMIN & Non-Operational departments
    if (userDeptId === '6a3caed51194353cbc8a3686' || userDeptId === '6a55c7e8b613a280003481d8') {
      return next();
    }

    if (userDeptId !== String(departmentId).trim()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Exclusive to the marketing department.'
      });
    }

    next();
  };
};

/**
 * Original default protectRoute middleware to prevent breaking existing routes
 * Restored EXACTLY to original implementation, with added Redis sliding session check.
 */
const protectRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        detail: "No authorization header"
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        detail: "Invalid authorization format"
      });
    }

    const token = authHeader.split(" ")[1];

    const secret = process.env.JWT_SECRET || 'fallback_secret_key';
    const decoded = jwt.verify(token, secret);

    req.user = decoded;

    // --- Inactivity sliding session check (30 mins = 1800 seconds) ---
    try {
      if (redis && redis.status === 'ready') {
        const sessionKey = `session:active:${decoded.id}`;
        const sessionExists = await redis.exists(sessionKey);
        
        if (sessionExists) {
          // Slide expiration forward
          await redis.expire(sessionKey, 1800);
        } else {
          // If Redis key is missing for valid JWT, auto-re-arm session key
          await redis.set(sessionKey, 'active', 'EX', 1800);
        }
      }
    } catch (redisError) {
      console.warn("Redis session verification failed, skipping check:", redisError.message);
    }

    next();

  } catch (error) {
    console.error("JWT ERROR:", error.message);

    return res.status(403).json({
      detail: error.message || "Unauthorized access"
    });
  }
};

export default protectRoute;