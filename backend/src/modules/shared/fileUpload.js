import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../../config/env.js';

export const isS3Configured = Boolean(env.s3.endpoint && env.s3.bucket && env.s3.accessKeyId && env.s3.secretAccessKey);

// Resolved from this module's own location, not process.cwd() — process.cwd() varies
// with whatever launched the server (e.g. the e2e webServer runs it from e2e/, not
// backend/), which would otherwise scatter an uploads/ dir wherever it happened to start.
export const LOCAL_UPLOAD_DIR = fileURLToPath(new URL('../../../uploads/', import.meta.url));
if (!isS3Configured) fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB — covers complaint/warranty photos & PDFs

// Always buffer in memory — same multer config regardless of which backend
// (local disk vs S3) ends up persisting it in storeUploadedFile below.
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

async function saveLocal(file) {
  const ext = path.extname(file.originalname) || '';
  const filename = `${randomUUID()}${ext}`;
  await fs.promises.writeFile(path.join(LOCAL_UPLOAD_DIR, filename), file.buffer);
  // Served by the /uploads static route in app.js — local/dev only, never used when isS3Configured.
  return `/uploads/${filename}`;
}

let s3Client = null;
function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: env.s3.endpoint,
      region: 'auto',
      credentials: { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey },
    });
  }
  return s3Client;
}

async function saveToS3(file) {
  const ext = path.extname(file.originalname) || '';
  const key = `${randomUUID()}${ext}`;
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );
  return `${env.s3.endpoint.replace(/\/$/, '')}/${env.s3.bucket}/${key}`;
}

export async function storeUploadedFile(file) {
  if (!file) throw new Error('No file provided');
  return isS3Configured ? saveToS3(file) : saveLocal(file);
}
