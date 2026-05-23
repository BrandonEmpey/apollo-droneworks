import { Express } from "express";
import { db } from "./db";
import { quotes, users } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "./auth";
import { createNotification } from "./notification-routes";

interface QuoteData {
  clientInfo: {
    name: string;
    email: string;
    phone: string;
    company: string;
    location: string;
    zipCode: string;
  };
  projectDetails: {
    projectName: string;
    description: string;
    timeline: string;
    rushDelivery: boolean;
  };
  items: Array<{
    serviceId: number;
    serviceName: string;
    quantity: number;
    basePrice: number;
    addons: number[];
    isRush: boolean;
  }>;
  calculation: {
    totalPrice: number;
    breakdown: Array<{
      serviceId: number | null;
      serviceName: string;
      quantity: number;
      basePrice: number;
      finalPrice: number;
      isRush: boolean;
    }>;
    zone: string;
    currency: string;
  };
  validUntil: Date;
}

export function registerQuoteRoutes(app: Express) {
  
  // Generate and send quote
  app.post("/api/quotes/generate", async (req, res) => {
    try {
      const quoteData: QuoteData = req.body;

      // Validate that validUntil is a parseable date before touching the DB.
      if (!quoteData.validUntil || isNaN(new Date(quoteData.validUntil).getTime())) {
        return res.status(400).json({ message: "validUntil must be a valid date" });
      }

      // This is a public endpoint – no session is required. Resolve the
      // userId by preferring the authenticated user (if any), then falling
      // back to the first admin account as a "system" owner for the record.
      let resolvedUserId: number | undefined = (req as any).user?.id;
      if (!resolvedUserId) {
        const [adminUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.isAdmin, true))
          .limit(1);
        resolvedUserId = adminUser?.id;
      }
      if (!resolvedUserId) {
        return res.status(503).json({ message: "No system user available to own the quote" });
      }

      // Create quote record
      const quote = await db.insert(quotes).values({
        userId: resolvedUserId,
        clientName: quoteData.clientInfo.name,
        clientEmail: quoteData.clientInfo.email,
        clientPhone: quoteData.clientInfo.phone,
        clientCompany: quoteData.clientInfo.company,
        projectName: quoteData.projectDetails.projectName,
        projectDescription: quoteData.projectDetails.description,
        location: quoteData.clientInfo.location,
        zipCode: quoteData.clientInfo.zipCode,
        totalAmount: quoteData.calculation.totalPrice.toString(),
        items: quoteData.items,
        breakdown: quoteData.calculation.breakdown,
        isRush: quoteData.projectDetails.rushDelivery,
        status: 'sent',
        expiryDate: new Date(quoteData.validUntil),
        createdAt: new Date()
      }).returning();

      // Send notification to admin users
      const adminUsers = await db.select()
        .from(users)
        .where(eq(users.isAdmin, true));

      for (const admin of adminUsers) {
        await createNotification({
          userId: admin.id,
          type: 'quote_generated',
          title: 'New Quote Generated',
          message: `Quote for ${quoteData.clientInfo.name} - ${quoteData.projectDetails.projectName}`,
          metadata: { 
            quoteId: quote[0].id, 
            clientName: quoteData.clientInfo.name,
            totalAmount: quoteData.calculation.totalPrice
          },
          priority: 'medium'
        });
      }

      // TODO: Send email to client with quote details
      // This would require email service integration
      
      res.status(201).json({
        message: "Quote generated successfully",
        quoteId: quote[0].id,
        quote: quote[0]
      });

    } catch (error) {
      console.error("Error generating quote:", error);
      res.status(500).json({ message: "Failed to generate quote" });
    }
  });

  // Get all quotes (admin only)
  app.get("/api/quotes", requireAuth, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const allQuotes = await db.select()
        .from(quotes)
        .orderBy(desc(quotes.createdAt));

      res.json(allQuotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  // Get quote by ID
  app.get("/api/quotes/:id", async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      
      const [quote] = await db.select()
        .from(quotes)
        .where(eq(quotes.id, quoteId));

      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      res.json(quote);
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  // Update quote status
  app.put("/api/quotes/:id/status", requireAuth, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const quoteId = parseInt(req.params.id);
      const { status } = req.body;

      const updatedQuote = await db.update(quotes)
        .set({ 
          status, 
          updatedAt: new Date() 
        })
        .where(eq(quotes.id, quoteId))
        .returning();

      if (updatedQuote.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Notify admins of status change
      const adminUsers = await db.select()
        .from(users)
        .where(eq(users.isAdmin, true));

      for (const admin of adminUsers) {
        await createNotification({
          userId: admin.id,
          type: 'quote_status_change',
          title: 'Quote Status Updated',
          message: `Quote #${quoteId} status changed to ${status}`,
          metadata: { quoteId, status },
          priority: 'low'
        });
      }

      res.json(updatedQuote[0]);
    } catch (error) {
      console.error("Error updating quote status:", error);
      res.status(500).json({ message: "Failed to update quote status" });
    }
  });

  // Accept quote (convert to booking)
  app.post("/api/quotes/:id/accept", async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      
      const [quote] = await db.select()
        .from(quotes)
        .where(eq(quotes.id, quoteId));

      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      if (quote.status !== 'sent') {
        return res.status(400).json({ message: "Quote cannot be accepted in current status" });
      }

      // Update quote status to accepted
      await db.update(quotes)
        .set({ 
          status: 'accepted',
          acceptedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(quotes.id, quoteId));

      // Notify admins
      const adminUsers = await db.select()
        .from(users)
        .where(eq(users.isAdmin, true));

      for (const admin of adminUsers) {
        await createNotification({
          userId: admin.id,
          type: 'quote_accepted',
          title: 'Quote Accepted',
          message: `Quote #${quoteId} has been accepted by ${quote.clientName}`,
          metadata: { 
            quoteId, 
            clientName: quote.clientName,
            totalAmount: parseFloat(quote.totalAmount)
          },
          priority: 'high'
        });
      }

      res.json({ 
        message: "Quote accepted successfully",
        redirectUrl: `/booking?quoteId=${quoteId}`
      });

    } catch (error) {
      console.error("Error accepting quote:", error);
      res.status(500).json({ message: "Failed to accept quote" });
    }
  });

  // Reject quote
  app.post("/api/quotes/:id/reject", async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      const { reason } = req.body;
      
      const [quote] = await db.select()
        .from(quotes)
        .where(eq(quotes.id, quoteId));

      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Update quote status to rejected
      await db.update(quotes)
        .set({ 
          status: 'rejected',
          rejectionReason: reason,
          updatedAt: new Date()
        })
        .where(eq(quotes.id, quoteId));

      // Notify admins
      const adminUsers = await db.select()
        .from(users)
        .where(eq(users.isAdmin, true));

      for (const admin of adminUsers) {
        await createNotification({
          userId: admin.id,
          type: 'quote_rejected',
          title: 'Quote Rejected',
          message: `Quote #${quoteId} has been rejected by ${quote.clientName}`,
          metadata: { 
            quoteId, 
            clientName: quote.clientName,
            reason
          },
          priority: 'medium'
        });
      }

      res.json({ message: "Quote rejected" });

    } catch (error) {
      console.error("Error rejecting quote:", error);
      res.status(500).json({ message: "Failed to reject quote" });
    }
  });
}