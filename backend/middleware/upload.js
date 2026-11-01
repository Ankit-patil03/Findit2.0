const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Where photos are kept:
// - S3_BUCKET set (on the server): in S3, because a Docker container's disk is wiped on every deploy.
// - S3_BUCKET not set (your laptop): in backend/uploads, like before.
// Either way the database stores "/uploads/<file>", so the frontend never knows the difference.
const BUCKET = process.env.S3_BUCKET;
// No keys here: on EC2 the SDK picks up the server's IAM role by itself
const s3 = BUCKET ? new S3Client({ region: process.env.AWS_REGION }) : null;
const s3Key = (filename) => `uploads/${filename}`;

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!BUCKET) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Random name so two users uploading "photo.jpg" never overwrite each other
const newFilename = (file) => `${crypto.randomUUID()}${ALLOWED_TYPES[file.mimetype]}`;

// For S3, multer holds the image in memory (max 5 MB) and saveToS3() sends it on
const storage = BUCKET
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, UPLOAD_DIR),
      filename: (req, file, cb) => cb(null, newFilename(file)),
    });

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
    cb(new Error('Only JPG, PNG or WEBP images are allowed'));
  },
});

async function saveToS3(file) {
  file.filename = newFilename(file); // same field diskStorage sets, so the routes work unchanged
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key(file.filename),
    Body: file.buffer,
    ContentType: file.mimetype,
  }));
  file.buffer = null; // free the memory
}

// Wrapper so upload errors come back as clean JSON instead of crashing the request
function uploadImage(req, res, next) {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Image must be smaller than 5 MB' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (!req.file || !BUCKET) return next();

    try {
      await saveToS3(req.file);
      next();
    } catch (s3Err) {
      console.error('S3 upload error:', s3Err);
      res.status(500).json({ error: 'Could not save the image' });
    }
  });
}

// Deletes the image of a report that was rejected, so no orphan photos pile up
function removeImage(file) {
  if (!file) return;
  if (!BUCKET) return fs.unlink(file.path, () => {});
  s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key(file.filename) }))
    .catch((err) => console.error('S3 delete error:', err));
}

// GET /uploads/<file> on the server: read the photo from S3 and pass it to the browser.
// The bucket stays private; only the backend (through the IAM role) can read it.
async function serveFromS3(req, res) {
  const filename = path.basename(req.path); // basename blocks "../" tricks
  try {
    const photo = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key(filename) }));
    res.set('Content-Type', photo.ContentType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable'); // names are random, never reused
    photo.Body.pipe(res);
  } catch (err) {
    // A missing photo shows up as NoSuchKey (or AccessDenied when the role can't list the bucket)
    if (err.name !== 'NoSuchKey') console.error('S3 read error:', err.name);
    res.status(404).end();
  }
}

const serveImages = BUCKET ? serveFromS3 : express.static(UPLOAD_DIR);

module.exports = uploadImage;
module.exports.removeImage = removeImage;
module.exports.serveImages = serveImages;
