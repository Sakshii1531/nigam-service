import { TrainingGuide } from '../technician/trainingGuide.model.js';
import { Course } from '../technician/course.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

// A brand's own technician-training library. Platform-wide content (brand: null)
// is authored by super-admin and is deliberately NOT editable here — a brand can
// only manage what it published itself.

async function findOwnedOr404(Model, brandId, id, label) {
  const doc = await Model.findById(id);
  if (!doc) throw new ApiError(404, `${label} not found`);
  if (!doc.brand) throw new ApiError(403, `${label} is platform-wide content and cannot be changed by a brand`);
  if (String(doc.brand) !== String(brandId)) throw new ApiError(403, `Not authorized to access this ${label.toLowerCase()}`);
  return doc;
}

export async function listGuides(brandId) {
  return TrainingGuide.find({ brand: brandId }).sort({ createdAt: -1 });
}

export async function createGuide(brandId, data) {
  return TrainingGuide.create({ ...data, brand: brandId });
}

export async function deleteGuide(brandId, id) {
  const guide = await findOwnedOr404(TrainingGuide, brandId, id, 'Training guide');
  await guide.deleteOne();
  return { deleted: true };
}

export async function listCourses(brandId) {
  return Course.find({ brand: brandId }).sort({ createdAt: -1 });
}

export async function createCourse(brandId, data) {
  return Course.create({ ...data, brand: brandId });
}

const EDITABLE_FIELDS = ['name', 'modules', 'testRequired', 'minScore', 'status'];

export async function updateCourse(brandId, id, updates) {
  const course = await findOwnedOr404(Course, brandId, id, 'Course');
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) course[field] = updates[field];
  }
  await course.save();
  return course;
}

export async function deleteCourse(brandId, id) {
  const course = await findOwnedOr404(Course, brandId, id, 'Course');
  await course.deleteOne();
  return { deleted: true };
}
