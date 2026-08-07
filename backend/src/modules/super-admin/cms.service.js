import { Banner } from './banner.model.js';
import { Story } from './story.model.js';
import { Video } from './video.model.js';
import { Advertisement } from './advertisement.model.js';
import { CMSPage } from './cmsPage.model.js';
import { AppSetting } from './appSetting.model.js';
import { Announcement } from '../technician/announcement.model.js';
import { TechnicianSkill } from '../technician/technicianSkill.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

// All six content types below are read by the customer/technician apps (public
// GET, no auth) and written only by super-admin (see cms.routes.js) — this is
// what CustomerAppCustomization.jsx is actually a merchandising builder for.
//
// The public list* readers deliberately return only live content (Active /
// Running / isActive). The console has to manage what is NOT live too — a
// Scheduled story, a Paused ad — so each has a listAll* counterpart behind the
// admin-only `/admin` routes. Keep the two apart: widening the public reader
// would leak unpublished content to the apps.

export async function listBanners({ app } = {}) {
  const query = { isActive: true };
  if (app) query.app = app;
  return Banner.find(query).sort({ sortOrder: 1 });
}
export async function createBanner(data) {
  return Banner.create(data);
}
export async function updateBanner(id, updates) {
  const banner = await Banner.findByIdAndUpdate(id, updates, { new: true });
  if (!banner) throw new ApiError(404, 'Banner not found');
  return banner;
}
export async function deleteBanner(id) {
  const banner = await Banner.findByIdAndDelete(id);
  if (!banner) throw new ApiError(404, 'Banner not found');
}

export async function listStories() {
  return Story.find({ status: 'Active' }).sort({ createdAt: -1 });
}
export async function createStory(data) {
  return Story.create(data);
}
export async function updateStory(id, updates) {
  const story = await Story.findByIdAndUpdate(id, updates, { new: true });
  if (!story) throw new ApiError(404, 'Story not found');
  return story;
}
export async function deleteStory(id) {
  const story = await Story.findByIdAndDelete(id);
  if (!story) throw new ApiError(404, 'Story not found');
}

export async function listVideos() {
  return Video.find({ isActive: true }).sort({ createdAt: -1 });
}
export async function createVideo(data) {
  return Video.create(data);
}
export async function updateVideo(id, updates) {
  const video = await Video.findByIdAndUpdate(id, updates, { new: true });
  if (!video) throw new ApiError(404, 'Video not found');
  return video;
}
export async function deleteVideo(id) {
  const video = await Video.findByIdAndDelete(id);
  if (!video) throw new ApiError(404, 'Video not found');
}

export async function listAdvertisements() {
  return Advertisement.find({ status: 'Running' }).sort({ createdAt: -1 });
}
export async function createAdvertisement(data) {
  return Advertisement.create(data);
}
export async function updateAdvertisement(id, updates) {
  const ad = await Advertisement.findByIdAndUpdate(id, updates, { new: true });
  if (!ad) throw new ApiError(404, 'Advertisement not found');
  return ad;
}
export async function deleteAdvertisement(id) {
  const ad = await Advertisement.findByIdAndDelete(id);
  if (!ad) throw new ApiError(404, 'Advertisement not found');
}

// ── Admin (console) readers — unfiltered by publish state ─────────────────────

export async function listAllBanners({ app } = {}) {
  const query = {};
  if (app) query.app = app;
  return Banner.find(query).sort({ sortOrder: 1 });
}

export async function listAllStories({ status } = {}) {
  const query = {};
  if (status) query.status = status;
  return Story.find(query).sort({ createdAt: -1 });
}

export async function listAllVideos() {
  return Video.find({}).sort({ createdAt: -1 });
}

export async function listAllAdvertisements({ status } = {}) {
  const query = {};
  if (status) query.status = status;
  return Advertisement.find(query).sort({ createdAt: -1 });
}

