import { Express } from "express";
import { db } from "./db";
import { 
  referralPrograms, 
  referralCodes, 
  referralTracking, 
  satisfactionSurveys,
  serviceCredits,
  insertReferralProgramSchema,
  insertReferralCodeSchema,
  insertReferralTrackingSchema,
  insertSatisfactionSurveySchema,
  insertServiceCreditSchema
} from "@shared/referral-schema";
import { eq, and, desc, sum, count, gte, lte } from "drizzle-orm";
import { requireAuth } from "./auth";

export function registerReferralRoutes(app: Express) {
  
  // Referral Programs Management
  app.get("/api/referral/programs", requireAuth, async (req, res) => {
    try {
      const programs = await db.select()
        .from(referralPrograms)
        .orderBy(desc(referralPrograms.createdAt));
      res.json(programs);
    } catch (error) {
      console.error("Error fetching referral programs:", error);
      res.status(500).json({ message: "Failed to fetch referral programs" });
    }
  });

  app.post("/api/referral/programs", requireAuth, async (req, res) => {
    try {
      const validatedData = insertReferralProgramSchema.parse(req.body);
      const [program] = await db.insert(referralPrograms)
        .values(validatedData)
        .returning();
      res.status(201).json(program);
    } catch (error) {
      console.error("Error creating referral program:", error);
      res.status(500).json({ message: "Failed to create referral program" });
    }
  });

  app.put("/api/referral/programs/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertReferralProgramSchema.parse(req.body);
      
      const [updatedProgram] = await db.update(referralPrograms)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(referralPrograms.id, id))
        .returning();
      
      if (!updatedProgram) {
        return res.status(404).json({ message: "Referral program not found" });
      }
      
      res.json(updatedProgram);
    } catch (error) {
      console.error("Error updating referral program:", error);
      res.status(500).json({ message: "Failed to update referral program" });
    }
  });

  // Referral Codes Management
  app.get("/api/referral/codes", requireAuth, async (req, res) => {
    try {
      const codes = await db.select({
        id: referralCodes.id,
        code: referralCodes.code,
        referrerId: referralCodes.referrerId,
        programId: referralCodes.programId,
        isActive: referralCodes.isActive,
        usageCount: referralCodes.usageCount,
        maxUsage: referralCodes.maxUsage,
        expiresAt: referralCodes.expiresAt,
        createdAt: referralCodes.createdAt,
        programName: referralPrograms.name
      })
      .from(referralCodes)
      .leftJoin(referralPrograms, eq(referralCodes.programId, referralPrograms.id))
      .orderBy(desc(referralCodes.createdAt));
      
      res.json(codes);
    } catch (error) {
      console.error("Error fetching referral codes:", error);
      res.status(500).json({ message: "Failed to fetch referral codes" });
    }
  });

  app.post("/api/referral/codes/generate", requireAuth, async (req, res) => {
    try {
      const { referrerId, programId, customCode, maxUsage, expiresAt } = req.body;
      
      // Generate unique code if not provided
      const code = customCode || `REF${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const codeData = {
        code,
        referrerId,
        programId,
        maxUsage: maxUsage || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      };
      
      const [referralCode] = await db.insert(referralCodes)
        .values(codeData)
        .returning();
      
      res.status(201).json(referralCode);
    } catch (error) {
      console.error("Error generating referral code:", error);
      res.status(500).json({ message: "Failed to generate referral code" });
    }
  });

  // Validate and apply referral code (public endpoint)
  app.post("/api/referral/validate-code", async (req, res) => {
    try {
      const { code } = req.body;
      
      const [referralCode] = await db.select({
        id: referralCodes.id,
        code: referralCodes.code,
        referrerId: referralCodes.referrerId,
        programId: referralCodes.programId,
        isActive: referralCodes.isActive,
        usageCount: referralCodes.usageCount,
        maxUsage: referralCodes.maxUsage,
        expiresAt: referralCodes.expiresAt,
        program: referralPrograms
      })
      .from(referralCodes)
      .leftJoin(referralPrograms, eq(referralCodes.programId, referralPrograms.id))
      .where(eq(referralCodes.code, code));
      
      if (!referralCode) {
        return res.status(404).json({ message: "Invalid referral code" });
      }
      
      // Check if code is active
      if (!referralCode.isActive || !referralCode.program.isActive) {
        return res.status(400).json({ message: "Referral code is inactive" });
      }
      
      // Check expiration
      if (referralCode.expiresAt && new Date() > referralCode.expiresAt) {
        return res.status(400).json({ message: "Referral code has expired" });
      }
      
      // Check usage limit
      if (referralCode.maxUsage && referralCode.usageCount >= referralCode.maxUsage) {
        return res.status(400).json({ message: "Referral code usage limit reached" });
      }
      
      res.json({
        valid: true,
        code: referralCode.code,
        refereeDiscount: {
          type: referralCode.program.refereeRewardType,
          value: referralCode.program.refereeRewardValue
        },
        minimumOrderValue: referralCode.program.minimumOrderValue
      });
    } catch (error) {
      console.error("Error validating referral code:", error);
      res.status(500).json({ message: "Failed to validate referral code" });
    }
  });

  // Referral Tracking and Analytics
  app.get("/api/referral/analytics", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate, programId } = req.query;
      
      let query = db.select({
        totalReferrals: count(referralTracking.id),
        totalRewardsPaid: sum(referralTracking.referrerRewardAmount),
        completedReferrals: count(referralTracking.id),
        pendingReferrals: count(referralTracking.id)
      }).from(referralTracking);
      
      if (startDate && endDate) {
        query = query.where(and(
          gte(referralTracking.createdAt, new Date(startDate as string)),
          lte(referralTracking.createdAt, new Date(endDate as string))
        ));
      }
      
      if (programId) {
        const programCodes = await db.select({ id: referralCodes.id })
          .from(referralCodes)
          .where(eq(referralCodes.programId, parseInt(programId as string)));
        
        const codeIds = programCodes.map(code => code.id);
        if (codeIds.length > 0) {
          query = query.where(eq(referralTracking.referralCodeId, codeIds[0])); // Simplified
        }
      }
      
      const [analytics] = await query;
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching referral analytics:", error);
      res.status(500).json({ message: "Failed to fetch referral analytics" });
    }
  });

  // Satisfaction Surveys
  app.get("/api/satisfaction/surveys", requireAuth, async (req, res) => {
    try {
      const surveys = await db.select()
        .from(satisfactionSurveys)
        .orderBy(desc(satisfactionSurveys.submittedAt));
      res.json(surveys);
    } catch (error) {
      console.error("Error fetching satisfaction surveys:", error);
      res.status(500).json({ message: "Failed to fetch satisfaction surveys" });
    }
  });

  app.post("/api/satisfaction/survey", async (req, res) => {
    try {
      const validatedData = insertSatisfactionSurveySchema.parse(req.body);
      const [survey] = await db.insert(satisfactionSurveys)
        .values(validatedData)
        .returning();
      
      // Auto-generate testimonial if rating is high
      if (survey.overallRating >= 4 && survey.wouldRecommend && survey.feedback) {
        await db.update(satisfactionSurveys)
          .set({ 
            isTestimonial: true,
            publicTestimonial: survey.feedback.substring(0, 250) + "..."
          })
          .where(eq(satisfactionSurveys.id, survey.id));
      }
      
      res.status(201).json(survey);
    } catch (error) {
      console.error("Error submitting satisfaction survey:", error);
      res.status(500).json({ message: "Failed to submit satisfaction survey" });
    }
  });

  // Service Credits Management
  app.get("/api/service-credits/:customerId", requireAuth, async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const credits = await db.select()
        .from(serviceCredits)
        .where(and(
          eq(serviceCredits.customerId, customerId),
          eq(serviceCredits.isUsed, false)
        ))
        .orderBy(desc(serviceCredits.createdAt));
      
      res.json(credits);
    } catch (error) {
      console.error("Error fetching service credits:", error);
      res.status(500).json({ message: "Failed to fetch service credits" });
    }
  });

  app.post("/api/service-credits", requireAuth, async (req, res) => {
    try {
      const validatedData = insertServiceCreditSchema.parse(req.body);
      const [credit] = await db.insert(serviceCredits)
        .values(validatedData)
        .returning();
      
      res.status(201).json(credit);
    } catch (error) {
      console.error("Error creating service credit:", error);
      res.status(500).json({ message: "Failed to create service credit" });
    }
  });

  // Apply service credit to order
  app.post("/api/service-credits/:creditId/apply", requireAuth, async (req, res) => {
    try {
      const creditId = parseInt(req.params.creditId);
      const { orderId } = req.body;
      
      const [updatedCredit] = await db.update(serviceCredits)
        .set({ 
          isUsed: true, 
          usedAt: new Date(), 
          usedForOrderId: orderId 
        })
        .where(and(
          eq(serviceCredits.id, creditId),
          eq(serviceCredits.isUsed, false)
        ))
        .returning();
      
      if (!updatedCredit) {
        return res.status(404).json({ message: "Service credit not found or already used" });
      }
      
      res.json(updatedCredit);
    } catch (error) {
      console.error("Error applying service credit:", error);
      res.status(500).json({ message: "Failed to apply service credit" });
    }
  });

  // Process referral reward when order is completed
  app.post("/api/referral/process-reward", requireAuth, async (req, res) => {
    try {
      const { referralCodeId, refereeId, orderId, orderValue } = req.body;
      
      // Get referral code and program details
      const [referralCode] = await db.select({
        id: referralCodes.id,
        referrerId: referralCodes.referrerId,
        program: referralPrograms
      })
      .from(referralCodes)
      .leftJoin(referralPrograms, eq(referralCodes.programId, referralPrograms.id))
      .where(eq(referralCodes.id, referralCodeId));
      
      if (!referralCode) {
        return res.status(404).json({ message: "Referral code not found" });
      }
      
      // Calculate rewards
      const program = referralCode.program;
      let referrerReward = 0;
      let refereeReward = 0;
      
      if (program.referrerRewardType === 'percentage') {
        referrerReward = (parseFloat(program.referrerRewardValue) / 100) * orderValue;
      } else {
        referrerReward = parseFloat(program.referrerRewardValue);
      }
      
      if (program.refereeRewardType === 'percentage') {
        refereeReward = (parseFloat(program.refereeRewardValue) / 100) * orderValue;
      } else {
        refereeReward = parseFloat(program.refereeRewardValue);
      }
      
      // Create referral tracking record
      const [tracking] = await db.insert(referralTracking)
        .values({
          referralCodeId,
          referrerId: referralCode.referrerId,
          refereeId,
          orderId,
          orderValue: orderValue.toString(),
          referrerRewardAmount: referrerReward.toString(),
          refereeRewardAmount: refereeReward.toString(),
          status: 'completed'
        })
        .returning();
      
      // Create service credits for both parties
      await db.insert(serviceCredits).values([
        {
          customerId: referralCode.referrerId,
          amount: referrerReward.toString(),
          source: 'referral',
          sourceId: tracking.id,
          description: 'Referral reward for successful referral'
        },
        {
          customerId: refereeId,
          amount: refereeReward.toString(),
          source: 'referral',
          sourceId: tracking.id,
          description: 'Welcome bonus for using referral code'
        }
      ]);
      
      // Update referral code usage count
      await db.update(referralCodes)
        .set({ usageCount: referralCode.program.usageCount + 1 })
        .where(eq(referralCodes.id, referralCodeId));
      
      res.json({
        tracking,
        referrerReward,
        refereeReward,
        message: "Referral rewards processed successfully"
      });
    } catch (error) {
      console.error("Error processing referral reward:", error);
      res.status(500).json({ message: "Failed to process referral reward" });
    }
  });
}