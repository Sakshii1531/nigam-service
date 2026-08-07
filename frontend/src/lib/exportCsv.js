/**
 * Writes rows to a CSV the browser downloads.
 *
 * Several consoles used to show "exported as CSV!" / "Download started!" and
 * produce no file at all, so this exists to give those buttons something real
 * to do rather than removing them.
 *
 * @param filename base name; ".csv" and today's date are appended
 * @param headers  column labels
 * @param rows     array of arrays, in the same order as `headers`
 * @returns true when a file was written, false when there was nothing to write
 */
export function exportCsv(filename, headers, rows) {
  if (!rows?.length) return false;

  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}
