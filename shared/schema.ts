import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, serial, boolean, integer, jsonb, check } from "drizzle-orm/pg-core";
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
  invoiceUrl: text("invoice_url").notNull(),
  justSignsInvoiceNumber: text("just_signs_invoice_number").notNull(),
  justSignsInvoiceUrl: text("just_signs_invoice_url").notNull(),
  
  // Product Details
  productInstalled: text("product_installed").notNull(),
  lotNumber: text("lot_number").notNull(),
  issue: text("issue").notNull(),
  
  // Evidence
  evidence1Url: text("evidence_1_url").notNull(),
  evidence2Url: text("evidence_2_url").notNull(),
  evidence3Url: text("evidence_3_url").notNull(),
  
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

// Blog posts
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  featuredImageUrl: text("featured_image_url"),
  published: text("published").notNull().default("false"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

// Marketing collateral
export const marketingCollateral = pgTable("marketing_collateral", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(),
  fileName: text("file_name").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMarketingCollateralSchema = createInsertSchema(marketingCollateral).omit({
  id: true,
  createdAt: true,
});

export type InsertMarketingCollateral = z.infer<typeof insertMarketingCollateralSchema>;
export type MarketingCollateral = typeof marketingCollateral.$inferSelect;

// ── ERP Finance (/erp) ──────────────────────────────────────────────────────────────────────────
// Created at server startup with CREATE TABLE IF NOT EXISTS (server/finance/db-bootstrap.ts); these
// definitions mirror that DDL. The password is checked by the Just Signs ERPNext, never stored here:
// a row only grants or overrides a Finance role for an ERP login (username = ERP login email).
export const erpUsers = pgTable("erp_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name"),
  role: text("role").notNull().default("nsm"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [check("erp_users_role_check", sql`${t.role} in ('nsm','admin')`)]);

export type ErpUser = typeof erpUsers.$inferSelect;

export const financeAccessLog = pgTable("finance_access_log", {
  id: serial("id").primaryKey(),
  username: text("username"),
  role: text("role"),
  endpoint: text("endpoint").notNull(),
  query: jsonb("query"),
  status: integer("status"),
  ip: text("ip"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
