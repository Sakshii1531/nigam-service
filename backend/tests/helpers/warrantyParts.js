import {PartOrder} from '../../src/modules/service-provider/partOrder.model.js';
// Exercise the real Phase 10 chain before older lifecycle scenarios complete
// their repair. No database status changes stand in for either desk's consent.
export async function fulfillWarrantyParts(kit,{jobId,claimId,partner,brand,admin,customer}){
 const orders=await PartOrder.find({job:jobId});
 for(const p of orders){
  if(p.payer==='customer'&&p.customerApprovalStatus==='Pending')await kit.api().post(`/api/v1/partner-warranty/claims/${claimId}/parts/${p.id}/respond`).set(kit.bearer(customer.token)).send({approved:true}).expect(200);
  if(p.approval.required.includes('brand'))await kit.api().post(`/api/v1/brand/parts/${p.id}/approve`).set(kit.bearer(brand.token)).send({remarks:'Replacement part approved'}).expect(200);
  const statuses=p.fulfillmentType==='in_stock'?['Approved','Ready to Hand Over','Handed Over']:['Approved','Dispatched','Delivered'];
  for(const status of statuses)await kit.api().patch(`/api/v1/super-admin/part-orders/${p.id}`).set(kit.bearer(admin.token)).send({status}).expect(200);
  for(const action of ['received','installed'])await kit.api().post(`/api/v1/service-provider/jobs/${jobId}/parts/${p.id}/${action}`).set(kit.bearer(partner.token)).send({}).expect(200);
 }
 for(const action of ['start-travel','arrive'])await kit.api().post(`/api/v1/service-provider/jobs/${jobId}/${action}`).set(kit.bearer(partner.token)).expect(200);
}
