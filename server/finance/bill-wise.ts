import { erpHttp, failedNote, istDay, num, runQueryReport, tenantsFor, type FinanceCompanyKey, type ReportColumn, type SourceStatus } from './erp-client';

// ====================================================================================================
// BILL-WISE ACCOUNTS RECEIVABLE / PAYABLE — ERPNext's own report, one row per open bill.
//
// Ported from the STEK dashboard (src/tools/erp-bill-wise.ts). Where ledgers.ts boils the same report
// down to totals and ageing, this passes the report's rows and columns through so the page shows exactly
// what the ERP screen shows. The columns are not hard-coded: they are whatever the report returns, so a
// column ERP adds shows up without a code change.
//
// READ-ONLY: report run + /api/resource GETs only.
// ====================================================================================================

export type BillKind = 'receivable' | 'payable';
export type AgeingBasis = 'Posting Date' | 'Due Date';

const KIND: Record<BillKind, { report: string; accountType: 'Receivable' | 'Payable'; defaultType: string }> = {
  receivable: { report: 'Accounts Receivable', accountType: 'Receivable', defaultType: 'Customer' },
  payable: { report: 'Accounts Payable', accountType: 'Payable', defaultType: 'Supplier' },
};

/** Which field of each party doctype holds the display name. */
const NAME_FIELD: Record<string, string> = {
  Customer: 'customer_name',
  Supplier: 'supplier_name',
  Employee: 'employee_name',
};

const RANGES = { range1: 30, range2: 60, range3: 90, range4: 120 };
const CACHE_MS = 60_000;
const LIST_CACHE_MS = 5 * 60_000;
const MAX_PARTIES = 200;

export interface BillColumn { fieldname: string; label: string; fieldtype: string }

export interface BillWise {
  kind: BillKind;
  asOn: string;
  partyType: string;
  ageingBasedOn: AgeingBasis;
  columns: BillColumn[];
  /** Every row carries one value per column fieldname, plus `site` and `party_name`. */
  rows: Array<Record<string, string | number | null>>;
  scopeNote: string | null;
  sources: SourceStatus[];
}

export interface BillWiseOptions {
  kind: BillKind;
  companies: readonly FinanceCompanyKey[];
  /** The as-on date, YYYY-MM-DD. */
  asOn: string;
  partyType?: string;
  /** Party IDs (ERP `name`); empty means every party. */
  parties?: string[];
  ageingBasedOn?: AgeingBasis;
}

