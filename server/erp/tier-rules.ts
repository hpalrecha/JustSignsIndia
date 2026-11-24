/**
 * Which Finance role an ERP Employee's designation gives.
 *
 * Copied from P91Elite (services/erp-salesperson-rules.ts, deriveTier) with the instance fixed to
 * 'justsigns'. Pure, no I/O.
 *
 *   'national' in the designation                      -> nsm
 *   'regional' / 'area'                                -> rsm / asm (no Finance access today)
 *   'head' + 'sales' (Just Signs rule, e.g. "Head - Sales & Marketing") -> nsm
 */

export type Tier = 'nsm' | 'rsm' | 'asm';

/** Employee id (HR-EMP-xxxxx on erp.justsigns.co.in) -> tier, for people whose title does not say it. */
export const TIER_OVERRIDES: Record<string, Tier> = {};

/**
 * Employee id -> real ERP login email, for an Employee whose user_id is empty and whose company_email
 * is not a real login. Prefer fixing Employee.user_id in ERP over adding entries here.
 */
export const EMAIL_OVERRIDES: Record<string, string> = {};

function isHeadOfSales(d: string): boolean {
  return /\bhead\b/.test(d) && /\bsales\b/.test(d);
}

export function deriveTier(designation: string | null | undefined, employeeId: string): Tier | null {
  const override = TIER_OVERRIDES[employeeId];
  if (override) return override;
  const d = (designation ?? '').toLowerCase();
  if (/national/.test(d)) return 'nsm';
  if (/regional/.test(d)) return 'rsm';
  if (/area/.test(d)) return 'asm';
  if (isHeadOfSales(d)) return 'nsm';
  return null;
}

export function emailOverride(employeeId: string): string | undefined {
  return EMAIL_OVERRIDES[employeeId];
}
