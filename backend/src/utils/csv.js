// Quote every cell and neutralize spreadsheet formulas, including whitespace
// before the formula marker. Use this for data controlled by customers/staff.
export function csv(rows) {
  const cell = value => {
    let text = String(value ?? '');
    if (/^\s*[=+@-]|^[\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
}
