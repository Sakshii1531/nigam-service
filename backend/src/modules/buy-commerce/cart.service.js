import { Cart } from './cart.model.js';
import { Product } from './product.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
}

export async function getCart(userId) {
  const cart = await getOrCreateCart(userId);
  return cart.populate('items.product');
}

export async function addItem(userId, productId, quantity = 1) {
  const product = await Product.findById(productId);
  if (!product || !product.isActive) throw new ApiError(404, 'Product not found');

  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find((item) => String(item.product) === productId);
  if (existing) existing.quantity += quantity;
  else cart.items.push({ product: productId, quantity });

  await cart.save();
  return cart.populate('items.product');
}

export async function removeItem(userId, productId) {
  const cart = await getOrCreateCart(userId);
  cart.items = cart.items.filter((item) => String(item.product) !== productId);
  await cart.save();
  return cart.populate('items.product');
}

export async function clearCart(userId) {
  const cart = await getOrCreateCart(userId);
  cart.items = [];
  await cart.save();
  return cart;
}
