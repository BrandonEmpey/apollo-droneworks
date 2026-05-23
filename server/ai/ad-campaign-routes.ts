import { Express, Request, Response } from "express";
import { db } from "../db";
import { adCampaigns, adContents, platformPreviews, adTemplates, insertAdCampaignSchema, insertAdContentSchema } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { generateAdContent, generateAdImage, generateHashtags, analyzeAdContent, generatePlatformPreviews, createAdTemplate } from "./openai-service";

export function registerAdCampaignRoutes(app: Express) {
  // Get all ad templates
  app.get("/api/ads/templates", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const templates = await db
        .select()
        .from(adTemplates)
        .where(eq(adTemplates.userId, req.user.id));

      return res.status(200).json(templates);
    } catch (error: any) {
      console.error("Error fetching ad templates:", error);
      return res.status(500).json({ error: "Failed to fetch ad templates: " + (error.message || "Unknown error") });
    }
  });
  
  // Get all ad campaigns for a user
  app.get("/api/ads/campaigns", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const campaigns = await db
        .select()
        .from(adCampaigns)
        .where(eq(adCampaigns.userId, req.user.id));

      return res.status(200).json(campaigns);
    } catch (error: any) {
      console.error("Error fetching ad campaigns:", error);
      return res.status(500).json({ error: "Failed to fetch ad campaigns: " + (error.message || "Unknown error") });
    }
  });

  // Get a specific ad campaign with its contents
  app.get("/api/ads/campaigns/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const campaignId = parseInt(req.params.id);
      
      // Get the campaign data
      const [campaign] = await db
        .select()
        .from(adCampaigns)
        .where(and(
          eq(adCampaigns.id, campaignId),
          eq(adCampaigns.userId, req.user.id)
        ));

      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      // Get associated content
      const contents = await db
        .select()
        .from(adContents)
        .where(eq(adContents.campaignId, campaignId));

      console.log(`Retrieved campaign ID ${campaignId} with ${contents.length} content items`);
      console.log(`Campaign details:`, JSON.stringify(campaign, null, 2));
      
      // Combine campaign with its contents and return
      return res.status(200).json({ 
        ...campaign, 
        contents: contents || [] 
      });
    } catch (error: any) {
      console.error("Error fetching ad campaign:", error);
      return res.status(500).json({ error: "Failed to fetch ad campaign: " + (error.message || "Unknown error") });
    }
  });

  // Create a new ad campaign
  app.post("/api/ads/campaigns", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Validate and parse the request data
      const parsedData = insertAdCampaignSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      console.log("Parsed campaign data:", JSON.stringify(parsedData, null, 2));
      
      // Insert the new campaign
      const [campaign] = await db
        .insert(adCampaigns)
        .values(parsedData)
        .returning();

      console.log(`Created new campaign with ID ${campaign.id}`);
      
      return res.status(201).json(campaign);
    } catch (error: any) {
      console.error("Error creating ad campaign:", error);
      return res.status(500).json({ error: "Failed to create ad campaign: " + (error.message || "Unknown error") });
    }
  });

  // Update an existing ad campaign
  app.patch("/api/ads/campaigns/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const campaignId = parseInt(req.params.id);
      
      // Check if the campaign exists and belongs to the user
      const [existingCampaign] = await db
        .select()
        .from(adCampaigns)
        .where(and(
          eq(adCampaigns.id, campaignId),
          eq(adCampaigns.userId, req.user.id)
        ));

      if (!existingCampaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      // Filter out fields that should not be updated
      const { userId, ...updateData } = req.body;
      
      // Update the campaign
      const [updatedCampaign] = await db
        .update(adCampaigns)
        .set(updateData)
        .where(eq(adCampaigns.id, campaignId))
        .returning();

      return res.status(200).json(updatedCampaign);
    } catch (error: any) {
      console.error("Error updating ad campaign:", error);
      return res.status(500).json({ error: "Failed to update ad campaign: " + (error.message || "Unknown error") });
    }
  });

  // Delete an ad campaign
  app.delete("/api/ads/campaigns/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const campaignId = parseInt(req.params.id);
      
      // Check if the campaign exists and belongs to the user
      const [existingCampaign] = await db
        .select()
        .from(adCampaigns)
        .where(and(
          eq(adCampaigns.id, campaignId),
          eq(adCampaigns.userId, req.user.id)
        ));

      if (!existingCampaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      // Delete the campaign
      await db
        .delete(adCampaigns)
        .where(eq(adCampaigns.id, campaignId));

      return res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting ad campaign:", error);
      return res.status(500).json({ error: "Failed to delete ad campaign: " + (error.message || "Unknown error") });
    }
  });

  // Generate content for a campaign
  app.post("/api/ads/campaigns/:id/generate-content", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const campaignId = parseInt(req.params.id);
      const { prompt, adType = "image" } = req.body;
      
      // Check if the campaign exists and belongs to the user
      const [existingCampaign] = await db
        .select()
        .from(adCampaigns)
        .where(and(
          eq(adCampaigns.id, campaignId),
          eq(adCampaigns.userId, req.user.id)
        ));

      if (!existingCampaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      console.log(`Generating content for campaign ID ${campaignId}`);
      
      // Generate the content
      const content = await generateAdContent(campaignId, prompt, adType);
      
      console.log(`Generated content: `, JSON.stringify(content, null, 2));
      
      return res.status(201).json(content);
    } catch (error: any) {
      console.error("Error generating ad content:", error);
      return res.status(500).json({ error: "Failed to generate ad content: " + (error.message || "Unknown error") });
    }
  });

  // Generate an image for ad content
  app.post("/api/ads/contents/:id/generate-image", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const contentId = parseInt(req.params.id);
      
      // Check if the content exists and belongs to the user's campaign
      const [content] = await db
        .select({ content: adContents, campaign: adCampaigns })
        .from(adContents)
        .innerJoin(adCampaigns, eq(adContents.campaignId, adCampaigns.id))
        .where(and(
          eq(adContents.id, contentId),
          eq(adCampaigns.userId, req.user.id)
        ));

      if (!content) {
        return res.status(404).json({ error: "Content not found or unauthorized" });
      }

      // Get custom prompt if provided
      const { customPrompt } = req.body;
      
      // Generate the image
      const updatedContent = await generateAdImage(contentId, customPrompt);
      
      return res.status(200).json(updatedContent);
    } catch (error: any) {
      console.error("Error generating ad image:", error);
      return res.status(500).json({ error: "Failed to generate ad image: " + (error.message || "Unknown error") });
    }
  });

  // Generate hashtags for ad content
  app.post("/api/ads/contents/:id/generate-hashtags", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const contentId = parseInt(req.params.id);
      
      // Check if the content exists and belongs to the user's campaign
      const [content] = await db
        .select({ content: adContents, campaign: adCampaigns })
        .from(adContents)
        .innerJoin(adCampaigns, eq(adContents.campaignId, adCampaigns.id))
        .where(and(
          eq(adContents.id, contentId),
          eq(adCampaigns.userId, req.user.id)
        ));

      if (!content) {
        return res.status(404).json({ error: "Content not found or unauthorized" });
      }

      // Generate the hashtags
      const updatedContent = await generateHashtags(contentId);
      
      return res.status(200).json(updatedContent);
    } catch (error: any) {
      console.error("Error generating hashtags:", error);
      return res.status(500).json({ error: "Failed to generate hashtags: " + (error.message || "Unknown error") });
    }
  });

  // Analyze ad content effectiveness
  app.get("/api/ads/contents/:id/analyze", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const contentId = parseInt(req.params.id);
      
      // Check if the content exists and belongs to the user's campaign
      const [content] = await db
        .select({ content: adContents, campaign: adCampaigns })
        .from(adContents)
        .innerJoin(adCampaigns, eq(adContents.campaignId, adCampaigns.id))
        .where(and(
          eq(adContents.id, contentId),
          eq(adCampaigns.userId, req.user.id)
        ));

      if (!content) {
        return res.status(404).json({ error: "Content not found or unauthorized" });
      }

      // Analyze the content
      const analysis = await analyzeAdContent(contentId);
      
      return res.status(200).json(analysis);
    } catch (error: any) {
      console.error("Error analyzing ad content:", error);
      return res.status(500).json({ error: "Failed to analyze ad content: " + (error.message || "Unknown error") });
    }
  });
  
  // Generate platform-specific previews for ad content
  app.post("/api/ads/contents/:id/generate-previews", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const contentId = parseInt(req.params.id);
      const { platforms = ['facebook', 'instagram', 'twitter', 'linkedin'] } = req.body;
      
      // Check if the content exists and belongs to the user's campaign
      const [content] = await db
        .select({ content: adContents, campaign: adCampaigns })
        .from(adContents)
        .innerJoin(adCampaigns, eq(adContents.campaignId, adCampaigns.id))
        .where(and(
          eq(adContents.id, contentId),
          eq(adCampaigns.userId, req.user.id)
        ));

      if (!content) {
        return res.status(404).json({ error: "Content not found or unauthorized" });
      }

      // Generate the previews
      const previews = await generatePlatformPreviews(contentId, platforms);
      
      return res.status(200).json(previews);
    } catch (error: any) {
      console.error("Error generating platform previews:", error);
      return res.status(500).json({ error: "Failed to generate platform previews: " + (error.message || "Unknown error") });
    }
  });

  // Get specific ad content with its platform previews
  app.get("/api/ads/contents/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const contentId = parseInt(req.params.id);
      
      // Check if the content exists and belongs to the user's campaign
      const [content] = await db
        .select({ content: adContents, campaign: adCampaigns })
        .from(adContents)
        .innerJoin(adCampaigns, eq(adContents.campaignId, adCampaigns.id))
        .where(and(
          eq(adContents.id, contentId),
          eq(adCampaigns.userId, req.user.id)
        ));

      if (!content) {
        return res.status(404).json({ error: "Content not found or unauthorized" });
      }

      // Get platform previews for this content
      const previews = await db
        .select()
        .from(platformPreviews)
        .where(eq(platformPreviews.adContentId, contentId));

      return res.status(200).json({
        ...content.content,
        campaign: content.campaign,
        platformPreviews: previews
      });
    } catch (error: any) {
      console.error("Error fetching ad content:", error);
      return res.status(500).json({ error: "Failed to fetch ad content: " + (error.message || "Unknown error") });
    }
  });

  // Create an ad template from existing content
  app.post("/api/ads/contents/:id/create-template", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const contentId = parseInt(req.params.id);
      const { name, category = "general" } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Template name is required" });
      }
      
      // Check if the content exists and belongs to the user's campaign
      const [content] = await db
        .select({ content: adContents, campaign: adCampaigns })
        .from(adContents)
        .innerJoin(adCampaigns, eq(adContents.campaignId, adCampaigns.id))
        .where(and(
          eq(adContents.id, contentId),
          eq(adCampaigns.userId, req.user.id)
        ));

      if (!content) {
        return res.status(404).json({ error: "Content not found or unauthorized" });
      }

      // Create the template
      const template = await createAdTemplate(contentId, req.user.id, name, category);
      
      return res.status(201).json(template);
    } catch (error: any) {
      console.error("Error creating ad template:", error);
      return res.status(500).json({ error: "Failed to create ad template: " + (error.message || "Unknown error") });
    }
  });
}