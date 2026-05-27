import type { Request, Response, NextFunction, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

declare module 'express-session' {
  interface SessionData {
    adminUserId?: number;
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
