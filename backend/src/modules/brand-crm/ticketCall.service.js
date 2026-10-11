import { CallLog } from '../calls/callLog.model.js';
import { User } from '../auth/user.model.js';
import { actorFromUser } from './actor.js';
import { findTicket, applyContact } from './ticketComm.service.js';
import { WarrantyClaim } from '../partner-warranty/warrantyClaim.model.js';
import { persistClaim, flushAudit } from '../partner-warranty/claimTimeline.js';
import { runInTransaction } from '../../utils/transaction.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { getTwilioClient } from '../calls/call.service.js';
export function brandCallEnabled(){return process.env.CALL_MASKING_ENABLED!=='false'&&Boolean(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_VOICE_NUMBER&&process.env.API_PUBLIC_URL);}
const phone=v=>/^\+?[1-9]\d{9,14}$/.test(v||'')?(v.startsWith('+')?v:`+91${v}`):null;
export async function initiateBrandCall(user,id) {
  const c=await findTicket(user,id);
  if(!brandCallEnabled())throw new ApiError(501,'Calling is unavailable; log the contact manually',{fallback:'log_manually'});
  const [caller,customer]=await Promise.all([User.findById(user.id).select('phone').lean(),User.findById(c.customer).select('phone').lean()]);
  const from=phone(process.env.TWILIO_VOICE_NUMBER),to=phone(caller?.phone),callee=phone(customer?.phone);
  if(!from||!to||!callee)throw new ApiError(422,'A valid caller and customer phone number are required');
  const client=await getTwilioClient();if(!client)throw new ApiError(501,'Calling is unavailable; log the contact manually',{fallback:'log_manually'});
  const log=await CallLog.create({customer:c.customer,warrantyClaim:c._id,serviceRequest:c.serviceRequest||undefined,brandUser:user.id,brandActor:await actorFromUser(user.id,'brand'),initiatedBy:'brand_user',startedAt:new Date()});
  const callback=`${process.env.API_PUBLIC_URL.replace(/\/$/,'')}/api/v1/calls/status?callLog=${log.id}`;
  try{
    const result=await client.calls.create({from,to,twiml:`<Response><Dial callerId="${from}" action="${callback}&amp;leg=dial" method="POST">${callee}</Dial></Response>`,statusCallback:callback,statusCallbackEvent:['initiated','ringing','answered','completed'],statusCallbackMethod:'POST'});
    log.callSid=result.sid;await log.save();
  }catch(e){log.status='failed';log.endedAt=new Date();await log.save();throw new ApiError(502,'Unable to start the call; log the contact manually',{fallback:'log_manually'});}
  return {id:log.id,status:log.status,startedAt:log.startedAt};
}
export async function recordBrandCallResult(id) {
  let c;
  await runInTransaction(async session=>{
    c=null;
    const log=await CallLog.findById(id).session(session||null);if(!log||log.contactLoggedAt)return;
    c=await WarrantyClaim.findOne({_id:log.warrantyClaim,customer:log.customer}).session(session||null);if(!c)return;
    const outcome={completed:'connected','no-answer':'no_answer',busy:'busy',failed:'failed',canceled:'failed'}[log.status];if(!outcome)return;
    applyContact(c,log.brandActor,{channel:'phone',direction:'outbound',outcome,durationSec:Number.isFinite(log.duration)?Math.max(0,Math.min(86400,log.duration)):0,remarks:`Phone call ${log.status.replaceAll('-',' ')}`},{callLogId:String(log._id)});
    log.contactLoggedAt=new Date();await log.save(session?{session}:undefined);await persistClaim(c,{session});
  });if(c)await flushAudit(c);
}
