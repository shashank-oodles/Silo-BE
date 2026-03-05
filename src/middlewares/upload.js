// // middlewares/upload.js
// import multer from 'multer';
// import path from 'path';

// const storage = multer.memoryStorage(); // Store in memory for processing

// const fileFilter = (req, file, cb) => {
//   const allowedTypes = [
//     // Images
//     'image/jpeg', 'image/png', 'image/gif', 'image/webp',
//     // Audio
//     'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm',
//     // Video
//     'video/mp4', 'video/webm', 'video/mpeg',
//     // Documents
//     'application/pdf', 'text/plain'
//   ];

//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error(`File type ${file.mimetype} not supported`), false);
//   }
// };

// export const upload = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: 20 * 1024 * 1024 // 20MB limit
//   }
// });

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
    'application/pdf', 
    'text/plain',
    
    // ✅ Add Microsoft Office documents
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',        // .docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',             // .xlsx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',     // .pptx
    'application/msword',                                                             // .doc
    'application/vnd.ms-excel',                                                       // .xls
    'application/vnd.ms-powerpoint',                                                  // .ppt
    
    // ✅ Add other common document types
    'text/csv',                                                                       // .csv
    'application/rtf'                                                                 // .rtf
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