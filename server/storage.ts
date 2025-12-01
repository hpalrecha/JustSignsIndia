import {
  adminUsers,
  contactSubmissions,
  warrantyClaims,
  blogPosts,
  marketingCollateral,
  type AdminUser,
  type InsertAdminUser,
  type ContactSubmission,
  type InsertContactSubmission,
  type WarrantyClaim,
  type InsertWarrantyClaim,
  type BlogPost,
  type InsertBlogPost,
  type MarketingCollateral,
  type InsertMarketingCollateral,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Admin user operations
  getAdminUser(id: number): Promise<AdminUser | undefined>;
  getAdminUserByUsername(username: string): Promise<AdminUser | undefined>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;
  verifyAdminPassword(username: string, password: string): Promise<AdminUser | null>;

  // Contact submission operations
  getAllContactSubmissions(): Promise<ContactSubmission[]>;
  createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission>;

  // Warranty claim operations
  getAllWarrantyClaims(): Promise<WarrantyClaim[]>;
  createWarrantyClaim(claim: InsertWarrantyClaim): Promise<WarrantyClaim>;

  // Blog post operations
  getAllBlogPosts(): Promise<BlogPost[]>;
  getPublishedBlogPosts(): Promise<BlogPost[]>;
  getBlogPostById(id: number): Promise<BlogPost | undefined>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: number, post: Partial<InsertBlogPost>): Promise<BlogPost | undefined>;
  deleteBlogPost(id: number): Promise<boolean>;

  // Marketing collateral operations
  getAllMarketingCollateral(): Promise<MarketingCollateral[]>;
  getMarketingCollateralById(id: number): Promise<MarketingCollateral | undefined>;
  createMarketingCollateral(collateral: InsertMarketingCollateral): Promise<MarketingCollateral>;
  updateMarketingCollateral(id: number, collateral: Partial<InsertMarketingCollateral>): Promise<MarketingCollateral | undefined>;
  deleteMarketingCollateral(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Admin user operations
  async getAdminUser(id: number): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return user || undefined;
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
    return user || undefined;
  }

  async createAdminUser(insertUser: InsertAdminUser): Promise<AdminUser> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(adminUsers)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async verifyAdminPassword(username: string, password: string): Promise<AdminUser | null> {
    const user = await this.getAdminUserByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    return user;
  }

  // Contact submission operations
  async getAllContactSubmissions(): Promise<ContactSubmission[]> {
    return await db.select().from(contactSubmissions).orderBy(contactSubmissions.createdAt);
  }

  async createContactSubmission(insertSubmission: InsertContactSubmission): Promise<ContactSubmission> {
    const [submission] = await db
      .insert(contactSubmissions)
      .values(insertSubmission)
      .returning();
    return submission;
  }

  // Warranty claim operations
  async getAllWarrantyClaims(): Promise<WarrantyClaim[]> {
    return await db.select().from(warrantyClaims).orderBy(warrantyClaims.createdAt);
  }

  async createWarrantyClaim(insertClaim: InsertWarrantyClaim): Promise<WarrantyClaim> {
    const [claim] = await db
      .insert(warrantyClaims)
      .values(insertClaim)
      .returning();
    return claim;
  }

  // Blog post operations
  async getAllBlogPosts(): Promise<BlogPost[]> {
    return await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }

  async getPublishedBlogPosts(): Promise<BlogPost[]> {
    return await db.select().from(blogPosts).where(eq(blogPosts.published, "true")).orderBy(desc(blogPosts.createdAt));
  }

  async getBlogPostById(id: number): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return post || undefined;
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
    return post || undefined;
  }

  async createBlogPost(insertPost: InsertBlogPost): Promise<BlogPost> {
    const [post] = await db.insert(blogPosts).values(insertPost).returning();
    return post;
  }

  async updateBlogPost(id: number, updateData: Partial<InsertBlogPost>): Promise<BlogPost | undefined> {
    const [post] = await db.update(blogPosts).set({ ...updateData, updatedAt: new Date() }).where(eq(blogPosts.id, id)).returning();
    return post || undefined;
  }

  async deleteBlogPost(id: number): Promise<boolean> {
    const result = await db.delete(blogPosts).where(eq(blogPosts.id, id));
    return true;
  }

  // Marketing collateral operations
  async getAllMarketingCollateral(): Promise<MarketingCollateral[]> {
    return await db.select().from(marketingCollateral).orderBy(desc(marketingCollateral.createdAt));
  }

  async getMarketingCollateralById(id: number): Promise<MarketingCollateral | undefined> {
    const [item] = await db.select().from(marketingCollateral).where(eq(marketingCollateral.id, id));
    return item || undefined;
  }

  async createMarketingCollateral(insertCollateral: InsertMarketingCollateral): Promise<MarketingCollateral> {
    const [item] = await db.insert(marketingCollateral).values(insertCollateral).returning();
    return item;
  }

  async updateMarketingCollateral(id: number, updateData: Partial<InsertMarketingCollateral>): Promise<MarketingCollateral | undefined> {
    const [item] = await db.update(marketingCollateral).set(updateData).where(eq(marketingCollateral.id, id)).returning();
    return item || undefined;
  }

  async deleteMarketingCollateral(id: number): Promise<boolean> {
    await db.delete(marketingCollateral).where(eq(marketingCollateral.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
