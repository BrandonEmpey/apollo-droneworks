// @vitest-environment node
//
// Integration tests for the enforceAerialImageRule middleware wired into
// POST /api/upload/image.
//
// Three cases are covered:
//   1. Non-compliant image → 400 + the temp file is removed from disk.
//   2. Compliant image     → 200 + the /uploads/... URL is returned.
//   3. Fail-open path      → when XAI_API_KEY is absent the validator skips
//                            the check (compliant:true, skipped:true) and
//                            the upload still succeeds with 200.
//
// validateAerialImageFile is mocked so the test suite never makes a real
// network call to the xAI vision API.
//
// NOTE: vi.mock factories are hoisted to the top of the file by vitest, so
// they cannot reference variables declared in the same module. The mock
// factory here uses vi.fn() inline; the typed reference is obtained via
// vi.mocked() after the module is imported.

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { type Server } from "http";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Mock the aerial image validator BEFORE importing upload-routes so that the
// hoisted factory is active when the module is first evaluated.
// ---------------------------------------------------------------------------

vi.mock("../ai/image-validator", () => ({
  validateAerialImageFile: vi.fn(),
  AERIAL_REJECTION_MESSAGE:
    "Image rejected: it does not meet the aerial-only marketing rule " +
    "(must be a top-down or oblique aerial drone view, with no drones, " +
    "aircraft, propellers, operators, watermarks, text, or logos in the frame).",
}));

// These imports resolve AFTER vi.mock is hoisted, so they receive the mock.
import { registerUploadRoutes } from "../upload-routes";
import { validateAerialImageFile } from "../ai/image-validator";

// Typed handle to the mock function — safe to use after hoisting.
const mockValidator = vi.mocked(validateAerialImageFile);

// ---------------------------------------------------------------------------
// Auth shim — same pattern used across other route integration tests.
// The isAdmin guard checks req.isAuthenticated?.() && req.user?.isAdmin.
// ---------------------------------------------------------------------------

type TestUser = { id: number; username: string; email: string; isAdmin: boolean };
interface RequestWithUser extends Request {
  user?: TestUser;
  isAuthenticated?: () => boolean;
}

const authCtx: { user: TestUser | null } = { user: null };

function fakeAuth(req: RequestWithUser, _res: Response, next: NextFunction) {
  req.isAuthenticated = () => authCtx.user !== null;
  if (authCtx.user) req.user = authCtx.user;
  next();
}

function actAsAdmin() {
  authCtx.user = {
    id: 1,
    username: "admin",
    email: "admin@test.com",
    isAdmin: true,
  };
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app: Express = express();
  app.use(fakeAuth);
  registerUploadRoutes(app);
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("listen failed");
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

afterEach(() => {
  authCtx.user = null;
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helper — build a multipart/form-data payload containing a minimal PNG.
// ---------------------------------------------------------------------------

function makeFakeImageFormData(
  filename = "test.png",
  mimeType = "image/png",
): FormData {
  // Minimal PNG magic bytes so multer accepts the file.
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const formData = new FormData();
  const blob = new Blob([pngHeader], { type: mimeType });
  formData.append("file", blob, filename);
  return formData;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/upload/image — aerial image rule enforcement", () => {
  it(
    "case 1: non-compliant image returns 400, includes the rejection message, and removes the temp file from disk",
    async () => {
      actAsAdmin();

      mockValidator.mockResolvedValueOnce({
        compliant: false,
        reason: "A drone is visible in the frame",
      });

      // Spy on unlinkSync to confirm the middleware cleans up the saved file.
      const unlinkSpy = vi.spyOn(fs, "unlinkSync");

      const res = await fetch(`${baseUrl}/api/upload/image`, {
        method: "POST",
        body: makeFakeImageFormData(),
      });

      expect(res.status).toBe(400);

      const body = (await res.json()) as { error: string; reason?: string };
      expect(body.error).toMatch(/aerial-only marketing rule/i);
      expect(body.reason).toBe("A drone is visible in the frame");

      // The middleware must have called fs.unlinkSync with the multer-saved path.
      expect(unlinkSpy).toHaveBeenCalledOnce();
      const deletedPath = unlinkSpy.mock.calls[0][0] as string;
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      expect(deletedPath.startsWith(uploadsDir)).toBe(true);

      // The file must no longer exist on disk.
      expect(fs.existsSync(deletedPath)).toBe(false);
    },
  );

  it(
    "case 2: compliant image returns 200 with a /uploads/... URL and file is kept on disk",
    async () => {
      actAsAdmin();

      mockValidator.mockResolvedValueOnce({ compliant: true });

      const res = await fetch(`${baseUrl}/api/upload/image`, {
        method: "POST",
        body: makeFakeImageFormData(),
      });

      expect(res.status).toBe(200);

      const body = (await res.json()) as { url: string };
      expect(body.url).toMatch(/^\/uploads\//);

      // The uploaded file should still be present on disk.
      const filePath = path.join(process.cwd(), "public", body.url);
      expect(fs.existsSync(filePath)).toBe(true);

      // Clean up the test file so it doesn't accumulate between runs.
      try { fs.unlinkSync(filePath); } catch { /* best-effort */ }
    },
  );

  it(
    "case 3: fail-open — when XAI_API_KEY is unset the validator returns skipped:true and the upload succeeds with 200",
    async () => {
      actAsAdmin();

      // This is the exact value validateAerialImageFile returns when the
      // XAI_API_KEY environment variable is not configured (see the
      // `unavailable()` helper in server/ai/image-validator.ts). The
      // enforceAerialImageRule middleware must treat it as compliant and
      // call next() rather than rejecting the upload.
      mockValidator.mockResolvedValueOnce({
        compliant: true,
        skipped: true,
        reason: "XAI_API_KEY not configured",
      });

      const res = await fetch(`${baseUrl}/api/upload/image`, {
        method: "POST",
        body: makeFakeImageFormData(),
      });

      expect(res.status).toBe(200);

      const body = (await res.json()) as { url: string };
      expect(body.url).toMatch(/^\/uploads\//);

      // Clean up the test file.
      const filePath = path.join(process.cwd(), "public", body.url);
      try { fs.unlinkSync(filePath); } catch { /* best-effort */ }
    },
  );
});
