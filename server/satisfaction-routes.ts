import { Express } from "express";
import { db } from "./db";
import { satisfactionSurveys, testimonials, insertSatisfactionSurveySchema } from "@shared/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { requireAuth } from "./auth";

export function registerSatisfactionRoutes(app: Express) {
  // Get all satisfaction surveys
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

  // Get a specific survey by ID
  app.get("/api/satisfaction/surveys/:id", requireAuth, async (req, res) => {
    try {
      const surveyId = parseInt(req.params.id);
      const [survey] = await db.select()
        .from(satisfactionSurveys)
        .where(eq(satisfactionSurveys.id, surveyId));
      
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      res.json(survey);
    } catch (error) {
      console.error("Error fetching survey:", error);
      res.status(500).json({ message: "Failed to fetch survey" });
    }
  });

  // Create a new satisfaction survey
  app.post("/api/satisfaction/surveys", requireAuth, async (req, res) => {
    try {
      const validatedData = insertSatisfactionSurveySchema.parse(req.body);
      const [survey] = await db.insert(satisfactionSurveys)
        .values(validatedData)
        .returning();
      res.json(survey);
    } catch (error) {
      console.error("Error creating satisfaction survey:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid survey data", errors: error });
      }
      res.status(500).json({ message: "Failed to create satisfaction survey" });
    }
  });

  // Update a satisfaction survey
  app.put("/api/satisfaction/surveys/:id", requireAuth, async (req, res) => {
    try {
      const surveyId = parseInt(req.params.id);
      const validatedData = insertSatisfactionSurveySchema.partial().parse(req.body);
      const [updatedSurvey] = await db.update(satisfactionSurveys)
        .set(validatedData)
        .where(eq(satisfactionSurveys.id, surveyId))
        .returning();
      
      if (!updatedSurvey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      res.json(updatedSurvey);
    } catch (error) {
      console.error("Error updating satisfaction survey:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid survey data", errors: error });
      }
      res.status(500).json({ message: "Failed to update satisfaction survey" });
    }
  });

  // Delete a satisfaction survey
  app.delete("/api/satisfaction/surveys/:id", requireAuth, async (req, res) => {
    try {
      const surveyId = parseInt(req.params.id);
      await db.delete(satisfactionSurveys)
        .where(eq(satisfactionSurveys.id, surveyId));
      res.json({ message: "Survey deleted successfully" });
    } catch (error) {
      console.error("Error deleting satisfaction survey:", error);
      res.status(500).json({ message: "Failed to delete satisfaction survey" });
    }
  });

  // Send follow-up email for a survey
  app.post("/api/satisfaction/surveys/:id/send-follow-up", requireAuth, async (req, res) => {
    try {
      const surveyId = parseInt(req.params.id);
      const [survey] = await db.select()
        .from(satisfactionSurveys)
        .where(eq(satisfactionSurveys.id, surveyId));
      
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      if (!survey.submittedAt) {
        return res.status(400).json({ message: "Survey not yet submitted" });
      }

      if (survey.followUpSent) {
        return res.status(400).json({ message: "Follow-up already sent" });
      }

      // Mark follow-up as sent
      const [updatedSurvey] = await db.update(satisfactionSurveys)
        .set({ 
          followUpSent: true, 
          followUpSentAt: new Date() 
        })
        .where(eq(satisfactionSurveys.id, surveyId))
        .returning();

      // In a real app, this would send an actual email via SendGrid
      // For now, we'll just mark it as sent
      
      res.json(updatedSurvey);
    } catch (error) {
      console.error("Error sending follow-up:", error);
      res.status(500).json({ message: "Failed to send follow-up" });
    }
  });

  // Convert survey to testimonial
  app.post("/api/satisfaction/surveys/:id/convert-to-testimonial", requireAuth, async (req, res) => {
    try {
      const surveyId = parseInt(req.params.id);
      const [survey] = await db.select()
        .from(satisfactionSurveys)
        .where(eq(satisfactionSurveys.id, surveyId));
      
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      if (!survey.submittedAt) {
        return res.status(400).json({ message: "Survey not yet submitted" });
      }

      if (!survey.publicTestimonial || survey.publicTestimonial.trim() === "") {
        return res.status(400).json({ message: "No testimonial text provided" });
      }

      if (!survey.isTestimonial) {
        return res.status(400).json({ message: "Customer has not agreed to provide a testimonial" });
      }

      // Create testimonial from survey
      const [testimonial] = await db.insert(testimonials)
        .values({
          name: `Customer #${survey.customerId}`,
          content: survey.publicTestimonial,
          rating: survey.overallRating,
          date: survey.submittedAt.toISOString().split('T')[0],
          image: "",
        })
        .returning();

      res.json(testimonial);
    } catch (error) {
      console.error("Error converting to testimonial:", error);
      res.status(500).json({ message: "Failed to convert to testimonial" });
    }
  });

  // Get satisfaction analytics/stats
  app.get("/api/satisfaction/stats", requireAuth, async (req, res) => {
    try {
      // Get overall stats
      const allSurveys = await db.select()
        .from(satisfactionSurveys);

      if (allSurveys.length === 0) {
        return res.json({
          totalSurveys: 0,
          averageRating: 0,
          recommendationRate: 0,
          testimonialConversionRate: 0,
          followUpRate: 0,
        });
      }

      const totalSurveys = allSurveys.length;
      const averageRating = allSurveys.reduce((sum, s) => sum + s.overallRating, 0) / totalSurveys;
      const recommendCount = allSurveys.filter(s => s.wouldRecommend).length;
      const testimonialCount = allSurveys.filter(s => s.isTestimonial).length;
      const followUpCount = allSurveys.filter(s => s.followUpSent).length;

      res.json({
        totalSurveys,
        averageRating: Math.round(averageRating * 10) / 10,
        recommendationRate: Math.round((recommendCount / totalSurveys) * 100),
        testimonialConversionRate: Math.round((testimonialCount / totalSurveys) * 100),
        followUpRate: Math.round((followUpCount / totalSurveys) * 100),
      });
    } catch (error) {
      console.error("Error fetching satisfaction stats:", error);
      res.status(500).json({ message: "Failed to fetch satisfaction stats" });
    }
  });
}
