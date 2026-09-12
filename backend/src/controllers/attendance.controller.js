// ===============================
// BACKEND: attendance.controller.js
// ===============================

import fs from 'fs';
import path from 'path';
import Attendance from '../models/attendance.model.js';
import User from '../models/user.model.js';
import mongoose from 'mongoose';

const getISTDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata'
  }).format(new Date());
};

const checkIsLate = (dateObj, targetTimeStr = '09:30') => {
  try {
    const istTime = dateObj.toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const [hours, minutes] = istTime
      .split(':')
      .map(Number);

    let targetHours = 9;
    let targetMinutes = 30;

    if (targetTimeStr && typeof targetTimeStr === 'string' && targetTimeStr.includes(':')) {
      const parts = targetTimeStr.split(':').map(Number);
      if (!isNaN(parts[0]) && !isNaN(parts[1])) {
        targetHours = parts[0];
        targetMinutes = parts[1];
      }
    }

    return (
      hours > targetHours ||
      (hours === targetHours && minutes > targetMinutes)
    );

  } catch {
    return false;
  }
};

const calculateShiftMetrics = (
  checkIn,
  checkOut
) => {
  try {
    const totalMs =
      checkOut.getTime() - checkIn.getTime();

    const totalHours = Math.max(
      0,
      totalMs / (1000 * 60 * 60)
    );

    const overtime = Math.max(
      0,
      totalHours - 8
    );

    return {
      working_hours: totalHours.toFixed(2),
      overtime: overtime.toFixed(2)
    };

  } catch {
    return {
      working_hours: "0.00",
      overtime: "0.00"
    };
  }
};

const serializeAttendance = (record) => {
  if (!record) return null;

  const obj = record.toObject();

  return {
    ...obj,
    id: obj._id.toString(),
    user_id: obj.user_id.toString()
  };
};

const getClientIp = (req) => {
  const bodyIp = req.body?.clientIp;
  if (bodyIp && typeof bodyIp === 'string' && bodyIp.trim()) {
    return bodyIp.trim().replace(/^::ffff:/, '');
  }
  const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.connection?.remoteAddress || '';
  const firstIp = rawIp.split(',')[0].trim().replace(/^::ffff:/, '');
  return firstIp || '127.0.0.1';
};

const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
  try {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  } catch {
    return Infinity;
  }
};

// ===============================
// CHECK IN
// ===============================

export const checkIn = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        detail: "Authentication required."
      });
    }

    const clientIp = getClientIp(req);
    const bodyIp = (req.body?.clientIp || req.body?.ip || '').trim().replace(/^::ffff:/, '');

    // Wi-Fi IP Verification Check (if configured via env OFFICE_WIFI_IPS or REQUIRE_WIFI_VERIFICATION)
    const officeWifiIpsConfig = process.env.OFFICE_WIFI_IPS;
    const requireWifi = String(process.env.REQUIRE_WIFI_VERIFICATION).toLowerCase() === 'true' || (officeWifiIpsConfig && officeWifiIpsConfig.trim().length > 0);

    if (requireWifi && officeWifiIpsConfig && officeWifiIpsConfig.trim().length > 0) {
      const allowedIps = officeWifiIpsConfig.split(',').map(ip => ip.trim().replace(/^::ffff:/, ''));
      const ipToValidate = bodyIp || clientIp;
      const isAllowed = allowedIps.some(allowedIp => 
        allowedIp === clientIp || (bodyIp && allowedIp === bodyIp)
      );

      if (!isAllowed) {
        return res.status(403).json({
          detail: `Wi-Fi verification failed: You are connected to IP (${ipToValidate}). Attendance check-in can only be marked while connected to the Office Wi-Fi network (${officeWifiIpsConfig}).`
        });
      }
    }

    const { latitude, longitude } = req.body || {};

    if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
      return res.status(400).json({
        detail: "Location access is required. Please enable GPS/location to check in at the office."
      });
    }

    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);

    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({
        detail: "Invalid location coordinates provided."
      });
    }

    const hasOfficeConfig = process.env.OFFICE_LATITUDE !== undefined && process.env.OFFICE_LONGITUDE !== undefined;
    const officeLat = hasOfficeConfig ? parseFloat(process.env.OFFICE_LATITUDE) : 10.9463015;
    const officeLng = hasOfficeConfig ? parseFloat(process.env.OFFICE_LONGITUDE) : 76.1374676;
    const maxRadius = parseFloat(process.env.OFFICE_RADIUS_METERS) || 200000;
    const disableGeofence = String(process.env.OFFICE_GEOFENCE_DISABLED).toLowerCase() === 'true' || !hasOfficeConfig;

    const distanceMeters = getDistanceFromLatLonInMeters(userLat, userLng, officeLat, officeLng);

    if (!disableGeofence && distanceMeters > maxRadius) {
      const distanceFormatted = distanceMeters >= 1000
        ? `${(distanceMeters / 1000).toFixed(2)} km`
        : `${Math.round(distanceMeters)} meters`;
      const maxRadiusFormatted = maxRadius >= 1000
        ? `${(maxRadius / 1000).toFixed(0)} km`
        : `${Math.round(maxRadius)} meters`;

      return res.status(403).json({
        detail: `Location verification failed: You are currently ${distanceFormatted} away from the office. Attendance can only be marked within ${maxRadiusFormatted} of the office.`
      });
    }

    const userId =
      req.user.id || req.user._id;

    const userObj = await User.findById(userId).select('customCheckInTime');
    const shiftInTime = userObj?.customCheckInTime || '09:30';

    const todayStr = getISTDate();

    const now = new Date();

    const existing = await Attendance.findOne({
      user_id: userId,
      date: todayStr
    });

    if (existing?.check_in_time) {
      return res.status(400).json({
        detail:
          "Already checked in today."
      });
    }

    const record =
      await Attendance.findOneAndUpdate(
        {
          user_id: userId,
          date: todayStr
        },
        {
          $set: {
            user_id: userId,
            date: todayStr,
            status: 'PRESENT',
            check_in_time: now,
            is_late: checkIsLate(now, shiftInTime),
            check_in_latitude: userLat,
            check_in_longitude: userLng,
            distance_from_office_meters: Math.round(distanceMeters),
            check_in_ip: clientIp
          }
        },
        {
          upsert: true,
          new: true
        }
      );

    return res.status(201).json(
      serializeAttendance(record)
    );

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      detail: error.message
    });
  }
};

