import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const API = 'http://localhost:4111/api/v1';
async function call(r, m, p, token, data) {
  const res = await r[m](API + p, { headers: { Authorization: `Bearer ${token}` }, ...(data ? { data } : {}) });
  const b = await res.json(); if (!res.ok()) throw Error(`${p}: ${JSON.stringify(b.error)}`); return b.data;
}
async function session(r, role, identifier) {
  await r.post(API + '/auth/otp/send', { data: { role, identifier } });
  const code = (await (await r.get(API + '/_dev/last-otp/' + encodeURIComponent(identifier))).json()).data.code;
  return call(r, 'post', '/auth/otp/verify', '', { role, identifier, code });
}
test('breached countdown, assigned escalation, resolution history and sidebar badge; SLA settings save', async ({ page, request: r }) => {
  test.setTimeout(120000);
  const tag = randomUUID().slice(0,8);
  async function staff(role, template, brand) {
    const email = `sla-${template || role}-${tag}@e2e.test`;
    await r.post(API + '/_dev/test-user', { data: { role, email, name: template === 'quality_escalation' ? 'Quality Owner' : 'SLA Admin', password: 'password123', ...(brand ? { brand, brandRoleTemplate: template, employeeId: template } : {}) } });
    return session(r, role, email);
  }
  const admin = await staff('super_admin'), ac = (await call(r,'get','/super-admin/catalogue/categories',admin.accessToken)).find(c => c.key === 'AC');
  const brand = await call(r,'post','/super-admin/brands',admin.accessToken,{name:`SLA ${tag}`,status:'Active'});
  await call(r,'put',`/super-admin/warranty-catalog/brands/${brand.id}`,admin.accessToken,{warrantyEnabled:true,coverage:[ac.id]});
  const issue = await call(r,'post','/super-admin/warranty-catalog/issues',admin.accessToken,{category:ac.id,name:`SLA issue ${tag}`});
  const owner = await staff('brand_admin','brand_super_admin',brand.id), quality = await staff('brand_admin','quality_escalation',brand.id);
  const ticket = await call(r,'post','/brand/tickets',owner.accessToken,{newCustomer:{name:`SLA caller ${tag}`,phone:`9${String(Math.floor(Math.random()*1e9)).padStart(9,'0')}`},source:'toll_free',categoryId:ac.id,issueId:issue.id,remarks:'Product requires service',address:{house:'12 Test Street',city:'Indore',state:'MP',pincode:'452001'},product:{}});
  execFileSync(process.execPath, [fileURLToPath(new URL('../helpers/breachTicket.mjs', import.meta.url)), ticket.id], { env: { ...process.env, NODE_ENV:'test', OTP_PROVIDER:'test', FCM_SERVICE_ACCOUNT_JSON:'', TWILIO_ACCOUNT_SID:'', TWILIO_AUTH_TOKEN:'', TWILIO_WHATSAPP_FROM:'', TWILIO_VOICE_NUMBER:'' }, stdio:'pipe' });
  await page.addInitScript(s => { localStorage.setItem('ncc_access_token_brand_admin',s.accessToken); localStorage.setItem('ncc_refresh_token_brand_admin',s.refreshToken); localStorage.setItem('ncc_user_brand_admin',JSON.stringify(s.user)); },owner);
  await page.goto('/brand-admin/tickets');
  const row = page.getByRole('row').filter({hasText:ticket.humanId});
  const countdown = row.getByTestId('sla-countdown'); await expect(countdown).toContainText('Overdue'); await expect(countdown).toHaveClass(/bg-red-100/);
  await page.getByRole('button',{name:/More filters/}).click();
  await page.getByLabel('SLA state',{exact:true}).selectOption('breached'); await expect(row).toBeVisible();
  await page.getByRole('link',{name:ticket.humanId,exact:true}).click(); await expect(page.getByRole('cell',{name:'breached',exact:true})).toBeVisible();
  const panel = page.locator('[aria-label="Ticket escalations"]'); await expect(panel.getByRole('row').filter({hasText:'Brand approval SLA breached'})).toContainText('L2');
  await expect(panel.getByRole('combobox',{name:'Responsible for Brand approval SLA breached'})).toHaveValue(quality.user.id);
  const badge = page.locator('a[href="/brand-admin/escalations"]'); await expect(badge).toContainText('1');
  await panel.getByRole('button',{name:'Resolve',exact:true}).click();
  const dialog = page.getByRole('dialog',{name:'Resolve escalation'}); await dialog.getByLabel('Resolution',{exact:true}).fill('Reviewed warranty evidence and agreed next action');
  await dialog.getByRole('button',{name:'Confirm resolution',exact:true}).click(); await expect(dialog).toBeHidden();
  await expect(badge).not.toContainText('1');
  await panel.getByRole('button',{name:'Resolved',exact:true}).click(); await expect(panel).toContainText('Reviewed warranty evidence and agreed next action');
  await page.goto('/brand-admin/settings'); await page.getByRole('button',{name:'SLA & Escalation',exact:true}).click();
  await page.getByLabel('Response hours',{exact:true}).fill('3'); await page.getByRole('button',{name:'Save SLA targets',exact:true}).click(); await expect(page.getByRole('status')).toContainText('SLA settings saved');
  await page.getByRole('button',{name:'Save escalation matrix',exact:true}).click(); await expect(page.getByRole('status')).toContainText('Escalation matrix saved');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({path:fileURLToPath(new URL('../../docs/brand-crm/screenshots/phase-11-sla-settings.png',import.meta.url)),fullPage:true});
});
