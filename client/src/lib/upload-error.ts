export const AERIAL_RULE_RECAP =
  "Images must be top-down or oblique aerial views. No drones, aircraft, propellers, operators, watermarks, text, or logos may appear in the frame.";

export interface UploadErrorPayload {
  error?: string;
  reason?: string;
}

export function formatImageRejectionToast(payload: UploadErrorPayload): {
  title: string;
  description: string;
} {
  const reason = payload.reason?.trim();
  if (reason) {
    return {
      title: "Image Rejected",
      description: `${reason}\n\n${AERIAL_RULE_RECAP}`,
    };
  }
  return {
    title: "Upload Failed",
    description: payload.error || "The image could not be uploaded.",
  };
}

export function parseAerialRejectionError(rawMessage: string): {
  title: string;
  description: string;
} | null {
  const jsonStart = rawMessage.indexOf("{");
  if (jsonStart === -1) return null;
  try {
    const payload = JSON.parse(rawMessage.slice(jsonStart)) as UploadErrorPayload;
    if (!payload.error && !payload.reason) return null;
    return formatImageRejectionToast(payload);
  } catch {
    return null;
  }
}
