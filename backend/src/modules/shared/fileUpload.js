import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import { env, isCloudinaryConfigured, isProd } from '../../config/env.js';
import { ApiError } from '../../middleware/errorHandler.js';

// Cloudinary was the user's confirmed choice (BACKEND_CONTEXT.md §9 — resolved),
// replacing the S3-compatible placeholder from Phase 2. Kept behind the same
// `storeUploadedFile()` interface every caller already used, so nothing else
// (dev.routes.js, and whatever module wires uploads next) needed to change.
export const isFileStorageConfigured = isCloudinaryConfigured;

// Resolved from this module's own location, not process.cwd() — process.cwd() varies
// with whatever launched the server (e.g. the e2e webServer runs it from e2e/, not
// backend/), which would otherwise scatter an uploads/ dir wherever it happened to start.
export const LOCAL_UPLOAD_DIR = fileURLToPath(new URL('../../../uploads/', import.meta.url));
if (!isFileStorageConfigured) fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });

if (isFileStorageConfigured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB — covers complaint/warranty photos & PDFs

// Always buffer in memory — same multer config regardless of which backend
// (local disk vs Cloudinary) ends up persisting it in storeUploadedFile below.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      const err = new Error(`Unsupported file type: ${file.mimetype}`);
      err.statusCode = 400; // picked up by the global errorHandler's `err.statusCode || 500`
      return cb(err);
    }
    cb(null, true);
  },
});

async function convertToWebpIfNeeded(file) {
  if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/webp') {
    try {
      const webpBuffer = await sharp(file.buffer)
        .webp({ quality: 80 })
        .toBuffer();
      file.buffer = webpBuffer;
      file.mimetype = 'image/webp';
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext);
      file.originalname = `${base}.webp`;
    } catch (err) {
      console.error('[fileUpload] Failed to convert image to WebP format:', err.message);
      // Fall back to original image format on error
    }
  }
}

async function saveLocal(file) {
  const ext = path.extname(file.originalname) || '';
  const filename = `${randomUUID()}${ext}`;
  await fs.promises.writeFile(path.join(LOCAL_UPLOAD_DIR, filename), file.buffer);
  // Served by the /uploads static route in app.js — local/dev only, never used when isFileStorageConfigured.
  return `/uploads/${filename}`;
}

function saveToCloudinary(file) {
  const ext = path.extname(file.originalname) || '';
  const publicId = `${randomUUID()}${ext}`;
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: env.cloudinary.uploadFolder,
        public_id: publicId,
        // PDFs (warranty invoices, docs) aren't images — 'raw' avoids Cloudinary's
        // image-pipeline validation rejecting them; images still get its normal
        // optimization/CDN delivery either way.
        resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
      },
      (err, result) => {
        if (err) return reject(new ApiError(502, `Cloudinary upload failed: ${err.message}`));
        resolve(result.secure_url);
      },
    );
    uploadStream.end(file.buffer);
  });
}

export async function storeUploadedFile(file) {
  if (!file) throw new Error('No file provided');
  await convertToWebpIfNeeded(file);
  if (isFileStorageConfigured) return saveToCloudinary(file);
  if (isProd) throw new ApiError(500, 'File storage is not configured — cannot accept uploads in production');
  return saveLocal(file);
}
