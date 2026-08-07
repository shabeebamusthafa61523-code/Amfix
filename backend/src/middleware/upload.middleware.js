// ── src/middleware/upload.middleware.js ──
import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!file) return cb(null, false);

  const mimetype = (file.mimetype || '').toLowerCase();
  const ext = file.originalname ? file.originalname.toLowerCase().split('.').pop() : '';

  const isAllowed = 
    mimetype.startsWith('image/') || 
    mimetype === 'application/pdf' || 
    mimetype === 'application/octet-stream' ||
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'svg', 'heic', 'jfif', 'bmp', 'avif', ''].includes(ext);

  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only image files and PDFs are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter
});

export default upload;