// ===============================
// CHECK OUT
// ===============================

export const checkOut = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        detail: "Authentication required."
      });
    }

    const clientIp = getClientIp(req);

    // Wi-Fi IP Verification Check (if configured via env OFFICE_WIFI_IPS or REQUIRE_WIFI_VERIFICATION)
    const officeWifiIpsConfig = process.env.OFFICE_WIFI_IPS;
    const requireWifi = String(process.env.REQUIRE_WIFI_VERIFICATION).toLowerCase() === 'true' || (officeWifiIpsConfig && officeWifiIpsConfig.trim().length > 0);

    if (requireWifi && officeWifiIpsConfig) {
      const allowedIps = officeWifiIpsConfig.split(',').map(ip => ip.trim().replace(/^::ffff:/, ''));
      if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
        return res.status(403).json({
          detail: `Wi-Fi verification failed: You are connected to IP (${clientIp}). Check-out can only be marked while connected to the Office Wi-Fi network.`
        });
      }
    }

    const { latitude, longitude } = req.body || {};

    if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
      return res.status(400).json({
        detail: "Location access is required. Please enable GPS/location to check out."
      });
    }

    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);

    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({
        detail: "Invalid location coordinates provided."
      });
    }

    const hasOfficeConfig = process.env.OFFICE_LATITUDE !== undefined && process.env.OFFICE_LONGITUDE !== undefined;
    const officeLat = hasOfficeConfig ? parseFloat(process.env.OFFICE_LATITUDE) : 10.9463015;
    const officeLng = hasOfficeConfig ? parseFloat(process.env.OFFICE_LONGITUDE) : 76.1374676;
    const maxRadius = parseFloat(process.env.OFFICE_RADIUS_METERS) || 200000;
    const disableGeofence = String(process.env.OFFICE_GEOFENCE_DISABLED).toLowerCase() === 'true' || !hasOfficeConfig;

    const distanceMeters = getDistanceFromLatLonInMeters(userLat, userLng, officeLat, officeLng);

    if (!disableGeofence && distanceMeters > maxRadius) {
      const distanceFormatted = distanceMeters >= 1000
        ? `${(distanceMeters / 1000).toFixed(2)} km`
        : `${Math.round(distanceMeters)} meters`;
      const maxRadiusFormatted = maxRadius >= 1000
        ? `${(maxRadius / 1000).toFixed(0)} km`
        : `${Math.round(maxRadius)} meters`;

      return res.status(403).json({
        detail: `Location verification failed: You are currently ${distanceFormatted} away from the office. Check-out can only be marked within ${maxRadiusFormatted} of the office.`
      });
    }

    const userId =
      req.user.id || req.user._id;

    const todayStr = getISTDate();

    const record =
      await Attendance.findOne({
        user_id: userId,
        date: todayStr
      });

    if (!record?.check_in_time) {
      return res.status(400).json({
        detail:
          "Please check in first."
      });
    }

    if (record.check_out_time) {
      return res.status(400).json({
        detail:
          "Already checked out."
      });
    }

    const now = new Date();

    const metrics =
      calculateShiftMetrics(
        record.check_in_time,
        now
      );

    record.check_out_time = now;
    record.working_hours =
      metrics.working_hours;
    record.overtime =
      metrics.overtime;
    record.check_out_latitude = userLat;
    record.check_out_longitude = userLng;
    record.check_out_distance_from_office_meters = Math.round(distanceMeters);
    record.check_out_ip = clientIp;

    await record.save();

    return res.status(200).json(
      serializeAttendance(record)
    );

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      detail: error.message
    });
  }
};

