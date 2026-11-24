import type { Request, Response, NextFunction, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { pool } from "./db";

declare module 'express-session' {
  interface SessionData {
    adminUserId?: number;
    /** Local erp_users row id, when the Finance login matched one. */
    erpUserId?: number;
    /** The Finance (/erp) login: a Just Signs ERPNext user, checked against ERP at sign-in. */
    erpUser?: ErpSessionUser;
  }
}

export interface ErpSessionUser {
  /** ERP Employee id (HR-EMP-xxxxx), or the login email when ERP has no active Employee for it. */
  id: string;
  /** ERP login email. */
  username: string;
  name: string;
  role: "nsm" | "admin";
  /** epoch ms of the ERP password check. */
  verifiedAt: number;
}

/** A Finance session is re-checked against ERP (password + designation) after this long. */
export const ERP_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

declare global {
  namespace Express {
    interface Request {
      /** Set by isErpAuthenticated. */
      erpUser?: ErpSessionUser;
    }
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.CUSTOM_DATABASE_URL || process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl / 1000, // convert to seconds
  });

  return session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "just-signs-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export const isAdminAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.session.adminUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const adminUser = await storage.getAdminUser(req.session.adminUserId);
    if (!adminUser) {
      req.session.adminUserId = undefined;
      return res.status(401).json({ message: "Unauthorized" });
    }

    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Finance (/erp) sessions. The role was decided at sign-in (ERP designation, or an erp_users row);
 * here the session is only held to its age, and to the erp_users row when there is one: deactivating
 * the row, or changing its role, takes effect on the next request.
 */
export const isErpAuthenticated: RequestHandler = async (req, res, next) => {
  const u = req.session.erpUser;
  if (!u || Date.now() - u.verifiedAt > ERP_SESSION_MAX_AGE_MS) {
    req.session.erpUser = undefined;
    req.session.erpUserId = undefined;
    return res.status(401).json({ success: false, message: "Please sign in again." });
  }
  try {
    const r = await pool.query(
      "SELECT id, role, active FROM erp_users WHERE lower(username) = lower($1) LIMIT 1",
      [u.username],
    );
    const row = r.rows[0] as { id: number; role: string; active: boolean | null } | undefined;
    if (row) {
      if (row.active === false) {
        req.session.erpUser = undefined;
        req.session.erpUserId = undefined;
        return res.status(401).json({ success: false, message: "Your Finance access has been turned off." });
      }
      if (row.role === "nsm" || row.role === "admin") u.role = row.role;
    } else if (req.session.erpUserId) {
      // Signed in through a local row that has since been deleted.
      req.session.erpUser = undefined;
      req.session.erpUserId = undefined;
      return res.status(401).json({ success: false, message: "Please sign in again." });
    }
    req.erpUser = u;
    next();
  } catch (error) {
    console.error("ERP auth error:", (error as Error)?.message ?? error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
