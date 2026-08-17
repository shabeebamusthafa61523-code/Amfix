// ── src/controllers/recruitment.controller.js ──
import Recruitment from '../models/recruitment.model.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = (fileBuffer, originalname = '') => {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      return reject(new Error('Cloudinary credentials missing in environment'));
    }
    const isRaw = !/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(originalname);
    const stream = cloudinary.uploader.upload_stream(
      { 
        folder: 'crm_resumes', 
        resource_type: isRaw ? 'raw' : 'auto' 
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

const saveResumeToDisk = (buffer, originalname) => {
  try {
    const uploadDir = path.join(process.cwd(), 'uploads', 'resumes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const ext = originalname ? path.extname(originalname) : '.pdf';
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext || '.pdf'}`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/resumes/${fileName}`;
  } catch (err) {
    console.warn("Failed to write resume to disk:", err.message);
    return null;
  }
};

/**
 * GET /api/v1/recruitment
 * Fetch all recruitment candidates
 */
export const getAllCandidates = async (req, res, next) => {
  try {
    const candidates = await Recruitment.find()
      .populate('created_by', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = candidates.map(c => ({
      ...c,
      id: c._id.toString()
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    console.error("Error in getAllCandidates:", err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch recruitment candidates'
    });
  }
};

/**
 * POST /api/v1/recruitment
 * Create a new candidate record
 */
export const createCandidate = async (req, res, next) => {
  try {
    const { 
      name, 
      phone, 
      address, 
      status, 
      interview_1, 
      interview_2, 
      interview_3, 
      selected, 
      offer_letter, 
      notes 
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and Phone number are required fields'
      });
    }

    const userId = req.user?.id || req.user?._id;

    let resume_url = '';
    let resume_name = '';
    let resume_public_id = '';

    // Handle resume file upload
    const filesList = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);
    if (filesList.length > 0) {
      const f = filesList[0];
      resume_name = f.originalname || 'Resume';

      try {
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
          const uploadResult = await uploadToCloudinary(f.buffer, f.originalname || '');
          if (uploadResult && uploadResult.secure_url) {
            resume_url = uploadResult.secure_url;
            resume_public_id = uploadResult.public_id;
          }
        }
      } catch (err) {
        console.warn("Cloudinary resume upload fallback to base64:", err.message);
      }

      if (!resume_url && f.buffer) {
        const diskUrl = saveResumeToDisk(f.buffer, f.originalname);
        if (diskUrl) {
          resume_url = diskUrl;
        } else {
          const mime = f.mimetype || 'application/octet-stream';
          const base64 = f.buffer.toString('base64');
          resume_url = `data:${mime};base64,${base64}`;
        }
      }
    }

    const candidate = await Recruitment.create({
      name,
      phone,
      address: address || '',
      resume_url,
      resume_name,
      resume_public_id,
      status: status || 'New',
      interview_1: interview_1 || 'Pending',
      interview_2: interview_2 || 'N/A',
      interview_3: interview_3 || 'N/A',
      selected: selected || 'Pending',
      offer_letter: offer_letter || 'N/A',
      notes: notes || '',
      created_by: userId
    });

    const populated = await Recruitment.findById(candidate._id).populate('created_by', 'name email').lean();

    return res.status(201).json({
      success: true,
      message: 'Candidate added successfully',
      data: {
        ...populated,
        id: populated._id.toString()
      }
    });
  } catch (err) {
    console.error("Error in createCandidate:", err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to create candidate'
    });
  }
};

/**
 * PUT /api/v1/recruitment/:id
 * Update candidate details or inline status/interviews
 */
export const updateCandidate = async (req, res, next) => {
  try {
    const { id } = req.params;

    const candidate = await Recruitment.findById(id);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    const fields = [
      'name', 
      'phone', 
      'address', 
      'status', 
      'interview_1', 
      'interview_2', 
      'interview_3', 
      'selected', 
      'offer_letter', 
      'notes'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        candidate[field] = req.body[field];
      }
    });

    // Handle new resume file upload if provided
    const filesList = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);
    if (filesList.length > 0) {
      const f = filesList[0];
      candidate.resume_name = f.originalname || 'Resume';

      let resume_url = '';
      let resume_public_id = '';

      try {
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
          const uploadResult = await uploadToCloudinary(f.buffer, f.originalname || '');
          if (uploadResult && uploadResult.secure_url) {
            resume_url = uploadResult.secure_url;
            resume_public_id = uploadResult.public_id;
          }
        }
      } catch (err) {
        console.warn("Cloudinary resume update fallback to disk/base64:", err.message);
      }

      if (!resume_url && f.buffer) {
        const diskUrl = saveResumeToDisk(f.buffer, f.originalname);
        if (diskUrl) {
          resume_url = diskUrl;
        } else {
          const mime = f.mimetype || 'application/octet-stream';
          const base64 = f.buffer.toString('base64');
          resume_url = `data:${mime};base64,${base64}`;
        }
      }

      if (resume_url) {
        candidate.resume_url = resume_url;
        candidate.resume_public_id = resume_public_id;
      }
    }

    await candidate.save();

    const populated = await Recruitment.findById(candidate._id).populate('created_by', 'name email').lean();

    return res.status(200).json({
      success: true,
      message: 'Candidate updated successfully',
      data: {
        ...populated,
        id: populated._id.toString()
      }
    });
  } catch (err) {
    console.error("Error in updateCandidate:", err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to update candidate'
    });
  }
};

/**
 * DELETE /api/v1/recruitment/:id
 * Delete candidate record
 */
export const deleteCandidate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const candidate = await Recruitment.findByIdAndDelete(id);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Candidate deleted successfully'
    });
  } catch (err) {
    console.error("Error in deleteCandidate:", err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete candidate'
    });
  }
};
