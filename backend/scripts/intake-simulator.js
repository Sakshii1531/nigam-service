#!/usr/bin/env node
// Node 18+; no dependency on application secrets or database access.
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
const base=(process.env.INTAKE_BASE_URL||'http://localhost:4000/api/v1').replace(/\/$/,'');
const key=process.env.INTAKE_API_KEY;
async function call(path,{method='GET',body,headers={}}={}) {
  const response=await fetch(`${base}/intake${path}`,{method,headers:{Authorization:`Bearer ${key}`,...(body instanceof FormData?{}:{'Content-Type':'application/json'}),...headers},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});
  const result=await response.json();if(!response.ok)throw Error(`${response.status}: ${result.error?.message||'Request failed'}`);return result.data;
}
try {
  if(!key)throw Error('Set INTAKE_API_KEY (never pass secrets as command-line arguments).');
  if(!process.env.INTAKE_CUSTOMER_PHONE)throw Error('Set INTAKE_CUSTOMER_PHONE to the test customer phone. This command creates a real ticket.');
  const brands=await call('/brands'),brand=brands.find(b=>b.id===process.env.INTAKE_BRAND_ID)||(!process.env.INTAKE_BRAND_ID&&brands[0]);
  if(!brand)throw Error('No accessible warranty-enabled brand');
  await call('/whatsapp/validate-step',{method:'POST',body:{step:'brand',data:{brandId:brand.id}}});
  const catalog=await call(`/brands/${brand.id}/catalog`),category=catalog.categories[0];if(!category)throw Error('Brand has no covered categories');
  const customer={name:process.env.INTAKE_CUSTOMER_NAME||'Intake simulator',phone:process.env.INTAKE_CUSTOMER_PHONE};
  await call('/whatsapp/validate-step',{method:'POST',body:{step:'customer',data:customer}});
  const documents=[];
  if(process.env.INTAKE_INVOICE_PATH){const file=process.env.INTAKE_INVOICE_PATH,form=new FormData();form.set('file',new Blob([await readFile(file)],{type:'application/pdf'}),basename(file));const uploaded=await call('/uploads',{method:'POST',body:form});documents.push({kind:'invoice',url:uploaded.url});}
  const complaint=category.issues.find(i=>!i.productTypeId);
  const body={brandId:brand.id,categoryId:category.id,source:'whatsapp',customer,product:{},
    ...(complaint?{issueId:complaint.id}:{issueName:'Simulator complaint'}),remarks:'Simulator: product is not working properly',documents,
    address:{house:process.env.INTAKE_HOUSE||'12 Test Street',city:process.env.INTAKE_CITY||'Indore',state:process.env.INTAKE_STATE||'MP',pincode:process.env.INTAKE_PINCODE||'452001'}};
  const id=process.env.INTAKE_IDEMPOTENCY_KEY||randomUUID();
  const ticket=await call('/tickets',{method:'POST',body,headers:{'Idempotency-Key':id}});
  const replay=await call('/tickets',{method:'POST',body,headers:{'Idempotency-Key':id}});
  if(replay.ticketNo!==ticket.ticketNo)throw Error('Idempotency verification failed');
  const status=await call(`/tickets/${ticket.ticketNo}`);
  console.log(JSON.stringify({ticketNo:ticket.ticketNo,brandTicketNo:ticket.brandTicketNo,status:status.customerStatusLabel,idempotencyKey:id},null,2));
}catch(e){console.error(e.message);process.exitCode=1;}
