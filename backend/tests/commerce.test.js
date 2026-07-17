import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Product } from '../src/modules/buy-commerce/product.model.js';
import { Cart } from '../src/modules/buy-commerce/cart.model.js';
import { Wishlist } from '../src/modules/buy-commerce/wishlist.model.js';
import { Order } from '../src/modules/buy-commerce/order.model.js';
import { Coupon } from '../src/modules/rewards-loyalty/coupon.model.js';
import { ExchangeQuestionSet } from '../src/modules/warranty-amc-exchange/exchangeQuestionSet.model.js';
import { ExchangeCampaign } from '../src/modules/warranty-amc-exchange/exchangeCampaign.model.js';
import { ExchangeRequest } from '../src/modules/warranty-amc-exchange/exchangeRequest.model.js';
import { Payment } from '../src/modules/payments-wallet/payment.model.js';
import { WalletLedger } from '../src/modules/payments-wallet/walletLedger.model.js';
import { signForTesting } from '../src/modules/payments-wallet/paymentGateway.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';

const TEST_DB_URI = testDbUri('commerce');

let app;

function captureConsoleLog() {
  const original = console.log;
  const lines = [];
  console.log = (...args) => lines.push(args.join(' '));
  return {
    code: () => {
      console.log = original;
      const match = lines.join('\n').match(/code for [^:]+: (\d{6})/);
      if (!match) throw new Error(`No OTP code found: ${lines.join('\n')}`);
      return match[1];
    },
  };
}

async function loginAsCustomer(phone, walletCoins = 0) {
  await User.create({
    role: ROLES.CUSTOMER,
    phone,
    name: 'Commerce Test Customer',
    passwordHash: await hashPassword('password123'),
    walletCoins,
  });
  const capture = captureConsoleLog();
  await request(app).post('/api/v1/auth/login').send({ role: ROLES.CUSTOMER, identifier: phone, password: 'password123' });
  const code = capture.code();
  const res = await request(app).post('/api/v1/auth/otp/verify').send({ role: ROLES.CUSTOMER, identifier: phone, code });
  return res.body.data.accessToken;
}

async function seedProduct(overrides = {}) {
  return Product.create({ category: 'Television', name: 'Test TV', price: 1000, stock: 5, ...overrides });
}

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(TEST_DB_URI);
  await ensureIndexes();
  app = createApp();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Cart.deleteMany({}),
    Wishlist.deleteMany({}),
    Order.deleteMany({}),
    Coupon.deleteMany({}),
    ExchangeQuestionSet.deleteMany({}),
    ExchangeCampaign.deleteMany({}),
    ExchangeRequest.deleteMany({}),
    Payment.deleteMany({}),
    WalletLedger.deleteMany({}),
  ]);
});

describe('GET /products', () => {
  it('lists only active products', async () => {
    await seedProduct({ name: 'Active TV' });
    await seedProduct({ name: 'Inactive TV', isActive: false });
    const res = await request(app).get('/api/v1/products').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Active TV');
  });

  it('filters by category and condition', async () => {
    await seedProduct({ category: 'TV', condition: 'New' });
    await seedProduct({ category: 'Refrigerator', condition: 'Refurbished' });
    const res = await request(app).get('/api/v1/products?category=TV').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].category).toBe('TV');
  });
});

describe('Cart', () => {
  it('adds, accumulates quantity, and removes items', async () => {
    const product = await seedProduct();
    const token = await loginAsCustomer('9400000001');

    await request(app).post('/api/v1/cart/items').set('Authorization', `Bearer ${token}`).send({ productId: product.id, quantity: 2 }).expect(200);
    const afterAdd = await request(app).post('/api/v1/cart/items').set('Authorization', `Bearer ${token}`).send({ productId: product.id, quantity: 1 });
    expect(afterAdd.body.data.items[0].quantity).toBe(3);

    const removed = await request(app).delete(`/api/v1/cart/items/${product.id}`).set('Authorization', `Bearer ${token}`);
    expect(removed.body.data.items).toHaveLength(0);
  });
});

