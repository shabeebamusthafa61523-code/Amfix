// ===============================
// BACKEND: attendance.controller.js
// ===============================

import Attendance from '../models/attendance.model.js';

const getISTDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata'
  }).format(new Date());
};

const checkIsLate = (dateObj) => {
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

    return (
      hours > 9 ||
      (hours === 9 && minutes > 0)
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

    const officeLat = parseFloat(process.env.OFFICE_LATITUDE) || -11.0300977;
    const officeLng = parseFloat(process.env.OFFICE_LONGITUDE) || -76.0972006;
    const maxRadius = parseFloat(process.env.OFFICE_RADIUS_METERS) || 50;
    const disableGeofence = String(process.env.OFFICE_GEOFENCE_DISABLED).toLowerCase() === 'true';

    const distanceMeters = getDistanceFromLatLonInMeters(userLat, userLng, officeLat, officeLng);

    if (!disableGeofence && distanceMeters > maxRadius) {
      const distanceFormatted = distanceMeters >= 1000
        ? `${(distanceMeters / 1000).toFixed(2)} km`
        : `${Math.round(distanceMeters)} meters`;

      return res.status(403).json({
        detail: `Location verification failed: You are currently ${distanceFormatted} away from the office. Attendance can only be marked within ${maxRadius} meters of the office.`
      });
    }

    const userId =
      req.user.id || req.user._id;

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
            is_late: checkIsLate(now),
            check_in_latitude: userLat,
            check_in_longitude: userLng,
            distance_from_office_meters: Math.round(distanceMeters)
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
        const records = await Attendance.find({ date });
        return res.status(200).json(records.map(serializeAttendance));
      } catch (err) {
        console.error(err);
        return res.status(500).json({ detail: "Server Error" });
      }
    };