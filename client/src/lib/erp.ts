import { useEffect } from "react";

/** Adds <meta name="robots" content="noindex, nofollow"> while an ERP page is mounted. */
export function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);
}

export type ErpUser = { id: string | number; username: string; name?: string; role?: string };

export type FinanceMe = {
  role?: string;
  roleLabel?: string;
  pages?: string[];
  companies?: unknown;
  billOnly?: boolean;
};

/** The finance page's own view keys (same as P91Elite's FinanceView). */
export const FINANCE_VIEW_KEYS = ["profit", "sales", "purchase", "receivable", "payable", "stock"] as const;
export type FinanceViewKey = (typeof FINANCE_VIEW_KEYS)[number];

/** Map whatever shape /api/finance/me uses for a page key onto our view key. */
export function normalizeFinancePage(page: string): FinanceViewKey | null {
  const k = String(page ?? "")
    .toLowerCase()
    .trim()
    .replace(/^finance[-_]/, "")
    .replace(/[_\s&]+/g, "-")
    .replace(/-+/g, "-");
  if (["profit", "profit-loss", "pl", "p-l", "pnl", "profit-and-loss"].includes(k)) return "profit";
  if (["sales", "sale"].includes(k)) return "sales";
  if (["purchase", "purchases"].includes(k)) return "purchase";
  if (["receivable", "receivables", "accounts-receivable", "ar"].includes(k)) return "receivable";
  if (["payable", "payables", "accounts-payable", "ap"].includes(k)) return "payable";
  if (["stock", "stock-balance", "inventory"].includes(k)) return "stock";
  return null;
}

/** GET a JSON endpoint; resolves {status, body} without throwing on non-2xx. */
export async function getJson<T>(url: string): Promise<{ status: number; body: T | null }> {
  const res = await fetch(url, { credentials: "include" });
  let body: T | null = null;
  try {
    body = (await res.json()) as T;
  } catch {
    body = null;
  }
  return { status: res.status, body };
}
