import { Wishlist } from './wishlist.model.js';
import { Product } from './product.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

export async function listWishlist(userId) {
  const items = await Wishlist.find({ user: userId }).populate('product').sort({ createdAt: -1 });
  return items.map((i) => i.product).filter(Boolean);
}

export async function addToWishlist(userId, productId) {
  const product = await Product.findById(productId);
  if (!product || !product.isActive) throw new ApiError(404, 'Product not found');

  await Wishlist.findOneAndUpdate({ user: userId, product: productId }, {}, { upsert: true });
  return listWishlist(userId);
}

export async function removeFromWishlist(userId, productId) {
  await Wishlist.deleteOne({ user: userId, product: productId });
  return listWishlist(userId);
}