// ===============================
// GET BY DATE
// ===============================

export const getAttendanceByDate =
    async (req, res) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            detail: "Authentication required."
          });
        }
  
        const userId =
          req.user.id || req.user._id;
  
        const { date } = req.params;
  
        const record =
          await Attendance.findOne({
            user_id: userId,
            date
          });
  
        return res.status(200).json(
          serializeAttendance(record)
        );
      } catch (err) {
        console.error(err);
        return res.status(500).json({
          detail: "Server Error"
        });
      }
    };

export const getAllAttendanceByDate =
    async (req, res) => {
      try {
        const { date } = req.params;
        const records = await Attendance.find({ date }).populate('user_id', 'name email employeeId profile_image department role designation');
        return res.status(200).json(records.map(serializeAttendance));
      } catch (err) {
        console.error(err);
        return res.status(500).json({ detail: "Server Error" });
      }
    };

// ===============================
// GET ATTENDANCE LOGS / REPORT
// ===============================
export const getAttendanceLogs = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      userId, 
      search, 
      status, 
      sortOrder = 'desc', 
      sortBy = 'date',
      page,
      limit
    } = req.query;

    const query = {};

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    // User ID filter
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.user_id = userId;
    }

    // Status filter
    if (status && status !== 'ALL') {
      if (status === 'LATE') {
        query.is_late = true;
      } else {
        query.status = status;
      }
    }

    // Search query on User fields
    if (search && search.trim() !== '') {
      const escapedSearch = search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');
      const matchingUsers = await User.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { employeeId: searchRegex }
        ]
      }).select('_id');

      const userIds = matchingUsers.map(u => u._id);
      query.user_id = { $in: userIds };
    }

    // Sorting order (date-wise asc or desc)
    let sortObj = {};
    const direction = sortOrder === 'asc' ? 1 : -1;

    if (sortBy === 'date') {
      sortObj = { date: direction, check_in_time: direction };
    } else if (sortBy === 'check_in_time') {
      sortObj = { check_in_time: direction };
    } else if (sortBy === 'working_hours') {
      sortObj = { working_hours: direction };
    } else {
      sortObj = { date: direction };
    }

    const isPagination = page !== undefined && limit !== undefined;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 100);
    const skip = (p - 1) * l;

    let dbQuery = Attendance.find(query)
      .populate('user_id', 'name email employeeId profile_image department role designation')
      .sort(sortObj);

    if (isPagination) {
      dbQuery = dbQuery.skip(skip).limit(l);
    }

    const [records, totalRecords] = await Promise.all([
      dbQuery.lean(),
      Attendance.countDocuments(query)
    ]);

    // Calculate Summary Metrics
    const allRecordsForSummary = await Attendance.find(query).select('status is_late working_hours');
    let totalPresent = 0;
    let totalLate = 0;
    let totalHours = 0;

    allRecordsForSummary.forEach(r => {
      if (r.status === 'PRESENT') totalPresent++;
      if (r.is_late) totalLate++;
      if (r.working_hours) totalHours += parseFloat(r.working_hours) || 0;
    });

    const formattedRecords = records.map(r => ({
      ...r,
      id: String(r._id),
      user: r.user_id || null,
      user_id: r.user_id?._id ? String(r.user_id._id) : (r.user_id ? String(r.user_id) : null)
    }));

    return res.status(200).json({
      success: true,
      data: formattedRecords,
      pagination: {
        total: totalRecords,
        page: isPagination ? p : 1,
        limit: isPagination ? l : totalRecords,
        pages: isPagination ? Math.ceil(totalRecords / l) : 1
      },
      summary: {
        totalRecords,
        totalPresent,
        totalLate,
        totalHours: totalHours.toFixed(2),
        avgHours: totalPresent > 0 ? (totalHours / totalPresent).toFixed(2) : "0.00"
      }
    });

  } catch (error) {
    console.error('Error fetching attendance logs:', error);
    return res.status(500).json({
      success: false,
      detail: 'Failed to fetch attendance logs',
      error: error.message
    });
  }
};

