export const AERIAL_IMAGE_RULE_BULLETS = [
  "Must be an aerial drone-view perspective (top-down or oblique from above) — never a ground-level shot.",
  "The drone itself, any aircraft, propellers, controllers, or operators must NOT appear in the frame.",
  "No watermarks, no text overlays, and no logos may appear in the frame.",
] as const;

export const AERIAL_IMAGE_RULE = AERIAL_IMAGE_RULE_BULLETS.join(" ");

export const AERIAL_PROMPT_SUFFIX =
  " — " + AERIAL_IMAGE_RULE_BULLETS.join(" ") +
  " Style: photorealistic.";
