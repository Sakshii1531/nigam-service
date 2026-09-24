import { Search, Plus, BadgeIndianRupee, Copy, Pencil } from 'lucide-react';
import { formatINR } from '../../../lib/catalogueAdminApi';
import { toolbarControlClass, StatusPill, DemoBadge, Toggle, PrimaryButton } from './ui';

// Every offering under the selected category with its live commercial
// picture — customer price, GST, what the customer pays, the partner's fixed
// payout and NCC's margin — so price/payout decisions happen in one place.

function combination(row) {
  if (row.bookingType === 'PRODUCT_LINKED') {
    const size = row.variant?.label || (row.productType?.hasVariants ? 'Any size' : null);
    return [row.productType?.name, size, row.service?.name].filter(Boolean).join(' · ');
  }
  return [row.service?.name, row.variant?.label].filter(Boolean).join(' · ');
}

function MarginCell({ value }) {
  if (value == null) return <span className="text-slate-300">—</span>;
  const tone = value < 0 ? 'text-red-600' : value < 20 ? 'text-amber-600' : 'text-emerald-700';
  return <span className={`font-bold ${tone}`}>{value}%</span>;
}

function RowActions({ row, onOpen, onChangeRate, onDuplicate }) {
  return (
    <div className="flex justify-end gap-1">
      <button type="button" onClick={() => onChangeRate(row)} title="Change price / payout" aria-label={`Change price for ${row.code}`} className="p-1.5 text-slate-500 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg cursor-pointer">
        <BadgeIndianRupee size={15} />
      </button>
      <button type="button" onClick={() => onDuplicate(row)} title="Duplicate" aria-label={`Duplicate ${row.code}`} className="p-1.5 text-slate-500 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg cursor-pointer">
        <Copy size={15} />
      </button>
      <button type="button" onClick={() => onOpen(row)} title="Edit" aria-label={`Edit ${row.code}`} className="p-1.5 text-slate-500 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg cursor-pointer">
        <Pencil size={15} />
      </button>
    </div>
  );
}