describe('Wishlist', () => {
  it('adds and removes a product, deduping repeated adds', async () => {
    const product = await seedProduct();
    const token = await loginAsCustomer('9400000002');

    await request(app).post(`/api/v1/wishlist/${product.id}`).set('Authorization', `Bearer ${token}`);
    const afterSecondAdd = await request(app).post(`/api/v1/wishlist/${product.id}`).set('Authorization', `Bearer ${token}`);
    expect(afterSecondAdd.body.data).toHaveLength(1);

    const afterRemove = await request(app).delete(`/api/v1/wishlist/${product.id}`).set('Authorization', `Bearer ${token}`);
    expect(afterRemove.body.data).toHaveLength(0);
  });
});

describe('Exchange valuation', () => {
  async function seedQuestionSet() {
    return ExchangeQuestionSet.create({
      name: 'Mobile Questions',
      category: 'Mobile',
      questions: [
        { text: 'Turns on?', type: 'Yes/No', options: ['Yes', 'No'], deductions: { No: 0.8 } },
        { text: 'Screen condition?', type: 'Radio', options: ['Flawless', 'Cracked'], deductions: { Flawless: 0, Cracked: 0.4 } },
      ],
    });
  }

  it('computes a valuation without persisting anything', async () => {
    await seedQuestionSet();
    const token = await loginAsCustomer('9400000003');

    const res = await request(app)
      .post('/api/v1/exchange/valuate')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'Mobile', baseValue: 10000, answers: { 'Turns on?': 'Yes', 'Screen condition?': 'Cracked' } })
      .expect(200);

    expect(res.body.data.deductionsAmount).toBe(4000); // 0.4 * 10000
    expect(res.body.data.estimatedValue).toBe(6000);
    expect(await ExchangeRequest.countDocuments({})).toBe(0);
  });

  it('applies an active campaign bonus', async () => {
    await seedQuestionSet();
    const campaign = await ExchangeCampaign.create({ name: 'Test Campaign', status: 'Active', bonusAmount: 1500 });
    const token = await loginAsCustomer('9400000004');

    const res = await request(app)
      .post('/api/v1/exchange/valuate')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'Mobile', baseValue: 10000, answers: {}, campaignId: campaign.id })
      .expect(200);

    expect(res.body.data.bonusAmount).toBe(1500);
    expect(res.body.data.estimatedValue).toBe(11500); // no deductions answered, + bonus
  });

  it('persists a request via POST /exchange/requests, storing the computed value', async () => {
    await seedQuestionSet();
    const token = await loginAsCustomer('9400000005');

    const res = await request(app)
      .post('/api/v1/exchange/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'Mobile', brand: 'Apple', model: 'iPhone 12', baseValue: 14000, answers: { 'Turns on?': 'Yes' } })
      .expect(201);

    expect(res.body.data.estimatedValue).toBe(14000);
    expect(res.body.data.humanId).toMatch(/^EX-\d{4}$/);
  });
});

