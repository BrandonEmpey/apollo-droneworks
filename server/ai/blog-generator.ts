import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { storage } from "../storage";
import type { BlogPost } from "@shared/schema";
import { AERIAL_PROMPT_SUFFIX } from "./aerial-image-rule";
import { generateAndStoreSocialCaptions } from "./social-generator";

const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

const BLOG_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "blog");

const BLOG_CATEGORIES = [
  "drone-tips",
  "real-estate",
  "photogrammetry",
  "editing",
  "technology",
  "industry-news",
] as const;

type BlogCategory = (typeof BLOG_CATEGORIES)[number];

const TOPIC_IDEAS: Record<BlogCategory, string[]> = {
  "drone-tips": [
    "Pre-flight safety checklist for commercial drone operators",
    "Composition techniques for stunning aerial photography",
    "How to plan a drone shoot in challenging weather",
    "Battery management best practices for long shoot days",
    "Mastering manual exposure for aerial cinematography",
  ],
  "real-estate": [
    "How aerial photography increases property listing engagement",
    "Showcasing acreage and outbuildings with drone imagery",
    "Twilight aerial photography for luxury real estate",
    "Marketing rural and ranch properties with drone media",
    "Using drone video walkthroughs for virtual open houses",
  ],
  photogrammetry: [
    "From flight plan to point cloud: a photogrammetry workflow",
    "Choosing GSD (ground sample distance) for survey accuracy",
    "Using ground control points to improve mapping accuracy",
    "Comparing orthomosaics and digital surface models",
    "Volumetric stockpile measurements with drones",
  ],
  editing: [
    "Color grading aerial footage for cinematic results",
    "Stabilizing drone video in post-production",
    "Building LUTs that match your drone brand look",
    "Editing real estate aerial photos for MLS listings",
    "Top Lightroom presets for landscape drone photography",
  ],
  technology: [
    "Comparing the latest enterprise drone payloads",
    "RTK vs PPK: choosing the right positioning system",
    "Thermal drone applications for inspection work",
    "LiDAR drones: when they make sense over photogrammetry",
    "How drone-in-a-box solutions are changing operations",
  ],
  "industry-news": [
    "Recent FAA Part 107 updates every operator should know",
    "BVLOS waivers: the path to scaled drone operations",
    "Insurance trends for commercial drone businesses",
    "How AI is reshaping aerial inspection workflows",
    "Drone delivery: where the industry stands today",
  ],
};

interface GeneratedContent {
  title: string;
  excerpt: string;
  content: string;
  keywords: string[];
  imagePrompt: string;
}

async function ensureUploadDir() {
  await fs.mkdir(BLOG_UPLOAD_DIR, { recursive: true });
}

function pickTopic(): { category: BlogCategory; topic: string } {
  const category =
    BLOG_CATEGORIES[Math.floor(Math.random() * BLOG_CATEGORIES.length)];
  const ideas = TOPIC_IDEAS[category];
  const topic = ideas[Math.floor(Math.random() * ideas.length)];
  return { category, topic };
}

async function generateContent(
  category: BlogCategory,
  topic: string
): Promise<GeneratedContent> {
  const systemPrompt = `You are a professional content writer for Apollo DroneWorks, a commercial drone services company based in Southern Utah serving real estate, construction, surveying, and inspection clients. Write clear, informative, SEO-optimized articles for drone industry professionals and prospective clients.

Return ONLY valid JSON with this exact shape:
{
  "title": "An engaging, SEO-friendly title (max 70 characters)",
  "excerpt": "A 1-2 sentence summary that hooks the reader (max 200 characters)",
  "content": "The full article in plain text with paragraph breaks (\\n\\n between paragraphs). 600-900 words. Informative, professional, and factually accurate. Use natural keyword placement; avoid keyword stuffing.",
  "keywords": ["8-12", "relevant", "SEO", "keywords", "as", "lowercase", "phrases"],
  "imagePrompt": "A detailed prompt for an AI image generator describing a professional, photorealistic image that visually represents the article. The scene MUST be an aerial drone-view perspective (top-down or oblique from above) — never a ground-level shot. The drone itself, any aircraft, propellers, controllers, or operators must NOT appear in the frame. No watermarks, no text, no logos."
}`;

  const userPrompt = `Write a blog article in the "${category}" category about: "${topic}". Make it informative and useful for both industry pros and potential drone services clients.`;

  const response = await grok.chat.completions.create({
    model: "grok-3",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: 2500,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Grok returned empty content");

  const parsed = JSON.parse(raw) as GeneratedContent;
  if (
    !parsed.title ||
    !parsed.excerpt ||
    !parsed.content ||
    !parsed.imagePrompt
  ) {
    throw new Error("Generated blog content missing required fields");
  }
  if (!Array.isArray(parsed.keywords)) parsed.keywords = [];
  return parsed;
}

const ALLOWED_IMAGE_HOSTS = new Set<string>([
  "api.x.ai",
  "x.ai",
  "imgen.x.ai",
  "files.x.ai",
  "oaidalleapiprodscus.blob.core.windows.net",
]);
const ALLOWED_IMAGE_HOST_SUFFIXES = [".x.ai", ".grok.com"];

function isAllowedImageUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (ALLOWED_IMAGE_HOSTS.has(host)) return true;
    return ALLOWED_IMAGE_HOST_SUFFIXES.some((s) => host.endsWith(s));
  } catch {
    return false;
  }
}

async function generateAndSaveImage(prompt: string): Promise<string> {
  const finalPrompt = `${prompt}${AERIAL_PROMPT_SUFFIX}`;
  const imageResponse = await grok.images.generate({
    model: "grok-2-image",
    prompt: finalPrompt,
    n: 1,
  });

  const remoteUrl = imageResponse.data?.[0]?.url;
  if (!remoteUrl) throw new Error("Grok image generation returned no URL");

  if (!isAllowedImageUrl(remoteUrl)) {
    throw new Error("Generated image URL host is not allowlisted");
  }

  await ensureUploadDir();
  const fileName = `blog-${Date.now()}.png`;
  const localPath = path.join(BLOG_UPLOAD_DIR, fileName);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(remoteUrl, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    throw new Error(`Failed to download generated image: ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(localPath, buffer);

  return `/uploads/blog/${fileName}`;
}

export interface BlogGenerationOptions {
  category?: BlogCategory;
  topic?: string;
}

export async function generateBlogPost(
  options: BlogGenerationOptions = {}
): Promise<BlogPost> {
  if (!process.env.XAI_API_KEY) {
    throw new Error("XAI_API_KEY is not configured");
  }

  const { category, topic } = options.category && options.topic
    ? { category: options.category, topic: options.topic }
    : pickTopic();

  console.log(`[blog-generator] Generating post: [${category}] ${topic}`);

  const content = await generateContent(category, topic);
  console.log(`[blog-generator] Content generated: "${content.title}"`);

  let imageUrl = "";
  try {
    imageUrl = await generateAndSaveImage(content.imagePrompt);
    console.log(`[blog-generator] Image saved to ${imageUrl}`);
  } catch (err) {
    console.error("[blog-generator] Image generation failed:", err);
    imageUrl = "/uploads/blog/aerial-fallback.png";
  }

  const post = await storage.createBlogPost({
    title: content.title,
    content: content.content,
    excerpt: content.excerpt,
    category,
    imageUrl,
    keywords: content.keywords,
  });

  console.log(`[blog-generator] Blog post created with id ${post.id}`);

  // Fire-and-forget: generate social captions in background
  generateAndStoreSocialCaptions(post).catch(() => {});

  return post;
}