const cache = new Map<string, { at: number; value: unknown }>();
function cached<T>(key: string, ttl: number): T | null {
  const hit = cache.get(key);
  return hit && Date.now() - hit.at < ttl ? (hit.value as T) : null;
}
function remember<T>(key: string, value: T): T {
  if (cache.size >= 64) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Party types ERP offers for this report — read from ERP, not assumed. */
export async function getPartyTypes(kind: BillKind, companies: readonly FinanceCompanyKey[]): Promise<string[]> {
  const spec = KIND[kind];
  const key = `ptypes|${kind}|${companies.join(',')}`;
  const hit = cached<string[]>(key, LIST_CACHE_MS);
  if (hit) return hit;
  const found = new Set<string>();
  await Promise.allSettled(tenantsFor(companies).map(async (t) => {
    const res = await erpHttp(t.site).get('/api/resource/Party Type', {
      params: {
        fields: JSON.stringify(['name']),
        filters: JSON.stringify([['account_type', '=', spec.accountType]]),
        limit_page_length: 100,
      },
    });
    for (const r of (res.data as { data?: Array<{ name?: string }> })?.data ?? []) if (r.name) found.add(r.name);
  }));
  // ERP's own default always leads, and is the fallback if ERP could not be asked.
  const list = [spec.defaultType, ...[...found].filter((n) => n !== spec.defaultType).sort()];
  return remember(key, list);
}

export interface PartyOption { id: string; name: string }

/** The party dropdown: every party of one type, as ERP lists them. */
export async function getParties(kind: BillKind, companies: readonly FinanceCompanyKey[], partyType: string): Promise<PartyOption[]> {
  const allowed = await getPartyTypes(kind, companies);
  // The type goes into a URL path, so it must be one ERP itself offered — never a raw query value.
  if (!allowed.includes(partyType)) throw new PartyTypeRefused(`party type '${partyType}' is not available for ${kind}`);
  const key = `parties|${kind}|${companies.join(',')}|${partyType}`;
  const hit = cached<PartyOption[]>(key, LIST_CACHE_MS);
  if (hit) return hit;
  const nameField = NAME_FIELD[partyType];
  const byId = new Map<string, string>();
  await Promise.allSettled(tenantsFor(companies).map(async (t) => {
    const res = await erpHttp(t.site).get(`/api/resource/${encodeURIComponent(partyType)}`, {
      params: {
        fields: JSON.stringify(nameField ? ['name', nameField] : ['name']),
        limit_page_length: 0,
        order_by: 'name asc',
      },
    });
    for (const r of (res.data as { data?: Array<Record<string, unknown>> })?.data ?? []) {
      const id = String(r.name ?? '');
      if (id) byId.set(id, String((nameField && r[nameField]) || id));
    }
  }));
  const list = [...byId.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  return remember(key, list);
}

/** A party type ERP does not offer for this report. The route answers 400. */
export class PartyTypeRefused extends Error {}

export async function getBillWise(opts: BillWiseOptions): Promise<BillWise> {
  const spec = KIND[opts.kind];
  const partyType = opts.partyType || spec.defaultType;
  const allowed = await getPartyTypes(opts.kind, opts.companies);
  if (!allowed.includes(partyType)) throw new PartyTypeRefused(`party type '${partyType}' is not available for ${opts.kind}`);
  // Anything other than the two ERP bases falls back to Posting Date, the dashboard's default.
  const ageing: AgeingBasis = opts.ageingBasedOn === 'Due Date' ? 'Due Date' : 'Posting Date';
  const parties = (opts.parties ?? []).slice(0, MAX_PARTIES);
  const asOn = opts.asOn || istDay(new Date().toISOString());

  const key = ['bill', opts.kind, opts.companies.join(','), asOn, partyType, ageing, parties.join('\u0001')].join('|');
  const hit = cached<BillWise>(key, CACHE_MS);
  if (hit) return hit;

  const tenants = tenantsFor(opts.companies);
  const sources: SourceStatus[] = [];
  const columns: BillColumn[] = [];
  const seen = new Set<string>();
  const partySet = new Set(parties);

  const settled = await Promise.allSettled(tenants.map(async (t) => {
    const { rows, columns: cols } = await runQueryReport(erpHttp(t.site), spec.report, {
      company: t.company,
      report_date: asOn,
      ageing_based_on: ageing,
      calculate_ageing_with: 'Report Date',
      party_type: partyType,
      ...RANGES,
    });
    return { rows, cols, site: t.site.key };
  }));

  const rows: Array<Record<string, unknown>> = [];
  settled.forEach((r, idx) => {
    const t = tenants[idx];
    if (r.status !== 'fulfilled') {
      console.error(`[finance] bill-wise ${spec.report} (${t.company}) failed:`, (r.reason as Error)?.message ?? r.reason);
      sources.push({ company: t.company, ok: false });
      return;
    }
    sources.push({ company: t.company, ok: true });
    for (const c of r.value.cols as ReportColumn[]) {
      if (!c.fieldname || seen.has(c.fieldname)) continue;
      seen.add(c.fieldname);
      columns.push({ fieldname: c.fieldname, label: (c.label ?? c.fieldname).trim(), fieldtype: c.fieldtype ?? 'Data' });
    }
    for (const raw of r.value.rows) {
      const party = String(raw.party ?? '');
      if (partySet.size && !partySet.has(party)) continue;
      rows.push({ ...raw, party_name: nameOf(raw, partyType) ?? party, site: r.value.site });
    }
  });

  // Keep only the report's own columns on each row (plus party_name/site), so a wide raw row does not
  // ship fields no column displays. Money and age are coerced to numbers; the rest stay as ERP sent.
  const numeric = new Set(columns.filter((c) => c.fieldtype === 'Currency' || c.fieldtype === 'Int' || c.fieldtype === 'Float').map((c) => c.fieldname));
  const lean = rows.map((raw) => {
    const out: Record<string, string | number | null> = { site: String(raw.site ?? '') };
    for (const c of columns) {
      const v = raw[c.fieldname];
      out[c.fieldname] = numeric.has(c.fieldname) ? num(v) : v == null || v === '' ? null : String(v);
    }
    out.party_name = String(raw.party_name ?? '');
    return out;
  });

  const value: BillWise = {
    kind: opts.kind, asOn, partyType, ageingBasedOn: ageing, columns, rows: lean,
    scopeNote: failedNote(sources),
    sources,
  };
  return sources.every((s) => s.ok) ? remember(key, value) : value;
}

function nameOf(raw: Record<string, unknown>, partyType: string): string | null {
  const f = NAME_FIELD[partyType];
  const v = (f && raw[f]) || raw.customer_name || raw.supplier_name || raw.employee_name;
  return v ? String(v) : null;
}
