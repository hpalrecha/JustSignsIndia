import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Admin users table for admin authentication
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
});

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

// Contact form submissions
export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  city: text("city").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContactSubmissionSchema = createInsertSchema(contactSubmissions).omit({
  id: true,
  createdAt: true,
});

export type InsertContactSubmission = z.infer<typeof insertContactSubmissionSchema>;
export type ContactSubmission = typeof contactSubmissions.$inferSelect;

// Warranty claim submissions
export const warrantyClaims = pgTable("warranty_claims", {
  id: serial("id").primaryKey(),
  
  // End User Information
  endUserName: text("end_user_name").notNull(),
  endUserEmail: text("end_user_email").notNull(),
  endUserMobile: text("end_user_mobile").notNull(),
  
  // Installation Details
  installationDate: text("installation_date").notNull(),
  
  // Studio Information
  studioName: text("studio_name").notNull(),
  studioEmail: text("studio_email").notNull(),
  studioContactNo: text("studio_contact_no").notNull(),
  
  // Invoice Details
  invoiceNumber: text("invoice_number").notNull(),
  invoiceUrl: text("invoice_url"),
  justSignsInvoiceNumber: text("just_signs_invoice_number").notNull(),
  justSignsInvoiceUrl: text("just_signs_invoice_url"),
  
  // Product Details
  productInstalled: text("product_installed").notNull(),
  lotNumber: text("lot_number").notNull(),
  issue: text("issue").notNull(),
  
  // Evidence
  evidence1Url: text("evidence_1_url"),
  evidence2Url: text("evidence_2_url"),
  evidence3Url: text("evidence_3_url"),
  
  // Item and Warranty Details
  claimSqft: text("claim_sqft").notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWarrantyClaimSchema = createInsertSchema(warrantyClaims).omit({
  id: true,
  createdAt: true,
});

export type InsertWarrantyClaim = z.infer<typeof insertWarrantyClaimSchema>;
export type WarrantyClaim = typeof warrantyClaims.$inferSelect;
