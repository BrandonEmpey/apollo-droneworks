import OpenAI from "openai";
import { db } from "../db";
import { socialPosts, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { BlogPost } from "@shared/schema";

const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

interface SocialCaptions {
  instagram: string;
  facebook: string;
  twitter: string;
}

async function getAdminUserId(): Promise<number> {
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isAdmin, true))
    .limit(1);
  if (!admin) throw new Error("No admin user found for social post attribution");
  return admin.id;
}

async function generateCaptions(post: BlogPost): Promise<SocialCaptions> {
  const systemPrompt = `You are a social media manager for Apollo DroneWorks, a commercial drone services company in Southern Utah. Write platform-optimized captions for a blog post. Each caption should drive traffic to the blog and reflect the brand: professional, visually evocative, local pride, drone expertise.

Return ONLY valid JSON with this exact shape:
{
  "instagram": "Caption optimized for Instagram: engaging opener, 2-3 short paragraphs with line breaks (\\n\\n), 15-20 relevant hashtags at the end, 1-2 emojis max. Max 2200 characters.",
  "facebook": "Caption optimized for Facebook: conversational, 2-4 sentences, ask a question to drive comments, 2-3 hashtags only, include a call-to-action like 'Read more on the blog'. Max 400 characters.",
  "twitter": "Caption optimized for X/Twitter: punchy one-liner or two short sentences, 1-2 hashtags, no more than 260 characters total (leave room for a link)."
}`;

  const userPrompt = `Blog post title: "${post.title}"
Excerpt: "${post.excerpt}"
Category: ${post.category}
Keywords: ${Array.isArray(post.keywords) ? (post.keywords as string[]).join(", ") : ""}

Generate social media captions that promote this blog post.`;

  const response = await grok.chat.completions.create({
    model: "grok-3",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1200,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Grok returned empty social captions");

  return JSON.parse(raw) as SocialCaptions;
}

export async function generateAndStoreSocialCaptions(post: BlogPost): Promise<void> {
  if (!process.env.XAI_API_KEY) return;

  try {
    const [captions, adminUserId] = await Promise.all([
      generateCaptions(post),
      getAdminUserId(),
    ]);

    const platforms = [
      { platform: "instagram", content: captions.instagram },
      { platform: "facebook", content: captions.facebook },
      { platform: "twitter", content: captions.twitter },
    ] as const;

    for (const { platform, content } of platforms) {
      await db.insert(socialPosts).values({
        userId: adminUserId,
        content,
        mediaUrl: post.imageUrl || null,
        mediaType: post.imageUrl ? "image" : null,
        keywords: Array.isArray(post.keywords) ? (post.keywords as string[]) : [],
        published: false,
        publishedTo: [],
        blogPostId: post.id,
        platform,
      });
    }

    console.log(`[social-generator] Created 3 social captions for blog post ${post.id}`);
  } catch (err) {
    console.error("[social-generator] Failed to generate social captions:", err);
  }
}
