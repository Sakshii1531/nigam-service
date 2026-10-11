/** Calendar warranty dates are inclusive; month ends clamp, never roll into March. */
const day=value=>{if(!value)return null;const d=new Date(value);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):null;};
export function warrantyExpiry(purchaseDate,months){
 const value=new Date(purchaseDate);if(!Number.isFinite(value.getTime()))return null;
 const y=value.getUTCFullYear(),m=value.getUTCMonth()+months,d=value.getUTCDate();
 const last=new Date(Date.UTC(y,m+1,0)).getUTCDate();return new Date(Date.UTC(y,m,Math.min(d,last)));
}
export function evaluateResolvedWarranty(input,{policy,registry=null,at=new Date()}={}){
 const reasons=[];const purchase=input.purchaseDate||registry?.warrantyStartsOn||registry?.soldOn;
 const purchaseDay=day(purchase),today=day(at),months=policy?.warrantyMonths??12;
 if(!policy||policy.synthetic)reasons.push('NO_POLICY');
 if(!purchaseDay)reasons.push('NO_PURCHASE_DATE');
 if(purchaseDay&&purchaseDay>today)reasons.push('PURCHASE_IN_FUTURE');
 if(policy?.requireInvoice&&!input.hasInvoice)reasons.push('NO_INVOICE');
 const serial=String(input.serial||'').trim().toUpperCase();
 if((policy?.requireSerial||policy?.requireSerialInRegistry)&&!serial)reasons.push('NO_SERIAL');
 if(policy?.requireSerialInRegistry&&serial&&!registry)reasons.push('SERIAL_NOT_IN_REGISTRY');
 if(registry&&((registry.modelNumber&&input.model&&String(registry.modelNumber).trim().toUpperCase()!==String(input.model).trim().toUpperCase())||(registry.category&&input.category&&String(registry.category)!==String(input.category))))reasons.push('SERIAL_MODEL_MISMATCH');
 if(purchaseDay&&registry?.manufacturedOn&&purchaseDay<day(registry.manufacturedOn))reasons.push('PURCHASE_BEFORE_MANUFACTURE');
 const expiresOn=purchaseDay?warrantyExpiry(purchaseDay,months):null;
 if(expiresOn&&today>day(expiresOn))reasons.push('EXPIRED');
 const coverage=policy?.coverage||{};
 if(input.issue&&(coverage.excludedIssues||[]).some(i=>String(i)===String(input.issue)))reasons.push('ISSUE_EXCLUDED');
 if((coverage.nonCoveredServices||[]).includes(input.serviceType)||(Array.isArray(coverage.coveredServices)&&!coverage.coveredServices.includes(input.serviceType||'repair')))reasons.push('SERVICE_NOT_COVERED');
 const out=['EXPIRED','ISSUE_EXCLUDED','SERVICE_NOT_COVERED'].some(r=>reasons.includes(r));
 const status=reasons.includes('NO_POLICY')?'Verification Required':out?'Out of Warranty':reasons.length?'Verification Required':'In Warranty';
 return {status,reasons,expiresOn,months,policy:policy?{id:policy.synthetic?null:String(policy._id),name:policy.name,version:policy.version,coverage:JSON.parse(JSON.stringify(policy.coverage||{})),partsWarrantyMonths:policy.partsWarrantyMonths,labourWarrantyMonths:policy.labourWarrantyMonths}:null};
}
