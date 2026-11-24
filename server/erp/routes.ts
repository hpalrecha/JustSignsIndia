/**
 * Finance sign-in for https://justsigns.co.in/erp/login.
 *
 *   POST /api/erp/login   {username, password}
 *        200 {success:true, data:{id, username, name, role}}
 *        400 missing fields · 401 wrong ERP username/password · 403 no Finance access
 *        429 too many attempts · 503 ERP unreachable / not configured
 *   POST /api/erp/logout  -> {success:true}
 *   GET  /api/erp/me      -> 200 {success:true, data:{id, username, name, role}} | 401 {success:false}
 *
 * The person signs in with their own Just Signs ERPNext login (username = ERP login email or ERP
 * username); ERP checks the password (erp-login.ts). Who gets in:
 *   1. an erp_users row for that login (active) — its role wins (admin, or nsm as an override);
 *      an inactive row blocks the login;
 *   2. otherwise the active ERP Employee's designation must derive to 'nsm' (tier-rules.ts);
 *   3. everyone else: 403 "Your ERP account does not have Finance access."
 */
import { Router, type Request, type Response } from 'express';
import { pool } from '../db';
import { isErpAuthenticated, type ErpSessionUser } from '../auth';
import { makeRateLimiter } from '../finance/finance-rules';
import { FinanceNotConfigured } from '../finance/erp-client';
import { verifyErpLogin } from './erp-login';
import { lookupErpIdentity } from './erp-identity';

const router = Router();

// 10 attempts per 15 minutes per IP + username; a second, wider cap per IP stops username spraying.
const allowAttempt = makeRateLimiter(10, 15 * 60_000);
const allowIp = makeRateLimiter(50, 15 * 60_000);

const NO_ACCESS = 'Your ERP account does not have Finance access.';
const TRY_AGAIN = 'Could not reach ERP just now. Try again in a minute.';

const publicUser = (u: ErpSessionUser) => ({ id: u.id, username: u.username, name: u.name, role: u.role });

function regenerate(req: Request): Promise<void> {
  return new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
}
function save(req: Request): Promise<void> {
  return new Promise((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));
}

router.post('/login', async (req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store');
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }
  if (username.length > 140 || password.length > 256) {
    return res.status(400).json({ success: false, message: 'Username or password is too long' });
  }
  const ip = String(req.ip ?? '');
  if (!allowIp(ip) || !allowAttempt(`${ip}|${username.toLowerCase()}`)) {
    return res.status(429).json({ success: false, message: 'Too many sign-in attempts. Wait 15 minutes and try again.' });
  }

  try {
    const check = await verifyErpLogin(username, password);
    if (check === 'error') return res.status(503).json({ success: false, message: TRY_AGAIN });
    if (check === 'invalid') return res.status(401).json({ success: false, message: 'Invalid username or password' });

    const who = await lookupErpIdentity(username);
    const r = await pool.query(
      'SELECT id, username, name, role, active FROM erp_users WHERE lower(username) = lower($1) OR lower(username) = lower($2) LIMIT 1',
      [who.email, username],
    );
    const row = r.rows[0] as { id: number; username: string; name: string | null; role: string; active: boolean | null } | undefined;
    if (row && row.active === false) return res.status(403).json({ success: false, message: NO_ACCESS });

    const role: ErpSessionUser['role'] | null =
      row && (row.role === 'admin' || row.role === 'nsm') ? row.role : who.tier === 'nsm' ? 'nsm' : null;
    if (!role) {
      console.warn(`[erp-login] ${who.email} signed in to ERP but has no Finance access (designation: ${who.designation ?? 'none'})`);
      return res.status(403).json({ success: false, message: NO_ACCESS });
    }

    const user: ErpSessionUser = {
      id: who.employeeId ?? who.email,
      username: who.email.toLowerCase(),
      name: who.name || row?.name || who.email,
      role,
      verifiedAt: Date.now(),
    };
    // Keep the admin session (if any) across the regenerate; regenerate stops session fixation.
    const adminUserId = req.session.adminUserId;
    await regenerate(req);
    if (adminUserId) req.session.adminUserId = adminUserId;
    req.session.erpUser = user;
    req.session.erpUserId = row?.id;
    await save(req);
    return res.json({ success: true, data: publicUser(user) });
  } catch (err) {
    if (err instanceof FinanceNotConfigured) {
      console.error('[erp-login] Just Signs ERP is not configured:', err.message);
      return res.status(503).json({ success: false, message: TRY_AGAIN });
    }
    console.error('[erp-login] sign-in failed:', (err as Error)?.message ?? err);
    return res.status(503).json({ success: false, message: TRY_AGAIN });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.set({ 'Cache-Control': 'no-store', 'Clear-Site-Data': '"cache"' });
  req.session.erpUser = undefined;
  req.session.erpUserId = undefined;
  req.session.save(() => res.json({ success: true }));
});

router.get('/me', isErpAuthenticated, (req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store');
  return res.json({ success: true, data: publicUser(req.erpUser as ErpSessionUser) });
});

export default router;
