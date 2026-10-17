export type CanonicalRole = 'CUSTOMER' | 'DRIVER' | 'ADMIN';

/**
 * Standardize any legacy or lowercase role (e.g. 'rider', 'CUSTOMER', 'admin', 'administrator')
 * into the canonical role model: CUSTOMER, DRIVER, or ADMIN.
 */
export function toCanonicalRole(role?: string | null): CanonicalRole {
  if (!role) return 'CUSTOMER';
  const r = role.toLowerCase().trim();
  if (r === 'admin' || r === 'administrator') return 'ADMIN';
  if (r === 'driver') return 'DRIVER';
  return 'CUSTOMER';
}

/**
 * Friendly display title (e.g. 'Customer', 'Driver', 'Administrator')
 */
export function toDisplayRole(role?: string | null): string {
  const canonical = toCanonicalRole(role);
  if (canonical === 'ADMIN') return 'Administrator';
  if (canonical === 'DRIVER') return 'Driver';
  return 'Customer';
}

/**
 * Corresponding dashboard navigation route
 */
export function getRoleDashboardRoute(role?: string | null): 'admin' | 'driver' | 'rider' {
  const canonical = toCanonicalRole(role);
  if (canonical === 'ADMIN') return 'admin';
  if (canonical === 'DRIVER') return 'driver';
  return 'rider';
}
