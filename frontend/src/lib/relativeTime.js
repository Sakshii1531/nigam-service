/**
 * "3 hours ago" from an ISO timestamp. The notification feed used to ship a
 * pre-baked `time` string on each mock item, which never aged.
 */
export function relativeTime(iso) {
  if (!iso) return '';
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';

  const units = [
    ['minute', 60],
    ['hour', 3600],
    ['day', 86400],
    ['week', 604800],
    ['month', 2592000],
    ['year', 31536000],
  ];

  let label = 'year';
  let size = 31536000;
  for (let i = units.length - 1; i >= 0; i -= 1) {
    if (seconds >= units[i][1]) {
      [label, size] = units[i];
      break;
    }
    if (i === 0) [label, size] = units[0];
  }

  const value = Math.floor(seconds / size);
  return `${value} ${label}${value === 1 ? '' : 's'} ago`;
}
