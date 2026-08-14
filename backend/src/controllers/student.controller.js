import StudentAttendance
from '../models/studentattendance.js';

export const markAttendance = async(req,res)=>{
  try{

    const { user_id,date,status } = req.body;

    const record =
    await StudentAttendance.findOneAndUpdate(
      { user_id,date },
      { status: status.toUpperCase() },
      {
        new:true,
        upsert:true,
        runValidators:true
      }
    );

    res.status(200).json({
      success:true,
      data:record
    });

  }catch(err){
    res.status(500).json({
      success:false,
      message:err.message
    });
  }
};

export const getAttendanceByDate = async(req,res)=>{
  try{

    const { date } = req.params;

    const records =
    await StudentAttendance.find({ date })
      .select('user_id status');

    res.status(200).json(records);

  }catch(err){
    res.status(500).json({
      success:false,
      message:err.message
    });
  }
};

export const getStudentProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const User = (await import('../models/user.model.js')).default;
    const Student = (await import('../models/student.js')).default;

    let studentObj = await User.findById(id).select('-password -passwordHash');
    if (!studentObj) {
      studentObj = await Student.findById(id).select('-password');
    }

    if (!studentObj) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const attendanceRecords = await StudentAttendance.find({ user_id: id });
    const totalMarked = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(r => r.status?.toUpperCase() === 'PRESENT').length;
    const absentCount = attendanceRecords.filter(r => r.status?.toUpperCase() === 'ABSENT').length;
    const attendancePercentage = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        student: studentObj,
        attendanceSummary: {
          totalMarked,
          presentCount,
          absentCount,
          attendancePercentage
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

