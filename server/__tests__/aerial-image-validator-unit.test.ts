// @vitest-environment node
//
// Unit tests for validateAerialImageFile (the real function, not a mock).
//
// These tests exercise the env-gating logic inside image-validator.ts itself:
//   - When XAI_API_KEY is absent the function must fail-open
//     (compliant:true, skipped:true) without calling the vision API.
//   - When XAI_API_KEY is present and the vision call returns non-compliant
//     the function must surface compliant:false.
//   - When XAI_API_KEY is present and the vision call returns compliant
//     the function must surface compliant:true.
//
// The grok OpenAI client is mocked at the module level so no real network
// calls are made in any case.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "os";
import fs from "fs/promises";
import path from "path";

// ---------------------------------------------------------------------------
// Mock the openai module so the grok client never hits the network.
// The factory is hoisted by vitest — no external variable references allowed.
// ---------------------------------------------------------------------------

vi.mock("openai", () => {
  const mockCreate = vi.fn();
  const MockOpenAI = vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
  // Attach the mock so tests can reach it via vi.mocked(OpenAI)
  return { default: MockOpenAI };
});

import OpenAI from "openai";
import { validateAerialImageFile } from "../ai/image-validator";

// Convenience accessor for the mock `create` function on any constructed instance.
function getMockCreate() {
  const instances = vi.mocked(OpenAI).mock.instances;
  if (instances.length === 0) return undefined;
  // The constructor mock sets chat.completions.create on the instance.
  return (instances[0] as unknown as { chat: { completions: { create: ReturnType<typeof vi.fn> } } })
    .chat.completions.create;
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let tempFilePath: string;

async function writeTempPng(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aerial-test-"));
  const file = path.join(dir, "test.png");
  // Minimal PNG header so MIME detection works by extension.
  await fs.writeFile(file, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return file;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(async () => {
  tempFilePath = await writeTempPng();
  vi.clearAllMocks();
});

afterEach(async () => {
  try { await fs.unlink(tempFilePath); } catch { /* best-effort */ }
  try { await fs.rmdir(path.dirname(tempFilePath)); } catch { /* best-effort */ }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("validateAerialImageFile — env-gating and vision-call wiring", () => {
  it(
    "fail-open: returns { compliant:true, skipped:true } when XAI_API_KEY is unset and never calls the vision API",
    async () => {
      const savedKey = process.env.XAI_API_KEY;
      delete process.env.XAI_API_KEY;
      try {
        const result = await validateAerialImageFile(tempFilePath, "image/png");

        expect(result.compliant).toBe(true);
        expect(result.skipped).toBe(true);
        expect(result.reason).toMatch(/XAI_API_KEY/i);

        // The vision model must NOT have been called.
        const mockCreate = getMockCreate();
        if (mockCreate) expect(mockCreate).not.toHaveBeenCalled();
      } finally {
        if (savedKey !== undefined) process.env.XAI_API_KEY = savedKey;
      }
    },
  );

  it(
    "non-compliant: returns { compliant:false } when vision API reports a violation",
    async () => {
      process.env.XAI_API_KEY = "test-key";
      try {
        // Re-instantiate so the new key takes effect in the module-level grok client.
        // Because the OpenAI constructor is mocked, we control the create response here.
        vi.mocked(OpenAI).mockImplementationOnce(
          () =>
            ({
              chat: {
                completions: {
                  create: vi.fn().mockResolvedValueOnce({
                    choices: [
                      {
                        message: {
                          content: JSON.stringify({
                            compliant: false,
                            reason: "Drone rotor visible in lower-left corner",
                          }),
                        },
                      },
                    ],
                  }),
                },
              },
            }) as unknown as InstanceType<typeof OpenAI>,
        );

        // Force re-import so the constructor re-runs with the mock above.
        vi.resetModules();
        const { validateAerialImageFile: freshFn } = await import("../ai/image-validator");

        const result = await freshFn(tempFilePath, "image/png");

        expect(result.compliant).toBe(false);
        expect(result.reason).toMatch(/drone/i);
      } finally {
        delete process.env.XAI_API_KEY;
        vi.resetModules();
      }
    },
  );

  it(
    "compliant: returns { compliant:true } when vision API confirms the image is aerial-only",
    async () => {
      process.env.XAI_API_KEY = "test-key";
      try {
        vi.mocked(OpenAI).mockImplementationOnce(
          () =>
            ({
              chat: {
                completions: {
                  create: vi.fn().mockResolvedValueOnce({
                    choices: [
                      {
                        message: {
                          content: JSON.stringify({ compliant: true, reason: "ok" }),
                        },
                      },
                    ],
                  }),
                },
              },
            }) as unknown as InstanceType<typeof OpenAI>,
        );

        vi.resetModules();
        const { validateAerialImageFile: freshFn } = await import("../ai/image-validator");

        const result = await freshFn(tempFilePath, "image/png");

        expect(result.compliant).toBe(true);
        expect(result.skipped).toBeUndefined();
      } finally {
        delete process.env.XAI_API_KEY;
        vi.resetModules();
      }
    },
  );
});
