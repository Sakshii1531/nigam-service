import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { testDbUri } from './helpers/testDb.js';
import { detectWarrantyForAppliance } from '../src/modules/warranty-amc-exchange/warrantyDetector.service.js';
import { createBooking } from '../src/modules/booking/booking.service.js';
import { acceptJob } from '../src/modules/technician/job.service.js';
import { User } from '../src/modules/auth/user.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { ServiceCatalogItem } from '../src/modules/catalog/serviceCatalogItem.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { Technician } from '../src/modules/technician/technician.model.js';
import { OwnedAppliance } from '../src/modules/service-requests/ownedAppliance.model.js';
import { AMCPlan } from '../src/modules/warranty-amc-exchange/amcPlan.model.js';
import { AMCSubscription } from '../src/modules/warranty-amc-exchange/amcSubscription.model.js';
import { ExtendedWarrantyOrder } from '../src/modules/warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { Job } from '../src/modules/technician/job.model.js';
import { City } from '../src/modules/super-admin/city.model.js';
import { AssignmentWeighting } from '../src/modules/super-admin/assignmentWeighting.model.js';

describe('Smart Warranty Detection Pipeline', () => {
  let customer;
  let techUser;
  let technician;
  let brand;
  let category;

  beforeAll(async () => {
    // Per-file suffix, not a bare testDbUri() — that resolves to the shared
    // "..._undefined" database (see helpers/testDb.js), which this file was
    // silently sharing with notifications.test.js.
    const uri = await testDbUri('smartWarranty');
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    // Drop, not just disconnect — otherwise this file's data survives the run
    // and collides with the next one, as every other suite here already does.
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Brand.deleteMany({}),
      ServiceCatalogItem.deleteMany({}),
      Category.deleteMany({}),
      Technician.deleteMany({}),
      OwnedAppliance.deleteMany({}),
      AMCPlan.deleteMany({}),
      AMCSubscription.deleteMany({}),
      ExtendedWarrantyOrder.deleteMany({}),
      Booking.deleteMany({}),
      ServiceRequest.deleteMany({}),
      Job.deleteMany({}),
      City.deleteMany({}),
      AssignmentWeighting.deleteMany({}),
    ]);

    customer = await User.create({
      role: 'customer',
      name: 'Smart Warranty Customer',
      phone: '9988776655',
      passwordHash: 'stub',
      status: 'Active',
    });

    techUser = await User.create({
      role: 'technician',
      name: 'Smart Warranty Tech',
      phone: '9988776654',
      passwordHash: 'stub',
      status: 'Active',
    });

    technician = await Technician.create({
      user: techUser._id,
      name: 'Smart Warranty Tech',
      phone: '9988776654',
      status: 'Active',
      availability: 'Available',
      specs: ['AC'],
    });

    brand = await Brand.create({
      name: 'LG Electronics',
      category: 'AC',
      status: 'Active',
    });

    category = await Category.create({
      key: 'AC',
      name: 'AC',
      slug: 'ac',
      order: 1,
    });

    await ServiceCatalogItem.create({
      category: category._id,
      name: 'AC Servicing',
      slug: 'ac-servicing',
      price: 500,
      desc: 'Deep cleaning AC service',
    });
  });

  describe('detectWarrantyForAppliance()', () => {
    it('detects In Warranty when purchaseDate is within 12 months', async () => {
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 2);

      const res = await detectWarrantyForAppliance({
        userId: customer.id,
        category: 'AC',
        brandName: 'LG Electronics',
        purchaseDate: recentDate,
      });

      expect(res.warrantyStatus).toBe('In Warranty');
      expect(res.jobType).toBe('Brand Warranty');
      expect(String(res.brandId)).toBe(brand.id);
    });

    it('detects Out of Warranty when purchaseDate is older than 12 months', async () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);

      const res = await detectWarrantyForAppliance({
        userId: customer.id,
        category: 'AC',
        brandName: 'LG Electronics',
        purchaseDate: oldDate,
      });

      expect(res.warrantyStatus).toBe('Out of Warranty');
      expect(res.jobType).toBe('NCC Paid Service');
    });

    it('detects AMC when active subscription exists', async () => {
      const plan = await AMCPlan.create({ name: 'Gold AMC', tier: 'Gold', price: 1999, visitsTotal: 4 });
      const amc = await AMCSubscription.create({
        user: customer._id,
        plan: plan._id,
        brand: 'LG Electronics',
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        visitsTotal: 4,
        visitsRemaining: 3,
        status: 'Active',
      });

      const res = await detectWarrantyForAppliance({
        userId: customer.id,
        category: 'AC',
        brandName: 'LG Electronics',
      });

      expect(res.warrantyStatus).toBe('AMC');
      expect(res.jobType).toBe('AMC Visit');
      expect(String(res.amcSubscriptionId)).toBe(amc.id);
    });

    it('detects Extended Warranty when active order exists', async () => {
      const ew = await ExtendedWarrantyOrder.create({
        user: customer._id,
        applianceCategory: 'AC',
        brand: 'LG Electronics',
        tierId: 'Shield Plus',
        price: 999,
        validTill: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'Active',
        claimsRemaining: 2,
        claimsTotal: 2,
      });

      const res = await detectWarrantyForAppliance({
        userId: customer.id,
        category: 'AC',
        brandName: 'LG Electronics',
      });

      expect(res.warrantyStatus).toBe('Extended Warranty');
      expect(res.jobType).toBe('NCC Extended Warranty');
      expect(String(res.extendedWarrantyOrderId)).toBe(ew.id);
    });
  });

  describe('createBooking() — automated warranty benefit application', () => {
    it('applies free covered service (totalPrice = 0) and sets warranty status on ServiceRequest for In-Warranty booking', async () => {
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 1);

      const { booking, serviceRequest } = await createBooking(customer.id, {
        category: 'AC',
        serviceSlug: 'ac-servicing',
        brand: 'LG Electronics',
        purchaseDate: recentDate,
      });

      expect(booking.totalPrice).toBe(0); // Covered by Brand Warranty!
      expect(serviceRequest.warranty).toBe('In Warranty');
      expect(String(serviceRequest.brand)).toBe(brand.id);
    });

    it('charges standard catalog price for Out-of-Warranty booking', async () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 3);

      const { booking, serviceRequest } = await createBooking(customer.id, {
        category: 'AC',
        serviceSlug: 'ac-servicing',
        brand: 'LG Electronics',
        purchaseDate: oldDate,
      });

      expect(booking.totalPrice).toBe(500); // Standard catalog price
      expect(serviceRequest.warranty).toBe('Out of Warranty');
    });
  });

  describe('acceptJob() — automated job type & warranty reference auto-inference', () => {
    it('auto-infers jobType = "AMC Visit" and populates amc metadata when accepting an AMC service request', async () => {
      const plan = await AMCPlan.create({ name: 'Gold AMC', tier: 'Gold', price: 1999, visitsTotal: 4 });
      const amc = await AMCSubscription.create({
        user: customer._id,
        plan: plan._id,
        brand: 'LG Electronics',
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        visitsTotal: 4,
        visitsRemaining: 3,
        status: 'Active',
      });

      const { serviceRequest } = await createBooking(customer.id, {
        category: 'AC',
        serviceSlug: 'ac-servicing',
        brand: 'LG Electronics',
      });

      // Update ServiceRequest technician manually for acceptance
      serviceRequest.technician = technician._id;
      await serviceRequest.save();

      // Accept job WITHOUT explicitly specifying jobType or amcSubscriptionId
      const job = await acceptJob(technician.id, serviceRequest.id);

      expect(job.type).toBe('AMC Visit');
      expect(String(job.amc.amcSubscription)).toBe(amc.id);
    });
  });
});
