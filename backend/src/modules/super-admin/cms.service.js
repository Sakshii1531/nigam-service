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

const DEFAULT_PRIVACY_SECTIONS = [
  {
    heading: '1. Information We Collect',
    text: 'We collect personal information necessary to deliver doorstep services, including your name, contact phone number, service address, email address, and booking history. Payment details are processed through PCI-DSS compliant payment gateways (Razorpay) and are never stored on our servers.',
    order: 0,
  },
  {
    heading: '2. How We Use Your Data',
    text: 'Your personal data is strictly utilized for service dispatch, booking updates via SMS/WhatsApp, technician verification, warranty tracking, and customer support resolution.',
    order: 1,
  },
  {
    heading: '3. Data Protection & Security Protocols',
    text: 'We implement 256-bit SSL encryption, tokenized authentication, and strict role-based access controls to safeguard your personal details against unauthorized access or disclosure.',
    order: 2,
  },
  {
    heading: '4. Sharing Information with Service Technicians',
    text: 'Your contact name and service address are shared exclusively with the assigned background-verified technician solely for the duration of the scheduled job slot.',
    order: 3,
  },
  {
    heading: '5. Cookies & Analytics',
    text: 'We use essential session cookies to keep you logged in, save address preferences, and improve app responsiveness. You can manage cookie preferences via your browser settings.',
    order: 4,
  },
  {
    heading: '6. Your Data Rights & Contact Desk',
    text: 'You maintain the right to view, update, or request deletion of your account profile at any time. For privacy inquiries or data requests, email privacy@nccservice.in.',
    order: 5,
  },
];

const DEFAULT_TERMS_SECTIONS = [
  {
    heading: '1. Service Booking & Technician Dispatch',
    text: 'Nigam Care Center (NCC) acts as a verified home service platform connecting clients with certified technicians for AC repair, appliance servicing, electrical, plumbing, and cleaning tasks. By placing a booking, you agree to provide accurate location details and ensure adult supervision during doorstep appointments.',
    order: 0,
  },
  {
    heading: '2. Upfront Pricing & Payment Terms',
    text: 'All visiting charges, diagnostic costs, and spare part prices are displayed upfront prior to job confirmation. Payments can be processed securely online via UPI, Credit/Debit Cards, NetBanking, or directly in cash to the technician upon satisfactory job completion.',
    order: 1,
  },
  {
    heading: '3. 30-Day Service Warranty Policy',
    text: 'All repair services completed by NCC technicians include a complimentary 30-day service warranty. If the exact same issue reoccurs within 30 days of service, our team will dispatch a senior technician to rectify the problem free of any additional labor or visiting charge.',
    order: 2,
  },
  {
    heading: '4. Cancellation & Refund Policy',
    text: 'Bookings may be cancelled or rescheduled free of penalty up to 2 hours prior to the scheduled slot. If cancelled after technician dispatch, a nominal visiting charge may apply. Approved refunds are processed to the original payment source within 5 to 7 business days.',
    order: 3,
  },
  {
    heading: '5. Genuine Parts Guarantee',
    text: 'Spare parts supplied by NCC technicians are 100% original OEM parts. Replacement components carry manufacturer warranty as specified on the billing invoice.',
    order: 4,
  },
  {
    heading: '6. Limitation of Liability',
    text: 'NCC carries comprehensive liability coverage for technician property damage during active job execution. For support or dispute resolution, contact support@nccservice.in or call 1800-123-6222.',
    order: 5,
  },
];

const DEFAULT_ABOUT_SECTIONS = [
  {
    heading: 'Certified & Verified Technicians',
    text: 'Every technician undergoes rigorous background verification, technical testing, and safety protocols before taking any job.',
    order: 0,
  },
  {
    heading: '100% Transparent Pricing',
    text: 'No hidden fees or unexpected charges. View exact service rates upfront before booking.',
    order: 1,
  },
  {
    heading: 'Genuine Spare Parts',
    text: 'We use only authentic, high-grade OEM spare parts backed by warranty protection for long-lasting performance.',
    order: 2,
  },
  {
    heading: 'Instant Support & Warranty',
    text: 'Dedicated 24/7 customer care desk with hassle-free claim processing for all covered home appliances.',
    order: 3,
  },
];

const DEFAULT_ABOUT_STATS = [
  { label: 'Happy Customers', value: '50,000+' },
  { label: 'Certified Technicians', value: '100+' },
  { label: 'Satisfaction Rating', value: '4.8 ★' },
  { label: 'Response Time', value: '30 Mins' },
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
        body: 'Official Privacy Policy Document',
        version: 'v1.0',
        contactEmail: 'privacy@nccservice.in',
        sections: DEFAULT_PRIVACY_SECTIONS,
        publishedAt: new Date(),
      });
    } else if (slug === 'terms-and-conditions' || slug === 'terms') {
      page = await CMSPage.create({
        slug: slug,
        body: 'Official Terms & Conditions Document',
        version: 'v1.0',
        contactEmail: 'support@nccservice.in',
        sections: DEFAULT_TERMS_SECTIONS,
        publishedAt: new Date(),
      });
    } else if (slug === 'about-us' || slug === 'about-ncc') {
      page = await CMSPage.create({
        slug: slug,
        title: 'Empowering Smart Home Care & Appliance Solutions',
        subtitle: "Nigam Care Center (NCC) is India's leading home service network. We connect households with top-rated, background-verified technicians for AC repair, appliance servicing, electrical work, plumbing, and genuine spare parts delivery.",
        body: 'About Nigam Care Center',
        version: 'v2.4.0',
        contactEmail: 'support@nccservice.in',
        stats: DEFAULT_ABOUT_STATS,
        sections: DEFAULT_ABOUT_SECTIONS,
        publishedAt: new Date(),
      });
    } else {
      page = { slug, body: '', faqs: [], sections: [], stats: [] };
    }
  } else if ((slug === 'privacy-policy' || slug === 'terms-and-conditions') && (!page.sections || page.sections.length === 0)) {
    page.sections = slug === 'privacy-policy' ? DEFAULT_PRIVACY_SECTIONS : DEFAULT_TERMS_SECTIONS;
    await page.save();
  } else if ((slug === 'about-us' || slug === 'about-ncc') && (!page.sections || page.sections.length === 0)) {
    page.sections = DEFAULT_ABOUT_SECTIONS;
    page.stats = DEFAULT_ABOUT_STATS;
    page.title = page.title || 'Empowering Smart Home Care & Appliance Solutions';
    page.subtitle = page.subtitle || "Nigam Care Center (NCC) is India's leading home service network.";
    await page.save();
  }
  return page;
}

export async function upsertCmsPage(slug, { title, subtitle, body, sections, stats, faqs, version, contactEmail, publishedAt }) {
  const updateData = { slug, publishedAt: publishedAt || new Date() };
  if (title !== undefined) updateData.title = title;
  if (subtitle !== undefined) updateData.subtitle = subtitle;
  if (body !== undefined) updateData.body = body;
  if (sections !== undefined) updateData.sections = sections;
  if (stats !== undefined) updateData.stats = stats;
  if (faqs !== undefined) updateData.faqs = faqs;
  if (version !== undefined) updateData.version = version;
  if (contactEmail !== undefined) updateData.contactEmail = contactEmail;

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
