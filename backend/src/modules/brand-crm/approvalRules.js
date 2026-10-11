import {ApiError} from '../../middleware/errorHandler.js';
export function assertApprovalCoverage(claim,{coverageDecision='warranty',remarks}={},canVerify=false){
 if(!['warranty','goodwill'].includes(coverageDecision))throw new ApiError(400,'Choose warranty or goodwill');
 if(coverageDecision==='goodwill'&&(!remarks||remarks.trim().length<5))throw new ApiError(400,'Goodwill approval requires remarks (at least 5 characters)');
 if(coverageDecision==='warranty'&&claim.warranty.status==='Out of Warranty')throw new ApiError(409,'Out of warranty: approve as goodwill or reject');
 if(coverageDecision==='warranty'&&claim.warranty.status==='Verification Required'&&!canVerify&&!claim.warranty.verifiedBy?.user)throw new ApiError(409,'Verify warranty first');
 return coverageDecision;
}
