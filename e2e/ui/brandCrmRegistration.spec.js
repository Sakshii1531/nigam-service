import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
const API = 'http://localhost:4111/api/v1';
const shots = fileURLToPath(new URL('../../docs/brand-crm/screenshots/', import.meta.url));
fs.mkdirSync(shots, { recursive: true });
const phone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
async function call(request, method, path, token, data) {
  const res = await request[method](`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, ...(data ? { data } : {}) });
  const body = await res.json();
  if (!res.ok()) throw new Error(`${method} ${path}: ${JSON.stringify(body.error)}`);
  return body.data;
}
async function session(request, role, identifier) {
  await request.post(`${API}/auth/otp/send`, { data: { role, identifier } });
  const otp = (await (await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;
  return call(request, 'post', '/auth/otp/verify', '', { role, identifier, code: otp });
}
async function setup(request, template = 'cce') {
  const tag = randomUUID().slice(0, 8);
  const email = `crm4-admin-${tag}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  const admin = await session(request, 'super_admin', email);
  const category = (await call(request, 'get', '/super-admin/catalogue/categories', admin.accessToken)).find(c => c.key === 'AC');
  const brand = await call(request, 'post', '/super-admin/brands', admin.accessToken, { name: `E2E Registration ${tag}`, status: 'Active' });
  await call(request, 'put', `/super-admin/warranty-catalog/brands/${brand.id}`, admin.accessToken, { warrantyEnabled: true, coverage: [category.id] });
  const issue = await call(request, 'post', '/super-admin/warranty-catalog/issues', admin.accessToken, { category: category.id, name: `CRM issue ${tag}` });
  const staffEmail = `crm4-${template}-${tag}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'brand_admin', email: staffEmail, password: 'password123', brand: brand.id, brandRoleTemplate: template, employeeId: 'CCE-360' } });
  return { tag, brand, category, issue, staff: await session(request, 'brand_admin', staffEmail) };
}
async function signIn(page, s) {
  await page.addInitScript(s => {
    localStorage.setItem('ncc_access_token_brand_admin', s.accessToken);
    localStorage.setItem('ncc_refresh_token_brand_admin', s.refreshToken);
    localStorage.setItem('ncc_user_brand_admin', JSON.stringify(s.user));
  }, s);
}


async function wizard(page,w,mobile){
 await signIn(page,w.staff);await page.goto('/brand-admin/requests');
 await page.getByLabel('Mobile number',{exact:true}).fill(mobile);await page.getByRole('button',{name:'Find customer',exact:true}).click();
 await expect(page.getByText('No customer found. Create their account with this ticket.')).toBeVisible();
 await page.getByLabel('Customer name',{exact:true}).fill(`New Caller ${w.tag}`);await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByLabel('House / street',{exact:true}).fill('12 Call Street');await page.getByLabel('City',{exact:true}).fill('Indore');await page.getByLabel('State',{exact:true}).fill('MP');await page.getByLabel('Pincode',{exact:true}).fill('452001');await page.getByRole('button',{name:'Next',exact:true}).click();
 await page.getByLabel('Product category',{exact:true}).selectOption(w.category.id);await page.getByRole('button',{name:'Next',exact:true}).click();
 await page.getByLabel('Issue',{exact:true}).selectOption(w.issue.id);await page.getByLabel('Description',{exact:true}).fill('Product has stopped cooling since yesterday');
 const opts=await call(w.request,'get','/brand/tickets/form-options',w.staff.accessToken);await page.getByLabel('Preferred visit date (optional)',{exact:true}).fill(opts.visitDates.min);await page.getByLabel('Preferred slot',{exact:true}).selectOption('afternoon');
 await page.getByRole('button',{name:'Review ticket',exact:true}).click();await expect(page.getByText('Warranty: Verification Required')).toBeVisible();
}
test('CCE registers a new Toll-Free caller, opens the queue and customer profile',async({page,request})=>{
 const w=await setup(request);w.request=request;const mobile=phone();await wizard(page,w,mobile);
 await expect(page.getByRole('button',{name:'Register & Approve',exact:true})).toHaveCount(0);await page.screenshot({path:`${shots}phase-4-review.png`,fullPage:true});
 await page.getByRole('button',{name:'Register',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog.getByRole('heading',{name:'Ticket registered successfully'})).toBeVisible();await expect(dialog).toContainText('Pending Approval');
 const master=await dialog.getByText(/^NCCW-/).textContent();await page.screenshot({path:`${shots}phase-4-success.png`,fullPage:true});
 const search=await call(request,'get',`/brand/customers/search?phone=${mobile}`,w.staff.accessToken);expect(search.match).toBe('brand');const profile=await call(request,'get',`/brand/customers/${search.customer.id}`,w.staff.accessToken);expect(profile.tickets[0].humanId).toBe(master);expect(profile.tickets[0].source).toBe('toll_free');
 await page.goto('/brand-admin/warranty-claims');await page.getByLabel('Search claims').fill(master);await expect(page.getByText(master,{exact:true})).toBeVisible();
 await page.goto(`/brand-admin/customers/${search.customer.id}`);await page.getByRole('link',{name:'New ticket for this customer'}).click();await expect(page.getByRole('heading',{name:'Product',exact:true})).toBeVisible();
});
test('authorized registrar approves during registration and receives an NCC job number',async({page,request})=>{
 const w=await setup(request,'brand_super_admin');w.request=request;await wizard(page,w,phone());await page.getByLabel('Registration approval remarks',{exact:true}).fill('Approve incomplete proof as goodwill');await page.getByRole('button',{name:'Register & Approve',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog.getByText(/^NCCJ-/)).toBeVisible();await expect(dialog).toContainText('Approved — NCC job created');await page.screenshot({path:`${shots}phase-4-approved.png`,fullPage:true});
});
test('platform customer remains masked until their ticket is registered',async({page,request})=>{
 const w=await setup(request);const mobile=phone();await request.post(`${API}/_dev/test-user`,{data:{role:'customer',phone:mobile,password:'password123'}});await signIn(page,w.staff);await page.goto('/brand-admin/requests');await page.getByLabel('Mobile number',{exact:true}).fill(mobile);await page.getByRole('button',{name:'Find customer',exact:true}).click();await expect(page.getByText(`Existing NCC customer, new to ${w.brand.name}`)).toBeVisible();await expect(page.getByText(new RegExp(`\\*{6}${mobile.slice(-4)}`))).toBeVisible();await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByRole('heading',{name:'Customer and address',exact:true})).toBeVisible();await expect(page.getByLabel('House / street')).toHaveValue('');
});
