import { connectDB, disconnectDB, ensureIndexes } from '../src/config/db.js';
import { registerAllModels } from '../src/config/registerModels.js';
import mongoose from 'mongoose';
import { ID_PREFIXES } from '../src/config/constants.js';

async function clearBookingsAndServiceRequests() {
  console.log('[clearBookings] Connecting to database...');
  await connectDB();
  await registerAllModels();
  await ensureIndexes();

  console.log('[clearBookings] Clearing all bookings, service requests, jobs, and associated transaction data...');

  const Booking = mongoose.model('Booking');
  const ServiceRequest = mongoose.model('ServiceRequest');
  const Job = mongoose.model('Job');
  const LiveTracking = mongoose.model('LiveTracking');
  const Invoice = mongoose.model('Invoice');
  const Payment = mongoose.model('Payment');
  const GatewayTransaction = mongoose.model('GatewayTransaction');
  const BillingTransaction = mongoose.model('BillingTransaction');
  const Escalation = mongoose.model('Escalation');
  const Review = mongoose.model('Review');
  const Conversation = mongoose.model('Conversation');
  const Message = mongoose.model('Message');
  const Notification = mongoose.model('Notification');
  const NotificationReceipt = mongoose.model('NotificationReceipt');
  const CallLog = mongoose.model('CallLog');
  const PartOrder = mongoose.model('PartOrder');
  const ReplacementApproval = mongoose.model('ReplacementApproval');
  const ReverseLogisticsReturn = mongoose.model('ReverseLogisticsReturn');
  const AMCVisit = mongoose.model('AMCVisit');
  const Claim = mongoose.model('Claim');
  const ExchangeRequest = mongoose.model('ExchangeRequest');
  const GeneratedDocument = mongoose.model('GeneratedDocument');
  const Counter = mongoose.model('Counter');
  const EarningsTally = mongoose.model('EarningsTally');
  const Payout = mongoose.model('Payout');
  const WalletLedger = mongoose.model('WalletLedger');
  const ServiceProvider = mongoose.model('ServiceProvider');
  const User = mongoose.model('User');

  // Delete bookings, service requests, jobs
  const bookingRes = await Booking.deleteMany({});
  const srRes = await ServiceRequest.deleteMany({});
  const jobRes = await Job.deleteMany({});

  // Delete related operational & tracking data
  const trackingRes = await LiveTracking.deleteMany({});
  const invoiceRes = await Invoice.deleteMany({});
  const paymentRes = await Payment.deleteMany({});
  const gwTxRes = await GatewayTransaction.deleteMany({});
  const billTxRes = await BillingTransaction.deleteMany({});
  const escRes = await Escalation.deleteMany({});
  const reviewRes = await Review.deleteMany({});
  const convRes = await Conversation.deleteMany({});
  const msgRes = await Message.deleteMany({});
  const notifRes = await Notification.deleteMany({});
  const notifReceiptRes = await NotificationReceipt.deleteMany({});
  const callLogRes = await CallLog.deleteMany({});
  const partOrderRes = await PartOrder.deleteMany({});
  const replAppRes = await ReplacementApproval.deleteMany({});
  const revLogRes = await ReverseLogisticsReturn.deleteMany({});
  const amcVisitRes = await AMCVisit.deleteMany({});
  const claimRes = await Claim.deleteMany({});
  const exReqRes = await ExchangeRequest.deleteMany({});
  const genDocRes = await GeneratedDocument.deleteMany({});

  // Earnings and wallet history accrue from completed jobs and bookings
  const tallyRes = await EarningsTally.deleteMany({});
  const payoutRes = await Payout.deleteMany({});
  const walletRes = await WalletLedger.deleteMany({});
  await User.updateMany({ walletCoins: { $gt: 0 } }, { $set: { walletCoins: 0 } });

  // Reset service provider job counters and free up any busy technicians
  const serviceProviderRes = await ServiceProvider.updateMany(
    {},
    {
      $set: {
        activeJobsCount: 0,
        completedJobsCount: 0,
      },
    }
  );
  const busyProvidersRes = await ServiceProvider.updateMany(
    { availability: 'Busy' },
    { $set: { availability: 'Available' } }
  );

  // Reset sequential human-ID counters for wiped entities
  const prefixesToReset = [
    ID_PREFIXES.BOOKING, // NCC
    ID_PREFIXES.SERVICE_REQUEST, // SR
    ID_PREFIXES.JOB, // JOB
    ID_PREFIXES.INVOICE, // INV
    ID_PREFIXES.CLAIM, // NC
    ID_PREFIXES.AMC_RECORD, // AMC
    ID_PREFIXES.EXCHANGE, // EX
    ID_PREFIXES.REPLACEMENT, // RPL
    ID_PREFIXES.RETURN, // RET
    ID_PREFIXES.PART_REQUEST, // PR
    ID_PREFIXES.REVIEW, // REV
    ID_PREFIXES.DOCUMENT, // DOC
  ];

  const counterRegex = new RegExp(`^(${prefixesToReset.join('|')})(:.*)?$`);
  const counterRes = await Counter.deleteMany({ _id: { $regex: counterRegex } });

  console.log('\n--- Cleanup Summary ---');
  console.log(`- Bookings: ${bookingRes.deletedCount}`);
  console.log(`- Service Requests: ${srRes.deletedCount}`);
  console.log(`- Jobs: ${jobRes.deletedCount}`);
  console.log(`- Live Tracking Records: ${trackingRes.deletedCount}`);
  console.log(`- Invoices: ${invoiceRes.deletedCount}`);
  console.log(`- Payments: ${paymentRes.deletedCount}`);
  console.log(`- Gateway Transactions: ${gwTxRes.deletedCount}`);
  console.log(`- Billing Transactions: ${billTxRes.deletedCount}`);
  console.log(`- Escalations: ${escRes.deletedCount}`);
  console.log(`- Reviews: ${reviewRes.deletedCount}`);
  console.log(`- Conversations: ${convRes.deletedCount}`);
  console.log(`- Messages: ${msgRes.deletedCount}`);
  console.log(`- Notifications: ${notifRes.deletedCount}`);
  console.log(`- Notification Receipts: ${notifReceiptRes.deletedCount}`);
  console.log(`- Call Logs: ${callLogRes.deletedCount}`);
  console.log(`- Part Orders: ${partOrderRes.deletedCount}`);
  console.log(`- Replacement Approvals: ${replAppRes.deletedCount}`);
  console.log(`- Reverse Logistics Returns: ${revLogRes.deletedCount}`);
  console.log(`- AMC Visits: ${amcVisitRes.deletedCount}`);
  console.log(`- Claims: ${claimRes.deletedCount}`);
  console.log(`- Exchange Requests: ${exReqRes.deletedCount}`);
  console.log(`- Generated Documents: ${genDocRes.deletedCount}`);
  console.log(`- Earnings Tallies: ${tallyRes.deletedCount}`);
  console.log(`- Payouts: ${payoutRes.deletedCount}`);
  console.log(`- Wallet Ledgers: ${walletRes.deletedCount}`);
  console.log(`- Service Provider counters reset: ${serviceProviderRes.modifiedCount}`);
  console.log(`- Service Provider availability reset (Busy -> Available): ${busyProvidersRes.modifiedCount}`);
  console.log(`- Reset ID Counters: ${counterRes.deletedCount}`);
  console.log('-----------------------\n');

  console.log('[clearBookings] Cleanup complete! All bookings, service requests, and related data cleared. Users and Catalog remain intact.');
  await disconnectDB();
}

clearBookingsAndServiceRequests().catch(async (err) => {
  console.error('[clearBookings] Error during cleanup:', err);
  await disconnectDB();
  process.exit(1);
});
