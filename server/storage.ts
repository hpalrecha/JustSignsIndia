import {
  adminUsers,
  contactSubmissions,
  warrantyClaims,
  type AdminUser,
  type InsertAdminUser,
  type ContactSubmission,
  type InsertContactSubmission,
  type WarrantyClaim,
  type InsertWarrantyClaim,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
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
}

export const storage = new DatabaseStorage();
