import { Banner } from './banner.model.js';
import { Story } from './story.model.js';
import { Video } from './video.model.js';
import { Advertisement } from './advertisement.model.js';
import { CMSPage } from './cmsPage.model.js';
import { AppSetting } from './appSetting.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

// All six content types below are read by the customer/technician apps (public
// GET, no auth) and written only by super-admin (see cms.routes.js) — this is
// what CustomerAppCustomization.jsx is actually a merchandising builder for.

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

export async function getCmsPage(slug) {
  const page = await CMSPage.findOne({ slug });
  if (!page) throw new ApiError(404, `No CMS page found for slug "${slug}"`);
  return page;
}
export async function upsertCmsPage(slug, { body, publishedAt }) {
  return CMSPage.findOneAndUpdate(
    { slug },
    { slug, body, publishedAt: publishedAt || new Date() },
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
