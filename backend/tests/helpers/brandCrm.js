import { ROLES } from '../../src/config/constants.js';
import { ensureBrandRoleTemplates } from '../../src/modules/brand-crm/roleTemplates.service.js';
import { actorFromUser } from '../../src/modules/brand-crm/actor.js';
import { createTicket } from '../../src/modules/partner-warranty/ticketIntake.service.js';
import { partnerWarrantyKit } from './partnerWarranty.js';

const DAY = 24 * 3600 * 1000;

// Brand CRM scenario builder (docs/brand-crm). Extends the partner-warranty
// kit — same two-brand world, logins and uploads — with brand staff who have
// employee IDs and roles, and direct access to the single ticket creator.
export function brandCrmKit(getApp, { phoneStart }) {
  const pw = partnerWarrantyKit(getApp, { phoneStart });

  /**
   * A brand user with an employee ID and role templates (brand-crm/permissions.js
   * ROLE_TEMPLATES keys, e.g. ['cce'], ['warranty_executive']). No templates →
   * a user with no roles at all, who can reach nothing.
   */
  async function brandUser(brand, { employeeId, name, templates = [], department, status } = {}) {
    const roles = await ensureBrandRoleTemplates(brand._id);
    return pw.staff(ROLES.BRAND_ADMIN, {
      brand: brand._id,
      ...(employeeId ? { employeeId } : {}),
      ...(name ? { name } : {}),
      ...(department ? { department } : {}),
      ...(status ? { status } : {}),
      assignedRoles: templates.map((t) => {
        if (!roles[t]) throw new Error(`brandUser: unknown template "${t}"`);
        return roles[t]._id;
      }),
    });
  }

  let serialSeq = 0;
  /** createTicket input for an LG AC cooling complaint (overridable). */
  function ticketInput(w, cust, overrides = {}) {
    return {
      customer: cust.user._id,
      brand: w.lg.toObject ? w.lg.toObject() : w.lg,
      category: w.ac.toObject ? w.ac.toObject() : w.ac,
      issue: w.cooling.toObject ? w.cooling.toObject() : w.cooling,
      modelNumber: 'AS-Q18',
      serialNumber: `CRM-${phoneStart}-${serialSeq++}`,
      purchaseDate: new Date(Date.now() - 200 * DAY),
      remarks: 'Blows warm air',
      documents: [],
      address: { name: 'Home', house: '12 MG Road', city: 'Indore', state: 'MP', pincode: '452001' },
      ...overrides,
    };
  }

  /** Creates a ticket as a brand user (toll-free by default). */
  async function createTicketAs(staffUser, input, source = 'toll_free') {
    return createTicket(input, { source, actor: await actorFromUser(staffUser.user._id, 'brand') });
  }

  return { ...pw, brandUser, ticketInput, createTicketAs };
}