// ===============================
// UPDATE ATTENDANCE RECORD (ADMIN / EDIT)
// ===============================
export const updateAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, check_in_time, check_out_time, is_late } = req.body;

    const record = await Attendance.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    if (status !== undefined) {
      record.status = status;
    }

    if (is_late !== undefined) {
      record.is_late = Boolean(is_late);
    }

    const parseDateTimeStr = (dateStr, timeStr) => {
      if (!timeStr) return null;
      if (timeStr instanceof Date) return timeStr;
      if (typeof timeStr === 'string' && (timeStr.includes('T') || timeStr.includes('Z'))) {
        const d = new Date(timeStr);
        return isNaN(d.getTime()) ? null : d;
      }
      if (typeof timeStr === 'string') {
        const [h, m] = timeStr.split(':');
        if (h !== undefined && m !== undefined && dateStr) {
          const [year, month, day] = dateStr.split('-').map(Number);
          const d = new Date(year, month - 1, day, parseInt(h, 10), parseInt(m, 10), 0);
          return isNaN(d.getTime()) ? null : d;
        }
      }
      return null;
    };

    if (check_in_time !== undefined) {
      if (!check_in_time) {
        record.check_in_time = null;
      } else {
        const parsedIn = parseDateTimeStr(record.date, check_in_time);
        if (parsedIn) record.check_in_time = parsedIn;
      }
    }

    if (check_out_time !== undefined) {
      if (!check_out_time) {
        record.check_out_time = null;
      } else {
        const parsedOut = parseDateTimeStr(record.date, check_out_time);
        if (parsedOut) record.check_out_time = parsedOut;
      }
    }

    if (record.check_in_time && record.check_out_time) {
      const diffMs = new Date(record.check_out_time) - new Date(record.check_in_time);
      if (diffMs > 0) {
        const hours = diffMs / (1000 * 60 * 60);
        record.working_hours = hours.toFixed(2);
      }
    }

    await record.save();
    await record.populate('user_id', 'name email employeeId profile_image');

    return res.status(200).json({
      success: true,
      message: 'Attendance record updated successfully.',
      data: serializeAttendance(record)
    });
  } catch (error) {
    console.error('Error updating attendance record:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update attendance record',
      error: error.message
    });
  }
};

export const getWifiSettings = async (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const officeWifiIpsConfig = process.env.OFFICE_WIFI_IPS || '';
    const requireWifi = String(process.env.REQUIRE_WIFI_VERIFICATION).toLowerCase() === 'true' || (officeWifiIpsConfig.trim().length > 0);

    return res.status(200).json({
      success: true,
      data: {
        clientIp,
        requireWifi,
        officeWifiIps: officeWifiIpsConfig
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch Wi-Fi settings'
    });
  }
};

export const updateWifiSettings = async (req, res) => {
  try {
    const { requireWifi, officeWifiIps } = req.body || {};

    const cleanRequireWifi = Boolean(requireWifi);
    const cleanOfficeWifiIps = typeof officeWifiIps === 'string' ? officeWifiIps.trim() : '';

    process.env.REQUIRE_WIFI_VERIFICATION = String(cleanRequireWifi);
    process.env.OFFICE_WIFI_IPS = cleanOfficeWifiIps;

    // Persist changes to backend/.env file
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      const updateOrAppendEnvVar = (content, key, value) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(content)) {
          return content.replace(regex, `${key}=${value}`);
        } else {
          return content ? `${content.trim()}\n${key}=${value}` : `${key}=${value}`;
        }
      };

      envContent = updateOrAppendEnvVar(envContent, 'REQUIRE_WIFI_VERIFICATION', String(cleanRequireWifi));
      envContent = updateOrAppendEnvVar(envContent, 'OFFICE_WIFI_IPS', cleanOfficeWifiIps);

      fs.writeFileSync(envPath, envContent, 'utf8');
    } catch (fsErr) {
      console.warn('Warning: Could not persist Wi-Fi settings to .env file:', fsErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Wi-Fi Attendance settings updated successfully.',
      data: {
        requireWifi: cleanRequireWifi,
        officeWifiIps: cleanOfficeWifiIps
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to update Wi-Fi settings'
    });
  }
};