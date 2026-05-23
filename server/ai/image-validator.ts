import OpenAI from "openai";
import type {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import fs from "fs/promises";
import path from "path";
import { AERIAL_IMAGE_RULE } from "./aerial-image-rule";

const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

export interface AerialValidationResult {
  compliant: boolean;
  reason?: string;
  skipped?: boolean;
}

const VISION_MODEL = process.env.AERIAL_VALIDATOR_MODEL || "grok-2-vision-1212";
const VISION_TIMEOUT_MS = 15_000;
const STRICT_MODE = process.env.AERIAL_VALIDATOR_STRICT === "1";

function unavailable(reason: string): AerialValidationResult {
  if (STRICT_MODE) {
    return { compliant: false, reason: `Aerial validator unavailable (${reason})` };
  }
  return { compliant: true, skipped: true, reason };
}

const SUPPORTED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function mimeFromExt(ext: string): string | null {
  const e = ext.toLowerCase().replace(/^\./, "");
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "png") return "image/png";
  if (e === "webp") return "image/webp";
  if (e === "gif") return "image/gif";
  return null;
}

async function readImageAsDataUrl(filePath: string, mime: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function parseDataUrl(dataUrl: string): { mime: string; dataUrl: string } | null {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  if (!SUPPORTED_MIME.has(mime)) return null;
  return { mime, dataUrl };
}

async function callVision(dataUrl: string): Promise<AerialValidationResult> {
  const systemPrompt = `You are an image-compliance reviewer for Apollo DroneWorks. You must decide whether the provided image follows this rule:

${AERIAL_IMAGE_RULE}

Respond ONLY with valid JSON of the shape:
{"compliant": boolean, "reason": "short explanation citing which part of the rule is violated, or 'ok' if compliant"}`;

  const userContent: ChatCompletionContentPart[] = [
    {
      type: "text",
      text: "Classify this image against the aerial-only rule.",
    },
    {
      type: "image_url",
      image_url: { url: dataUrl },
    },
  ];

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);
  let raw: string | null = null;
  try {
    const response = await grok.chat.completions.create(
      {
        model: VISION_MODEL,
        messages,
        response_format: { type: "json_object" },
        max_tokens: 200,
      },
      { signal: controller.signal },
    );
    raw = response.choices[0]?.message?.content ?? null;
  } finally {
    clearTimeout(timer);
  }

  if (!raw) {
    return unavailable("Vision model returned no content");
  }

  try {
    const parsed = JSON.parse(raw) as { compliant?: boolean; reason?: string };
    if (typeof parsed.compliant !== "boolean") {
      return unavailable("Vision response missing 'compliant'");
    }
    return { compliant: parsed.compliant, reason: parsed.reason };
  } catch {
    return unavailable("Vision response was not valid JSON");
  }
}

/**
 * Validate that an uploaded image satisfies the aerial-only marketing rule.
 * Fails open (returns { compliant: true, skipped: true }) when the validator
 * cannot run (e.g. XAI_API_KEY missing, network error, unsupported file type).
 */
export async function validateAerialImageFile(
  filePath: string,
  mimeType?: string,
): Promise<AerialValidationResult> {
  if (!process.env.XAI_API_KEY) {
    return unavailable("XAI_API_KEY not configured");
  }

  let mime = (mimeType || "").toLowerCase();
  if (!SUPPORTED_MIME.has(mime)) {
    const fromExt = mimeFromExt(path.extname(filePath));
    if (fromExt) mime = fromExt;
  }
  if (!SUPPORTED_MIME.has(mime)) {
    return { compliant: true, skipped: true, reason: "Unsupported image type for validation" };
  }

  try {
    const dataUrl = await readImageAsDataUrl(filePath, mime);
    return await callVision(dataUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[aerial-validator] file validation failed:", message);
    return unavailable("Validator error");
  }
}

/**
 * Validate a base64 data-URL image (used for blog covers and other surfaces
 * that submit images as data URLs rather than uploading to /api/upload).
 */
export async function validateAerialImageDataUrl(
  dataUrl: string,
): Promise<AerialValidationResult> {
  if (!process.env.XAI_API_KEY) {
    return unavailable("XAI_API_KEY not configured");
  }
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return unavailable("Not a supported data URL");
  }
  try {
    return await callVision(parsed.dataUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[aerial-validator] data-URL validation failed:", message);
    return unavailable("Validator error");
  }
}

/**
 * Validate any value that might be an image reference (data URL or a
 * server-hosted /uploads/... path). Non-image strings (http(s) URLs to
 * external sites, empty values, etc.) are skipped as compliant. Used by
 * write routes that persist `imageUrl`/`url` fields for marketing content
 * (galleries, industry tiles, about-page sections) so non-compliant
 * imagery cannot be saved by going around `/api/upload/image`.
 */
export async function validateAerialImageReference(
  value: unknown,
): Promise<AerialValidationResult> {
  if (typeof value !== "string" || value.length === 0) {
    return { compliant: true, skipped: true };
  }
  if (value.startsWith("data:image/")) {
    return validateAerialImageDataUrl(value);
  }
  if (value.startsWith("/uploads/")) {
    const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
    const relative = value.slice("/uploads/".length).split("?")[0].split("#")[0];
    const resolved = path.resolve(uploadsRoot, relative);
    if (resolved !== uploadsRoot && !resolved.startsWith(uploadsRoot + path.sep)) {
      return { compliant: true, skipped: true, reason: "Path traversal blocked" };
    }
    const ext = path.extname(resolved);
    const mime = mimeFromExt(ext);
    if (!mime) {
      // The caller invoked this on a marketing image field, so anything
      // that isn't a recognised image type must be rejected — silently
      // skipping would let admins persist e.g. a `.pdf` or `.mp4` URL in
      // an `imageUrl` column and bypass the aerial check.
      return {
        compliant: false,
        reason: `Referenced /uploads asset is not a supported image type (${ext || "no extension"})`,
      };
    }
    try {
      await fs.access(resolved);
    } catch {
      return { compliant: true, skipped: true, reason: "Referenced upload not found" };
    }
    return validateAerialImageFile(resolved, mime);
  }
  return { compliant: true, skipped: true, reason: "External URL — not validated" };
}

export const AERIAL_REJECTION_MESSAGE =
  "Image rejected: it does not meet the aerial-only marketing rule (must be a top-down or oblique aerial drone view, with no drones, aircraft, propellers, operators, watermarks, text, or logos in the frame).";
