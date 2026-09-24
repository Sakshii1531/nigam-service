import { useState } from 'react';
import { catalogueAdmin } from '../../../lib/catalogueAdminApi';
import { Modal, Field, inputClass, ErrorNote, PrimaryButton, SecondaryButton } from './ui';

// Copy an offering as the starting point for a sibling — e.g. Split AC 2 Ton
// Installation from 1.5 Ton. The copy must be a different combination (other
// size/option or other service), starts inactive and flagged for rate review.

export default function DuplicateOfferingModal({ row, structure, onClose, onDuplicated }) {
  const isProduct = row.bookingType === 'PRODUCT_LINKED';
  const parentVariants = isProduct
    ? structure.productTypes.find((pt) => pt.id === row.productType?.id)?.variants || []
    : structure.services.find((s) => s.id === row.service?.id)?.options || [];
  const [variant, setVariant] = useState('');
  const [service, setService] = useState(row.service?.id || '');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const copy = await catalogueAdmin.duplicateOffering(row.id, {
        variant: variant || null,
        service: service || undefined,
        name: name.trim() || undefined,
      });
      onDuplicated(copy);
    } catch (err) {
      setError(err.message || 'Could not duplicate.');
      setSaving(false);
    }
  };

  return (
    <Modal title="Duplicate offering" subtitle={`From ${row.code}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <p className="text-xs text-slate-500">
          Copies the content and current rate. The copy starts <b>inactive</b> with a demo-rate flag — review its price before switching it on.
        </p>
        {isProduct && (
          <Field label="Service">
            <select value={service} onChange={(e) => setService(e.target.value)} className={inputClass}>
              {structure.services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        )}
        {parentVariants.length > 0 && (
          <Field label="Size / option for the copy">
            <select value={variant} onChange={(e) => setVariant(e.target.value)} className={inputClass}>
              <option value="">Any (applies to all)</option>
              {parentVariants.map((v) => (
                <option key={v.id} value={v.id} disabled={v.id === row.variant?.id && service === row.service?.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Name for the copy" hint="Leave empty to use “… (copy)”.">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Copying…' : 'Duplicate'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
