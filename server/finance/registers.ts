import type { AxiosInstance } from 'axios';
import {
  erpHttp, failedNote, istDay, makeCache, num, round2, runQueryReport, str, tenantsFor,
  type FinanceCompanyKey, type ReportColumn, type SourceStatus,
} from './erp-client';

// ====================================================================================================
// SALES and PURCHASE REGISTERS — ERPNext's own reports, read for the Finance pages.
//
// Ported from the STEK dashboard (erp-register-core.ts, erp-sales-register.ts,
// erp-purchase-register.ts). The arithmetic is unchanged, brand attribution included: with one brand
// chosen, Sales keeps the invoices that carry that brand's lines (resolved per line, see
// resolveLineBrandKey); Purchases are company-level and are not narrowed. The per-document rows are not
// sent to the browser — the page only draws totals, rankings and series, so the rows stay here.
//
// The two registers are one report in mirror image; the differences live in a RegisterSpec.
// ====================================================================================================

export interface RegisterSpec {
  reportName: string;
  doctype: string;
  /** Sales Register says `tax_total`, Purchase Register says `total_tax`. The wrong one reads as 0. */
  taxTotalField: string;
  partyIdField: string;
  partyNameField: string;
  partyGroupField: string;
  /** Child table that carries each line's brand, or null for a company-level register. */
  brandLineDoctype: string | null;
}

export const SALES_SPEC: RegisterSpec = {
  reportName: 'Sales Register',
  doctype: 'Sales Invoice',
  taxTotalField: 'tax_total',
  partyIdField: 'customer',
  partyNameField: 'customer_name',
  partyGroupField: 'customer_group',
  brandLineDoctype: 'Sales Invoice Item',
};

export const PURCHASE_SPEC: RegisterSpec = {
  reportName: 'Purchase Register',
  doctype: 'Purchase Invoice',
  taxTotalField: 'total_tax',
  partyIdField: 'supplier_id',
  partyNameField: 'supplier_name',
  partyGroupField: 'supplier_group',
  brandLineDoctype: null,
};

interface RegisterRow {
  /** site|voucher — two ERP sites can reuse a document number, so the number alone is not unique. */
  key: string;
  voucher: string;
  postingDate: string;
  party: string;
  net: number;
  tax: number;
  total: number;
  outstanding: number;
  settled: number;
  status: string;
  overdueDays: number | null;
  /** Dashboard brands on this document's lines (empty when unattributed or not applicable). */
  brands: string[];
}

export interface GroupTotals {
  count: number;
  net: number;
  tax: number;
  total: number;
  outstanding: number;
  settled: number;
  averageValue: number | null;
}

export interface Register {
  /** Split on the SIGN of the document total: invoices are positive, credit/debit notes negative. */
  totals: { invoices: GroupTotals; returns: GroupTotals; all: GroupTotals };
  byAccountHead: Array<{ label: string; total: number }>;
  reportTotals: Array<{ fieldname: string; label: string; total: number }>;
  /** Trading heads only (tax heads excluded), split by sign per document. "Excl. GST" figures. */
  revenueHeads: { heads: string[]; positive: number; negative: number; net: number };
  byStatus: Array<{ status: string; count: number; total: number; outstanding: number }>;
  ageing: Array<{ label: string; documents: number; outstanding: number }>;
  topParties: Array<{ party: string; documents: number; total: number; outstanding: number }>;
  partyCount: number;
  series: { bucket: 'day' | 'month'; points: Array<{ label: string; value: number }> };
  scopeNote: string | null;
  sources: SourceStatus[];
}

export interface RegisterOptions {
  /** Companies to read, already narrowed to what the caller may see. */
  companies: readonly FinanceCompanyKey[];
  /** Inclusive IST calendar dates, YYYY-MM-DD. */
  from: string;
  to: string;
  /** How many parties to rank. 0 means every party. */
  partiesLimit: number;
  /** Rank invoices ('positive') or credit/debit notes ('negative'). Never the net. */
  sign: 'positive' | 'negative';
  /** 'all', or one dashboard brand (STEK, P91, P91 CC, JustSigns). */
  brand: string;
}

