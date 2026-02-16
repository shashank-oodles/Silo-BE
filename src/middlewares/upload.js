// middlewares/upload.js
import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage(); // Store in memory for processing

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm',
    // Video
    'video/mp4', 'video/webm', 'video/mpeg',
    // Documents
    'application/pdf', 'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not supported`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  }
});