import mongoose from 'mongoose';
import multer from 'multer';
import sharp from 'sharp';
import { once } from 'node:events';
import { OwnedAppliance } from './ownedAppliance.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { ok, created } from '../../utils/respond.js';

// Private customer documents live in GridFS, never in the public /uploads CDN.
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'applianceDocuments' });
const supported = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
const handle = fn => async (req, res, next) => { try { await fn(req, res); } catch (e) { next(e); } };
async function owned(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, 'Appliance not found');
    const appliance = await OwnedAppliance.findOne({ _id: req.params.id, user: req.user.id, deletedAt: null });
    if (!appliance) throw new ApiError(404, 'Appliance not found');
    req.appliance = appliance; next();
  } catch (e) { next(e); }
}
export async function deleteApplianceFiles(appliance) {
  // Keep the historical appliance reference, but remove customer documents when deleted.
  await Promise.all(appliance.documents.map(d => bucket().delete(d.fileId).catch(e => {
    if (!/File not found/i.test(e.message)) throw e;
  })));
  await OwnedAppliance.updateOne({ _id: appliance._id }, { $pull: { documents: { fileId: { $in: appliance.documents.map(d => d.fileId) } } } });
}
export function addApplianceDocumentRoutes(router) {
  const receive = (req, res, next) => upload.single('file')(req, res, error => next(error?.code === 'LIMIT_FILE_SIZE' ? new ApiError(400, 'Files must be 10 MB or smaller') : error));
  router.post('/:id/documents', owned, receive, handle(async (req, res) => {
    const { file, appliance } = req;
    if (!file || !supported.has(file.mimetype)) throw new ApiError(400, 'Choose a PDF, JPG, PNG or WebP file up to 10 MB');
    const kind = req.body.kind;
    if (!['invoice', 'warranty', 'photo', 'other'].includes(kind)) throw new ApiError(400, 'Choose a document type');
    if (kind === 'photo' && file.mimetype === 'application/pdf') throw new ApiError(400, 'Product photos must be images');
    if (file.mimetype === 'application/pdf') {
      if (!file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new ApiError(400, 'Invalid PDF file');
    } else {
      try {
        const image = sharp(file.buffer, { limitInputPixels: 40000000 });
        const metadata = await image.metadata();
        const format = { 'image/jpeg':'jpeg', 'image/png':'png', 'image/webp':'webp' }[file.mimetype];
        if (metadata.format !== format) throw new Error('MIME mismatch');
        await image.stats();
      } catch { throw new ApiError(400, 'This image cannot be read. Choose a valid JPG, PNG or WebP.'); }
    }
    const name = [...file.originalname].map(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 || c === '/' || c === '\\' ? '_' : c).join('').slice(0, 180) || 'Document';
    const stream = bucket().openUploadStream(name, { metadata: { user: appliance.user, appliance: appliance._id }, contentType: file.mimetype });
    const completed = once(stream, 'finish'); stream.end(file.buffer); await completed;
    const doc = { fileId: stream.id, name, kind, mimeType: file.mimetype, size: file.size, uploadedAt: new Date() };
    try {
      // Conditional push bounds concurrent uploads and prevents resurrection after deletion.
      const saved = await OwnedAppliance.findOneAndUpdate({ _id: appliance._id, deletedAt: null, 'documents.19': { $exists: false } }, { $push: { documents: doc } }, { new: true });
      if (!saved) throw new ApiError(409, 'The appliance was deleted or already has 20 documents');
      created(res, saved.toJSON().documents.at(-1));
    } catch (e) { await bucket().delete(stream.id); throw e; }
  }));
  router.get('/:id/documents/:fileId', owned, handle(async (req, res) => {
    const doc = req.appliance.documents.find(d => String(d.fileId) === req.params.fileId);
    if (!doc) throw new ApiError(404, 'Document not found');
    const store = bucket();
    if (!(await store.find({ _id: doc.fileId }).hasNext())) throw new ApiError(404, 'Document not found');
    res.set({ 'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff', 'Content-Security-Policy':"sandbox; default-src 'none'", 'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(doc.name)}` });
    res.type(doc.mimeType);
    const download = store.openDownloadStream(doc.fileId);
    download.on('error', () => res.destroy());
    res.on('close', () => download.destroy()); download.pipe(res);
  }));
  router.delete('/:id/documents/:fileId', owned, handle(async (req, res) => {
    const doc = req.appliance.documents.find(d => String(d.fileId) === req.params.fileId);
    if (!doc) throw new ApiError(404, 'Document not found');
    await bucket().delete(doc.fileId);
    await OwnedAppliance.updateOne({ _id: req.appliance._id }, { $pull: { documents: { fileId: doc.fileId } } });
    ok(res, { deleted: true });
  }));
}
