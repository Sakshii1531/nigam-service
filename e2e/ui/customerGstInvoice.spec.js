import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const API='http://localhost:4111/api/v1';
async function call(request,method,path,token,data){const response=await request[method](`${API}${path}`,{headers:{Authorization:`Bearer ${token}`},...(data?{data}:{})});const body=await response.json();if(!response.ok())throw new Error(`${path}: ${JSON.stringify(body.error)}`);return body.data;}
async function login(request,role,identifier){await request.post(`${API}/auth/otp/send`,{data:{role,identifier}});const code=(await(await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;return call(request,'post','/auth/otp/verify','',{role,identifier,code});}
async function store(page,session){await page.addInitScript(s=>{localStorage.setItem(`ncc_access_token_${s.user.role}`,s.accessToken);localStorage.setItem(`ncc_user_${s.user.role}`,JSON.stringify(s.user));},session);}
test('customer requests a business GST invoice, completes service and saves the correctly taxed invoice',async({page,request})=>{
 test.setTimeout(120000);await page.setViewportSize({width:390,height:844});const tag=randomUUID().slice(0,8);
 const email=`gst-admin-${tag}@e2e.test`;await request.post(`${API}/_dev/test-user`,{data:{role:'super_admin',email,password:'password123'}});const admin=await login(request,'super_admin',email);
 const cities=await call(request,'get','/super-admin/cities',admin.accessToken);if(!(cities.items||cities).some(c=>c.name==='Indore'))await call(request,'post','/super-admin/cities',admin.accessToken,{name:'Indore',state:'Madhya Pradesh',status:'Active'});
 const png=Buffer.from(await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=100;canvas.height=32;const context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,100,32);context.strokeStyle='navy';context.beginPath();context.moveTo(10,22);context.lineTo(30,8);context.lineTo(50,22);context.stroke();return canvas.toDataURL('image/png').split(',')[1];}),'base64');
 const upload=await request.post(`${API}/uploads`,{headers:{Authorization:`Bearer ${admin.accessToken}`},multipart:{file:{name:'test-signature.png',mimeType:'image/png',buffer:png}}});expect(upload.ok()).toBe(true);const signatureUrl=(await upload.json()).data.url;
 const realIssuer={sample:false,enabled:true,legalName:'GST Test Supplier',gstin:'23AAAAA0000A1ZA',address:'10 Supplier Street, Indore',signatoryName:'Test Accounts',signatureUrl,defaultSac:'998719',defaultPartsHsn:'',autoIssue:true,eInvoiceRequired:false};
 await call(request,'put','/super-admin/customer-invoices/settings',admin.accessToken,{...realIssuer,enabled:false,legalName:'',gstin:'',address:'',signatoryName:'',signatureUrl:'',defaultSac:''});
 const phone=`9${String(Math.floor(Math.random()*1e9)).padStart(9,'0')}`;
 await request.post(`${API}/_dev/test-user`,{data:{role:'customer',phone,name:'GST Test Customer',password:'password123',walletCoins:0}});const customer=await login(request,'customer',phone);
 customer.user.walletCoins=999; // A stale cached balance must not expose coins the wallet does not have.
 customer.user.addresses=await call(request,'post','/auth/addresses',customer.accessToken,{type:'Work',house:'15 Service Street',city:'Indore',state:'Madhya Pradesh',pincode:'452001',isDefault:true,latitude:22.7196,longitude:75.8577});
 const partnerPhone=`9${String(Math.floor(Math.random()*1e9)).padStart(9,'0')}`;await request.post(`${API}/_dev/test-serviceProvider`,{data:{phone:partnerPhone,password:'password123',specs:['AC'],serviceCityName:'Indore',serviceStateName:'Madhya Pradesh',availability:'Available'}});const partner=await login(request,'service_provider',partnerPhone);
 await store(page,customer);await page.goto('/book/AC');await page.getByText('Split AC',{exact:true}).click();await page.getByRole('button',{name:/^1\.5 Ton/}).click();await page.getByRole('button',{name:/Continue — Select Service/i}).click();
 await page.getByRole('button',{name:/Installation/i}).first().click();await page.getByRole('button',{name:/Continue — Schedule Visit/i}).click();await page.locator('select').first().selectOption('Voltas');await page.getByText(/Service Needed Now/i).click();await page.getByRole('button',{name:/Continue — Address & Payment/i}).click();
 await page.getByLabel('Wall type *',{exact:true}).selectOption('Brick');
 await expect(page.getByRole('checkbox',{name:/Use NCC coins/})).toHaveCount(0);
 await page.getByRole('button',{name:/Pay After Service/}).click();await page.getByRole('checkbox',{name:'I need a business GST invoice',exact:true}).check();
 const confirm=page.getByRole('button',{name:'Complete Business GST Details',exact:true});await expect(confirm).toBeDisabled();
 await page.getByLabel('GSTIN',{exact:true}).fill('27ABCDE1234F2Z5');
 await page.getByLabel('Registered business name',{exact:true}).focus();
 await expect(page.getByLabel('GSTIN',{exact:true})).toHaveAttribute('aria-invalid','true');
 await expect(page.getByRole('alert')).toContainText('fails its check-digit validation');
 for(const [label,value] of [['GSTIN','23AAAAA0000A1ZA'],['Registered business name','Test Business Services'],['Business billing address','12 Business Street'],['Billing city','Indore'],['Billing pincode','452001']])await page.getByLabel(label,{exact:true}).fill(value);
 await expect(page.getByLabel('GSTIN',{exact:true})).toHaveAttribute('aria-invalid','false');
 await expect(page.getByText('This GSTIN fails its check-digit validation.',{exact:false})).toHaveCount(0);
 await page.screenshot({path:'/tmp/gst-booking-mobile.png',fullPage:true});
 const booked=page.waitForResponse(r=>r.url()===`${API}/bookings`&&r.request().method()==='POST');await page.getByRole('button',{name:'Confirm Booking (Pay After Service)',exact:true}).click();const response=await booked;expect(response.status()).toBe(201);const {booking,serviceRequest}= (await response.json()).data;
 expect(booking.businessBilling.gstin).toBe('23AAAAA0000A1ZA');expect(booking.commercial.gstAmount).toBeGreaterThan(0);expect(Math.round(booking.commercial.taxableAmount*100)+Math.round(booking.commercial.gstAmount*100)).toBe(Math.round(booking.totalPrice*100));
 const job=await call(request,'post',`/service-provider/jobs/accept/${serviceRequest.id}`,partner.accessToken,{});
 for(const step of ['start-travel','arrive'])await call(request,'post',`/service-provider/jobs/${job.id}/${step}`,partner.accessToken);
 await call(request,'post',`/service-provider/jobs/${job.id}/diagnosis`,partner.accessToken,{notes:'Completed requested installation'});await call(request,'post',`/service-provider/jobs/${job.id}/spare-parts`,partner.accessToken,{parts:[]});await call(request,'post',`/service-provider/jobs/${job.id}/repair-complete`,partner.accessToken);await call(request,'post',`/service-provider/jobs/${job.id}/billing`,partner.accessToken);
 const current=await call(request,'get',`/bookings/${booking.id}`,customer.accessToken);await call(request,'post',`/service-provider/jobs/${job.id}/collect-payment`,partner.accessToken,{paymentMethod:'Cash',otp:current.completionOtp});
 await page.goto(`/bookings/${booking.id}`);await expect(page.getByText('Test Business Services',{exact:true})).toBeVisible();
 await expect(page.getByText('Awaiting accounts setup',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'View / save GST invoice',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Check invoice availability',exact:true}).click();
 await expect(page.getByText('Awaiting accounts setup',{exact:true})).toBeVisible();
 const configured=await call(request,'get','/super-admin/customer-invoices/settings',admin.accessToken);
 expect(configured.readiness).toMatchObject({enabled:false,configured:false});
 await store(page,admin);await page.goto('/super-admin/settings?tab=tax');
 await page.getByRole('button',{name:'Use sample supplier for testing',exact:true}).click();
 await expect(page.getByText('Sample supplier saved.',{exact:false})).toBeVisible();
 await expect(page.getByLabel('Supplier legal name',{exact:true})).toHaveValue('NCC Sample Supplier — TEST ONLY');
 const adminSamplePopup=page.waitForEvent('popup');await page.getByRole('button',{name:'View sample invoice',exact:true}).first().click();
 const adminSample=await adminSamplePopup;await expect(adminSample.getByRole('heading',{name:'Sample Invoice',exact:true})).toBeVisible();await adminSample.close();
 await page.goto(`/bookings/${booking.id}`);
 const samplePopup=page.waitForEvent('popup');
 await page.getByRole('button',{name:'View / save sample invoice',exact:true}).click();
 const sample=await samplePopup;
 await expect(sample.getByRole('heading',{name:'Sample Invoice',exact:true})).toBeVisible();
 await expect(sample.getByText('SAMPLE — NOT A TAX INVOICE.',{exact:false})).toBeVisible();
 await sample.screenshot({path:'/tmp/gst-sample-invoice.png',fullPage:true});await sample.close();
 await call(request,'put','/super-admin/customer-invoices/settings',admin.accessToken,realIssuer);
 await page.reload();
 await expect(page.getByRole('button',{name:'View / save GST invoice',exact:true})).toBeVisible();
 const popup=page.waitForEvent('popup');await page.getByRole('button',{name:'View / save GST invoice',exact:true}).click();const invoice=await popup;await expect(invoice.getByRole('heading',{name:'Tax Invoice',exact:true})).toBeVisible();await expect(invoice.getByText('Bill to: Test Business Services',{exact:true})).toBeVisible();await expect(invoice.getByRole('columnheader',{name:'CGST',exact:true})).toBeVisible();await expect(invoice.getByRole('button',{name:'Print / Save as PDF',exact:true})).toBeVisible();await expect.poll(()=>invoice.getByAltText('Authorised signature').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);await invoice.screenshot({path:'/tmp/gst-customer-invoice.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1050});await store(page,admin);await page.goto('/super-admin/settings?tab=tax');await expect(page.getByLabel('Supplier legal name',{exact:true})).toHaveValue('GST Test Supplier');await expect(page.getByText(booking.humanId,{exact:false}).first()).toBeVisible();await page.screenshot({path:'/tmp/gst-admin-invoices.png',fullPage:true});
});

test('booking shows the current available coin count and applies coins only after selection',async({page,request})=>{
 test.setTimeout(90000);
 const phone=`9${String(Math.floor(Math.random()*1e9)).padStart(9,'0')}`;
 await request.post(`${API}/_dev/test-user`,{data:{role:'customer',phone,password:'password123',walletCoins:123}});
 const customer=await login(request,'customer',phone);
 customer.user.walletCoins=0; // The current API balance wins over cached profile data.
 await call(request,'post','/auth/addresses',customer.accessToken,{type:'Home',house:'15 Coin Street',city:'Indore',state:'Madhya Pradesh',pincode:'452001',isDefault:true,latitude:22.7196,longitude:75.8577});
 await store(page,customer);await page.goto('/book/AC');
 await page.getByText('Split AC',{exact:true}).click();await page.getByRole('button',{name:/^1\.5 Ton/}).click();await page.getByRole('button',{name:/Continue — Select Service/i}).click();
 await page.getByRole('button',{name:/Installation/i}).first().click();await page.getByRole('button',{name:/Continue — Schedule Visit/i}).click();await page.locator('select').first().selectOption('Voltas');await page.getByText(/Service Needed Now/i).click();await page.getByRole('button',{name:/Continue — Address & Payment/i}).click();
 const coins=page.getByRole('checkbox',{name:/Use NCC coins.*123 available/});
 await expect(coins).toBeVisible();await expect(coins).not.toBeChecked();
 const repriced=page.waitForResponse(r=>r.url().endsWith('/catalog/quote')&&r.request().method()==='POST'&&r.request().postDataJSON()?.useCoins===true);
 await coins.check();const response=await repriced;expect(response.status()).toBe(200);expect((await response.json()).data.coinsApplied).toBeGreaterThan(0);
 await page.screenshot({path:'/tmp/booking-available-coins.png',fullPage:true});
 await coins.uncheck();await expect(coins).not.toBeChecked();
});
