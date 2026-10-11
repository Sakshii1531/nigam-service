import { BrandCustomer } from './brandCustomer.model.js';
import { WarrantyClaim } from '../partner-warranty/warrantyClaim.model.js';
import { OwnedAppliance } from '../service-requests/ownedAppliance.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { User } from '../auth/user.model.js';

/** Read-only: a phone lookup must never create a CRM relationship. */
export async function isBrandCustomer(brand, customer) {
  if (!await User.exists({ _id: customer, role: 'customer' })) return false;
  const links = await Promise.all([
    BrandCustomer.exists({ brand, customer }),
    WarrantyClaim.exists({ brand, customer }),
    OwnedAppliance.exists({ brandRef: brand, user: customer }),
    ServiceRequest.exists({ brand, user: customer }),
  ]);
  return links.some(Boolean);
}