/** ERP Item.brand values that are dashboard brands. Anything else stays unattributed. */
const ITEM_BRAND_TO_KEY: Record<string, string> = { STEK: 'STEK', 'P91 CC': 'P91 CC', P91: 'P91' };

/**
 * Which dashboard brand one invoice LINE belongs to. The line's own recorded brand wins (it is frozen
 * at submit, so closed periods never move between brands); the current Item master is consulted only
 * when the line carries none. Unresolved lines belong to no brand.
 */
function resolveLineBrandKey(itemCode: unknown, rowBrand: unknown, currentByItem: Map<string, string>): string | null {
  const recorded = String(rowBrand ?? '').trim();
  if (recorded) return ITEM_BRAND_TO_KEY[recorded] ?? null;
  const code = String(itemCode ?? '').trim();
  const current = code ? String(currentByItem.get(code) ?? '').trim() : '';
  return current ? (ITEM_BRAND_TO_KEY[current] ?? null) : null;
}

/** Per-document set of brands, from the document's lines. Only a multi-brand site needs it. */
async function brandsByDocument(
  api: AxiosInstance, lineDoctype: string, parentDoctype: string, names: string[],
): Promise<Map<string, Set<string>>> {
  const byDoc = new Map<string, Set<string>>();
  const chunks: string[][] = [];
  for (let i = 0; i < names.length; i += ITEM_CHUNK) chunks.push(names.slice(i, i + ITEM_CHUNK));
  const read = async (doctype: string, fields: string[], filters: unknown[], limit: number, parent?: string) => {
    const params: Record<string, string> = { fields: JSON.stringify(fields), filters: JSON.stringify(filters), limit_page_length: String(limit) };
    if (parent) params.parent = parent;
    const res = await api.get(`/api/resource/${encodeURIComponent(doctype)}`, { params });
    const d = (res.data as { data?: unknown })?.data;
    return Array.isArray(d) ? (d as Array<Record<string, unknown>>) : [];
  };
  const lines = (await Promise.all(chunks.map((chunk) => read(
    lineDoctype, ['parent', 'item_code', 'brand'], [['parent', 'in', chunk], ['docstatus', '=', 1]], 5000, parentDoctype,
  )))).flat();
  // Current brand for every DISTINCT item, in batches — never one request per line.
  const codes = [...new Set(lines.map((l) => String(l.item_code ?? '').trim()).filter(Boolean))];
  const codeChunks: string[][] = [];
  for (let i = 0; i < codes.length; i += ITEM_CHUNK) codeChunks.push(codes.slice(i, i + ITEM_CHUNK));
  const itemRows = (await Promise.all(codeChunks.map((chunk) => read('Item', ['name', 'brand'], [['name', 'in', chunk]], ITEM_CHUNK * 2)))).flat();
  const currentByItem = new Map<string, string>();
  for (const r of itemRows) currentByItem.set(String(r.name), String(r.brand ?? '').trim());
  for (const l of lines) {
    const parent = String(l.parent ?? '');
    const key = resolveLineBrandKey(l.item_code, l.brand, currentByItem);
    if (!parent || !key) continue;
    const set = byDoc.get(parent) ?? new Set<string>();
    set.add(key);
    byDoc.set(parent, set);
  }
  return byDoc;
}

const ITEM_CHUNK = 100;
// A head is a tax head if ERP named it one, so a new tax account is classified without a code change.
const TAX_HEAD_RE = /\b(tax|tds|tcs|gst|cess)\b/i;
const STANDARD_CURRENCY = new Set([
  'net_total', 'tax_total', 'total_tax', 'grand_total', 'rounded_total', 'outstanding_amount',
]);

interface DocMeta { dueDate: string | null; status: string; net: number; tax: number }

/**
 * net and tax come from the DOCUMENT, not the report. The report's net/tax columns depend on the window
 * asked for (a charge account can move between net and tax), so the same invoice would show two taxable
 * values on one page. due_date and status are simply absent from the registers.
 */
