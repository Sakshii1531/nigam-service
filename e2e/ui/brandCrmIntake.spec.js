import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const API=`${process.env.UI_API_ORIGIN||'http://localhost:4111'}/api/v1`;
test('Settings integrations creates, edits, reveals once and revokes a brand key',async({page,request:r})=>{
 const tag=randomUUID().slice(0,8),email=`intake-ui-${tag}@e2e.test`;
 async function call(method,path,data,token=''){const res=await r[method](`${API}${path}`,{headers:{Authorization:`Bearer ${token}`},...(data?{data}:{})});expect(res.ok(),await res.text()).toBe(true);return (await res.json()).data;}
 const brand=await call('post','/_dev/test-brand',{name:`Intake UI ${tag}`});
 await call('post','/_dev/test-user',{role:'brand_admin',email,password:'password123',brand:brand.id,brandRoleTemplate:'brand_super_admin'});
 await call('post','/auth/login',{role:'brand_admin',identifier:email,password:'password123'});
 const otp=(await call('get',`/_dev/last-otp/${email}`)).code;
 const s=await call('post','/auth/otp/verify',{role:'brand_admin',identifier:email,code:otp});
 await page.addInitScript(s=>{for(const[k,v]of Object.entries({access_token:s.accessToken,refresh_token:s.refreshToken,user:JSON.stringify(s.user)}))localStorage.setItem(`ncc_${k}_brand_admin`,v);},s);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/brand-admin/settings');await page.getByRole('button',{name:'Integrations',exact:true}).click();
 await expect(page.getByRole('heading',{name:'CRM webhook'})).toBeVisible();
 await page.getByLabel('Key name',{exact:true}).fill('WhatsApp production');await page.getByRole('button',{name:'Create API key'}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();const secret=await dialog.locator('code').textContent();expect(secret).toMatch(/^ncc_live_/);
 await page.screenshot({path:'/private/tmp/crm17-key-modal.png',fullPage:true});
 await dialog.getByRole('button',{name:'Done'}).click();await expect(dialog).not.toBeVisible();
 await expect(page.getByRole('row').filter({hasText:'WhatsApp production'})).toContainText('Never');
 await page.getByLabel('WhatsApp production source api',{exact:true}).check();await expect(page.getByLabel('WhatsApp production source api',{exact:true})).toBeEnabled();
 await page.reload();await page.getByRole('button',{name:'Integrations',exact:true}).click();await expect(page.getByLabel('WhatsApp production source api',{exact:true})).toBeChecked();await expect(page.getByText(secret,{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Revoke WhatsApp production'}).click();await expect(page.getByRole('row').filter({hasText:'WhatsApp production'})).toContainText('(revoked)');
 const denied=await r.get(`${API}/intake/brands`,{headers:{Authorization:`Bearer ${secret}`}});expect(denied.status()).toBe(401);
 await page.screenshot({path:'/private/tmp/crm17-integrations.png',fullPage:true});expect(errors).toEqual([]);
});
