import OpenAI from "openai";
import { db } from "../db";
import { adContents, adTemplates, platformPreviews } from "@shared/schema";
import { eq } from "drizzle-orm";

// Grok (xAI) client — used for all AI features site-wide
const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

/**
 * Generate ad content for a campaign
 */
export async function generateAdContent(
  campaignId: number,
  prompt: string,
  adType: string
) {
  try {
    console.log(`Starting ad content generation for campaign ${campaignId}, type: ${adType}`);
    
    // Formulate the prompt for the ad generation
    const systemPrompt = `You are a professional advertising copywriter specializing in social media ads. 
Create compelling ad content for the specified platform and format.
The content should be persuasive, on-brand, and optimized for the target platform.
Your response must be in JSON format with the following fields:
{
  "headline": "A short, catchy headline (max 40 chars)",
  "primaryText": "The main ad copy (max 125 chars)",
  "description": "Detailed ad text that elaborates on the offer",
  "callToAction": "A clear CTA phrase like 'Book Now' or 'Learn More'"
}`;

    const response = await grok.chat.completions.create({
      model: "grok-3",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Create a ${adType} ad with the following: ${prompt}` 
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    console.log(`Grok response received for campaign ${campaignId}`);
    
    // Parse the generated content
    const generatedContent = JSON.parse(response.choices[0].message.content);
    
    console.log(`Parsed content:`, JSON.stringify(generatedContent, null, 2));
    
    // Include the original prompt and the AI-generated content JSON for future reference
    const contentToInsert = {
      campaignId,
      adType,
      headline: generatedContent.headline || "No headline generated",
      primaryText: generatedContent.primaryText || "No primary text generated",
      description: generatedContent.description || generatedContent.body || "No description generated",
      callToAction: generatedContent.callToAction || "Learn More",
      aiPrompt: prompt,
      aiGeneratedContent: JSON.stringify(generatedContent)
    };
    
    console.log(`Inserting content into database:`, JSON.stringify(contentToInsert, null, 2));
    
    // Insert the content into the database
    const [newContent] = await db
      .insert(adContents)
      .values(contentToInsert)
      .returning();

    console.log(`Successfully inserted content ID ${newContent.id} for campaign ${campaignId}`);
    
    return newContent;
  } catch (error) {
    console.error("Error generating ad content:", error);
    throw new Error(`Failed to generate ad content: ${error.message || "Unknown error"}`);
  }
}

/**
 * Generate an image for ad content
 */
export async function generateAdImage(contentId: number, customPrompt?: string) {
  try {
    // Get the ad content
    const [content] = await db
      .select()
      .from(adContents)
      .where(eq(adContents.id, contentId));

    if (!content) {
      throw new Error("Ad content not found");
    }

    let imagePrompt: string;
    
    // Use the custom prompt if provided, otherwise generate one
    if (customPrompt) {
      imagePrompt = customPrompt;
      
      // Store the custom prompt for future reference
      await db
        .update(adContents)
        .set({ aiPrompt: customPrompt })
        .where(eq(adContents.id, contentId));
    } else {
      // Generate an image prompt based on the ad content
      const imagePromptResponse = await grok.chat.completions.create({
        model: "grok-3",
        messages: [
          {
            role: "system",
            content: "You are a professional ad creative designer who creates detailed image prompts for drone service advertisements."
          },
          {
            role: "user",
            content: `Create a detailed image prompt for a drone services advertisement with these details:
Headline: ${content.headline}
Copy: ${content.description || content.primaryText}
The image should showcase professional drone photography/videography in a compelling way. Make the prompt very detailed for high-quality image generation.`
          }
        ],
        max_tokens: 500,
      });

      imagePrompt = imagePromptResponse.choices[0].message.content || "";
      
      // Store the AI-generated prompt
      await db
        .update(adContents)
        .set({ aiPrompt: imagePrompt })
        .where(eq(adContents.id, contentId));
    }
    
    const imageResponse = await grok.images.generate({
      model: "grok-2-image",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = imageResponse.data[0].url;

    // Update the ad content with the image URL
    const [updatedContent] = await db
      .update(adContents)
      .set({ imageUrl })
      .where(eq(adContents.id, contentId))
      .returning();

    return updatedContent;
  } catch (error) {
    console.error("Error generating ad image:", error);
    throw new Error(`Failed to generate ad image: ${error.message}`);
  }
}

/**
 * Generate hashtags for ad content
 */
export async function generateHashtags(contentId: number) {
  try {
    // Get the ad content
    const [content] = await db
      .select()
      .from(adContents)
      .where(eq(adContents.id, contentId));

    if (!content) {
      throw new Error("Ad content not found");
    }

    const response = await grok.chat.completions.create({
      model: "grok-3",
      messages: [
        {
          role: "system",
          content: `You are a social media expert who creates effective hashtags for drone photography/videography businesses.
Your response must be in JSON format with an array of hashtags: { "hashtags": ["hashtag1", "hashtag2", ...] }
Do not include the # symbol in the hashtags.
Include a mix of popular and niche hashtags.
Limit to 10 hashtags maximum.`
        },
        {
          role: "user",
          content: `Create hashtags for this drone services ad:
Headline: ${content.headline}
Copy: ${content.description || content.primaryText}
Call to Action: ${content.callToAction}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    const result = JSON.parse(response.choices[0].message.content);
    const hashtags = result.hashtags || [];

    // Update the ad content with the hashtags
    const [updatedContent] = await db
      .update(adContents)
      .set({ hashtags })
      .where(eq(adContents.id, contentId))
      .returning();

    return updatedContent;
  } catch (error) {
    console.error("Error generating hashtags:", error);
    throw new Error(`Failed to generate hashtags: ${error.message}`);
  }
}

/**
 * Analyze ad content for effectiveness
 */
export async function analyzeAdContent(contentId: number) {
  try {
    // Get the ad content
    const [content] = await db
      .select()
      .from(adContents)
      .where(eq(adContents.id, contentId));

    if (!content) {
      throw new Error("Ad content not found");
    }

    const response = await grok.chat.completions.create({
      model: "grok-3",
      messages: [
        {
          role: "system",
          content: `You are an advertising expert who analyzes social media ads for effectiveness.
Provide a detailed analysis with scores out of 10 for key metrics and specific improvement suggestions.
Focus on engagement potential, clarity, persuasiveness, and appeal to drone services customers.`
        },
        {
          role: "user",
          content: `Analyze this drone services ad for effectiveness:
Headline: ${content.headline}
Primary Text: ${content.primaryText}
Body: ${content.description || content.primaryText}
Call to Action: ${content.callToAction}
${content.hashtags?.length ? `Hashtags: ${content.hashtags.join(', ')}` : ''}

Provide detailed analysis with specific suggestions for improvement.`
        }
      ],
      max_tokens: 1000,
    });

    return {
      contentId,
      analysis: response.choices[0].message.content
    };
  } catch (error) {
    console.error("Error analyzing ad content:", error);
    throw new Error(`Failed to analyze ad content: ${error.message}`);
  }
}

/**
 * Generate platform-specific ad previews
 */
export async function generatePlatformPreviews(contentId: number, platforms: string[] = ['facebook', 'instagram', 'twitter', 'linkedin']) {
  try {
    // Get the ad content
    const [content] = await db
      .select()
      .from(adContents)
      .where(eq(adContents.id, contentId));

    if (!content) {
      throw new Error("Ad content not found");
    }

    const previewsPromises = platforms.map(async (platform) => {
      // Define platform-specific dimensions
      const dimensions = getPlatformDimensions(platform);
      
      // Generate HTML representation for platform-specific preview
      const previewHtmlResponse = await grok.chat.completions.create({
        model: "grok-3",
        messages: [
          {
            role: "system",
            content: `You are an expert in social media ad design who creates platform-specific ad previews.
You will generate HTML code that simulates how an ad would look on ${platform}.
The HTML should include appropriate styling to mimic ${platform}'s interface.
Use inline CSS for styling. Do not include any external resources or scripts.
Make the preview responsive and visually appealing within a width of ${dimensions.width}px.
Include platform-specific UI elements like like/comment buttons, profile pictures, etc.`
          },
          {
            role: "user",
            content: `Create an HTML preview for this drone services ad on ${platform}:

Headline: ${content.headline}
Primary Text: ${content.primaryText}
Body: ${content.description || content.primaryText}
Call to Action: ${content.callToAction}
${content.hashtags?.length ? `Hashtags: ${content.hashtags.join(' ')}` : ''}
${content.imageUrl ? `Image URL: ${content.imageUrl}` : ''}

Respond ONLY with the HTML code, no explanations.`
          }
        ],
        max_tokens: 2000,
      });

      const previewHtml = previewHtmlResponse.choices[0].message.content;

      // Create a platform-specific image prompt
      const imagePromptResponse = await grok.chat.completions.create({
        model: "grok-3",
        messages: [
          {
            role: "system",
            content: `You are a professional social media ad designer who creates detailed image prompts for drone service advertisements.
Create a prompt for a visual representation of how this ad would appear on ${platform} with its characteristic UI elements and layout.`
          },
          {
            role: "user",
            content: `Create a detailed image prompt to generate a visual of how this drone services ad would appear on ${platform}'s interface:

Headline: ${content.headline}
Primary Text: ${content.primaryText}
Call to Action: ${content.callToAction}
${content.imageUrl ? 'The ad includes a professional drone photography image.' : ''}

The image should show the ad as it would appear in the ${platform} feed with realistic UI elements, proper layout, and branding. Make it photorealistic.`
          }
        ],
        max_tokens: 500,
      });

      const imagePrompt = imagePromptResponse.choices[0].message.content;
      
      const imageResponse = await grok.images.generate({
        model: "grok-2-image",
        prompt: imagePrompt,
        n: 1,
        size: getPlatformImageSize(platform),
        quality: "standard",
      });

      const previewImageUrl = imageResponse.data[0].url;

      // Store the preview in the database
      const [preview] = await db
        .insert(platformPreviews)
        .values({
          adContentId: contentId,
          platform,
          previewImageUrl,
          previewHtml,
          dimensions
        })
        .returning();

      return preview;
    });

    const previews = await Promise.all(previewsPromises);
    return previews;
  } catch (error) {
    console.error("Error generating platform previews:", error);
    throw new Error(`Failed to generate platform previews: ${error.message}`);
  }
}

/**
 * Create an ad template from existing content
 */
export async function createAdTemplate(contentId: number, userId: number, name: string, category: string) {
  try {
    // Get the ad content
    const [content] = await db
      .select()
      .from(adContents)
      .where(eq(adContents.id, contentId));

    if (!content) {
      throw new Error("Ad content not found");
    }

    // Create a structure from the content
    const structure = {
      headline: content.headline,
      primaryText: content.primaryText,
      description: content.description || content.primaryText,
      callToAction: content.callToAction,
      hashtags: content.hashtags
    };

    // Insert the template into the database
    const [template] = await db
      .insert(adTemplates)
      .values({
        userId,
        name,
        category,
        structure,
        samplePreview: content.imageUrl
      })
      .returning();

    return template;
  } catch (error) {
    console.error("Error creating ad template:", error);
    throw new Error(`Failed to create ad template: ${error.message}`);
  }
}

/**
 * Helper function to get platform-specific dimensions
 */
function getPlatformDimensions(platform: string): { width: number, height: number, unit: string } {
  switch (platform.toLowerCase()) {
    case 'facebook':
      return { width: 500, height: 628, unit: 'px' };
    case 'instagram':
      return { width: 500, height: 500, unit: 'px' };
    case 'twitter':
      return { width: 600, height: 335, unit: 'px' };
    case 'linkedin':
      return { width: 600, height: 400, unit: 'px' };
    default:
      return { width: 500, height: 500, unit: 'px' };
  }
}

/**
 * Helper function to get platform-specific image size
 */
function getPlatformImageSize(platform: string): "1024x1024" | "1792x1024" | "1024x1792" {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return "1024x1024";
    case 'facebook':
    case 'linkedin':
      return "1024x1024";
    case 'twitter':
      return "1792x1024";
    default:
      return "1024x1024";
  }
}