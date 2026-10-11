import mongoose from 'mongoose';
import { WarrantyClaim } from '../partner-warranty/warrantyClaim.model.js';
import { BillingLine } from './billingLine.model.js';
import { SLA_STAGES } from '../partner-warranty/claimSla.js';
import { City } from '../super-admin/city.model.js';
import { Category } from '../catalog/category.model.js';
import { ProductType } from '../catalog/productType.model.js';
import { Brand } from '../super-admin/brand.model.js';
import { dateRange } from './billing.service.js';
import { SERVICE_TYPES, TICKET_SOURCES } from '../partner-warranty/ticketConstants.js';
import { CLAIM_STATUSES } from '../partner-warranty/claimStatus.js';
import { ApiError } from '../../middleware/errorHandler.js';
export const MAX_REPORT_ROWS = 100000;
const HOUR = 3600000;
const DAY = 24 * HOUR;
// Null/missing lookup variables disable MongoDB equality index bounds.
const MISSING_ID = new mongoose.Types.ObjectId('000000000000000000000000');
const cents = expression => ({
  $toLong: {
    $round: [{
      $multiply: [{
        $ifNull: [expression, 0]
      }, 100]
    }, 0]
  }
});
const percent = (numerator, denominator) => ({
  $cond: [{
    $gt: [denominator, 0]
  }, {
    $round: [{
      $multiply: [{
        $divide: [numerator, denominator]
      }, 100]
    }, 2]
  }, null]
});
const nonempty = expression => ({
  $and: [{
    $ne: [expression, null]
  }, {
    $ne: [expression, '']
  }]
});
const completedAt = {
  $ifNull: ['$sla.met.resolution', {
    $let: {
      vars: {
        event: {
          $arrayElemAt: [{
            $filter: {
              input: '$timeline',
              as: 'e',
              cond: {
                $or: [{
                  $and: [{
                    $eq: ['$$e.action', 'JOB_STAGE_CHANGED']
                  }, {
                    $eq: ['$$e.meta.stage', 'COMPLETED']
                  }]
                }, {
                  $eq: ['$$e.toStatus', 'Service Completed']
                }]
              }
            }
          }, -1]
        }
      },
      in: '$$event.at'
    }
  }]
};
const ticketDone = {
  $in: ['$status', ['Service Completed', 'Closed']]
};
const columns = entries => entries.map(([key, label, type = 'number']) => ({
  key,
  label,
  type
}));
function result(report, cols, rows, extra = {}) {
  return {
    report,
    columns: columns(cols),
    rows,
    ...extra
  };
}
async function aggregate(model, pipeline) {
  const rows = await model.aggregate([...pipeline, {
    $limit: MAX_REPORT_ROWS + 1
  }]).allowDiskUse(true);
  if (rows.length > MAX_REPORT_ROWS) throw new ApiError(413, 'Report exceeds 100,000 rows. Narrow the date range or filters.');
  return rows;
}
/** A single source of tenant and dimensional filters. Dates are UTC, end exclusive. */
export function buildFilter(brandId, query = {}, kind = 'ticket') {
  const filter = {
    brand: new mongoose.Types.ObjectId(String(brandId))
  };
  const range = dateRange(query.from, query.to);
  if (Object.keys(range).length) filter[kind === 'ticket' ? 'createdAt' : 'completedAt'] = range;
  for (const key of ['state', 'city']) if (query[key]) filter[kind === 'ticket' ? `address.${key}` : key] = query[key];
  for (const key of ['categoryKey', 'serviceType']) if (query[key]) filter[key] = query[key];
  if (query.status) filter.status = query.status;else if (kind === 'line') filter.status = {
    $ne: 'void'
  };
  if (kind === 'ticket') {
    if (query.productType) filter.productType = new mongoose.Types.ObjectId(String(query.productType));
    if (query.source) filter.source = query.source;
  }
  return filter;
}
export function linePipeline(brandId, query = {}) {
  const pipeline = [{
    $match: buildFilter(brandId, query, 'line')
  }];
  if (query.productType || query.source) {
    pipeline.push({
      $lookup: {
        from: 'warrantyclaims',
        let: {
          ticket: '$ticket',
          brand: '$brand'
        },
        pipeline: [{
          $match: {
            $expr: {
              $and: [{
                $eq: ['$_id', '$$ticket']
              }, {
                $eq: ['$brand', '$$brand']
              }]
            },
            ...(query.productType ? {
              productType: new mongoose.Types.ObjectId(String(query.productType))
            } : {}),
            ...(query.source ? {
              source: query.source
            } : {})
          }
        }, {
          $project: {
            _id: 1
          }
        }],
        as: 'filteredTicket'
      }
    }, {
      $match: {
        'filteredTicket.0': {
          $exists: true
        }
      }
    });
  }
  return pipeline;
}
const moneySums = {
  subtotal: {
    $sum: cents('$subtotal')
  },
  gst: {
    $sum: cents('$gstAmount')
  },
  total: {
    $sum: cents('$total')
  }
};
const moneyProjection = {
  subtotal: {
    $divide: ['$subtotal', 100]
  },
  gst: {
    $divide: ['$gst', 100]
  },
  total: {
    $divide: ['$total', 100]
  }
};
export async function stateCityBilling(brandId, query) {
  // Separate cursors avoid MongoDB's 16 MB facet-document limit before the
  // explicit 100k row guard can return an actionable response.
  const facets = {
    rows: [{
      $group: {
        _id: {
          state: '$state',
          city: '$city',
          rate: '$rate.amount'
        },
        calls: {
          $sum: 1
        },
        ...moneySums
      }
    }, {
      $sort: {
        '_id.rate': 1
      }
    }, {
      $group: {
        _id: {
          state: '$_id.state',
          city: '$_id.city'
        },
        calls: {
          $sum: '$calls'
        },
        rates: {
          $push: {
            amount: '$_id.rate',
            calls: '$calls'
          }
        },
        subtotal: {
          $sum: '$subtotal'
        },
        gst: {
          $sum: '$gst'
        },
        total: {
          $sum: '$total'
        }
      }
    }, {
      $project: {
        _id: 0,
        state: {
          $ifNull: ['$_id.state', 'Unknown']
        },
        city: {
          $ifNull: ['$_id.city', 'Unknown']
        },
        calls: 1,
        rates: 1,
        ...moneyProjection
      }
    }, {
      $sort: {
        state: 1,
        city: 1
      }
    }, {
      $limit: MAX_REPORT_ROWS + 1
    }],
    states: [{
      $group: {
        _id: '$state',
        calls: {
          $sum: 1
        },
        ...moneySums
      }
    }, {
      $project: {
        _id: 0,
        state: {
          $ifNull: ['$_id', 'Unknown']
        },
        calls: 1,
        ...moneyProjection
      }
    }, {
      $sort: {
        state: 1
      }
    }],
    totals: [{
      $group: {
        _id: null,
        calls: {
          $sum: 1
        },
        ...moneySums
      }
    }, {
      $project: {
        _id: 0,
        calls: 1,
        ...moneyProjection
      }
    }]
  };
  const values = await Promise.all(Object.entries(facets).map(async ([key, pipeline]) => [key, await aggregate(BillingLine, [...linePipeline(brandId, query), ...pipeline])]));
  const data = Object.fromEntries(values);
  return result('state-city-billing', [['state', 'State', 'text'], ['city', 'City', 'text'], ['calls', 'Calls'], ['rates', 'Applicable rates', 'rates'], ['subtotal', 'Subtotal', 'money'], ['gst', 'GST', 'money'], ['total', 'Total', 'money']], data.rows, {
    states: data.states,
    totals: data.totals[0] || {
      calls: 0,
      subtotal: 0,
      gst: 0,
      total: 0
    }
  });
}
export async function source(brandId, query) {
  const rows = await aggregate(WarrantyClaim, [{
    $match: buildFilter(brandId, query)
  }, {
    $set: {
      decision: {
        $arrayElemAt: [{
          $filter: {
            input: '$timeline',
            as: 'e',
            cond: {
              $in: ['$$e.action', ['CLAIM_APPROVED', 'CLAIM_REJECTED']]
            }
          }
        }, 0]
      }
    }
  }, {
    $group: {
      _id: '$source',
      tickets: {
        $sum: 1
      },
      approved: {
        $sum: {
          $cond: [{
            $eq: ['$decision.action', 'CLAIM_APPROVED']
          }, 1, 0]
        }
      },
      rejected: {
        $sum: {
          $cond: [{
            $eq: ['$decision.action', 'CLAIM_REJECTED']
          }, 1, 0]
        }
      },
      avgDecisionHours: {
        $avg: {
          $cond: [{
            $gte: ['$decision.at', '$createdAt']
          }, {
            $divide: [{
              $subtract: ['$decision.at', '$createdAt']
            }, HOUR]
          }, null]
        }
      }
    }
  }, {
    $project: {
      _id: 0,
      source: '$_id',
      tickets: 1,
      approved: 1,
      rejected: 1,
      approvedPercent: percent('$approved', '$tickets'),
      rejectedPercent: percent('$rejected', '$tickets'),
      avgDecisionHours: 1
    }
  }, {
    $sort: {
      source: 1
    }
  }]);
  return result('source', [['source', 'Source', 'text'], ['tickets', 'Tickets'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['approvedPercent', 'Approved %', 'percent'], ['rejectedPercent', 'Rejected %', 'percent'], ['avgDecisionHours', 'Average decision (hours)', 'hours']], rows);
}
const jobLookup = {
  $lookup: {
    from: 'servicerequests',
    let: {
      id: { $ifNull: ['$serviceRequest', MISSING_ID] },
      brand: '$brand'
    },
    pipeline: [{
      $match: {
        $expr: {
          $and: [{
            $eq: ['$_id', '$$id']
          }, {
            $eq: ['$brand', '$$brand']
          }]
        }
      }
    }, {
      $project: {
        appliance: 1,
        serviceProvider: 1,
        createdAt: 1
      }
    }],
    as: 'job'
  }
};
export async function product(brandId, query) {
  const rows = await aggregate(WarrantyClaim, [{
    $match: buildFilter(brandId, query)
  }, jobLookup, {
    $set: {
      job: {
        $arrayElemAt: ['$job', 0]
      }
    }
  }, {
    $lookup: {
      from: 'warrantyclaims',
      let: {
        serial: {
          $ifNull: ['$serialNumber', '']
        },
        brand: '$brand',
        category: '$categoryKey',
        at: '$createdAt'
      },
      pipeline: [{
        $match: {
          $expr: {
            $and: [nonempty('$$serial'), {
              $eq: ['$brand', '$$brand']
            }, {
              $eq: ['$categoryKey', '$$category']
            }, {
              $eq: ['$serialNumber', '$$serial']
            }, {
              $lt: ['$createdAt', '$$at']
            }, {
              $gte: ['$createdAt', {
                $subtract: ['$$at', 90 * DAY]
              }]
            }]
          }
        }
      }, {
        $limit: 1
      }, {
        $project: {
          _id: 1
        }
      }],
      as: 'serialRepeat'
    }
  }, {
    $lookup: {
      from: 'servicerequests',
      let: {
        appliance: {
          // A typed sentinel keeps equality indexable even without an appliance.
          // Comparing a lookup variable to null otherwise scans every job.
          $ifNull: ['$job.appliance', MISSING_ID]
        },
        brand: '$brand',
        at: '$createdAt'
      },
      pipeline: [{
        $match: {
          $expr: {
            $and: [{
              $ne: ['$$appliance', null]
            }, {
              $eq: ['$appliance', '$$appliance']
            }, {
              $eq: ['$brand', '$$brand']
            }]
          }
        }
      }, {
        $lookup: {
          from: 'warrantyclaims',
          let: {
            sr: '$_id'
          },
          pipeline: [{
            $match: {
              $expr: {
                $and: [{
                  $eq: ['$serviceRequest', '$$sr']
                }, {
                  $eq: ['$brand', '$$brand']
                }, {
                  $lt: ['$createdAt', '$$at']
                }, {
                  $gte: ['$createdAt', {
                    $subtract: ['$$at', 90 * DAY]
                  }]
                }]
              }
            }
          }, {
            $limit: 1
          }, {
            $project: {
              _id: 1
            }
          }],
          as: 'prior'
        }
      }, {
        $match: {
          'prior.0': {
            $exists: true
          }
        }
      }, {
        $limit: 1
      }, {
        $project: {
          _id: 1
        }
      }],
      as: 'applianceRepeat'
    }
  }, {
    $group: {
      _id: {
        category: '$categoryKey',
        productType: '$productType'
      },
      tickets: {
        $sum: 1
      },
      inWarranty: {
        $sum: {
          $cond: [{
            $eq: ['$warranty.status', 'In Warranty']
          }, 1, 0]
        }
      },
      verification: {
        $sum: {
          $cond: [{
            $eq: ['$warranty.status', 'Verification Required']
          }, 1, 0]
        }
      },
      outOfWarranty: {
        $sum: {
          $cond: [{
            $eq: ['$warranty.status', 'Out of Warranty']
          }, 1, 0]
        }
      },
      repeatComplaints: {
        $sum: {
          $cond: [{
            $or: [{
              $gt: [{
                $size: '$serialRepeat'
              }, 0]
            }, {
              $gt: [{
                $size: '$applianceRepeat'
              }, 0]
            }]
          }, 1, 0]
        }
      }
    }
  }, {
    $lookup: {
      from: 'producttypes',
      localField: '_id.productType',
      foreignField: '_id',
      as: 'type'
    }
  }, {
    $project: {
      _id: 0,
      category: '$_id.category',
      productType: {
        $ifNull: [{
          $arrayElemAt: ['$type.name', 0]
        }, 'Unspecified']
      },
      tickets: 1,
      inWarranty: 1,
      verification: 1,
      outOfWarranty: 1,
      repeatComplaints: 1,
      repeatPercent: percent('$repeatComplaints', '$tickets')
    }
  }, {
    $sort: {
      category: 1,
      productType: 1
    }
  }]);
  return result('product', [['category', 'Category', 'text'], ['productType', 'Product type', 'text'], ['tickets', 'Tickets'], ['inWarranty', 'In warranty'], ['verification', 'Verification required'], ['outOfWarranty', 'Out of warranty'], ['repeatComplaints', 'Repeat complaints'], ['repeatPercent', 'Repeat %', 'percent']], rows);
}
export async function sla(brandId, query, {
  now = new Date()
} = {}) {
  const stages = SLA_STAGES.map(s => ({
    key: s.key,
    label: s.label,
    due: `$sla.${s.dueField}`,
    met: `$sla.met.${s.key}`,
    hours: `$sla.hours.${s.hoursKey}`
  }));
  const rows = await aggregate(WarrantyClaim, [{
    $match: buildFilter(brandId, query)
  }, {
    $project: {
      stages,
      pausedAt: '$sla.pausedAt',
      breaches: {
        $ifNull: ['$sla.breaches', []]
      },
      status: 1
    }
  }, {
    $unwind: '$stages'
  }, {
    $match: {
      'stages.due': {
        $type: 'date'
      }
    }
  }, {
    $match: {
      $expr: {
        $or: [{
          $ne: [{
            $ifNull: ['$stages.met', null]
          }, null]
        }, {
          $not: [{
            $in: ['$status', ['Closed', 'Cancelled', 'Rejected']]
          }]
        }]
      }
    }
  }, {
    $set: {
      late: {
        $or: [{
          $in: ['$stages.key', '$breaches']
        }, {
          $gt: ['$stages.met', '$stages.due']
        }, {
          $and: [{
            $eq: [{
              $ifNull: ['$stages.met', null]
            }, null]
          }, {
            $eq: [{
              $ifNull: ['$pausedAt', null]
            }, null]
          }, {
            $lt: ['$stages.due', now]
          }]
        }]
      }
    }
  }, {
    $set: {
      warning: {
        $and: [{
          $not: ['$late']
        }, {
          $eq: [{
            $ifNull: ['$stages.met', null]
          }, null]
        }, {
          $eq: [{
            $ifNull: ['$pausedAt', null]
          }, null]
        }, {
          $gte: [now, {
            $subtract: ['$stages.due', {
              $multiply: ['$stages.hours', 0.2 * HOUR]
            }]
          }]
        }]
      },
      overrun: {
        $cond: ['$late', {
          $max: [0, {
            $divide: [{
              $subtract: [{
                $ifNull: ['$stages.met', {
                  $ifNull: ['$pausedAt', now]
                }]
              }, '$stages.due']
            }, HOUR]
          }]
        }, null]
      }
    }
  }, {
    $group: {
      _id: '$stages.key',
      stage: {
        $first: '$stages.label'
      },
      measured: {
        $sum: 1
      },
      met: {
        $sum: {
          $cond: [{
            $and: [{
              $not: ['$late']
            }, {
              $ne: [{
                $ifNull: ['$stages.met', null]
              }, null]
            }]
          }, 1, 0]
        }
      },
      warning: {
        $sum: {
          $cond: ['$warning', 1, 0]
        }
      },
      breached: {
        $sum: {
          $cond: ['$late', 1, 0]
        }
      },
      avgOverrunHours: {
        $avg: '$overrun'
      }
    }
  }, {
    $project: {
      _id: 0,
      stage: 1,
      measured: 1,
      met: 1,
      warning: 1,
      breached: 1,
      pending: {
        $subtract: ['$measured', {
          $add: ['$met', '$warning', '$breached']
        }]
      },
      breachPercent: percent('$breached', '$measured'),
      avgOverrunHours: 1
    }
  }, {
    $sort: {
      stage: 1
    }
  }]);
  return result('sla', [['stage', 'Stage', 'text'], ['measured', 'Measured'], ['met', 'Met'], ['warning', 'Warning'], ['breached', 'Breached'], ['pending', 'Pending / paused'], ['breachPercent', 'Breach %', 'percent'], ['avgOverrunHours', 'Average overrun (hours)', 'hours']], rows);
}
let percentileSupport;
async function supportsPercentiles() {
  if (percentileSupport === undefined) percentileSupport = Number((await mongoose.connection.db.admin().command({
    buildInfo: 1
  })).version.split('.')[0]) >= 7;
  return percentileSupport;
}
export async function resolutionTime(brandId, query, {
  percentiles
} = {}) {
  const start = [{
    $match: buildFilter(brandId, query)
  }, {
    $set: {
      completed: completedAt
    }
  }, {
    $match: {
      $expr: {
        $and: [ticketDone, {
          $gte: ['$completed', '$createdAt']
        }]
      }
    }
  }, {
    $set: {
      hours: {
        $divide: [{
          $subtract: ['$completed', '$createdAt']
        }, HOUR]
      }
    }
  }];
  const supported = percentiles ?? (await supportsPercentiles());
  let rows;
  if (supported) rows = await aggregate(WarrantyClaim, [...start, {
    $group: {
      _id: {
        category: '$categoryKey',
        city: '$address.city'
      },
      completed: {
        $sum: 1
      },
      avgHours: {
        $avg: '$hours'
      },
      quantiles: {
        $percentile: {
          input: '$hours',
          p: [0.5, 0.9],
          method: 'approximate'
        }
      }
    }
  }, {
    $project: {
      _id: 0,
      category: '$_id.category',
      city: '$_id.city',
      completed: 1,
      avgHours: 1,
      medianHours: {
        $arrayElemAt: ['$quantiles', 0]
      },
      p90Hours: {
        $arrayElemAt: ['$quantiles', 1]
      }
    }
  }, {
    $sort: {
      category: 1,
      city: 1
    }
  }]);else {
    const bounded = await aggregate(WarrantyClaim, [...start, {
      $project: {
        _id: 0,
        category: '$categoryKey',
        city: '$address.city',
        hours: 1
      }
    }]);
    const groups = new Map();
    for (const row of bounded) {
      const key = JSON.stringify([row.category, row.city]);
      if (!groups.has(key)) groups.set(key, {
        category: row.category,
        city: row.city,
        values: []
      });
      groups.get(key).values.push(row.hours);
    }
    const percentile = (a, p) => {
      const n = (a.length - 1) * p,
        lo = Math.floor(n),
        hi = Math.ceil(n);
      return a[lo] + (a[hi] - a[lo]) * (n - lo);
    };
    rows = [...groups.values()].map(({
      values,
      ...row
    }) => {
      values.sort((a, b) => a - b);
      return {
        ...row,
        completed: values.length,
        avgHours: values.reduce((a, b) => a + b, 0) / values.length,
        medianHours: percentile(values, 0.5),
        p90Hours: percentile(values, 0.9)
      };
    }).sort((a, b) => a.category.localeCompare(b.category) || a.city.localeCompare(b.city));
  }
  return result('resolution-time', [['category', 'Category', 'text'], ['city', 'City', 'text'], ['completed', 'Completed'], ['avgHours', 'Average hours', 'hours'], ['medianHours', 'Median hours', 'hours'], ['p90Hours', 'P90 hours', 'hours']], rows, {
    percentileMethod: supported ? 'MongoDB approximate percentile' : 'Exact linear interpolation; bounded to 100,000 completed tickets'
  });
}
export async function warranty(brandId, query) {
  const [data] = await aggregate(WarrantyClaim, [{
    $match: buildFilter(brandId, query)
  }, {
    $facet: {
      status: [{
        $group: {
          _id: '$warranty.status',
          tickets: {
            $sum: 1
          }
        }
      }],
      coverage: [{
        $group: {
          _id: '$coverageDecision',
          tickets: {
            $sum: 1
          }
        }
      }],
      rejection: [{
        $match: {
          rejectionCode: {
            $ne: null
          }
        }
      }, {
        $group: {
          _id: '$rejectionCode',
          tickets: {
            $sum: 1
          }
        }
      }]
    }
  }]);
  const rows = Object.entries(data).flatMap(([dimension, values]) => values.map(r => ({
    dimension,
    value: r._id || 'Undecided',
    tickets: r.tickets
  }))).sort((a, b) => a.dimension.localeCompare(b.dimension) || a.value.localeCompare(b.value));
  return result('warranty', [['dimension', 'Dimension', 'text'], ['value', 'Value', 'text'], ['tickets', 'Tickets']], rows);
}
export async function billing(brandId, query, {
  now = new Date()
} = {}) {
  // Allocate receipts by consecutive frozen line weights. Difference-of-rounded-prefix
  // amounts preserves every paise, including when only one city/category is selected.
  const prefix = count => ({
    $sum: {
      $map: {
        input: {
          $slice: [{
            $ifNull: ['$invoice.lineSnapshots', []]
          }, count]
        },
        as: 'l',
        in: cents('$$l.total')
      }
    }
  });
  const allocation = weight => ({
    $round: [{
      $multiply: [cents('$invoice.paidAmount'), {
        $divide: [weight, cents('$invoice.total')]
      }]
    }, 0]
  });
  const rows = await aggregate(BillingLine, [...linePipeline(brandId, query), {
    $lookup: {
      from: 'brandinvoices',
      let: {
        id: { $ifNull: ['$invoice', MISSING_ID] },
        brand: '$brand'
      },
      pipeline: [{
        $match: {
          $expr: {
            $and: [{
              $eq: ['$_id', '$$id']
            }, {
              $eq: ['$brand', '$$brand']
            }]
          },
          status: {
            $nin: ['draft', 'cancelled']
          }
        }
      }, {
        $project: {
          lines: 1,
          'lineSnapshots.total': 1,
          total: 1,
          paidAmount: 1,
          dueDate: 1
        }
      }],
      as: 'invoice'
    }
  }, {
    $set: {
      invoice: {
        $arrayElemAt: ['$invoice', 0]
      },
      lineTotal: cents('$total')
    }
  }, {
    $set: {
      issued: {
        $ne: [{
          $ifNull: ['$invoice._id', null]
        }, null]
      },
      position: {
        $indexOfArray: [{
          $ifNull: ['$invoice.lines', []]
        }, '$_id']
      },
      daysLate: {
        $divide: [{
          $subtract: [now, '$invoice.dueDate']
        }, DAY]
      }
    }
  }, {
    $set: {
      allocatedPaid: {
        $cond: [{
          $and: ['$issued', {
            $gt: ['$invoice.total', 0]
          }, {
            $gte: ['$position', 0]
          }]
        }, {
          $subtract: [allocation(prefix({
            $add: ['$position', 1]
          })), allocation(prefix('$position'))]
        }, 0]
      }
    }
  }, {
    $set: {
      pending: {
        $cond: ['$issued', {
          $subtract: ['$lineTotal', '$allocatedPaid']
        }, 0]
      }
    }
  }, {
    $group: {
      _id: {
        $dateToString: {
          format: '%Y-%m',
          date: '$completedAt',
          timezone: 'UTC'
        }
      },
      calls: {
        $sum: 1
      },
      invoiced: {
        $sum: {
          $cond: ['$issued', '$lineTotal', 0]
        }
      },
      paid: {
        $sum: '$allocatedPaid'
      },
      pending: {
        $sum: '$pending'
      },
      overdue: {
        $sum: {
          $cond: [{
            $gt: ['$daysLate', 0]
          }, '$pending', 0]
        }
      },
      current: {
        $sum: {
          $cond: [{
            $lte: ['$daysLate', 0]
          }, '$pending', 0]
        }
      },
      days1to30: {
        $sum: {
          $cond: [{
            $and: [{
              $gt: ['$daysLate', 0]
            }, {
              $lte: ['$daysLate', 30]
            }]
          }, '$pending', 0]
        }
      },
      days31to60: {
        $sum: {
          $cond: [{
            $and: [{
              $gt: ['$daysLate', 30]
            }, {
              $lte: ['$daysLate', 60]
            }]
          }, '$pending', 0]
        }
      },
      days61to90: {
        $sum: {
          $cond: [{
            $and: [{
              $gt: ['$daysLate', 60]
            }, {
              $lte: ['$daysLate', 90]
            }]
          }, '$pending', 0]
        }
      },
      days90plus: {
        $sum: {
          $cond: [{
            $gt: ['$daysLate', 90]
          }, '$pending', 0]
        }
      }
    }
  }, {
    $project: {
      _id: 0,
      month: '$_id',
      calls: 1,
      ...Object.fromEntries(['invoiced', 'paid', 'pending', 'overdue', 'current', 'days1to30', 'days31to60', 'days61to90', 'days90plus'].map(k => [k, {
        $divide: [`$${k}`, 100]
      }]))
    }
  }, {
    $sort: {
      month: 1
    }
  }]);
  return result('billing', [['month', 'Completion month', 'text'], ['calls', 'Calls'], ...['invoiced', 'paid', 'pending', 'overdue', 'current', 'days1to30', 'days31to60', 'days61to90', 'days90plus'].map(k => [k, {
    invoiced: 'Invoiced',
    paid: 'Paid',
    pending: 'Pending',
    overdue: 'Overdue',
    current: 'Not due',
    days1to30: '1–30 days overdue',
    days31to60: '31–60 days overdue',
    days61to90: '61–90 days overdue',
    days90plus: '90+ days overdue'
  }[k], 'money'])], rows, {
    note: 'Completion-month cohorts. Issued value and receipts allocated to frozen invoice lines; excludes drafts, cancelled invoices and void lines by default.'
  });
}
export async function partnerPerformance(brandId, query, {
  now = new Date()
} = {}) {
  const rows = await aggregate(WarrantyClaim, [{
    $match: buildFilter(brandId, query)
  }, jobLookup, {
    $unwind: '$job'
  }, {
    $match: {
      'job.serviceProvider': {
        $ne: null
      }
    }
  }, {
    $lookup: {
      from: 'reviews',
      let: {
        sr: '$job._id'
      },
      pipeline: [{
        $match: {
          $expr: {
            $eq: ['$serviceRequest', '$$sr']
          }
        }
      }, {
        $group: {
          _id: null,
          rating: {
            $avg: {
              $ifNull: ['$serviceProviderRating', '$rating']
            }
          }
        }
      }],
      as: 'review'
    }
  }, {
    $set: {
      completed: completedAt,
      repeatVisit: {
        $gt: [{
          $size: {
            $filter: {
              input: '$timeline',
              as: 'e',
              cond: {
                $and: [{
                  $eq: ['$$e.action', 'JOB_STAGE_CHANGED']
                }, {
                  $eq: ['$$e.meta.stage', 'REACHED']
                }]
              }
            }
          }
        }, 1]
      },
      visitMeasured: {
        $ne: [{
          $ifNull: ['$sla.visitDueAt', null]
        }, null]
      },
      visitBreached: {
        $or: [{
          $in: ['visit', {
            $ifNull: ['$sla.breaches', []]
          }]
        }, {
          $gt: ['$sla.met.visit', '$sla.visitDueAt']
        }, {
          $and: [{
            $ne: [{
              $ifNull: ['$sla.visitDueAt', null]
            }, null]
          }, {
            $eq: [{
              $ifNull: ['$sla.met.visit', null]
            }, null]
          }, {
            $eq: [{
              $ifNull: ['$sla.pausedAt', null]
            }, null]
          }, {
            $not: [{
              $in: ['$status', ['Closed', 'Cancelled', 'Rejected']]
            }]
          }, {
            $lt: ['$sla.visitDueAt', now]
          }]
        }]
      }
    }
  }, {
    $group: {
      _id: '$job.serviceProvider',
      jobs: {
        $sum: 1
      },
      completed: {
        $sum: {
          $cond: [ticketDone, 1, 0]
        }
      },
      avgTatHours: {
        $avg: {
          $cond: [{
            $and: [ticketDone, {
              $gte: ['$completed', '$job.createdAt']
            }]
          }, {
            $divide: [{
              $subtract: ['$completed', '$job.createdAt']
            }, HOUR]
          }, null]
        }
      },
      visitMeasured: {
        $sum: {
          $cond: ['$visitMeasured', 1, 0]
        }
      },
      visitBreached: {
        $sum: {
          $cond: ['$visitBreached', 1, 0]
        }
      },
      averageRating: {
        $avg: {
          $ifNull: [{
            $arrayElemAt: ['$review.rating', 0]
          }, '$closure.rating']
        }
      },
      repeatVisits: {
        $sum: {
          $cond: ['$repeatVisit', 1, 0]
        }
      }
    }
  }, {
    $lookup: {
      from: 'serviceproviders',
      localField: '_id',
      foreignField: '_id',
      as: 'partner'
    }
  }, {
    $project: {
      _id: 0,
      name: {
        $ifNull: [{
          $arrayElemAt: ['$partner.name', 0]
        }, 'Former partner']
      },
      jobs: 1,
      completed: 1,
      completionPercent: percent('$completed', '$jobs'),
      avgTatHours: 1,
      firstVisitBreachPercent: percent('$visitBreached', '$visitMeasured'),
      averageRating: 1,
      repeatVisits: 1,
      repeatVisitPercent: percent('$repeatVisits', '$jobs')
    }
  }, {
    $sort: {
      jobs: -1,
      name: 1
    }
  }]);
  return result('partner-performance', [['name', 'Partner', 'text'], ['jobs', 'Jobs'], ['completed', 'Completed'], ['completionPercent', 'Completed %', 'percent'], ['avgTatHours', 'Average TAT (hours)', 'hours'], ['firstVisitBreachPercent', 'First visit breach %', 'percent'], ['averageRating', 'Average rating'], ['repeatVisits', 'Repeat visits'], ['repeatVisitPercent', 'Repeat visit %', 'percent']], rows);
}
export const REPORTS = Object.freeze({
  'state-city-billing': stateCityBilling,
  source,
  product,
  sla,
  'resolution-time': resolutionTime,
  warranty,
  billing,
  'partner-performance': partnerPerformance
});
export async function getReport(brandId, report, query = {}, options = {}) {
  if (!Object.hasOwn(REPORTS, report)) throw new ApiError(404, 'Unknown report');
  const fn = REPORTS[report];
  if (!fn) throw new ApiError(404, 'Unknown report');
  return fn(brandId, query, options);
}
export async function reportOptions(brandId) {
  const brand = await Brand.findById(brandId).select('coverage ticketPrefix').lean();
  return {
    ticketPrefix: brand?.ticketPrefix,
    reports: Object.keys(REPORTS),
    cities: await City.find({
      status: 'Active'
    }).select('name state').sort({
      state: 1,
      name: 1
    }).lean(),
    categories: await Category.find({
      _id: {
        $in: brand?.coverage || []
      }
    }).select('name key').lean(),
    productTypes: await ProductType.find({
      category: {
        $in: brand?.coverage || []
      },
      isActive: true
    }).select('name category').lean(),
    serviceTypes: [...SERVICE_TYPES, 'visit_only'],
    sources: TICKET_SOURCES,
    ticketStatuses: CLAIM_STATUSES,
    lineStatuses: ['pending_closure', 'billable', 'invoiced', 'void']
  };
}
