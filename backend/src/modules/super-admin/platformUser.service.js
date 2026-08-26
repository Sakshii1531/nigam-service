import { User } from '../auth/user.model.js';
import { RefreshToken } from '../auth/refreshToken.model.js';
import { OwnedAppliance } from '../service-requests/ownedAppliance.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { Referral } from '../rewards-loyalty/referral.model.js';
import { AMCSubscription } from '../warranty-amc-exchange/amcSubscription.model.js';
import { ExtendedWarrantyOrder } from '../warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { Order } from '../buy-commerce/order.model.js';
import { ExchangeRequest } from '../warranty-amc-exchange/exchangeRequest.model.js';
import { Job } from '../technician/job.model.js';
import { PlatformSettings } from './platformSettings.model.js';

export async function listUsers({ role, status, page, limit, sort } = {}) {
  const query = {};
  if (role) query.role = role;
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    User.find(query).sort(sortObj).skip(skip).limit(lim),
    User.countDocuments(query),
  ]);

  // The console shows (and sorts by) an appliance and service count per row.
  // Neither was returned, so both columns read zero for every customer and the
  // "minimum appliances" filter matched nobody.
  const ids = items.map((u) => u._id);
  const [applianceRows, serviceRows] = await Promise.all([
    OwnedAppliance.aggregate([{ $match: { user: { $in: ids } } }, { $group: { _id: '$user', count: { $sum: 1 } } }]),
    ServiceRequest.aggregate([{ $match: { user: { $in: ids } } }, { $group: { _id: '$user', count: { $sum: 1 } } }]),
  ]);
  const applianceCount = new Map(applianceRows.map((r) => [String(r._id), r.count]));
  const serviceCount = new Map(serviceRows.map((r) => [String(r._id), r.count]));

  const withCounts = items.map((u) => ({
    ...u.toJSON(),
    appliancesCount: applianceCount.get(String(u._id)) || 0,
    servicesCount: serviceCount.get(String(u._id)) || 0,
  }));

  return { items: withCounts, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

async function findOr404(id) {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

export async function getUser(id) {
  const user = await findOr404(id);
  
  if (user.role === 'customer') {
    const [referrals, amcSubscriptions, warrantyOrders, serviceRequests, orders, exchangeRequests] = await Promise.all([
      Referral.find({ referrer: user._id }).populate('referredUser'),
      AMCSubscription.find({ user: user._id }).populate('plan'),
      ExtendedWarrantyOrder.find({ user: user._id }),
      ServiceRequest.find({ user: user._id }).populate('technician').populate('appliance'),
      Order.find({ user: user._id }).populate('items.product'),
      ExchangeRequest.find({ user: user._id })
    ]);

    const cleanedAddresses = (user.addresses || []).map(addr => {
      const obj = addr && addr.toObject ? addr.toObject() : (addr || {});
      if (obj.house && (obj.house.includes('(City:') || obj.house.includes('City:'))) {
        return {
          ...obj,
          city: obj.city === 'Delhi' ? '' : (obj.city || ''),
          pincode: obj.pincode === '110001' ? '' : (obj.pincode || '')
        };
      }
      return obj;
    });

    return {
      ...user.toObject(),
      addresses: cleanedAddresses,
      referrals,
      amcSubscriptions,
      warrantyOrders,
      serviceRequests,
      orders,
      exchangeRequests
    };
  }

  return user;
}

export async function updateUserStatus(id, status) {
  const user = await findOr404(id);
  user.status = status;
  // A suspension has to end the sessions the user already holds, or their
  // existing refresh token keeps minting access tokens.
  if (status === 'Suspended') {
    await RefreshToken.updateMany({ user: user._id, revoked: false }, { revoked: true });
  }
  await user.save();
  return user;
}

/**
 * Closes an account from the admin console. This suspends and signs the user
 * out rather than removing the document — orders, service requests and invoices
 * reference the User, and deleting it would leave that history dangling.
 */
export async function closeUserAccount(id) {
  return updateUserStatus(id, 'Suspended');
}

export async function getServiceReceipt(userId, requestId) {
  const user = await findOr404(userId);
  const request = await ServiceRequest.findOne({ _id: requestId, user: userId })
    .populate('technician')
    .populate('appliance');
  
  if (!request) {
    throw new ApiError(404, 'Service Request not found for this customer');
  }

  // The receipt has to state what was actually billed. It previously issued
  // every customer a flat ₹499 + 18% regardless of the job.
  const job = await Job.findOne({ serviceRequest: request._id });
  const settings = await PlatformSettings.findOne();
  const gstPercent = job?.billingEstimate?.gstPercent ?? settings?.defaultGstPercent ?? 18;

  const baseAmount = (job?.billingEstimate?.serviceCharge || 0)
    + (job?.billingEstimate?.sparePartsTotal || 0)
    + (job?.billingEstimate?.additionalServicesTotal || 0);
  const taxAmount = Math.round(baseAmount * (gstPercent / 100));
  const totalAmount = job?.billingEstimate?.total != null
    ? Math.round(job.billingEstimate.total)
    : baseAmount + taxAmount;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Service Receipt - ${request.humanId || request._id}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; color: #0F172A; margin: 0; padding: 40px; background-color: #F8FAFC; }
        .receipt-card { max-width: 700px; margin: 0 auto; bg-color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #E2E8F0; background: #FFF; box-shadow: 0 10px 30px rgba(13, 71, 161, 0.04); }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #E2E8F0; padding-bottom: 24px; margin-bottom: 24px; }
        .logo-text { font-size: 24px; font-weight: 900; color: #0D47A1; text-transform: uppercase; letter-spacing: 1px; }
        .receipt-title { font-size: 14px; font-weight: 700; color: #64748B; uppercase tracking-widest; text-align: right; }
        .grid-details { display: grid; grid-template-cols: 1fr 1fr; gap: 24px; margin-bottom: 30px; }
        .section-title { font-size: 11px; font-weight: 800; color: #0D47A1; text-transform: uppercase; tracking-wider; margin-bottom: 8px; }
        .details-box { background-color: #F8FAFC; border: 1px solid #F1F5F9; padding: 16px; border-radius: 16px; font-size: 13px; line-height: 1.6; }
        .table { w-full; width: 100%; border-collapse: collapse; margin-top: 20px; }
        .table th { border-bottom: 2px solid #E2E8F0; padding: 12px; font-size: 12px; font-weight: 700; color: #64748B; text-align: left; text-transform: uppercase; }
        .table td { padding: 16px 12px; border-bottom: 1px solid #F1F5F9; font-size: 13px; color: #334155; }
        .summary-box { float: right; width: 280px; margin-top: 24px; font-size: 13px; }
        .summary-row { display: flex; justify-content: space-between; padding: 6px 0; }
        .summary-row.total { border-top: 2px solid #E2E8F0; font-weight: 800; color: #0D47A1; font-size: 16px; padding-top: 12px; }
        .actions { margin-top: 40px; clear: both; text-align: center; }
        .btn-print { background-color: #0D47A1; color: #FFF; border: none; padding: 12px 24px; font-weight: 700; font-size: 13px; border-radius: 12px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(13, 71, 161, 0.15); }
        .btn-print:hover { background-color: #0A3A85; transform: translateY(-1px); }
        @media print { .actions { display: none; } body { padding: 0; background-color: #FFF; } .receipt-card { border: none; box-shadow: none; padding: 0; } }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <div class="header">
          <div>
            <div class="logo-text">Nigam Care</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px; font-weight: 500;">Trusted Home Appliance Services</div>
          </div>
          <div>
            <div class="receipt-title">SERVICE RECEIPT</div>
            <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-top: 4px;">#${request.humanId || request._id}</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Date: ${new Date(request.createdAt).toLocaleDateString()}</div>
          </div>
        </div>

        <div class="grid-details">
          <div>
            <div class="section-title">Customer Details</div>
            <div class="details-box">
              <strong>Name:</strong> ${user.name}<br/>
              <strong>Phone:</strong> ${user.phone}<br/>
              <strong>Email:</strong> ${user.email}<br/>
              <strong>Address:</strong> ${request.address || user.addresses?.[0]?.house || 'Indore, MP'}
            </div>
          </div>
          <div>
            <div class="section-title">Service Details</div>
            <div class="details-box">
              <strong>Appliance:</strong> ${request.appliance?.brand || request.brand || 'Appliance'} ${request.appliance?.type || request.category || ''}<br/>
              <strong>Model:</strong> ${request.appliance?.model || request.model || '—'}<br/>
              <strong>Status:</strong> <span style="color:#22C55E; font-weight: 700;">${request.status}</span><br/>
              <strong>Technician:</strong> ${request.technician?.name || 'Assigned Agent'}
            </div>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Type</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Appliance Maintenance / Repair Service</strong><br/>
                <span style="font-size: 11px; color: #64748B;">Diagnosis, inspection, and component servicing for ${request.category || 'Appliance'}</span>
              </td>
              <td>${request.complaintType || 'Breakdown'}</td>
              <td style="text-align: right; font-weight: 600;">₹${baseAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="summary-box">
          <div class="summary-row">
            <span style="color: #64748B;">Subtotal:</span>
            <strong>₹${baseAmount.toFixed(2)}</strong>
          </div>
          <div class="summary-row">
            <span style="color: #64748B;">GST (${gstPercent}%):</span>
            <strong>₹${taxAmount.toFixed(2)}</strong>
          </div>
          <div class="summary-row total">
            <span>Total Paid:</span>
            <span>₹${totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div class="actions">
          <button class="btn-print" onclick="window.print()">Print / Download PDF</button>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function getProductReceipt(userId, orderId) {
  const user = await findOr404(userId);
  const order = await Order.findOne({ _id: orderId, user: userId }).populate('items.product');
  
  if (!order) {
    throw new ApiError(404, 'Product order not found for this customer');
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Product Invoice - ${order.humanId || order._id}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; color: #0F172A; margin: 0; padding: 40px; background-color: #F8FAFC; }
        .receipt-card { max-width: 700px; margin: 0 auto; bg-color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #E2E8F0; background: #FFF; box-shadow: 0 10px 30px rgba(13, 71, 161, 0.04); }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #E2E8F0; padding-bottom: 24px; margin-bottom: 24px; }
        .logo-text { font-size: 24px; font-weight: 900; color: #0D47A1; text-transform: uppercase; letter-spacing: 1px; }
        .receipt-title { font-size: 14px; font-weight: 700; color: #64748B; uppercase tracking-widest; text-align: right; }
        .grid-details { display: grid; grid-template-cols: 1fr 1fr; gap: 24px; margin-bottom: 30px; }
        .section-title { font-size: 11px; font-weight: 800; color: #0D47A1; text-transform: uppercase; tracking-wider; margin-bottom: 8px; }
        .details-box { background-color: #F8FAFC; border: 1px solid #F1F5F9; padding: 16px; border-radius: 16px; font-size: 13px; line-height: 1.6; }
        .table { w-full; width: 100%; border-collapse: collapse; margin-top: 20px; }
        .table th { border-bottom: 2px solid #E2E8F0; padding: 12px; font-size: 12px; font-weight: 700; color: #64748B; text-align: left; text-transform: uppercase; }
        .table td { padding: 16px 12px; border-bottom: 1px solid #F1F5F9; font-size: 13px; color: #334155; }
        .summary-box { float: right; width: 280px; margin-top: 24px; font-size: 13px; }
        .summary-row { display: flex; justify-content: space-between; padding: 6px 0; }
        .summary-row.total { border-top: 2px solid #E2E8F0; font-weight: 800; color: #0D47A1; font-size: 16px; padding-top: 12px; }
        .actions { margin-top: 40px; clear: both; text-align: center; }
        .btn-print { background-color: #0D47A1; color: #FFF; border: none; padding: 12px 24px; font-weight: 700; font-size: 13px; border-radius: 12px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(13, 71, 161, 0.15); }
        .btn-print:hover { background-color: #0A3A85; transform: translateY(-1px); }
        @media print { .actions { display: none; } body { padding: 0; background-color: #FFF; } .receipt-card { border: none; box-shadow: none; padding: 0; } }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <div class="header">
          <div>
            <div class="logo-text">Nigam Care</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px; font-weight: 500;">Premium Appliances & Spares</div>
          </div>
          <div>
            <div class="receipt-title">TAX INVOICE</div>
            <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-top: 4px;">#${order.humanId || order._id}</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Date: ${new Date(order.createdAt).toLocaleDateString()}</div>
          </div>
        </div>

        <div class="grid-details">
          <div>
            <div class="section-title">Billing Details</div>
            <div class="details-box">
              <strong>Name:</strong> ${user.name}<br/>
              <strong>Phone:</strong> ${user.phone}<br/>
              <strong>Email:</strong> ${user.email}<br/>
              <strong>Address:</strong> ${order.address?.house || 'Indore, MP'}
            </div>
          </div>
          <div>
            <div class="section-title">Order Status</div>
            <div class="details-box">
              <strong>Payment Mode:</strong> Razorpay Gateway<br/>
              <strong>Delivery Status:</strong> <span style="color:#0D47A1; font-weight: 700;">${order.status}</span><br/>
              <strong>Coins Redeemed:</strong> ${order.coinsRedeemed || 0} Coins
            </div>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th style="text-align: center;">Price</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td><strong>${item.name || item.product?.name || 'Product Item'}</strong></td>
                <td style="text-align: center;">₹${item.price.toFixed(2)}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right; font-weight: 600;">₹${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary-box">
          <div class="summary-row">
            <span style="color: #64748B;">Subtotal:</span>
            <strong>₹${order.subtotal.toFixed(2)}</strong>
          </div>
          ${order.couponDiscount ? `
            <div class="summary-row" style="color: #22C55E;">
              <span>Coupon Discount (${order.couponCode || 'PROMO'}):</span>
              <strong>-₹${order.couponDiscount.toFixed(2)}</strong>
            </div>
          ` : ''}
          ${order.exchangeDiscount ? `
            <div class="summary-row" style="color: #22C55E;">
              <span>Exchange Value Deduction:</span>
              <strong>-₹${order.exchangeDiscount.toFixed(2)}</strong>
            </div>
          ` : ''}
          ${order.coinsValue ? `
            <div class="summary-row" style="color: #22C55E;">
              <span>Coins Discount:</span>
              <strong>-₹${order.coinsValue.toFixed(2)}</strong>
            </div>
          ` : ''}
          <div class="summary-row total">
            <span>Grand Total:</span>
            <span>₹${order.total.toFixed(2)}</span>
          </div>
        </div>

        <div class="actions">
          <button class="btn-print" onclick="window.print()">Print / Download PDF</button>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function getExchangeReceipt(userId, exchangeId) {
  const user = await findOr404(userId);
  const exchange = await ExchangeRequest.findOne({ _id: exchangeId, user: userId });
  
  if (!exchange) {
    throw new ApiError(404, 'Exchange Request not found for this customer');
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Exchange Valuation - ${exchange.humanId || exchange._id}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; color: #0F172A; margin: 0; padding: 40px; background-color: #F8FAFC; }
        .receipt-card { max-width: 700px; margin: 0 auto; bg-color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #E2E8F0; background: #FFF; box-shadow: 0 10px 30px rgba(13, 71, 161, 0.04); }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #E2E8F0; padding-bottom: 24px; margin-bottom: 24px; }
        .logo-text { font-size: 24px; font-weight: 900; color: #0D47A1; text-transform: uppercase; letter-spacing: 1px; }
        .receipt-title { font-size: 14px; font-weight: 700; color: #64748B; uppercase tracking-widest; text-align: right; }
        .grid-details { display: grid; grid-template-cols: 1fr 1fr; gap: 24px; margin-bottom: 30px; }
        .section-title { font-size: 11px; font-weight: 800; color: #0D47A1; text-transform: uppercase; tracking-wider; margin-bottom: 8px; }
        .details-box { background-color: #F8FAFC; border: 1px solid #F1F5F9; padding: 16px; border-radius: 16px; font-size: 13px; line-height: 1.6; }
        .table { w-full; width: 100%; border-collapse: collapse; margin-top: 20px; }
        .table th { border-bottom: 2px solid #E2E8F0; padding: 12px; font-size: 12px; font-weight: 700; color: #64748B; text-align: left; text-transform: uppercase; }
        .table td { padding: 16px 12px; border-bottom: 1px solid #F1F5F9; font-size: 13px; color: #334155; }
        .summary-box { float: right; width: 280px; margin-top: 24px; font-size: 13px; }
        .summary-row { display: flex; justify-content: justify; justify-content: space-between; padding: 6px 0; }
        .summary-row.total { border-top: 2px solid #E2E8F0; font-weight: 800; color: #22C55E; font-size: 16px; padding-top: 12px; }
        .actions { margin-top: 40px; clear: both; text-align: center; }
        .btn-print { background-color: #0D47A1; color: #FFF; border: none; padding: 12px 24px; font-weight: 700; font-size: 13px; border-radius: 12px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(13, 71, 161, 0.15); }
        .btn-print:hover { background-color: #0A3A85; transform: translateY(-1px); }
        @media print { .actions { display: none; } body { padding: 0; background-color: #FFF; } .receipt-card { border: none; box-shadow: none; padding: 0; } }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <div class="header">
          <div>
            <div class="logo-text">Nigam Care</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 4px; font-weight: 500;">Eco-friendly appliance upgrades</div>
          </div>
          <div>
            <div class="receipt-title">EXCHANGE VALUATION</div>
            <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-top: 4px;">#${exchange.humanId || exchange._id}</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Date: ${new Date(exchange.createdAt).toLocaleDateString()}</div>
          </div>
        </div>

        <div class="grid-details">
          <div>
            <div class="section-title">Customer Details</div>
            <div class="details-box">
              <strong>Name:</strong> ${user.name}<br/>
              <strong>Phone:</strong> ${user.phone}<br/>
              <strong>Email:</strong> ${user.email}
            </div>
          </div>
          <div>
            <div class="section-title">Valuation Status</div>
            <div class="details-box">
              <strong>Exchange Category:</strong> ${exchange.category || 'Appliance'}<br/>
              <strong>Brand/Model:</strong> ${exchange.brand || 'Generic'} ${exchange.model || ''}<br/>
              <strong>Status:</strong> <span style="color:#FFCA00; font-weight: 700;">${exchange.status}</span>
            </div>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Condition</th>
              <th style="text-align: right;">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Device Exchange Appraisal</strong><br/>
                <span style="font-size: 11px; color: #64748B;">Valuation estimation for trade-in product exchange program.</span>
              </td>
              <td style="text-align: center; font-weight: 700;">${exchange.condition || 'Good'}</td>
              <td style="text-align: right; font-weight: 600;">₹${exchange.baseValue.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="summary-box">
          <div class="summary-row">
            <span style="color: #64748B;">Base Value:</span>
            <strong>₹${exchange.baseValue.toFixed(2)}</strong>
          </div>
          <div class="summary-row" style="color: #E11D48;">
            <span>Condition Deductions:</span>
            <strong>-₹${exchange.deductionsAmount.toFixed(2)}</strong>
          </div>
          <div class="summary-row" style="color: #22C55E;">
            <span>Exchange Upgrade Bonus:</span>
            <strong>+₹${exchange.bonusAmount.toFixed(2)}</strong>
          </div>
          <div class="summary-row total">
            <span>Estimated Value:</span>
            <span>₹${exchange.estimatedValue.toFixed(2)}</span>
          </div>
        </div>

        <div class="actions">
          <button class="btn-print" onclick="window.print()">Print / Download PDF</button>
        </div>
      </div>
    </body>
    </html>
  `;
}
