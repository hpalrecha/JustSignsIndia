import { db } from "./db";
import { adminUsers } from "@shared/schema";
import bcrypt from "bcrypt";

async function seed() {
  console.log("Seeding database...");
  
  // Create default admin user if not exists
  const existingAdmin = await db.select().from(adminUsers).limit(1);
  
  if (existingAdmin.length === 0) {
    const hashedPassword = await bcrypt.hash("Admin@2024", 10);
    await db.insert(adminUsers).values({
      username: "admin",
      password: hashedPassword,
    });
    console.log("Created default admin user:");
    console.log("  Username: admin");
    console.log("  Password: admin@123");
  } else {
    console.log("Admin user already exists, skipping...");
  }
  
  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