describe('POST /orders — full checkout: coupon + exchange discount + coin redemption', () => {
  it('prices everything server-side and produces a consistent breakdown', async () => {
    const product = await seedProduct({ price: 5000, stock: 3 });
    await Coupon.create({ code: 'SAVE100', discount: 100, status: 'Active' });
    const questionSet = await ExchangeQuestionSet.create({
      name: 'TV Questions',
      category: 'Television',
      questions: [{ text: 'Works?', type: 'Yes/No', options: ['Yes', 'No'], deductions: { No: 1 } }],
    });
    void questionSet;

    const token = await loginAsCustomer('9400000006', 500); // 500 coins = ₹50

    const exchangeRes = await request(app)
      .post('/api/v1/exchange/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'Television', baseValue: 2000, answers: { Works: 'Yes' } });
    const exchangeRequestId = exchangeRes.body.data.id;
    const exchangeValue = exchangeRes.body.data.estimatedValue; // 2000
    await ExchangeRequest.findByIdAndUpdate(exchangeRequestId, { status: 'Inspection Approved' });

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: product.id, quantity: 1 }],
        couponCode: 'SAVE100',
        exchangeRequestId,
        coinsToRedeem: 500,
        paymentMethod: 'UPI',
      })
      .expect(201);

    const order = orderRes.body.data;
    expect(order.subtotal).toBe(5000);
    expect(order.couponDiscount).toBe(100);
    expect(order.exchangeDiscount).toBe(exchangeValue); // 2000
    expect(order.coinsValue).toBe(50); // 500 coins / 10
    expect(order.coinsRedeemed).toBe(500);
    expect(order.total).toBe(5000 - 100 - 2000 - 50); // 2850
    expect(order.humanId).toMatch(/^NCCO\d{6}$/);

    // total > 0 and a real gateway method (UPI) — checkout is NOT complete yet,
    // it's awaiting the customer finishing Razorpay's Checkout.js.
    expect(order.status).toBe('Placed');
    expect(order.razorpay).toMatchObject({ amount: 285000, currency: 'INR' }); // 2850 rupees in paise
    expect(order.razorpay.orderId).toBeTruthy();

    // Nothing that should only happen on a CONFIRMED order has happened yet:
    // stock is reserved (decremented upfront, same as before) but coins/exchange/cart are not.
    const updatedProduct = await Product.findById(product.id);
    expect(updatedProduct.stock).toBe(2);
    const pendingExchange = await ExchangeRequest.findById(exchangeRequestId);
    expect(pendingExchange.appliedToOrder).toBeNull();
    const pendingPayment = await Payment.findById(order.payment);
    expect(pendingPayment.status).toBe('Pending');

    // Customer completes Checkout.js — the frontend gets back a payment id +
    // signature from Razorpay and posts them here to confirm.
    const razorpaySignature = signForTesting({ orderId: order.razorpay.orderId, paymentId: 'pay_test_12345' });
    const verifyRes = await request(app)
      .post(`/api/v1/orders/${order.id}/verify-payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ razorpayPaymentId: 'pay_test_12345', razorpaySignature })
      .expect(200);
    expect(verifyRes.body.data.status).toBe('Confirmed');

    // Now the side effects fire: wallet debited (already happened at
    // checkout-initiation, unchanged), exchange marked applied, payment recorded.
    const updatedUser = await User.findOne({ phone: '9400000006' });
    expect(updatedUser.walletCoins).toBe(0);

    const updatedExchange = await ExchangeRequest.findById(exchangeRequestId);
    expect(String(updatedExchange.appliedToOrder)).toBe(order.id);

    const payment = await Payment.findById(order.payment);
    expect(payment.status).toBe('Success');
    expect(payment.amount).toBe(order.total);
    expect(payment.razorpayPaymentId).toBe('pay_test_12345');
  });

  it('rejects payment verification with an invalid signature, leaving the order Placed', async () => {
    const product = await seedProduct({ price: 1000, stock: 5 });
    const token = await loginAsCustomer('9400000014');

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product.id, quantity: 1 }], paymentMethod: 'UPI' })
      .expect(201);
    const order = orderRes.body.data;
    expect(order.status).toBe('Placed');

    await request(app)
      .post(`/api/v1/orders/${order.id}/verify-payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ razorpayPaymentId: 'pay_test_wrong', razorpaySignature: 'not-a-real-signature' })
      .expect(400);

    const stillPlaced = await Order.findById(order.id);
    expect(stillPlaced.status).toBe('Placed');
  });

  it('caps coin redemption at what is actually owed rather than over-redeeming', async () => {
    const product = await seedProduct({ price: 30, stock: 5 }); // cheap item, plenty of coins available
    const token = await loginAsCustomer('9400000007', 1000); // 1000 coins = ₹100, order only costs ₹30

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product.id, quantity: 1 }], coinsToRedeem: 1000 })
      .expect(201);

    expect(res.body.data.total).toBe(0);
    expect(res.body.data.coinsValue).toBe(30);
    expect(res.body.data.coinsRedeemed).toBe(300); // only 300 of the 1000 requested coins actually needed

    const updatedUser = await User.findOne({ phone: '9400000007' });
    expect(updatedUser.walletCoins).toBe(700); // 1000 - 300, not 0
  });

  it('rejects checkout for insufficient stock and leaves the customer\'s wallet untouched', async () => {
    const product = await seedProduct({ price: 100, stock: 1 });
    const token = await loginAsCustomer('9400000008', 50);

    await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product.id, quantity: 5 }], coinsToRedeem: 50 })
      .expect(400);

    // Compensation: coins redeemed before the stock check failed must be credited back.
    const updatedUser = await User.findOne({ phone: '9400000008' });
    expect(updatedUser.walletCoins).toBe(50);
    expect(await Order.countDocuments({})).toBe(0);
  });

  it('rejects reusing an exchange request already applied to a previous order', async () => {
    const product = await seedProduct({ price: 1000, stock: 5 });
    await ExchangeQuestionSet.create({ name: 'TV Questions', category: 'Television', questions: [] });
    const token = await loginAsCustomer('9400000009');

    const exchangeRes = await request(app)
      .post('/api/v1/exchange/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'Television', baseValue: 500, answers: {} });
    const exchangeRequestId = exchangeRes.body.data.id;
    await ExchangeRequest.findByIdAndUpdate(exchangeRequestId, { status: 'Inspection Approved' });

    // Cash — completes synchronously (marks the exchange applied immediately)
    // so the second attempt below has something real to reject reusing.
    await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product.id, quantity: 1 }], exchangeRequestId, paymentMethod: 'Cash' })
      .expect(201);

    await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product.id, quantity: 1 }], exchangeRequestId })
      .expect(400);
  });

  it('rejects an exchange discount for a request that has not been approved after inspection yet', async () => {
    const product = await seedProduct({ price: 1000, stock: 5 });
    await ExchangeQuestionSet.create({ name: 'TV Questions', category: 'Television', questions: [] });
    const token = await loginAsCustomer('9400000013');

    const exchangeRes = await request(app)
      .post('/api/v1/exchange/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'Television', baseValue: 500, answers: {} });
    const exchangeRequestId = exchangeRes.body.data.id;
    expect((await ExchangeRequest.findById(exchangeRequestId)).status).toBe('Pending Inspection');

    await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product.id, quantity: 1 }], exchangeRequestId })
      .expect(400);

    expect(await Order.countDocuments({})).toBe(0);
  });

  it('checks out using the cart and clears it afterward', async () => {
    const product = await seedProduct({ price: 200, stock: 5 });
    const token = await loginAsCustomer('9400000010');

    await request(app).post('/api/v1/cart/items').set('Authorization', `Bearer ${token}`).send({ productId: product.id, quantity: 2 });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ useCart: true, paymentMethod: 'Cash' }) // Cash — cart-clearing happens on synchronous completion
      .expect(201);
    expect(res.body.data.subtotal).toBe(400);

    const cartRes = await request(app).get('/api/v1/cart').set('Authorization', `Bearer ${token}`);
    expect(cartRes.body.data.items).toHaveLength(0);
  });

  it('rejects viewing another customer\'s order with 403', async () => {
    const product = await seedProduct({ price: 100, stock: 5 });
    const ownerToken = await loginAsCustomer('9400000011');
    const intruderToken = await loginAsCustomer('9400000012');

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ items: [{ productId: product.id, quantity: 1 }] })
      .expect(201);

    await request(app)
      .get(`/api/v1/orders/${orderRes.body.data.id}`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .expect(403);
  });
});
