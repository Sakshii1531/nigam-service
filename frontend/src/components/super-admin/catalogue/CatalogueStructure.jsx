import { useState } from 'react';
import { Plus, Pencil, Layers, Wrench, Filter, Eye, EyeOff } from 'lucide-react';
import { catalogueAdmin } from '../../../lib/catalogueAdminApi';
import { Modal, Field, inputClass, Toggle, ErrorNote, PrimaryButton, SecondaryButton } from './ui';
import { listToText, textToList } from './listText';

// Left half of a category: what can be booked FOR (product types → sizes) and
// what can be booked AS a standalone service (services → options). Prices
// are never set here — they belong to offerings in the table.

const EMPTY = { name: '', icon: '', desc: '', dimensionLabel: '', keywords: '', label: '' };

function dimensionFromLabel(label) {
  const clean = label.trim();
  if (!clean) return null;
  return { key: clean.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''), label: clean };
}

function StructureModal({ modal, categoryId, onClose, onSaved }) {
  const { kind, mode, item, parent } = modal;
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    name: item?.name || '',
    icon: item?.icon || '',
    desc: item?.desc || '',
    label: item?.label || '',
    keywords: listToText(item?.keywords, ', '),
    dimensionLabel: (kind === 'productType' ? item?.variantDimension?.label : item?.optionDimension?.label) || '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const title = {
    productType: mode === 'add' ? 'Add product type' : 'Edit product type',
    service: mode === 'add' ? 'Add service' : 'Edit service',
    variant: mode === 'add' ? `Add ${parent?.dimensionLabel || 'size / option'}` : 'Edit size / option',
  }[kind];

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (kind === 'variant') {
        if (mode === 'add') {
          await catalogueAdmin.createVariant({ [parent.field]: parent.id, label: form.label.trim() });
        } else {
          await catalogueAdmin.updateVariant(item.id, { label: form.label.trim() });
        }
      } else {
        const body = { name: form.name.trim(), icon: form.icon.trim(), desc: form.desc.trim() };
        if (kind === 'productType') {
          body.variantDimension = dimensionFromLabel(form.dimensionLabel);
          if (mode === 'add') await catalogueAdmin.createProductType({ ...body, category: categoryId });
          else await catalogueAdmin.updateProductType(item.id, body);
        } else {
          body.optionDimension = dimensionFromLabel(form.dimensionLabel);
          body.keywords = textToList(form.keywords, { commas: true });
          if (mode === 'add') await catalogueAdmin.createService({ ...body, category: categoryId });
          else await catalogueAdmin.updateService(item.id, body);
        }
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Could not save.');
      setSaving(false);
    }
  };

  return (
    <Modal title={title} subtitle={parent?.name ? `Under ${parent.name}` : undefined} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        {kind === 'variant' ? (
          <Field label="Label" hint='Shown to customers as a choice, e.g. "1.5 Ton", "55–65 inch", "501–1000 L".'>
            <input required autoFocus value={form.label} onChange={set('label')} className={inputClass} />
          </Field>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_5rem] gap-3">
              <Field label="Name">
                <input required autoFocus value={form.name} onChange={set('name')} className={inputClass} placeholder={kind === 'productType' ? 'Split AC' : 'Fan Installation'} />
              </Field>
              <Field label="Icon">
                <input value={form.icon} onChange={set('icon')} className={`${inputClass} text-center`} placeholder="❄️" />
              </Field>
            </div>
            <Field label="Short description">
              <input value={form.desc} onChange={set('desc')} className={inputClass} />
            </Field>
            <Field
              label={kind === 'productType' ? 'Sizes vary by (optional)' : 'Options vary by (optional)'}
              hint={
                kind === 'productType'
                  ? 'e.g. "Capacity" for Split AC, "Screen Size" for LED TV. Leave empty if this type has no sizes.'
                  : 'e.g. "Tank Capacity" for Water Tank Cleaning. Leave empty if the service has no options.'
              }
            >
              <input value={form.dimensionLabel} onChange={set('dimensionLabel')} className={inputClass} />
            </Field>
            {kind === 'service' && (
              <Field label="Search keywords" hint="Comma separated — words customers might search for.">
                <input value={form.keywords} onChange={set('keywords')} className={inputClass} placeholder="ceiling fan, fan fitting" />
              </Field>
            )}
          </>
        )}
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function VariantChips({ items, parent, onEdit, onToggle, onAdd }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map((v) => (
        <span
          key={v.id}
          className={`group inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full border text-[11px] font-semibold ${
            v.isActive ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400 line-through'
          }`}
        >
          {v.label}
          <button type="button" onClick={() => onEdit(v, parent)} aria-label={`Edit ${v.label}`} className="p-0.5 rounded-full hover:bg-slate-100 cursor-pointer">
            <Pencil size={10} />
          </button>
          <button
            type="button"
            onClick={() => onToggle(v)}
            aria-label={v.isActive ? `Hide ${v.label} from customers` : `Show ${v.label} to customers`}
            title={v.isActive ? 'Hide from customers' : 'Show to customers'}
            className="p-0.5 rounded-full hover:bg-slate-100 cursor-pointer"
          >
            {v.isActive ? <EyeOff size={10} /> : <Eye size={10} />}
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => onAdd(parent)}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-dashed border-[#0D47A1]/40 text-[11px] font-semibold text-[#0D47A1] hover:bg-blue-50 cursor-pointer"
      >
        <Plus size={11} /> {parent.dimensionLabel}
      </button>
    </div>
  );
}

function NodeRow({ node, kind, focus, onFocus, onEdit, onToggle, children }) {
  const focused = focus?.id === node.id;
  return (
    <li className={`p-3 rounded-xl border transition-colors ${focused ? 'border-[#0D47A1] bg-blue-50/40' : 'border-slate-100 bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`min-w-0 ${node.isActive ? '' : 'opacity-50'}`}>
          <p className="text-sm font-bold text-slate-800 truncate">
            {node.icon && <span className="mr-1">{node.icon}</span>}
            {node.name}
          </p>
          {node.desc && <p className="text-[11px] text-slate-400 truncate">{node.desc}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onFocus(focused ? null : { kind, id: node.id, name: node.name })}
            title="Show only offerings under this"
            aria-pressed={focused}
            className={`p-1.5 rounded-lg cursor-pointer ${focused ? 'text-[#0D47A1] bg-blue-100' : 'text-slate-400 hover:text-[#0D47A1] hover:bg-slate-100'}`}
          >
            <Filter size={13} />
          </button>
          <button type="button" onClick={() => onEdit(node)} aria-label={`Edit ${node.name}`} className="p-1.5 text-slate-400 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg cursor-pointer">
            <Pencil size={13} />
          </button>
          <Toggle checked={node.isActive} onChange={() => onToggle(node)} />
        </div>
      </div>
      {children}
    </li>
  );
}

export default function CatalogueStructure({ structure, categoryId, focus, onFocus, onChanged, onError }) {
  const [modal, setModal] = useState(null);

  const run = async (work) => {
    try {
      await work();
      onChanged();
    } catch (err) {
      onError(err.message || 'Could not update.');
    }
  };

  const variantParent = (node, kind) => ({
    id: node.id,
    name: node.name,
    field: kind === 'productType' ? 'productType' : 'service',
    dimensionLabel: (kind === 'productType' ? node.variantDimension?.label : node.optionDimension?.label) || 'Size / option',
  });

  const section = (kind, nodes, heading, icon, emptyText) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          {icon} {heading}
        </h3>
        <button
          type="button"
          onClick={() => setModal({ kind, mode: 'add' })}
          className="text-[11px] font-bold text-[#0D47A1] hover:bg-blue-50 px-2 py-1 rounded-lg inline-flex items-center gap-1 cursor-pointer"
        >
          <Plus size={12} /> Add
        </button>
      </div>
      {nodes.length === 0 ? (
        <p className="text-[11px] text-slate-400 bg-slate-50 rounded-xl p-3">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {nodes.map((node) => {
            const dimension = kind === 'productType' ? node.variantDimension : node.optionDimension;
            const values = kind === 'productType' ? node.variants : node.options;
            const parent = variantParent(node, kind);
            return (
              <NodeRow
                key={node.id}
                node={node}
                kind={kind}
                focus={focus}
                onFocus={onFocus}
                onEdit={(item) => setModal({ kind, mode: 'edit', item })}
                onToggle={(item) =>
                  run(() =>
                    kind === 'productType'
                      ? catalogueAdmin.setProductTypeStatus(item.id, !item.isActive)
                      : catalogueAdmin.setServiceStatus(item.id, !item.isActive),
                  )
                }
              >
                {(dimension || values.length > 0) && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-bold uppercase text-slate-400">{dimension?.label || 'Options'}</p>
                    <VariantChips
                      items={values}
                      parent={parent}
                      onEdit={(item, p) => setModal({ kind: 'variant', mode: 'edit', item, parent: p })}
                      onToggle={(v) => run(() => catalogueAdmin.setVariantStatus(v.id, !v.isActive))}
                      onAdd={(p) => setModal({ kind: 'variant', mode: 'add', parent: p })}
                    />
                  </div>
                )}
              </NodeRow>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {section('productType', structure.productTypes, 'Product types', <Layers size={13} />, 'None — this category only has standalone services.')}
      {section('service', structure.services, 'Services', <Wrench size={13} />, 'No services yet. Add the work customers can book (Installation, Repair…).')}
      {modal && (
        <StructureModal
          modal={modal}
          categoryId={categoryId}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
