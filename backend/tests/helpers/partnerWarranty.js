import request from 'supertest';
import { ROLES } from '../../src/config/constants.js';
import { User } from '../../src/modules/auth/user.model.js';
import { Brand } from '../../src/modules/super-admin/brand.model.js';
import { Category } from '../../src/modules/catalog/category.model.js';
import { WarrantyGroup } from '../../src/modules/partner-warranty/warrantyGroup.model.js';
import { WarrantyIssue } from '../../src/modules/partner-warranty/warrantyIssue.model.js';
import { hashPassword } from '../../src/modules/auth/password.js';
import { jobFlow } from './jobFlow.js';

const DAY = 24 * 3600 * 1000;

// Partner-warranty scenario builder shared by the phase 4+ tests: two brands
// (LG covers AC; Samsung covers AC + Refrigerator), staff logins, customers
// with a saved address, real uploads, and claim submission over HTTP.
export function partnerWarrantyKit(getApp, { phoneStart }) {
  const flow = jobFlow(getApp, { phoneStart });
  const api = () => request(getApp());
  const bearer = (t) => ({ Authorization: `Bearer ${t}` });
  let emailSeq = 0;

  async function staff(role, extra = {}) {
    const email = `pw-kit-${phoneStart}-${emailSeq++}@test.local`;
    const user = await User.create({ role, name: `${role} ${emailSeq}`, email, passwordHash: await hashPassword('password123'), ...extra });
    return { user, token: await flow.loginAndVerify({ role, identifier: email }) };
  }

  const brandAdmin = (brand) => staff(ROLES.BRAND_ADMIN, { brand: brand._id });
  const superAdmin = () => staff(ROLES.SUPER_ADMIN);

  async function customer({ pincode = '452001', city = 'Indore', latitude = 22.72, longitude = 75.86 } = {}) {
    const { user, token } = await flow.customer();
    user.addresses.push({ house: '12 MG Road', city, state: 'MP', pincode, latitude, longitude });
    await user.save();
    return { user, token, addressId: String(user.addresses[0]._id) };
  }

  async function upload(token, name = 'invoice.pdf') {
    const res = await api()
      .post('/api/v1/uploads')
      .set(bearer(token))
      .attach('file', Buffer.from('%PDF-1.4\n%test\n'), { filename: name, contentType: 'application/pdf' })
      .expect(200);
    return res.body.data.url;
  }

  async function world() {
    const [ac, fridge] = await Category.create([
      { key: 'AC', name: 'Air Conditioner' },
      { key: 'Refrigerator', name: 'Refrigerator' },
    ]);
    const group = await WarrantyGroup.create({ name: 'AirCare', slug: 'aircare', categories: [ac._id] });
    const [lg, samsung] = await Brand.create([
      { name: 'LG', status: 'Active', warrantyEnabled: true, coverage: [ac._id], warrantyMonths: 24 },
      { name: 'Samsung', status: 'Active', warrantyEnabled: true, coverage: [ac._id, fridge._id] },
    ]);
    const [cooling, fridgeNoise] = await WarrantyIssue.create([
      { category: ac._id, name: 'Cooling Issue' },
      { category: fridge._id, name: 'Noise' },
    ]);
    return { ac, fridge, group, lg, samsung, cooling, fridgeNoise };
  }

  let serialSeq = 0;
  /** Submits an LG AC cooling claim (overridable) and returns the customer view. */
  async function submitClaim(w, cust, overrides = {}) {
    const invoice = await upload(cust.token);
    const body = {
      brandId: String(w.lg._id),
      groupId: String(w.group._id),
      categoryId: String(w.ac._id),
      issueId: String(w.cooling._id),
      modelNumber: 'AS-Q18',
      serialNumber: `SN-${phoneStart}-${serialSeq++}`,
      purchaseDate: new Date(Date.now() - 200 * DAY).toISOString(),
      remarks: 'Blows warm air',
      addressId: cust.addressId,
      documents: [{ kind: 'invoice', url: invoice, name: 'invoice.pdf' }],
      ...overrides,
    };
    const res = await api().post('/api/v1/partner-warranty/claims').set(bearer(cust.token)).send(body).expect(201);
    return res.body.data;
  }

  return { flow, api, bearer, staff, brandAdmin, superAdmin, customer, upload, world, submitClaim };
}
