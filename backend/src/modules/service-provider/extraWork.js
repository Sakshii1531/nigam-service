// Kept out of job.service.js so booking.service.js can use it without an
// import cycle.

/**
 * The extra appliances on a job, each with its services and spare parts (and
 * each part's approval status) — what the partner's job screen and the
 * customer's booking page both show.
 */
export function extraWorkView(job, mainKey) {
  const groups = new Map();
  const group = (key, name) => {
    if (!groups.has(key)) groups.set(key, { key, name: name || key, services: [], parts: [] });
    return groups.get(key);
  };
  for (const a of job.additionalServices || []) {
    if (a.checked === false || !a.categoryKey || a.categoryKey === mainKey) continue;
    group(a.categoryKey, a.categoryName).services.push({
      id: String(a._id),
      name: a.name,
      quantity: a.quantity || 1,
      amount: a.finalAmount ?? a.price ?? 0,
    });
  }
  for (const p of job.extraParts || []) {
    group(p.categoryKey, p.categoryName).parts.push({
      id: String(p._id),
      name: p.name,
      quantity: p.quantity || 1,
      unitPrice: p.unitPrice,
      gstAmount: p.gstAmount,
      amount: p.totalAmount,
      status: p.status,
      requestedAt: p.requestedAt,
      respondedAt: p.respondedAt,
    });
  }
  const appliances = [...groups.values()];
  return {
    // The booked appliance's category: add-ons in any other one belong here.
    mainKey: mainKey || null,
    appliances,
    pendingApprovals: appliances.flatMap((g) => g.parts.filter((p) => p.status === 'Pending').map((p) => ({ ...p, appliance: g.name }))),
  };
}
