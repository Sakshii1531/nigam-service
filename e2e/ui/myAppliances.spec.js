import { test, expect as baseExpect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const expect=baseExpect.configure({timeout:15000});
const API='http://localhost:4111/api/v1';
async function call(request,method,path,token,data) {
  const response=await request[method](`${API}${path}`,{headers:{Authorization:`Bearer ${token}`},...(data ? {data} : {})});
  const body=await response.json();if(!response.ok())throw new Error(`${path}: ${JSON.stringify(body.error)}`);return body.data;
}
async function session(request,phone) {
  await request.post(`${API}/_dev/test-user`,{data:{role:'customer',phone,name:'Appliance Test Customer',password:'password123'}});
  await request.post(`${API}/auth/otp/send`,{data:{role:'customer',identifier:phone}});
  const code=(await(await request.get(`${API}/_dev/last-otp/${phone}`)).json()).data.code;
  return call(request,'post','/auth/otp/verify','',{role:'customer',identifier:phone,code});
}
function pdf() {
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const content='BT /F1 18 Tf 20 150 Td (Test purchase invoice) Tj ET';objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  let value='%PDF-1.4\n';const offsets=[0];for(const [i,obj] of objects.entries()){offsets.push(Buffer.byteLength(value));value+=`${i+1} 0 obj\n${obj}\nendobj\n`;}
  const start=Buffer.byteLength(value);value+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('');return Buffer.from(value+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`);
}
test('My Appliances manages private files, product details, exact service history and saved or unsaved bookings',async({page,request})=>{
  test.setTimeout(180000);await page.setViewportSize({width:390,height:844});const tag=randomUUID().slice(0,8);
  const adminEmail=`appliance-admin-${tag}@e2e.test`;await request.post(`${API}/_dev/test-user`,{data:{role:'super_admin',email:adminEmail,password:'password123'}});await request.post(`${API}/auth/otp/send`,{data:{role:'super_admin',identifier:adminEmail}});const adminCode=(await(await request.get(`${API}/_dev/last-otp/${encodeURIComponent(adminEmail)}`)).json()).data.code;const admin=await call(request,'post','/auth/otp/verify','',{role:'super_admin',identifier:adminEmail,code:adminCode});const cities=await call(request,'get','/super-admin/cities',admin.accessToken);if(!(cities.items||cities).some(c=>c.name==='Indore'))await call(request,'post','/super-admin/cities',admin.accessToken,{name:'Indore',state:'Madhya Pradesh',status:'Active'});
  const phone=`9${String(Math.floor(Math.random()*1e9)).padStart(9,'0')}`, customer=await session(request,phone);
  await call(request,'post','/auth/addresses',customer.accessToken,{type:'Home',house:'15 Test Street',city:'Indore',state:'Madhya Pradesh',pincode:'452001',isDefault:true,latitude:22.7196,longitude:75.8577});
  await page.addInitScript(s=>{localStorage.setItem('ncc_access_token_customer',s.accessToken);localStorage.setItem('ncc_user_customer',JSON.stringify(s.user));},customer);
  await page.goto('/profile');await expect(page.getByText('My Appliances',{exact:true}).first()).toBeVisible();await expect(page.getByText('Exchange Details',{exact:true})).toHaveCount(0);
  await page.goto('/exchange-details');await expect(page).toHaveURL(/\/my-appliances$/);await page.getByRole('button',{name:'Add your first appliance',exact:true}).click();
  await expect(page.getByRole('button',{name:'Electronics',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Bathware & Sanitary',exact:true})).toBeVisible();await page.screenshot({path:'/tmp/my-appliance-register-step1.png',fullPage:true});
  const name=`Bedroom AC ${tag}`;
  for(const [label,value] of [['Appliance name',name],['Category','AC'],['Brand','Voltas'],['Model number','MSQ-18'],['Purchase date','2026-06-15'],['Serial number',`SN-${tag}`],['Warranty end date (your record)','2028-10-01'],['Purchased from','Test store']])await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await page.getByLabel('Upload Purchase invoice / bill',{exact:true}).setInputFiles({name:'purchase.pdf',mimeType:'application/pdf',buffer:pdf()});
  await page.screenshot({path:'/tmp/my-appliance-register-step2.png',fullPage:true});
  // A failed upload must be retryable without creating a second saved product.
  let failedOnce=false;
  await page.route('**/appliances/*/documents',async route=>{if(route.request().method()==='POST'&&!failedOnce){failedOnce=true;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{message:'Temporary upload failure'}})});}else await route.continue();});
  await page.getByRole('button',{name:'Save appliance',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Product details are saved');
  expect((await call(request,'get','/appliances',customer.accessToken)).length).toBe(1);
  await page.getByRole('button',{name:'Retry uploads',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Product saved successfully!',exact:true})).toBeVisible();
  const dismiss=page.getByRole('button',{name:'Dismiss notification'});if(await dismiss.count())await dismiss.first().click();
  await page.screenshot({path:'/tmp/my-appliance-register-success.png',fullPage:true});
  await page.getByRole('button',{name:'Register another',exact:true}).click();await expect(page.getByLabel('Appliance name',{exact:true})).toHaveValue('');await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'Filters',exact:true}).click();await page.getByLabel('Filter appliances by brand').selectOption('Voltas');await page.getByLabel('Purchase date from',{exact:true}).fill('2026-06-01');await page.getByLabel('Purchase date to',{exact:true}).fill('2026-06-30');await page.getByRole('button',{name:'Apply filters',exact:true}).click();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  await page.getByLabel('Search appliances').fill('does-not-exist');await expect(page.getByText('No matching appliances',{exact:true})).toBeVisible();await page.getByLabel('Search appliances').fill('');
  await page.getByRole('button',{name:/^Filters/}).click();await page.getByRole('button',{name:'Reset filters',exact:true}).click();await page.getByRole('button',{name:'Apply filters',exact:true}).click();await page.getByRole('button',{name:'Manage appliance',exact:true}).click();
  const applianceId=page.url().split('/').pop();await expect(page.getByText('No NCC services recorded for this appliance yet.')).toBeVisible();await expect(page.getByText('purchase.pdf',{exact:true})).toBeVisible();
  await page.getByText('purchase.pdf',{exact:true}).click();await expect(page.getByRole('dialog',{name:'Document preview'})).toBeVisible();await expect(page.getByRole('img',{name:'PDF page 1',exact:true})).toHaveAttribute('data-rendered','true');await expect(page.getByText('Test purchase invoice',{exact:true})).toBeAttached();await page.screenshot({path:'/tmp/my-appliance-pdf.png',fullPage:true});await page.getByRole('button',{name:'Close document preview'}).click();
  const image=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=240;c.height=160;const ctx=c.getContext('2d');ctx.fillStyle='#dbeafe';ctx.fillRect(0,0,240,160);ctx.fillStyle='#1e40af';ctx.font='20px sans-serif';ctx.fillText('Test appliance photo',20,90);return c.toDataURL('image/png').split(',')[1];}),'base64');
  await page.getByLabel('Document type',{exact:true}).selectOption('photo');await page.getByLabel('Upload appliance document').setInputFiles({name:'ac-photo.png',mimeType:'image/png',buffer:image});await expect(page.getByText('ac-photo.png',{exact:true})).toBeVisible();await page.getByText('ac-photo.png',{exact:true}).click();await expect.poll(()=>page.getByRole('dialog',{name:'Document preview'}).getByRole('img').evaluate(img=>img.naturalWidth)).toBe(240);await page.screenshot({path:'/tmp/my-appliance-photo.png',fullPage:true});await page.getByRole('button',{name:'Close document preview'}).click();
  await page.goto('/my-appliances');await expect.poll(()=>page.getByRole('img',{name,exact:true}).evaluate(img=>img.naturalWidth)).toBe(240);await page.screenshot({path:'/tmp/my-appliance-list-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/my-appliance-list-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Manage appliance',exact:true}).click();
  await page.getByRole('button',{name:'Edit details',exact:true}).click();await page.getByLabel('Model number',{exact:true}).fill('MSQ-18-UPDATED');await page.getByRole('button',{name:'Save appliance',exact:true}).click();await expect(page.getByText('MSQ-18-UPDATED',{exact:true})).toBeVisible();
  async function schedule() {
    await page.getByText('Split AC',{exact:true}).click();await page.getByRole('button',{name:/^1\.5 Ton/}).click();await page.getByRole('button',{name:/Continue — Select Service/i}).click();await page.getByRole('button',{name:/Installation/i}).first().click();await page.getByRole('button',{name:/Continue — Schedule Visit/i}).click();
  }
  async function book() {
    await page.getByText(/Service Needed Now/i).click();await page.getByRole('button',{name:/Continue — Address & Payment/i}).click();await page.getByLabel('Wall type *',{exact:true}).selectOption('Brick');await page.getByRole('button',{name:/Pay After Service/}).click();
    const response=page.waitForResponse(r=>r.url()===`${API}/bookings`&&r.request().method()==='POST');await page.getByRole('button',{name:'Confirm Booking (Pay After Service)',exact:true}).click();const result=await response;expect(result.status()).toBe(201);return (await result.json()).data;
  }
  await page.getByRole('button',{name:'Book a service for this appliance',exact:true}).click();await schedule();await expect(page.getByLabel('Select saved appliance')).toHaveValue(applianceId);await expect(page.getByLabel('Appliance brand')).toHaveValue('Voltas');const savedBooking=await book();expect(savedBooking.serviceRequest.appliance).toBe(applianceId);
  await call(request,'post',`/bookings/${savedBooking.booking.id}/cancel`,customer.accessToken,{reason:'UI test cleanup'});
  await page.goto(`/my-appliances/${applianceId}`);await expect(page.getByText(savedBooking.booking.humanId,{exact:true})).toBeVisible();await expect(page.getByText('Cancelled',{exact:true})).toBeVisible();await page.screenshot({path:'/tmp/my-appliance-details-mobile.png',fullPage:true});
  await page.evaluate(()=>sessionStorage.removeItem('ncc_last_booking_flow'));await page.goto('/book/AC');await schedule();await page.getByLabel('Appliance brand').selectOption('Voltas');await page.getByLabel('Select saved appliance').selectOption('');const unsaved=await book();expect(unsaved.serviceRequest.appliance).toBeNull();
  expect((await call(request,'get','/appliances',customer.accessToken)).length).toBe(1);
  await page.evaluate(()=>sessionStorage.removeItem('ncc_last_booking_flow'));await page.goto('/book/AC');await schedule();await page.getByRole('button',{name:'+ Add appliance',exact:true}).click();await page.getByLabel('Appliance name',{exact:true}).fill('Kitchen AC');await page.getByRole('button',{name:'Manual entry',exact:true}).click();await page.getByLabel('Brand',{exact:true}).fill('Voltas');await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByRole('button',{name:'Save appliance',exact:true}).click();await expect(page.getByLabel('Select saved appliance').locator('option:checked')).toContainText('Kitchen AC');
  await page.goto(`/my-appliances/${applianceId}`);await page.getByRole('button',{name:'Delete purchase.pdf',exact:true}).click();await page.getByRole('button',{name:'Delete document',exact:true}).click();await expect(page.getByText('purchase.pdf',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Delete appliance',exact:true}).click();await page.getByRole('alertdialog',{name:'Delete appliance'}).getByRole('button',{name:'Delete appliance',exact:true}).click();await expect(page).toHaveURL(/\/my-appliances$/);await expect(page.getByRole('heading',{name,exact:true})).toHaveCount(0);await expect(page.getByRole('heading',{name:'Kitchen AC',exact:true})).toBeVisible();
  await page.evaluate(()=>localStorage.setItem('ncc_customer_city','Outside NCC Area'));await page.goto('/my-appliances');await expect(page.getByRole('heading',{name:'My Appliances',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Kitchen AC',exact:true})).toBeVisible();await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/my-appliances-desktop.png',fullPage:true});
});
