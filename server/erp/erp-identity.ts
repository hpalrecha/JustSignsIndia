/**
 * Who an ERP login is: the active Employee behind it, read with the service token (GET only, through
 * the read-only finance client).
 */
import { erpHttp, tenantsFor } from '../finance/erp-client';
import { EMAIL_OVERRIDES, deriveTier, type Tier } from './tier-rules';

export interface ErpIdentity {
  /** The ERP User name (login email). */
  email: string;
  employeeId: string | null;
  name: string | null;
  designation: string | null;
  tier: Tier | null;
}

type Row = Record<string, unknown>;

async function list(doctype: string, fields: string[], filters: unknown[]): Promise<Row[]> {
  const site = tenantsFor(['justsigns'])[0].site; // throws FinanceNotConfigured when env is missing
  const res = await erpHttp(site).get(`/api/resource/${encodeURIComponent(doctype)}`, {
    params: { fields: JSON.stringify(fields), filters: JSON.stringify(filters), limit_page_length: 5 },
  });
  const d = (res.data as { data?: unknown })?.data;
  return Array.isArray(d) ? (d as Row[]) : [];
}

const EMP_FIELDS = ['name', 'employee_name', 'designation', 'user_id', 'company_email'];

/**
 * `login` is what the person typed: an ERP login email, or an ERP username. A username is resolved to
 * its User (whose name is the email) first.
 */
export async function lookupErpIdentity(login: string): Promise<ErpIdentity> {
  let email = login.trim();
  if (!email.includes('@')) {
    const users = await list('User', ['name'], [['username', '=', email]]);
    if (users[0]?.name) email = String(users[0].name);
  }
  const lower = email.toLowerCase();
  // Overrides first (Employee whose user_id is wrong), then user_id, then company_email.
  const overrideId = Object.entries(EMAIL_OVERRIDES).find(([, e]) => e.toLowerCase() === lower)?.[0];
  let emp: Row | undefined;
  if (overrideId) emp = (await list('Employee', EMP_FIELDS, [['name', '=', overrideId], ['status', '=', 'Active']]))[0];
  if (!emp) emp = (await list('Employee', EMP_FIELDS, [['user_id', '=', email], ['status', '=', 'Active']]))[0];
  if (!emp) emp = (await list('Employee', EMP_FIELDS, [['company_email', '=', email], ['status', '=', 'Active']]))[0];
  if (!emp) return { email, employeeId: null, name: null, designation: null, tier: null };
  const employeeId = String(emp.name);
  const designation = emp.designation == null ? null : String(emp.designation);
  return {
    email,
    employeeId,
    name: emp.employee_name == null ? null : String(emp.employee_name).trim(),
    designation,
    tier: deriveTier(designation, employeeId),
  };
}
