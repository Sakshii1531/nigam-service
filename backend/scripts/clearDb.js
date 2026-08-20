import { connectDB, disconnectDB, ensureIndexes } from '../src/config/db.js';
import { registerAllModels } from '../src/config/registerModels.js';
import mongoose from 'mongoose';
import { ROLES } from '../src/config/constants.js';

async function clearDb() {
  console.log('[clearDb] Connecting to database...');
  await connectDB();
  await registerAllModels();
  await ensureIndexes();

  console.log('[clearDb] Wiping non-admin users and transactional data...');

  const User = mongoose.model('User');
  const Technician = mongoose.model('Technician');
  const ServiceRequest = mongoose.model('ServiceRequest');
  const Booking = mongoose.model('Booking');
  const Job = mongoose.model('Job');
  const OwnedAppliance = mongoose.model('OwnedAppliance');
  const Review = mongoose.model('Review');
  const Conversation = mongoose.model('Conversation');
  const Message = mongoose.model('Message');
  const Notification = mongoose.model('Notification');
  const NotificationPreference = mongoose.model('NotificationPreference');
  const Cart = mongoose.model('Cart');
  const Wishlist = mongoose.model('Wishlist');
  const Order = mongoose.model('Order');
  const Payment = mongoose.model('Payment');
  const WalletLedger = mongoose.model('WalletLedger');
  const Claim = mongoose.model('Claim');
  const PartOrder = mongoose.model('PartOrder');
  const Payout = mongoose.model('Payout');
  const EarningsTally = mongoose.model('EarningsTally');
  const TechInventoryItem = mongoose.model('TechInventoryItem');
  const AMCSubscription = mongoose.model('AMCSubscription');
  const ExtendedWarrantyOrder = mongoose.model('ExtendedWarrantyOrder');
  const AMCVisit = mongoose.model('AMCVisit');
  const ExchangeRequest = mongoose.model('ExchangeRequest');
  const Escalation = mongoose.model('Escalation');
  const AuditLog = mongoose.model('AuditLog');
  const LiveTracking = mongoose.model('LiveTracking');
  const Invoice = mongoose.model('Invoice');
  const ReplacementApproval = mongoose.model('ReplacementApproval');
  const ReverseLogisticsReturn = mongoose.model('ReverseLogisticsReturn');
  const Otp = mongoose.model('Otp');
  const RefreshToken = mongoose.model('RefreshToken');

  // Delete non-admin users (keeping super_admin and brand_admin)
  const userResult = await User.deleteMany({ role: { $in: [ROLES.CUSTOMER, ROLES.TECHNICIAN] } });
  console.log(`[clearDb] Deleted ${userResult.deletedCount} non-admin Users (Customer & Technician)`);

  // Delete all technicians
  const techResult = await Technician.deleteMany({});
  console.log(`[clearDb] Deleted ${techResult.deletedCount} Technician profiles`);

  // Delete bookings & service requests & jobs
  const srResult = await ServiceRequest.deleteMany({});
  const bookingResult = await Booking.deleteMany({});
  const jobResult = await Job.deleteMany({});
  console.log(`[clearDb] Deleted ${srResult.deletedCount} Service Requests, ${bookingResult.deletedCount} Bookings, ${jobResult.deletedCount} Jobs`);

  // Delete customer owned appliances & reviews
  const appResult = await OwnedAppliance.deleteMany({});
  const revResult = await Review.deleteMany({});
  console.log(`[clearDb] Deleted ${appResult.deletedCount} Owned Appliances, ${revResult.deletedCount} Reviews`);

  // Delete commerce transactions (Orders, Carts, Wishlists, Payments, Wallet Ledgers)
  const cartResult = await Cart.deleteMany({});
  const wishResult = await Wishlist.deleteMany({});
  const orderResult = await Order.deleteMany({});
  const payResult = await Payment.deleteMany({});
  const walletResult = await WalletLedger.deleteMany({});
  console.log(`[clearDb] Deleted ${orderResult.deletedCount} Orders, ${payResult.deletedCount} Payments, ${cartResult.deletedCount} Carts, ${wishResult.deletedCount} Wishlists, ${walletResult.deletedCount} Wallet Ledgers`);

  // Delete technician inventory & claims & payouts
  const techInvResult = await TechInventoryItem.deleteMany({});
  const partOrderResult = await PartOrder.deleteMany({});
  const claimResult = await Claim.deleteMany({});
  const payoutResult = await Payout.deleteMany({});
  const tallyResult = await EarningsTally.deleteMany({});
  console.log(`[clearDb] Deleted ${techInvResult.deletedCount} Tech Inventory Items, ${partOrderResult.deletedCount} Part Orders, ${claimResult.deletedCount} Claims, ${payoutResult.deletedCount} Payouts`);

  // Delete AMC & Warranty subscriptions/orders/visits & exchange requests
  const amcSubResult = await AMCSubscription.deleteMany({});
  const ewOrderResult = await ExtendedWarrantyOrder.deleteMany({});
  const amcVisitResult = await AMCVisit.deleteMany({});
  const exReqResult = await ExchangeRequest.deleteMany({});
  console.log(`[clearDb] Deleted ${amcSubResult.deletedCount} AMC Subscriptions, ${ewOrderResult.deletedCount} EW Orders, ${amcVisitResult.deletedCount} AMC Visits, ${exReqResult.deletedCount} Exchange Requests`);

  // Delete notifications, chats & session tokens
  await Conversation.deleteMany({});
  await Message.deleteMany({});
  await Notification.deleteMany({});
  await NotificationPreference.deleteMany({});
  await Otp.deleteMany({});
  await RefreshToken.deleteMany({});

  // Delete operational logs & brand invoices/approvals
  await Escalation.deleteMany({});
  await AuditLog.deleteMany({});
  await LiveTracking.deleteMany({});
  await Invoice.deleteMany({});
  await ReplacementApproval.deleteMany({});
  await ReverseLogisticsReturn.deleteMany({});

  // Verify remaining Admin users
  const adminUsers = await User.find({ role: { $in: [ROLES.SUPER_ADMIN, ROLES.BRAND_ADMIN] } }).select('name email role');
  console.log('\n[clearDb] Retained Admin Users:');
  adminUsers.forEach((admin) => {
    console.log(` - [${admin.role}] ${admin.name} (${admin.email || 'N/A'})`);
  });

  console.log('\n[clearDb] Database cleanup complete! Only Admin credentials were preserved.');
  await disconnectDB();
}

clearDb().catch(async (err) => {
  console.error('[clearDb] Error clearing DB:', err);
  await disconnectDB();
  process.exit(1);
});
