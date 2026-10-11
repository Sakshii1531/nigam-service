// Verified against the real SR and Job writers; see Brand CRM Phase 8 log.
export function jobStageFor(sr, job = {}, claim = {}) {
  const status = sr?.status, step = job?.activeStep;
  if (claim.status === 'Cancelled') return 'CANCELLED';
  if (status === 'Closed' || claim.status === 'Closed') return 'CLOSED';
  if (status === 'Cancelled') return 'ALLOCATION_FAILED';
  if (!sr?.isAccepted) {
    if (claim.flags?.allocationFailed) return 'ALLOCATION_FAILED';
    return sr?.serviceProvider ? 'JOB_OFFERED' : 'PARTNER_FINDING';
  }
  if (status === 'Customer Confirmation') return 'CUSTOMER_CONFIRMATION';
  if (status === 'Repair Completed' || ['repaircomplete', 'revisit_complete', 'billing', 'revisit_billing', 'revisit_payment', 'revisit_otp', 'awaitingpayment', 'completed'].includes(step)) return 'COMPLETED';
  if (['revisit_ontheway', 'ontheway'].includes(step)) return 'EN_ROUTE';
  if (step === 'revisit_scheduled' && job.revisit?.partOrderId && !job.revisit.partReceivedAt) return 'PARTS_REQUIRED';
  if (status === 'Spare Received' || step === 'revisit_arrived') return 'REPAIR';
  if (['Spare Required', 'Spare Ordered'].includes(status) || ['completed_pending', 'spare_part_required', 'revisit_scheduled'].includes(step)) return 'PARTS_REQUIRED';
  if (step === 'spareapproval') return job.spareParts?.some(p => p.checked) ? 'PARTS_REQUIRED' : 'REPAIR';
  if (status === 'Diagnosis Done') return 'DIAGNOSIS';
  if (status === 'Engineer Reached' || step === 'inspection') return 'REACHED';
  if (['Visit Scheduled', 'Reschedule', 'Customer NA'].includes(status)) return 'VISIT_SCHEDULED';
  return 'PARTNER_ASSIGNED';
}
export const FORWARD_JOB_STAGES = ['PARTNER_FINDING', 'JOB_OFFERED', 'PARTNER_ASSIGNED', 'VISIT_SCHEDULED', 'EN_ROUTE', 'REACHED', 'DIAGNOSIS', 'PARTS_REQUIRED', 'REPAIR', 'COMPLETED', 'CUSTOMER_CONFIRMATION', 'CLOSED'];
export function mayMoveJobStage(previous, next, sr, job) {
  if (!previous || previous === next || ['CANCELLED', 'CLOSED', 'ALLOCATION_FAILED'].includes(next)) return true;
  if (!sr.isAccepted && ['PARTNER_FINDING', 'JOB_OFFERED'].includes(next)) return true;
  if (previous === 'ALLOCATION_FAILED' || job?.activeStep?.startsWith('revisit_')) return true;
  if (['Visit Scheduled', 'Reschedule'].includes(sr.status) && !['COMPLETED', 'CUSTOMER_CONFIRMATION', 'CLOSED'].includes(previous)) return true;
  return FORWARD_JOB_STAGES.indexOf(next) >= FORWARD_JOB_STAGES.indexOf(previous);
}