async function enrichFromDoctype(api: AxiosInstance, doctype: string, names: string[]): Promise<Map<string, DocMeta>> {
  const out = new Map<string, DocMeta>();
  const chunks: string[][] = [];
  for (let i = 0; i < names.length; i += ITEM_CHUNK) chunks.push(names.slice(i, i + ITEM_CHUNK));
  const pages = await Promise.all(chunks.map(async (chunk) => {
    const res = await api.get(`/api/resource/${encodeURIComponent(doctype)}`, {
      params: {
        fields: JSON.stringify(['name', 'due_date', 'status', 'base_net_total', 'base_total_taxes_and_charges']),
        filters: JSON.stringify([['name', 'in', chunk]]),
        limit_page_length: String(chunk.length),
      },
    });
    const d = (res.data as { data?: unknown })?.data;
    return Array.isArray(d) ? (d as Array<Record<string, unknown>>) : [];
  }));
  for (const r of pages.flat()) {
    out.set(String(r.name), {
      dueDate: str(r.due_date),
      status: String(r.status ?? '—'),
      net: num(r.base_net_total),
      tax: num(r.base_total_taxes_and_charges),
    });
  }
  return out;
}

/** Day buckets while the window reads well as days; month buckets beyond about a quarter. */
function buildSeries(rows: Array<{ postingDate: string; total: number }>): Register['series'] {
  const days = [...new Set(rows.map((r) => r.postingDate).filter(Boolean))].sort();
  if (!days.length) return { bucket: 'day', points: [] };
  const spanDays = (Date.parse(days[days.length - 1]) - Date.parse(days[0])) / 86_400_000;
  const bucket: 'day' | 'month' = spanDays > 92 ? 'month' : 'day';
  const acc = new Map<string, number>();
  for (const r of rows) {
    if (!r.postingDate) continue;
    const k = bucket === 'month' ? r.postingDate.slice(0, 7) : r.postingDate;
    acc.set(k, (acc.get(k) ?? 0) + r.total);
  }
  return {
    bucket,
    points: [...acc.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, value]) => ({ label, value: round2(value) })),
  };
}

function buildAgeing(rows: Array<{ outstanding: number; overdueDays: number | null }>): Register['ageing'] {
  const defs: Array<{ label: string; test: (d: number | null) => boolean }> = [
    { label: 'Not due', test: (d) => d == null || d <= 0 },
    { label: '1–30 days', test: (d) => d != null && d >= 1 && d <= 30 },
    { label: '31–60 days', test: (d) => d != null && d >= 31 && d <= 60 },
    { label: '61–90 days', test: (d) => d != null && d >= 61 && d <= 90 },
    { label: '90+ days', test: (d) => d != null && d > 90 },
  ];
  return defs.map((def) => {
    const hit = rows.filter((r) => r.outstanding !== 0 && def.test(r.overdueDays));
    return { label: def.label, documents: hit.length, outstanding: round2(hit.reduce((a, r) => a + r.outstanding, 0)) };
  });
}

const cache = makeCache<Register>();

