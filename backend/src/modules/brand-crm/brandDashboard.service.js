import mongoose from 'mongoose';
import { WarrantyClaim } from '../partner-warranty/warrantyClaim.model.js';
import { Escalation } from '../super-admin/escalation.model.js';
import { PartOrder } from '../service-provider/partOrder.model.js';
import { bucketQuery } from './ticketQueue.js';
import { DASHBOARD_STAGES, slaExpressions, approvalMatch } from './dashboardQueries.js';
import { source } from './brandReports.service.js';
import { brandSummary, dateRange } from './billing.service.js';
import { myWork } from './ticketComm.service.js';
import { ApiError } from '../../middleware/errorHandler.js';
const DAY = 86400000;
export function dashboardPeriod(query = {}, now = new Date()) {
  const end = query.to ? new Date(query.to) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const start = query.from ? new Date(query.from) : new Date(+end - 7 * DAY);
  dateRange(start, end);
  if (end - start > 366 * DAY) throw new ApiError(400, 'Dashboard range cannot exceed 366 days');
  return {
    from: start,
    to: end,
    previousFrom: new Date(+start - (end - start)),
    previousTo: start
  };
}
const countIf = condition => ({
  $sum: {
    $cond: [condition, 1, 0]
  }
});
async function cohort(brand, from, to, now, financial) {
  const {
    breached,
    warning
  } = slaExpressions(now);
  const open = {
    $not: [{
      $in: ['$status', ['Closed', 'Cancelled', 'Rejected']]
    }]
  };
  const [rows, pendingApproval, approved, escalated, billing] = await Promise.all([WarrantyClaim.aggregate([{
    $match: {
      brand,
      createdAt: {
        $gte: from,
        $lt: to
      }
    }
  }, {
    $group: {
      _id: null,
      total: {
        $sum: 1
      },
      assigned: countIf({
        $in: ['$jobStage', DASHBOARD_STAGES.assigned]
      }),
      inProgress: countIf({
        $in: ['$jobStage', DASHBOARD_STAGES.in_progress]
      }),
      completed: countIf({
        $in: ['$jobStage', DASHBOARD_STAGES.completed]
      }),
      slaBreached: countIf({
        $and: [open, breached]
      }),
      warning: countIf({
        $and: [open, warning]
      }),
      open: countIf(open)
    }
  }]), WarrantyClaim.countDocuments({
    brand,
    createdAt: {
      $gte: from,
      $lt: to
    },
    ...bucketQuery('pending_approval')
  }), WarrantyClaim.countDocuments({
    brand,
    ...approvalMatch(from, to)
  }), Escalation.countDocuments({
    brand,
    scope: 'brand',
    status: {
      $ne: 'Resolved'
    },
    createdAt: {
      $gte: from,
      $lt: to
    }
  }), financial ? brandSummary(brand, {
    from,
    to,
    now
  }) : null]);
  const r = rows[0] || {};
  return {
    values: {
      total: r.total || 0,
      pendingApproval,
      approved,
      assigned: r.assigned || 0,
      inProgress: r.inProgress || 0,
      completed: r.completed || 0,
      escalated,
      slaBreached: r.slaBreached || 0,
      ...(billing ? {
        totalBilling: billing.invoiceValue,
        pendingPayment: billing.pending,
        unbilled: billing.unbilledAmount
      } : {})
    },
    billing,
    slaSnapshot: {
      onTrack: (r.open || 0) - (r.slaBreached || 0) - (r.warning || 0),
      warning: r.warning || 0,
      breached: r.slaBreached || 0
    }
  };
}
function queueLink(period, extra = {}) {
  return `/brand-admin/tickets?${new URLSearchParams({
    from: period.from.toISOString().slice(0, 10),
    to: new Date(+period.to - 1).toISOString().slice(0, 10),
    ...extra
  })}`;
}
export async function getBrandDashboard(user, query = {}, {
  now = new Date(),
  permissions = new Set(user.permissions || [])
} = {}) {
  const period = dashboardPeriod(query, now),
    brand = new mongoose.Types.ObjectId(String(user.brand));
  const financial = permissions.has('billing:view');
  const filter = {
    brand,
    createdAt: {
      $gte: period.from,
      $lt: period.to
    }
  };
  const unit = period.to - period.from <= 31 * DAY ? 'day' : 'week';
  const truncate = field => ({
    $dateTrunc: {
      date: field,
      unit,
      timezone: 'UTC',
      ...(unit === 'week' ? {
        startOfWeek: 'Monday'
      } : {})
    }
  });
  const [current, previous, sources, products, states, created, closed, queues, parts, recent] = await Promise.all([cohort(brand, period.from, period.to, now, financial), cohort(brand, period.previousFrom, period.previousTo, now, financial), source(brand, {
    from: period.from,
    to: period.to
  }), WarrantyClaim.aggregate([{
    $match: filter
  }, {
    $group: {
      _id: '$categoryKey',
      value: {
        $sum: 1
      }
    }
  }, {
    $sort: {
      value: -1,
      _id: 1
    }
  }, {
    $limit: 8
  }]), WarrantyClaim.aggregate([{
    $match: filter
  }, {
    $group: {
      _id: '$address.state',
      value: {
        $sum: 1
      }
    }
  }, {
    $sort: {
      value: -1,
      _id: 1
    }
  }, {
    $limit: 10
  }]), WarrantyClaim.aggregate([{
    $match: filter
  }, {
    $group: {
      _id: truncate('$createdAt'),
      created: {
        $sum: 1
      }
    }
  }]), WarrantyClaim.aggregate([{
    $match: {
      brand,
      closedAt: {
        $gte: period.from,
        $lt: period.to
      }
    }
  }, {
    $group: {
      _id: truncate('$closedAt'),
      closed: {
        $sum: 1
      }
    }
  }]), permissions.has('tickets:view') ? myWork(user, now, {countsOnly:true}).then(r => r.counts) : null, permissions.has('parts:view') ? PartOrder.aggregate([{
    $match: {
      brand,
      warrantyClaim: {
        $ne: null
      }
    }
  }, {
    $group: {
      _id: null,
      awaitingApproval: countIf({
        $and: [{
          $in: ['brand', {
            $ifNull: ['$approval.required', []]
          }]
        }, {
          $eq: ['$approval.brand.status', 'Pending']
        }, {
          $ne: ['$status', 'Rejected']
        }]
      }),
      inTransit: countIf({
        $eq: ['$status', 'Dispatched']
      }),
      installed: countIf({
        $and: [{
          $eq: ['$status', 'Installed']
        }, {
          $gte: ['$installedAt', period.from]
        }, {
          $lt: ['$installedAt', period.to]
        }]
      })
    }
  }]).then(r => r[0] ? {
    awaitingApproval: r[0].awaitingApproval,
    inTransit: r[0].inTransit,
    installed: r[0].installed
  } : {
    awaitingApproval: 0,
    inTransit: 0,
    installed: 0
  }) : null, permissions.has('tickets:view') ? WarrantyClaim.find(filter).select('humanId brandTicketNo productName categoryKey status jobStage createdAt').sort({
    createdAt: -1,
    _id: -1
  }).limit(5).lean() : null]);
  const ticketKeys = ['total', 'pendingApproval', 'approved', 'assigned', 'inProgress', 'completed', 'slaBreached'];
  const targets = {
    total: queueLink(period),
    pendingApproval: queueLink(period, {
      bucket: 'pending_approval'
    }),
    approved: queueLink(period, {
      dashboardKpi: 'approved'
    }),
    assigned: queueLink(period, {
      dashboardKpi: 'assigned'
    }),
    inProgress: queueLink(period, {
      dashboardKpi: 'in_progress'
    }),
    completed: queueLink(period, {
      dashboardKpi: 'completed'
    }),
    slaBreached: queueLink(period, {
      dashboardKpi: 'sla_breached'
    }),
    escalated: `/brand-admin/escalations?status=open&from=${period.from.toISOString().slice(0, 10)}&to=${period.to.toISOString().slice(0, 10)}`,
    totalBilling: `/brand-admin/invoices?tab=invoices&dateField=issuedAt&from=${period.from.toISOString().slice(0, 10)}&to=${period.to.toISOString().slice(0, 10)}`,
    pendingPayment: `/brand-admin/invoices?tab=invoices&status=outstanding&dateField=issuedAt&from=${period.from.toISOString().slice(0, 10)}&to=${period.to.toISOString().slice(0, 10)}`,
    unbilled: `/brand-admin/invoices?from=${period.from.toISOString().slice(0, 10)}&to=${period.to.toISOString().slice(0, 10)}`
  };
  const kpis = Object.fromEntries(Object.entries(current.values).map(([key, value]) => [key, {
    value,
    previous: previous.values[key],
    deltaPct: previous.values[key] ? Math.round((value - previous.values[key]) / previous.values[key] * 10000) / 100 : null,
    link: ticketKeys.includes(key) && !permissions.has('tickets:view') ? null : key === 'escalated' && !permissions.has('escalations:view') ? null : targets[key]
  }]));
  const points = new Map();
  const beginning = new Date(period.from);
  beginning.setUTCHours(0, 0, 0, 0);
  if (unit === 'week') beginning.setUTCDate(beginning.getUTCDate() - (beginning.getUTCDay() + 6) % 7);
  for (let d = +beginning; d < period.to; d += (unit === 'week' ? 7 : 1) * DAY) points.set(new Date(d).toISOString(), {
    date: new Date(d).toISOString().slice(0, 10),
    created: 0,
    closed: 0
  });
  for (const row of [...created, ...closed]) {
    const key = row._id.toISOString();
    if (points.has(key)) Object.assign(points.get(key), row.created !== undefined ? {
      created: row.created
    } : {
      closed: row.closed
    });
  }
  const distribution = (rows, key) => rows.map(r => ({
    name: r._id || 'Unspecified',
    [key]: r._id || '',
    value: r.value,
    pct: current.values.total ? Math.round(r.value / current.values.total * 10000) / 100 : 0
  }));
  return {
    period: {
      ...period,
      unit
    },
    kpis,
    trend: [...points.values()],
    bySource: sources.rows.map(r => ({
      name: r.source,
      value: r.tickets
    })),
    byProduct: distribution(products, 'categoryKey'),
    byState: distribution(states, 'state'),
    slaSnapshot: current.slaSnapshot,
    ...(queues ? {
      queues
    } : {}),
    ...(parts ? {
      parts
    } : {}),
    ...(current.billing ? {
      billing: current.billing
    } : {}),
    ...(recent ? {
      recent: recent.map(r => ({
        ...r,
        id: String(r._id),
        _id: undefined
      }))
    } : {}),
    note: 'UTC date ranges, end exclusive. Ticket status/stage and SLA compare creation cohorts in their current state. Approved counts use approval-event dates; escalations use raised dates. Invoice cohorts use issue dates with current balances. Parts awaiting approval/in transit and My Work are current queues.'
  };
}
