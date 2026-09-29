// Where each app opens a warranty claim — notification CTAs point here.
// Kept in one place so the frontend phases (12–14) only have to match these.
export const claimLinks = Object.freeze({
  customer: (id) => `/partner-warranty/claims/${id}`,
  brand: (id) => `/brand-admin/warranty-claims/${id}`,
  admin: (id) => `/super-admin/partner-warranty/claims/${id}`,
});