const DEFAULT_FAQS = [
  {
    question: 'How do I book a service on Nigam Care?',
    answer: 'Select your service or appliance, choose a date and time slot, select or enter your service address, and confirm your booking.',
    category: 'Bookings',
  },
  {
    question: 'How can I track my assigned technician?',
    answer: 'You can view your active service booking under "My Bookings" and track live technician assignment and status.',
    category: 'Bookings',
  },
  {
    question: 'What payment methods are supported?',
    answer: 'We support UPI (GPay, PhonePe, Paytm), Credit/Debit Cards (Visa, Mastercard, RuPay, Amex), Net Banking, and Cash after service.',
    category: 'Payments',
  },
  {
    question: 'How do I claim a warranty or extended warranty?',
    answer: 'Navigate to the Warranty section, upload your invoice, and register your appliance or claim service under active warranty.',
    category: 'Warranty',
  },
  {
    question: 'What if I need to reschedule or cancel my booking?',
    answer: 'You can reschedule or cancel your service request up to 2 hours before the scheduled time slot from the My Bookings page.',
    category: 'General',
  },
];

export async function getCmsPage(slug) {
  let page = await CMSPage.findOne({ slug });
  if (!page) {
    if (slug === 'faqs') {
      page = await CMSPage.create({
        slug: 'faqs',
        body: 'Frequently Asked Questions',
        faqs: DEFAULT_FAQS,
        publishedAt: new Date(),
      });
    } else if (slug === 'privacy-policy') {
      page = await CMSPage.create({
        slug: 'privacy-policy',
        body: 'Privacy Policy\n\nNigam Care values your privacy. We collect personal information to provide maintenance, repair, and customer support services.',
        publishedAt: new Date(),
      });
    } else if (slug === 'terms-and-conditions' || slug === 'terms') {
      page = await CMSPage.create({
        slug: slug,
        body: 'Terms & Conditions\n\nWelcome to Nigam Care. By using our platform, mobile apps, or booking services, you agree to comply with our policies.',
        publishedAt: new Date(),
      });
    } else {
      page = { slug, body: '', faqs: [] };
    }
  }
  return page;
}

export async function upsertCmsPage(slug, { body, faqs, publishedAt }) {
  const updateData = { slug, publishedAt: publishedAt || new Date() };
  if (body !== undefined) updateData.body = body;
  if (faqs !== undefined) updateData.faqs = faqs;

  return CMSPage.findOneAndUpdate(
    { slug },
    updateData,
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function getAppSettings(app) {
  const settings = await AppSetting.find({ app });
  return Object.fromEntries(settings.map((s) => [s.key, s.value]));
}
export async function setAppSetting(app, key, value) {
  return AppSetting.findOneAndUpdate({ app, key }, { app, key, value }, { upsert: true, new: true, setDefaultsOnInsert: true });
}

// ── Technician app content ────────────────────────────────────────────────────
// Announcements and the skill catalogue are authored here and read by the
// technician app (/tech/academy/announcements and the profile's spec picker).

export async function listAnnouncements() {
  return Announcement.find().sort({ createdAt: -1 });
}
export async function createAnnouncement(data) {
  return Announcement.create(data);
}
export async function updateAnnouncement(id, updates) {
  const doc = await Announcement.findByIdAndUpdate(id, updates, { new: true });
  if (!doc) throw new ApiError(404, 'Announcement not found');
  return doc;
}
export async function deleteAnnouncement(id) {
  const doc = await Announcement.findByIdAndDelete(id);
  if (!doc) throw new ApiError(404, 'Announcement not found');
}

export async function listSkills() {
  return TechnicianSkill.find().sort({ group: 1, name: 1 });
}
export async function createSkill(data) {
  // `code` is uniquely indexed — surface a clash as a 409 rather than a 500.
  const existing = await TechnicianSkill.findOne({ code: data.code });
  if (existing) throw new ApiError(409, `A skill with code "${data.code}" already exists`);
  return TechnicianSkill.create(data);
}
export async function updateSkill(id, updates) {
  const doc = await TechnicianSkill.findByIdAndUpdate(id, updates, { new: true });
  if (!doc) throw new ApiError(404, 'Skill not found');
  return doc;
}
export async function deleteSkill(id) {
  const doc = await TechnicianSkill.findByIdAndDelete(id);
  if (!doc) throw new ApiError(404, 'Skill not found');
}