export default function OfferingTable({ rows, loading, filters, onFilters, focus, onClearFocus, onNew, onOpen, onChangeRate, onToggle, onDuplicate }) {
  const setFilter = (key) => (e) => onFilters({ ...filters, [key]: e.target.value });

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold text-slate-800 mr-auto">
          Service offerings <span className="text-slate-400 font-semibold">({rows.length})</span>
        </h2>
        <label className="relative">
          <span className="sr-only">Search offerings</span>
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={filters.q} onChange={setFilter('q')} placeholder="Search code or name" className={`${toolbarControlClass} pl-8 w-48`} />
        </label>
        <select aria-label="Booking type" value={filters.bookingType} onChange={setFilter('bookingType')} className={toolbarControlClass}>
          <option value="">All types</option>
          <option value="PRODUCT_LINKED">Product-linked</option>
          <option value="STANDALONE">Standalone</option>
        </select>
        <select aria-label="Status" value={filters.active} onChange={setFilter('active')} className={toolbarControlClass}>
          <option value="">Any status</option>
          <option value="true">Live</option>
          <option value="false">Off</option>
        </select>
        <select aria-label="Rate review" value={filters.needsRateReview} onChange={setFilter('needsRateReview')} className={toolbarControlClass}>
          <option value="">All rates</option>
          <option value="true">Demo rates only</option>
          <option value="false">Real rates only</option>
        </select>
        <PrimaryButton type="button" onClick={onNew}>
          <Plus size={14} /> New offering
        </PrimaryButton>
      </div>

      {focus && (
        <div className="px-4 py-2 bg-blue-50/60 border-b border-blue-100 text-xs text-slate-600 flex items-center gap-2">
          Showing offerings under <b>{focus.name}</b>
          <button type="button" onClick={onClearFocus} className="font-bold text-[#0D47A1] hover:underline cursor-pointer">Show all</button>
        </div>
      )}

      {loading ? (
        <p className="p-10 text-center text-sm text-slate-400">Loading offerings…</p>
      ) : rows.length === 0 ? (
        <p className="p-10 text-center text-sm text-slate-400">No offerings match. Customers can only book what is listed here.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                  <th className="p-3 pl-4">Offering</th>
                  <th className="p-3">Unit · Qty</th>
                  <th className="p-3 text-right">Customer</th>
                  <th className="p-3 text-right">GST</th>
                  <th className="p-3 text-right">Customer pays</th>
                  <th className="p-3 text-right">SP payout</th>
                  <th className="p-3 text-right">Margin</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className={`hover:bg-slate-50/60 ${row.isActive ? '' : 'bg-slate-50/40'}`}>
                    <td className="p-3 pl-4 max-w-[18rem]">
                      <button type="button" onClick={() => onOpen(row)} className="text-left cursor-pointer group">
                        <span className="block font-bold text-slate-800 group-hover:text-[#0D47A1] truncate">{row.name}</span>
                        <span className="block text-[11px] text-slate-500 truncate">{combination(row)}</span>
                        <span className="flex items-center gap-1.5 mt-0.5">
                          <code className="text-[10px] font-bold text-[#0D47A1]">{row.code}</code>
                          {row.needsRateReview && <DemoBadge />}
                          {row.express.enabled && <span className="text-[9px] font-black uppercase text-purple-700 bg-purple-50 px-1 rounded">Express</span>}
                        </span>
                      </button>
                    </td>
                    <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                      {row.unitLabel}
                      <span className="block text-[10px] text-slate-400">{row.minQty === row.maxQty ? `qty ${row.minQty}` : `qty ${row.minQty}–${row.maxQty}`}</span>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-800 whitespace-nowrap">
                      {formatINR(row.rate?.customerPrice)}
                      {row.nextRate && <span className="block text-[10px] font-semibold text-amber-700">→ {formatINR(row.nextRate.customerPrice)} soon</span>}
                    </td>
                    <td className="p-3 text-right text-xs text-slate-500">{row.gstPercent}%</td>
                    <td className="p-3 text-right text-slate-700 whitespace-nowrap">{formatINR(row.finalPrice)}</td>
                    <td className="p-3 text-right font-bold text-slate-800 whitespace-nowrap">{formatINR(row.rate?.spPayout)}</td>
                    <td className="p-3 text-right"><MarginCell value={row.marginPercent} /></td>
                    <td className="p-3">
                      <Toggle checked={row.isActive} onChange={() => onToggle(row)} label={<StatusPill active={row.isActive} />} />
                    </td>
                    <td className="p-3 pr-4"><RowActions row={row} onOpen={onOpen} onChangeRate={onChangeRate} onDuplicate={onDuplicate} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Narrow screens: cards */}
          <ul className="lg:hidden divide-y divide-slate-100">
            {rows.map((row) => (
              <li key={row.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => onOpen(row)} className="text-left min-w-0 cursor-pointer">
                    <span className="block font-bold text-slate-800 truncate">{row.name}</span>
                    <span className="block text-[11px] text-slate-500 truncate">{combination(row)}</span>
                    <code className="text-[10px] font-bold text-[#0D47A1]">{row.code}</code>
                  </button>
                  <Toggle checked={row.isActive} onChange={() => onToggle(row)} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span>Customer <b>{formatINR(row.rate?.customerPrice)}</b></span>
                  <span>Pays <b>{formatINR(row.finalPrice)}</b></span>
                  <span>SP <b>{formatINR(row.rate?.spPayout)}</b></span>
                  <span>Margin <MarginCell value={row.marginPercent} /></span>
                  {row.needsRateReview && <DemoBadge />}
                </div>
                <RowActions row={row} onOpen={onOpen} onChangeRate={onChangeRate} onDuplicate={onDuplicate} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
