import { useEffect, useState } from 'react';
import { apiRequest } from '../../../lib/apiClient';

// A dropdown of every bookable catalogue service (docs/master-catalogue
// Phase 22) — used to give a story its "Book now" button. Value is the
// group id ("<productTypeId|none>:<serviceId>"), '' for none.
export default function ServiceGroupSelect({ value, onChange, id, className }) {
  const [groups, setGroups] = useState([]);
  useEffect(() => {
    let alive = true;
    apiRequest('/super-admin/catalogue/service-groups', { auth: true, silentError: true })
      .then((list) => alive && setGroups(list || []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const byCategory = groups.reduce((acc, g) => {
    (acc[g.category.name] ||= []).push(g);
    return acc;
  }, {});
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">No “Book now” button</option>
      {Object.entries(byCategory).map(([category, list]) => (
        <optgroup key={category} label={category}>
          {list.map((g) => (
            <option key={g.groupId} value={g.groupId}>
              {g.title} — from ₹{Number(g.fromPrice).toLocaleString('en-IN')}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