export async function getRegister(spec: RegisterSpec, opts: RegisterOptions): Promise<Register> {
  const key = [spec.reportName, opts.companies.join(','), opts.brand, opts.from, opts.to, opts.partiesLimit, opts.sign].join('|');
  const brandScoped = opts.brand !== 'all' && spec.brandLineDoctype !== null;
  const hit = cache.get(key);
  if (hit) return hit;

  const tenants = tenantsFor(opts.companies);
  const todayIst = istDay(new Date().toISOString());

  // Account-head columns carry the company abbreviation, so definitions and raw rows are kept per
  // company and summed afterwards.
  const headColumns: ReportColumn[] = [];
  const stdColumns: ReportColumn[] = [];
  const rawRows: Array<Record<string, unknown>> = [];

  const settled = await Promise.allSettled(tenants.map(async (t): Promise<RegisterRow[]> => {
    const api = erpHttp(t.site);
    const { rows: raw, columns } = await runQueryReport(api, spec.reportName, {
      company: t.company, from_date: opts.from, to_date: opts.to,
    });
    const currency = columns.filter((c) => c.fieldtype === 'Currency' && c.fieldname);
    headColumns.push(...currency.filter((c) => !STANDARD_CURRENCY.has(c.fieldname as string)));
    stdColumns.push(...currency.filter((c) => STANDARD_CURRENCY.has(c.fieldname as string)));
    rawRows.push(...raw.map((r) => ({ ...r, __key: `${t.site.key}|${String(r.voucher_no)}` })));
    if (!raw.length) return [];

    const names = raw.map((r) => String(r.voucher_no));
    const [meta, brandMap] = await Promise.all([
      enrichFromDoctype(api, spec.doctype, names),
      // Attribution is only paid for on a multi-brand site, and only when one brand is chosen.
      brandScoped && !t.site.fixedBrand
        ? brandsByDocument(api, spec.brandLineDoctype as string, spec.doctype, names)
        : Promise.resolve(new Map<string, Set<string>>()),
    ]);
    return raw.map((r) => {
      const voucher = String(r.voucher_no);
      const m = meta.get(voucher);
      const total = num(r.grand_total);
      const outstanding = num(r.outstanding_amount);
      const dueDate = m?.dueDate ?? null;
      // Only an unsettled document can be overdue.
      const overdueDays = dueDate && outstanding !== 0
        ? Math.floor((Date.parse(todayIst) - Date.parse(dueDate)) / 86_400_000)
        : null;
      return {
        key: `${t.site.key}|${voucher}`,
        voucher,
        postingDate: String(r.posting_date ?? ''),
        party: String(r[spec.partyNameField] ?? r[spec.partyIdField] ?? '—'),
        // The document first (stable); the report only if the document read missed it.
        net: m ? m.net : num(r.net_total),
        tax: m ? m.tax : num(r[spec.taxTotalField]),
        total,
        outstanding,
        settled: round2(total - outstanding),
        status: m?.status ?? '—',
        overdueDays,
        brands: t.site.fixedBrand ? [t.site.fixedBrand] : [...(brandMap.get(voucher) ?? [])].sort(),
      };
    });
  }));

  const sources: SourceStatus[] = [];
  let rows: RegisterRow[] = [];
  settled.forEach((r, idx) => {
    const t = tenants[idx];
    if (r.status === 'fulfilled') {
      sources.push({ company: t.company, ok: true });
      rows = rows.concat(r.value);
    } else {
      // A failed company is reported, never folded into an empty list: an outage must not read as
      // "nothing this period".
      console.error(`[finance] ${spec.reportName} (${t.company}) failed:`, (r.reason as Error)?.message ?? r.reason);
      sources.push({ company: t.company, ok: false });
    }
  });

  // One brand chosen: keep the documents that carry it. A single-brand site's documents are wholly its brand.
  if (brandScoped) rows = rows.filter((r) => r.brands.includes(opts.brand));

  const positives = rows.filter((r) => r.total > 0);
  const negatives = rows.filter((r) => r.total < 0);
  const groupTotals = (group: RegisterRow[]): GroupTotals => {
    const sum = (pick: (r: RegisterRow) => number): number => round2(group.reduce((a, r) => a + pick(r), 0));
    return {
      count: group.length,
      net: sum((r) => r.net),
      tax: sum((r) => r.tax),
      total: sum((r) => r.total),
      outstanding: sum((r) => r.outstanding),
      settled: sum((r) => r.settled),
      averageValue: group.length ? round2(group.reduce((a, r) => a + r.total, 0) / group.length) : null,
    };
  };

  // Account heads and the report's own summary columns, over the same documents. A company whose
  // document read failed after its report came back is out of `rows`, so it is kept out of here too.
  const keep = new Set(rows.map((r) => r.key));
  const keptRaw = rawRows.filter((r) => keep.has(String(r.__key)));
  const seenHead = new Map<string, string>();
  for (const c of headColumns) if (c.fieldname) seenHead.set(c.fieldname, c.label ?? c.fieldname);
  const headTotals = new Map<string, { label: string; total: number }>();
  let revPos = 0;
  let revNeg = 0;
  const revenueHeadNames = [...seenHead.entries()].filter(([, label]) => !TAX_HEAD_RE.test(label));
  for (const r of keptRaw) {
    for (const [fieldname, label] of seenHead) {
      const v = num(r[fieldname]);
      if (v === 0) continue;
      const cur = headTotals.get(fieldname) ?? { label, total: 0 };
      cur.total += v;
      headTotals.set(fieldname, cur);
    }
    // Split by sign PER DOCUMENT, so a credit note shows as its own figure.
    for (const [fieldname] of revenueHeadNames) {
      const v = num(r[fieldname]);
      if (v > 0) revPos += v;
      else if (v < 0) revNeg += v;
    }
  }
  const byAccountHead = [...headTotals.values()]
    .map((h) => ({ label: h.label, total: round2(h.total) }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

  const stdSeen = new Map<string, string>();
  for (const c of stdColumns) if (c.fieldname && !stdSeen.has(c.fieldname)) stdSeen.set(c.fieldname, c.label ?? c.fieldname);
  const stdTotals = new Map<string, { label: string; total: number }>();
  for (const r of keptRaw) {
    for (const [fieldname, label] of stdSeen) {
      const cur = stdTotals.get(fieldname) ?? { label, total: 0 };
      cur.total += num(r[fieldname]);
      stdTotals.set(fieldname, cur);
    }
  }
  const reportTotals = [...stdTotals.entries()].map(([fieldname, v]) => ({ fieldname, label: v.label, total: round2(v.total) }));

  const statusAcc = new Map<string, { count: number; total: number; outstanding: number }>();
  for (const r of rows) {
    const s = statusAcc.get(r.status) ?? { count: 0, total: 0, outstanding: 0 };
    s.count++; s.total += r.total; s.outstanding += r.outstanding;
    statusAcc.set(r.status, s);
  }
  const byStatus = [...statusAcc.entries()]
    .map(([status, v]) => ({ status, count: v.count, total: round2(v.total), outstanding: round2(v.outstanding) }))
    .sort((a, b) => b.count - a.count);

  // Ranked over ONE side. Netting returns into invoices would let a heavily credited account outrank
  // a steady one.
  const rankRows = opts.sign === 'negative' ? negatives : positives;
  const partyAcc = new Map<string, { documents: number; total: number; outstanding: number }>();
  for (const r of rankRows) {
    const c = partyAcc.get(r.party) ?? { documents: 0, total: 0, outstanding: 0 };
    c.documents++; c.total += r.total; c.outstanding += r.outstanding;
    partyAcc.set(r.party, c);
  }
  const ranked = [...partyAcc.entries()]
    .map(([party, v]) => ({ party, documents: v.documents, total: v.total, outstanding: v.outstanding }))
    .sort((a, b) => (opts.sign === 'negative' ? a.total - b.total : b.total - a.total));

  const value: Register = {
    totals: { invoices: groupTotals(positives), returns: groupTotals(negatives), all: groupTotals(rows) },
    byAccountHead,
    reportTotals,
    revenueHeads: {
      heads: revenueHeadNames.map(([, label]) => label),
      positive: round2(revPos),
      negative: round2(revNeg),
      net: round2(revPos + revNeg),
    },
    byStatus,
    ageing: buildAgeing(rows),
    topParties: opts.partiesLimit > 0 ? ranked.slice(0, opts.partiesLimit) : ranked,
    partyCount: ranked.length,
    series: buildSeries(rows),
    scopeNote: failedNote(sources),
    sources,
  };
  // A partial answer is not cached, so the next request retries the company that failed.
  if (sources.every((s) => s.ok)) cache.set(key, value);
  return value;
}

export const getSalesRegister = (opts: RegisterOptions) => getRegister(SALES_SPEC, opts);
export const getPurchaseRegister = (opts: RegisterOptions) => getRegister(PURCHASE_SPEC, opts);
