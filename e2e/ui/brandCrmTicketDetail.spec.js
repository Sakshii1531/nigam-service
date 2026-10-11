import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
const API='http://localhost:4111/api/v1';
async function call(request,method,path,token,data){const r=await request[method](`${API}${path}`,{headers:{Authorization:`Bearer ${token}`},...(data?{data}:{})});const b=await r.json();if(!r.ok())throw new Error(`${path}: ${JSON.stringify(b.error)}`);return b.data;}
async function session(request,role,identifier){await request.post(`${API}/auth/otp/send`,{data:{role,identifier}});const code=(await (await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;return call(request,'post','/auth/otp/verify','',{role,identifier,code});}
async function signIn(context,s,portal='brand_admin'){await context.addInitScript(({s,portal})=>{localStorage.setItem(`ncc_access_token_${portal}`,s.accessToken);localStorage.setItem(`ncc_refresh_token_${portal}`,s.refreshToken);localStorage.setItem(`ncc_user_${portal}`,JSON.stringify(s.user));}, {s,portal});}
test('sectioned ticket detail, video viewer, filtered activity and live decision',async({page,request})=>{
 const tag=randomUUID().slice(0,8),email=`queue-admin-${tag}@e2e.test`;await request.post(`${API}/_dev/test-user`,{data:{role:'super_admin',email,password:'password123'}});const admin=await session(request,'super_admin',email);
 const category=(await call(request,'get','/super-admin/catalogue/categories',admin.accessToken)).find(c=>c.key==='AC'),brand=await call(request,'post','/super-admin/brands',admin.accessToken,{name:`Queue ${tag}`,status:'Active'});
 await call(request,'put',`/super-admin/warranty-catalog/brands/${brand.id}`,admin.accessToken,{warrantyEnabled:true,coverage:[category.id]});const issue=await call(request,'post','/super-admin/warranty-catalog/issues',admin.accessToken,{category:category.id,name:`Queue issue ${tag}`});const staffEmail=`queue-staff-${tag}@e2e.test`;await request.post(`${API}/_dev/test-user`,{data:{role:'brand_admin',email:staffEmail,brand:brand.id,password:'password123',employeeId:'OWNER-06'}});const staff=await session(request,'brand_admin',staffEmail);
 const phone=()=>`9${String(Math.floor(Math.random()*1e9)).padStart(9,'0')}`;
 const mobile=phone();await request.post(`${API}/_dev/test-user`,{data:{role:'customer',phone:mobile,password:'password123'}});const customer=await session(request,'customer',mobile);
  const clip=await page.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;
    const stream=canvas.captureStream(10);const recorder=new MediaRecorder(stream,{mimeType:'video/webm'});const chunks=[];
    const done=new Promise(resolve=>{recorder.onstop=resolve;});recorder.ondataavailable=e=>chunks.push(e.data);
    recorder.start();const context=canvas.getContext('2d');context.fillStyle='blue';context.fillRect(0,0,32,32);
    await new Promise(resolve=>setTimeout(resolve,300));recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());
    return Array.from(new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer()));
  });
 const upload=await request.post(`${API}/uploads`,{headers:{Authorization:`Bearer ${customer.accessToken}`},multipart:{file:{name:'fault.webm',mimeType:'video/webm',buffer:Buffer.from(clip)}}});expect(upload.ok()).toBeTruthy();const url=(await upload.json()).data.url;
 const a=await call(request,'post','/brand/tickets',staff.accessToken,{customerId:customer.user.id,source:'toll_free',categoryId:category.id,issueId:issue.id,remarks:'Product stopped cooling',address:{house:'12 Test Street',city:'Indore',state:'MP',pincode:'452001'},product:{},documents:[{kind:'video',url,name:'Fault video'}]});
 await signIn(page,staff);await page.goto(`/brand-admin/tickets/${a.id}`);
 for(const title of ['Ticket','Customer','Product','Warranty','Complaint','Approval','NCC Job','Parts','Billing','Closure','Activity'])await expect(page.getByRole('heading',{name:title,exact:true,level:2})).toBeVisible();
 await page.getByRole('button',{name:/video/i}).click();const video=page.getByRole('dialog',{name:'Document preview'}).locator('video');await expect(video).toHaveAttribute('src',/fault|uploads/);await expect.poll(()=>video.evaluate(v=>v.readyState)).toBeGreaterThanOrEqual(1);await page.getByRole('button',{name:'Close preview'}).click();
 await page.getByLabel('Internal note',{exact:true}).fill('Called customer to confirm availability');await page.getByRole('button',{name:'Add note',exact:true}).click();await page.getByRole('button',{name:'notes',exact:true}).click();await expect(page.getByText('Called customer to confirm availability',{exact:true})).toBeVisible();
 await call(request,'post',`/brand/tickets/${a.id}/approve`,staff.accessToken,{coverageDecision:'goodwill',remarks:'Customer goodwill approval'});await expect(page.getByTestId('ticket-status')).toHaveText('Job Created');
 await page.getByRole('button',{name:'All activity',exact:true}).click();await expect(page.getByText('Customer goodwill approval',{exact:true}).first()).toBeVisible();
 await expect(page.getByRole('button',{name:'Print / Download ticket summary (PDF)'})).toBeVisible();await page.screenshot({path:'../docs/brand-crm/screenshots/phase-7-detail.png',fullPage:true});
});
