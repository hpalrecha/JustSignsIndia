/**
 * Checks a Just Signs ERPNext user's own password.
 *
 * Copied from P91Elite (artifacts/api-server/src/services/erp-login.ts, verifyErpLogin), narrowed to
 * the Just Signs ERP. The password is checked by ERPNext's own session login
 * (POST {JUSTSIGNS_ERPNEXT_BASE_URL}/api/method/login, form data usr/pwd) — this site never stores it.
 * The ERP session that call opens is logged out straight away.
 *
 * This is the ONLY non-GET request this app sends to ERP, and it is kept out of the read-only finance
 * client (server/finance/erp-client.ts) on purpose. It needs no API key: it authenticates the person.
 *
 *   'valid'   -> ERP accepted the credentials (200)
 *   'invalid' -> ERP rejected them (401, or another 4xx such as a disabled user)
 *   'error'   -> ERP unreachable, misconfigured or 5xx — the caller answers 503 "try again"
 */

export type ErpLoginResult = 'valid' | 'invalid' | 'error';

function baseUrl(): string | undefined {
  const v = (process.env.JUSTSIGNS_ERPNEXT_BASE_URL ?? '').trim().replace(/\/+$/, '');
  return v || undefined;
}

export async function verifyErpLogin(usr: string, pwd: string): Promise<ErpLoginResult> {
  const base = baseUrl();
  if (!base) {
    console.error('[erp-login] JUSTSIGNS_ERPNEXT_BASE_URL is not set — cannot check ERP passwords');
    return 'error';
  }
  let res: Response;
  try {
    res = await fetch(`${base}/api/method/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ usr, pwd }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    console.error('[erp-login] ERP login request failed:', (err as Error)?.message ?? err);
    return 'error';
  }

  const sid = (res.headers.get('set-cookie') ?? '').match(/sid=([^;]+)/)?.[1];
  if (sid && sid !== 'Guest') void logoutErp(base, sid); // best-effort, not awaited

  if (res.status === 200) return 'valid';
  if (res.status === 401) return 'invalid';
  console.warn(`[erp-login] unexpected ERP login status ${res.status}`);
  return res.status >= 500 ? 'error' : 'invalid';
}

async function logoutErp(base: string, sid: string): Promise<void> {
  try {
    await fetch(`${base}/api/method/logout`, {
      method: 'POST',
      headers: { Cookie: `sid=${sid}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    /* best-effort */
  }
}
