// Shared registry of delivery method types for project deliverables.
// Adding a new type is a single entry here — the picker, admin form
// chooser, customer view, and field-clearing logic all read from this.

export type DeliveryMethodId = "image" | "video" | "document" | "link";

export type DeliveryStorageField = "fileUrl" | "externalUrl" | "externalUrlLabel";

export interface DeliveryMethodDefinition {
  id: DeliveryMethodId;
  label: string;
  shortLabel: string;
  description: string;
  iconName: "Image" | "Video" | "FileText" | "Link2";
  // Registry-driven storage fields used by this method on a deliverable row.
  // When the admin switches methods, fields not listed here are cleared.
  storageFields: DeliveryStorageField[];
  // Lower-cased keyword fragments that suggest this method when present in
  // the deliverable's name (or service name).
  suggestKeywords: string[];
  // Whether this method's link/url comes from the project (shareableLink)
  // rather than from per-deliverable storage.
  usesProjectShareableLink: boolean;
  // Render contract — the UI reads these instead of branching on the id.
  // Adding a new method becomes one entry in this file.
  capabilities: {
    // Admin can attach a file via per-deliverable upload.
    acceptsFile: boolean;
    // <input accept="..."> string used when acceptsFile is true.
    fileAccept?: string;
    // Customer downloads/previews the per-deliverable fileUrl.
    customerDownload: boolean;
  };
}

export const DELIVERY_METHODS: Record<DeliveryMethodId, DeliveryMethodDefinition> = {
  image: {
    id: "image",
    label: "Upload Image",
    shortLabel: "Image",
    description: "Upload a photo or image file (JPG, PNG, etc.)",
    iconName: "Image",
    storageFields: ["fileUrl"],
    suggestKeywords: [
      "photo",
      "photos",
      "image",
      "imagery",
      "shot",
      "shots",
      "gallery",
      "picture",
      "snapshot",
    ],
    usesProjectShareableLink: false,
    capabilities: {
      acceptsFile: true,
      fileAccept: "image/*",
      customerDownload: true,
    },
  },
  video: {
    id: "video",
    label: "Upload Video",
    shortLabel: "Video",
    description: "Upload a video file (MP4, MOV, etc.)",
    iconName: "Video",
    storageFields: ["fileUrl"],
    suggestKeywords: [
      "video",
      "footage",
      "reel",
      "flyover",
      "fly-over",
      "tour video",
      "timelapse video",
      "walkthrough video",
      "clip",
    ],
    usesProjectShareableLink: false,
    capabilities: {
      acceptsFile: true,
      fileAccept: "video/*",
      customerDownload: true,
    },
  },
  document: {
    id: "document",
    label: "Upload Document / File",
    shortLabel: "Document",
    description: "Upload a document, report, or technical file (PDF, DOCX, ZIP, etc.)",
    iconName: "FileText",
    storageFields: ["fileUrl"],
    suggestKeywords: [
      "report",
      "documentation",
      "summary",
      "pdf",
      "written",
      "findings",
      "annotated",
      "annotation",
      "measurement",
      "classification",
      "analysis",
      // Technical export formats
      "point cloud",
      "obj",
      "glb",
      "geotiff",
      "cad",
      "dxf",
      "las",
      "laz",
      "e57",
      "dem",
      "bim",
      "orthomosaic",
      "mesh",
    ],
    usesProjectShareableLink: false,
    capabilities: {
      acceptsFile: true,
      fileAccept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.dxf,.dwg,.las,.laz,.e57,.obj,.glb,.gltf,.tif,.tiff,.geotiff",
      customerDownload: true,
    },
  },
  link: {
    id: "link",
    label: "Sharable Link",
    shortLabel: "Sharable Link",
    description: "Share via the project's external link (e.g. cloud viewer, web map)",
    iconName: "Link2",
    storageFields: [], // link uses project.shareableLink, no per-deliverable storage
    suggestKeywords: [
      "viewer access",
      "cloud viewer",
      "web map",
      "interactive hotspots",
      "web tour",
      "mobile tour",
      "viewer",
      "online viewer",
      "share link",
      "shareable link",
      "shared link",
    ],
    usesProjectShareableLink: true,
    capabilities: {
      acceptsFile: false,
      customerDownload: false,
    },
  },
};

export const DELIVERY_METHOD_IDS: DeliveryMethodId[] = Object.keys(DELIVERY_METHODS) as DeliveryMethodId[];

export function isDeliveryMethodId(value: unknown): value is DeliveryMethodId {
  return typeof value === "string" && (DELIVERY_METHOD_IDS as string[]).includes(value);
}

export function getDeliveryMethod(id: string | null | undefined): DeliveryMethodDefinition | null {
  if (!id) return null;
  return isDeliveryMethodId(id) ? DELIVERY_METHODS[id] : null;
}

// Suggestion helper — looks at a deliverable's name (and optionally its
// service name) and returns a suggested delivery method id, or null when
// nothing matches. Order matters: more specific keywords (link/video)
// match before broader ones (document) so e.g. "tour video" suggests
// video, not link.
const SUGGESTION_ORDER: DeliveryMethodId[] = ["link", "video", "image", "document"];

export function suggestDeliveryMethod(
  name: string | null | undefined,
  serviceName?: string | null,
): DeliveryMethodId | null {
  const haystack = `${name ?? ""} ${serviceName ?? ""}`.toLowerCase();
  if (!haystack.trim()) return null;
  for (const methodId of SUGGESTION_ORDER) {
    const method = DELIVERY_METHODS[methodId];
    for (const keyword of method.suggestKeywords) {
      if (haystack.includes(keyword)) {
        return methodId;
      }
    }
  }
  return null;
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "tif", "tiff", "bmp", "svg"];
const VIDEO_EXTENSIONS = ["mp4", "mov", "m4v", "avi", "mkv", "webm", "wmv", "flv"];

function extOf(url: string): string {
  const clean = url.split("?")[0].split("#")[0];
  const dot = clean.lastIndexOf(".");
  if (dot < 0) return "";
  return clean.slice(dot + 1).toLowerCase();
}

// Used for one-time backfill of existing deliverables that have a fileUrl
// or externalUrl but no deliveryMethod yet.
export function inferDeliveryMethodFromData(data: {
  fileUrl?: string | null;
  externalUrl?: string | null;
}): DeliveryMethodId | null {
  if (data.externalUrl) return "link";
  if (data.fileUrl) {
    const ext = extOf(data.fileUrl);
    if (IMAGE_EXTENSIONS.includes(ext)) return "image";
    if (VIDEO_EXTENSIONS.includes(ext)) return "video";
    return "document";
  }
  return null;
}

// Returns the patch needed to clear storage fields no longer used by the
// new method. Caller spreads this into the update payload.
export function clearedFieldsForMethodChange(
  newMethodId: DeliveryMethodId | null,
): { fileUrl?: null; externalUrl?: null; externalUrlLabel?: null } {
  const all: DeliveryStorageField[] = ["fileUrl", "externalUrl", "externalUrlLabel"];
  const keep = new Set<DeliveryStorageField>(
    newMethodId ? DELIVERY_METHODS[newMethodId].storageFields : [],
  );
  // externalUrlLabel rides along with externalUrl
  if (keep.has("externalUrl")) keep.add("externalUrlLabel");
  const out: { fileUrl?: null; externalUrl?: null; externalUrlLabel?: null } = {};
  for (const field of all) {
    if (!keep.has(field)) {
      out[field] = null;
    }
  }
  return out;
}
