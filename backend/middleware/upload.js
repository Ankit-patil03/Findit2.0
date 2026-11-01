const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Images are saved to backend/uploads for now.
// When we move to AWS S3 later, only THIS file changes (swap diskStorage for S3 storage).
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // Random name so two users uploading "photo.jpg" never overwrite each other
  filename: (req, file, cb) =>
    cb(null, `${crypto.randomUUID()}${ALLOWED_TYPES[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
    cb(new Error('Only JPG, PNG or WEBP images are allowed'));
  },
});

// Wrapper so upload errors come back as clean JSON instead of crashing the request
function uploadImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image must be smaller than 5 MB' });
    }
    return res.status(400).json({ error: err.message });
  });
}

module.exports = uploadImage; 