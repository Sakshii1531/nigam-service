import { SLA_STAGES } from '../partner-warranty/claimSla.js';
export const OPEN_STATUSES = {
  $nin: ['Closed', 'Cancelled', 'Rejected']
};
export const DASHBOARD_STAGES = {
  assigned: ['PARTNER_ASSIGNED', 'VISIT_SCHEDULED'],
  in_progress: ['EN_ROUTE', 'REACHED', 'DIAGNOSIS', 'PARTS_REQUIRED', 'REPAIR'],
  completed: ['COMPLETED', 'CUSTOMER_CONFIRMATION', 'CLOSED']
};
export function slaExpressions(now) {
  const unmet = s => ({
    $and: [{
      $ne: [{
        $ifNull: [`$sla.${s.dueField}`, null]
      }, null]
    }, {
      $eq: [{
        $ifNull: [`$sla.met.${s.key}`, null]
      }, null]
    }]
  });
  const active = {
    $eq: [{
      $ifNull: ['$sla.pausedAt', null]
    }, null]
  };
  const breached = {
    $or: [{
      $gt: [{
        $size: {
          $ifNull: ['$sla.breaches', []]
        }
      }, 0]
    }, {
      $and: [active, {
        $or: SLA_STAGES.map(s => ({
          $and: [unmet(s), {
            $lte: [`$sla.${s.dueField}`, now]
          }]
        }))
      }]
    }]
  };
  const warning = {
    $and: [active, {
      $not: [breached]
    }, {
      $or: SLA_STAGES.map(s => ({
        $and: [unmet(s), {
          $lte: [{
            $subtract: [`$sla.${s.dueField}`, {
              $multiply: [{
                $ifNull: [`$sla.hours.${s.hoursKey}`, 0]
              }, 720000]
            }]
          }, now]
        }]
      }))
    }]
  };
  return {
    breached,
    warning
  };
}
export function approvalMatch(from, to) {
  return {
    timeline: {
      $elemMatch: {
        action: 'CLAIM_APPROVED',
        at: {
          $gte: from,
          $lt: to
        }
      }
    }
  };
}
