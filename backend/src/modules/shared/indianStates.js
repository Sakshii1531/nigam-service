// Canonical labels for historical addresses that contain postal abbreviations.
// Apply the same aliases when grouping and drilling into the ticket queue.
const states = [
  ['Andhra Pradesh', 'AP'], ['Arunachal Pradesh', 'AR'], ['Assam', 'AS'],
  ['Bihar', 'BR'], ['Chhattisgarh', 'CG', 'CT'], ['Goa', 'GA'], ['Gujarat', 'GJ'],
  ['Haryana', 'HR'], ['Himachal Pradesh', 'HP'], ['Jharkhand', 'JH'],
  ['Karnataka', 'KA'], ['Kerala', 'KL'], ['Madhya Pradesh', 'MP'],
  ['Maharashtra', 'MH'], ['Manipur', 'MN'], ['Meghalaya', 'ML'], ['Mizoram', 'MZ'],
  ['Nagaland', 'NL'], ['Odisha', 'OD', 'OR', 'Orissa'], ['Punjab', 'PB'],
  ['Rajasthan', 'RJ'], ['Sikkim', 'SK'], ['Tamil Nadu', 'TN'],
  ['Telangana', 'TS', 'TG'], ['Tripura', 'TR'], ['Uttar Pradesh', 'UP'],
  ['Uttarakhand', 'UK', 'UT', 'Uttaranchal'], ['West Bengal', 'WB'],
  ['Andaman and Nicobar Islands', 'AN', 'Andaman & Nicobar Islands'],
  ['Chandigarh', 'CH'],
  ['Dadra and Nagar Haveli and Daman and Diu', 'DH', 'DN', 'DD', 'Dadra and Nagar Haveli', 'Daman and Diu'],
  ['Delhi', 'DL', 'NCT of Delhi', 'National Capital Territory of Delhi'],
  ['Jammu and Kashmir', 'JK', 'Jammu & Kashmir'], ['Ladakh', 'LA'],
  ['Lakshadweep', 'LD'], ['Puducherry', 'PY', 'Pondicherry'],
];
const key = value => String(value || '').toLowerCase().replace(/[\s._-]/g, '');
export function canonicalStateExpression(field) {
  const trimmed = { $trim: { input: { $ifNull: [field, ''] } } };
  const normalized = [' ', '\t', '\n', '\r', '.', '_', '-'].reduce((input, find) => ({ $replaceAll: { input, find, replacement: '' } }), { $toLower: trimmed });
  return { $let: { vars: { stateKey: normalized }, in: { $switch: {
    branches: states.map(([name, ...aliases]) => ({ case: { $in: ['$$stateKey', [name, ...aliases].map(key)] }, then: name })),
    default: trimmed,
  } } } };
}
export function stateFilter(value) {
  const aliases = states.find(names => names.some(name => key(name) === key(value)));
  const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Accept case/spacing/punctuation variants without matching another state.
  const patterns = aliases ? aliases.map(name => [...key(name)].map(escape).join('[\\s._-]*')) : [escape(String(value).trim())];
  const padding = aliases ? '[\\s._-]*' : '\\s*';
  return new RegExp(`^${padding}(?:${patterns.join('|')})${padding}$`, 'i');
}
