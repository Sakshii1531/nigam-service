import { useState } from 'react';
import { useApiData } from '../../hooks/useApiData';
import { apiRequest } from '../../lib/apiClient';
export default function BillingProfile() {
  const data = useApiData(() => apiRequest('/brand/billing/billing-profile', {
    auth: true
  }), [], {
    initial: {}
  });
  const [changes, setChanges] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <form className="space-y-4 max-w-xl" onSubmit={async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiRequest('/brand/billing/billing-profile', {
        auth: true,
        method: 'PUT',
        body: changes
      });
      setMessage('Billing profile saved');
      await data.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }}><h2 className="font-semibold text-lg">Billing profile</h2>{(error || data.error) && <p role="alert">{error || data.error.message}</p>}{message && <p role="status">{message}</p>}{['legalName', 'gstin', 'billingAddress'].map(k => <label key={k} className="block text-sm">{{
        legalName: 'Legal name',
        gstin: 'GSTIN',
        billingAddress: 'Billing address'
      }[k]}<input className="block border rounded-lg p-2 w-full mt-1" value={changes[k] ?? data.data?.[k] ?? ''} onChange={e => setChanges({
        ...changes,
        [k]: e.target.value
      })} /></label>)}<p>Payment terms: {data.data?.paymentTermsDays ?? 30} days. NCC Finance manages payment terms and GST rates.</p><button disabled={busy || data.loading} className="bg-blue-800 text-white px-4 py-2 rounded-lg">Save billing profile</button></form>;
}
