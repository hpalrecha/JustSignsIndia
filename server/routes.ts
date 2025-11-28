import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getSession, isAdminAuthenticated } from "./auth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { insertContactSubmissionSchema, insertWarrantyClaimSchema } from "@shared/schema";
import { Parser } from "json2csv";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session middleware
  app.set("trust proxy", 1);
  app.use(getSession());

  // Contact form submission endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const validatedData = insertContactSubmissionSchema.parse(req.body);
      const submission = await storage.createContactSubmission(validatedData);
      
      res.status(201).json({
        message: "Contact submission received successfully",
        id: submission.id,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }
      console.error("Error creating contact submission:", error);
      res.status(500).json({ message: "Failed to submit contact form" });
    }
  });

  // Warranty claim submission endpoint
  app.post("/api/warranty-claims", async (req, res) => {
    try {
      const validatedData = insertWarrantyClaimSchema.parse(req.body);
      const claim = await storage.createWarrantyClaim(validatedData);
      
      // Push warranty claim data to n8n webhook
      const webhookUrl = "https://n8n.subspace.money/webhook/416cdb30-f82e-4e94-a36e-f1641b24e8d5";
      try {
        // Build full URL for file links
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const baseUrl = `${protocol}://${host}`;
        
        // Helper function to convert relative path to full URL
        const toFullUrl = (path: string | null) => path ? `${baseUrl}${path}` : null;
        
        await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: claim.id,
            endUserName: claim.endUserName,
            endUserEmail: claim.endUserEmail,
            endUserMobile: claim.endUserMobile,
            installationDate: claim.installationDate,
            studioName: claim.studioName,
            studioEmail: claim.studioEmail,
            studioContactNo: claim.studioContactNo,
            invoiceNumber: claim.invoiceNumber,
            invoiceUrl: toFullUrl(claim.invoiceUrl),
            justSignsInvoiceNumber: claim.justSignsInvoiceNumber,
            justSignsInvoiceUrl: toFullUrl(claim.justSignsInvoiceUrl),
            productInstalled: claim.productInstalled,
            lotNumber: claim.lotNumber,
            issue: claim.issue,
            evidence1Url: toFullUrl(claim.evidence1Url),
            evidence2Url: toFullUrl(claim.evidence2Url),
            evidence3Url: toFullUrl(claim.evidence3Url),
            claimSqft: claim.claimSqft,
            createdAt: claim.createdAt,
          }),
        });
        console.log("Warranty claim data pushed to webhook successfully");
      } catch (webhookError) {
        console.error("Error pushing to webhook (non-blocking):", webhookError);
      }
      
      res.status(201).json({
        message: "Warranty claim submitted successfully",
        id: claim.id,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }
      console.error("Error creating warranty claim:", error);
      res.status(500).json({ message: "Failed to submit warranty claim" });
    }
  });

  // Get upload URL for warranty claim images
  app.post("/api/upload-url", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      // Extract and normalize the object path for persistent storage
      const url = new URL(uploadURL);
      const pathname = url.pathname;
      const pathParts = pathname.slice(1).split('/');
      // Skip bucket name and .private directory to get uploads/uuid
      const entityPath = pathParts.slice(2).join('/');
      const objectPath = `/objects/${entityPath}`;
      
      res.json({ 
        uploadURL,      // Temporary signed URL for uploading
        objectPath      // Permanent normalized path for database storage
      });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Serve uploaded images
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Admin login endpoint
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const adminUser = await storage.verifyAdminPassword(username, password);
      if (!adminUser) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.adminUserId = adminUser.id;
      res.json({
        message: "Login successful",
        user: {
          id: adminUser.id,
          username: adminUser.username,
        },
      });
    } catch (error) {
      console.error("Error during admin login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Admin logout endpoint
  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Check admin authentication status
  app.get("/api/admin/status", isAdminAuthenticated, async (req, res) => {
    try {
      const adminUser = await storage.getAdminUser(req.session.adminUserId!);
      if (!adminUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      res.json({
        authenticated: true,
        user: {
          id: adminUser.id,
          username: adminUser.username,
        },
      });
    } catch (error) {
      console.error("Error checking auth status:", error);
      res.status(500).json({ message: "Failed to check auth status" });
    }
  });

  // Get all contact submissions (admin only)
  app.get("/api/admin/contact-submissions", isAdminAuthenticated, async (req, res) => {
    try {
      const submissions = await storage.getAllContactSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching contact submissions:", error);
      res.status(500).json({ message: "Failed to fetch contact submissions" });
    }
  });

  // Get all warranty claims (admin only)
  app.get("/api/admin/warranty-claims", isAdminAuthenticated, async (req, res) => {
    try {
      const claims = await storage.getAllWarrantyClaims();
      res.json(claims);
    } catch (error) {
      console.error("Error fetching warranty claims:", error);
      res.status(500).json({ message: "Failed to fetch warranty claims" });
    }
  });

  // Export contact submissions as CSV (admin only)
  app.get("/api/admin/export/contacts", isAdminAuthenticated, async (req, res) => {
    try {
      const submissions = await storage.getAllContactSubmissions();
      
      const fields = ['id', 'name', 'phone', 'email', 'city', 'message', 'createdAt'];
      const parser = new Parser({ fields });
      const csv = parser.parse(submissions);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=contact-submissions.csv');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting contact submissions:", error);
      res.status(500).json({ message: "Failed to export contact submissions" });
    }
  });

  // Export warranty claims as CSV (admin only)
  app.get("/api/admin/export/warranty-claims", isAdminAuthenticated, async (req, res) => {
    try {
      const claims = await storage.getAllWarrantyClaims();
      
      const fields = [
        'id',
        'endUserName',
        'endUserEmail',
        'endUserMobile',
        'installationDate',
        'studioName',
        'studioEmail',
        'studioContactNo',
        'invoiceNumber',
        'invoiceUrl',
        'justSignsInvoiceNumber',
        'justSignsInvoiceUrl',
        'productInstalled',
        'lotNumber',
        'issue',
        'evidence1Url',
        'evidence2Url',
        'evidence3Url',
        'claimSqft',
        'createdAt',
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(claims);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=warranty-claims.csv');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting warranty claims:", error);
      res.status(500).json({ message: "Failed to export warranty claims" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
