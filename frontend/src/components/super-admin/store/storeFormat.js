// Plain helpers for the NCC Products / Inventory screens (Phases 20–21).

/** Drops blank rows / groups before saving. */
export const cleanRows = (rows) => rows.map((r) => ({ label: r.label.trim(), value: r.value.trim() })).filter((r) => r.label && r.value);
export const cleanGroups = (groups) =>
  groups.map((g) => ({ group: g.group.trim(), items: cleanRows(g.items) })).filter((g) => g.group && g.items.length);

export const rupees = (n) => (n == null || Number.isNaN(Number(n)) ? '—' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
