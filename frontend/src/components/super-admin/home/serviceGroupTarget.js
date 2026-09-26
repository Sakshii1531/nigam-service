// Home tiles / stories point at a catalogue service group (Phase 22).

/** "<productTypeId|none>:<serviceId>" ⇄ { productType, service } */
export const groupIdToTarget = (groupId) => {
  if (!groupId) return null;
  const [productType, service] = groupId.split(':');
  return { productType: productType === 'none' ? null : productType, service };
};
export const targetToGroupId = (target) => (target?.service ? `${target.productType || 'none'}:${target.service}` : '');
