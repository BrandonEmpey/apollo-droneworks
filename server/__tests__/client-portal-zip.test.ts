// @vitest-environment node
//
// Integration tests for POST /api/admin/client-portal/download-zip
//
// The route enforces admin-only access and builds a ZIP from the
// folderStructure stored in the services table.
//
// This suite mounts the real registerRoutes(app) against the live test
// Postgres DB, using the same fake-auth shim pattern established by
// server/__tests__/finance-routes-http.test.ts.

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { type Server } from "http";
import { inArray } from "drizzle-orm";
import { db } from "../db";
import { users } from "@shared/schema";
import { registerRoutes } from "../routes";
import { DatabaseStorage } from "../database-storage";
import JSZip from "jszip";

// ---------------------------------------------------------------------------
// Types & auth shim (same pattern as finance-routes-http.test.ts)
// ---------------------------------------------------------------------------

type InsertUserRow = typeof users.$inferInsert;

type TestUser = {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  role?: string;
  clientId?: number | null;
};

interface RequestWithUser extends Request {
  user?: TestUser;
}

const authCtx: { user: TestUser | null } = { user: null };
function fakeAuth(req: RequestWithUser, _res: Response, next: NextFunction) {
  if (authCtx.user) req.user = authCtx.user;
  next();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sanitizeName = (s: string) =>
  String(s).replace(/[/\\<>:"*?|]/g, "_").replace(/\.\./g, "_").trim();

function assertFolders(
  zipFiles: string[],
  safeProject: string,
  safeService: string,
  expectedFolders: string[],
) {
  for (const folder of expectedFolders) {
    const parts = folder.split("/").map((p) => sanitizeName(p)).filter((p) => p.length > 0);
    const expectedPath = `${safeProject}/${safeService}/${parts.join("/")}/.gitkeep`;
    expect(zipFiles).toContain(expectedPath);
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const tag = `task229-zip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createdUserIds: number[] = [];

let server: Server;
let baseUrl: string;
let adminUser: TestUser;
let nonAdminUser: TestUser;

async function insertUser(suffix: string, isAdmin = false): Promise<TestUser> {
  const row: InsertUserRow = {
    username: `${tag}-${suffix}`,
    password: "x",
    email: `${tag}-${suffix}@example.com`,
    isAdmin,
  };
  const [u] = await db.insert(users).values(row).returning({ id: users.id });
  createdUserIds.push(u.id);
  return { id: u.id, username: row.username!, email: row.email!, isAdmin };
}

beforeAll(async () => {
  adminUser = await insertUser("admin", true);
  nonAdminUser = await insertUser("user", false);

  const app: Express = express();
  app.use(express.json());
  app.use(fakeAuth);

  server = await registerRoutes(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));

  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("Server listen failed");
  baseUrl = `http://127.0.0.1:${addr.port}`;
}, 60_000);

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (createdUserIds.length) {
    await db.delete(users).where(inArray(users.id, createdUserIds));
  }
});

afterEach(() => {
  authCtx.user = null;
});

function actAs(user: TestUser) {
  authCtx.user = user;
}

// ---------------------------------------------------------------------------
// POST /api/admin/client-portal/download-zip — auth & validation
// ---------------------------------------------------------------------------

describe("POST /api/admin/client-portal/download-zip – auth and input validation", () => {
  it("returns 403 when the request is unauthenticated (isAdmin always returns 403 for non-admins)", async () => {
    const res = await fetch(`${baseUrl}/api/admin/client-portal/download-zip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName: "Test", serviceIds: ["1"] }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when a non-admin user calls the endpoint", async () => {
    actAs(nonAdminUser);
    const res = await fetch(`${baseUrl}/api/admin/client-portal/download-zip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName: "Test", serviceIds: ["1"] }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 when projectName is missing", async () => {
    actAs(adminUser);
    const res = await fetch(`${baseUrl}/api/admin/client-portal/download-zip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName: "", serviceIds: ["1"] }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/projectName/i);
  });

  it("returns 400 when serviceIds array is empty", async () => {
    actAs(adminUser);
    const res = await fetch(`${baseUrl}/api/admin/client-portal/download-zip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName: "My Project", serviceIds: [] }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when no serviceIds match existing services", async () => {
    actAs(adminUser);
    const res = await fetch(`${baseUrl}/api/admin/client-portal/download-zip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName: "My Project", serviceIds: ["999999999"] }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/No matching services/i);
  });
});

// ---------------------------------------------------------------------------
// POST /api/admin/client-portal/download-zip – ZIP contents
// ---------------------------------------------------------------------------

describe("POST /api/admin/client-portal/download-zip – ZIP folder hierarchy (DB)", () => {
  it("returns a valid ZIP with a root folder and README for a single service", async () => {
    const storage = new DatabaseStorage();
    const allServices = await storage.getServices();
    expect(allServices.length).toBeGreaterThan(0);

    const svc = allServices[0];
    actAs(adminUser);
    const res = await fetch(`${baseUrl}/api/admin/client-portal/download-zip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: "Acme_Tower_2024",
        clientName: "Acme Corp",
        serviceIds: [String(svc.id)],
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/zip");
    const disposition = res.headers.get("content-disposition") ?? "";
    expect(disposition).toContain("attachment");

    const buf = Buffer.from(await res.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);
    const zipFiles = Object.keys(zip.files);

    const safeProject = sanitizeName("Acme_Tower_2024").replace(/\s+/g, "_");
    const safeService = sanitizeName(svc.name).replace(/\s+/g, "_");

    expect(zipFiles.some((f) => f.startsWith(`${safeProject}/`))).toBe(true);
    expect(zipFiles).toContain(`${safeProject}/README.md`);
    expect(zipFiles.some((f) => f.startsWith(`${safeProject}/${safeService}/`))).toBe(true);
    expect(zipFiles).toContain(`${safeProject}/${safeService}/README.md`);
  });

  it("Real Estate Listings ZIP contains the four canonical delivery folders", async () => {
    const storage = new DatabaseStorage();
    const allServices = await storage.getServices();
    const svc = allServices.find((s) => s.name === "Real Estate Listings");
    expect(svc).toBeDefined();

    actAs(adminUser);
    const res = await fetch(`${baseUrl}/api/admin/client-portal/download-zip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: "RE_Test_Project",
        clientName: "Test Client",
        serviceIds: [String(svc!.id)],
      }),
    });

    expect(res.status).toBe(200);

    const buf = Buffer.from(await res.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);
    const zipFiles = Object.keys(zip.files);

    const safeProject = sanitizeName("RE_Test_Project").replace(/\s+/g, "_");
    const safeService = sanitizeName(svc!.name).replace(/\s+/g, "_");

    expect(zipFiles).toContain(`${safeProject}/${safeService}/README.md`);

    assertFolders(zipFiles, safeProject, safeService, [
      "01_Raw_Photos",
      "02_Edited_Photos",
      "03_Final_Delivery",
      "04_Client_Gallery",
    ]);
  });

  it("Aerial Mapping ZIP contains flat and nested delivery folders", async () => {
    const storage = new DatabaseStorage();
    const allServices = await storage.getServices();
    const svc = allServices.find((s) => s.name === "Aerial Mapping");
    expect(svc).toBeDefined();

    actAs(adminUser);
    const res = await fetch(`${baseUrl}/api/admin/client-portal/download-zip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: "Mapping_Test_Project",
        clientName: "Survey Co",
        serviceIds: [String(svc!.id)],
      }),
    });

    expect(res.status).toBe(200);

    const buf = Buffer.from(await res.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);
    const zipFiles = Object.keys(zip.files);

    const safeProject = sanitizeName("Mapping_Test_Project").replace(/\s+/g, "_");
    const safeService = sanitizeName(svc!.name).replace(/\s+/g, "_");

    expect(zipFiles).toContain(`${safeProject}/${safeService}/README.md`);

    // Flat top-level folders
    assertFolders(zipFiles, safeProject, safeService, [
      "01_Flight_&_Data_Capture",
      "Raw_Data",
      "Edited_Assets",
    ]);

    // Nested processing subfolders
    assertFolders(zipFiles, safeProject, safeService, [
      "02_Processing/Orthomosaic",
      "02_Processing/Elevation_Data",
      "02_Processing/Contour_Maps",
      "02_Processing/Volumetric_Reports",
    ]);

    // Nested deliverables subfolders
    assertFolders(zipFiles, safeProject, safeService, [
      "03_Deliverables/GIS_Files",
      "03_Deliverables/CAD_Exports",
      "03_Deliverables/Client_Formats",
    ]);
  });

  it("3D Modeling ZIP contains the six canonical delivery folders", async () => {
    const storage = new DatabaseStorage();
    const allServices = await storage.getServices();
    const svc = allServices.find((s) => s.name === "3D Modeling");
    expect(svc).toBeDefined();

    actAs(adminUser);
    const res = await fetch(`${baseUrl}/api/admin/client-portal/download-zip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: "3D_Test_Project",
        clientName: "Architecture Ltd",
        serviceIds: [String(svc!.id)],
      }),
    });

    expect(res.status).toBe(200);

    const buf = Buffer.from(await res.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);
    const zipFiles = Object.keys(zip.files);

    const safeProject = sanitizeName("3D_Test_Project").replace(/\s+/g, "_");
    const safeService = sanitizeName(svc!.name).replace(/\s+/g, "_");

    expect(zipFiles).toContain(`${safeProject}/${safeService}/README.md`);

    assertFolders(zipFiles, safeProject, safeService, [
      "01_Raw_Images",
      "02_Point_Cloud",
      "03_Mesh_Model",
      "04_Textured_Model",
      "05_Walkthrough_Video",
      "06_Final_Export",
    ]);
  });

  it("ZIP with all three services contains a subfolder and README for each", async () => {
    const storage = new DatabaseStorage();
    const allServices = await storage.getServices();
    const targetNames = ["Real Estate Listings", "Aerial Mapping", "3D Modeling"];
    const svcs = targetNames.map((name) => allServices.find((s) => s.name === name)!);
    svcs.forEach((s) => expect(s).toBeDefined());

    actAs(adminUser);
    const res = await fetch(`${baseUrl}/api/admin/client-portal/download-zip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: "Multi_Service_Project",
        clientName: "Big Client",
        serviceIds: svcs.map((s) => String(s.id)),
      }),
    });

    expect(res.status).toBe(200);

    const buf = Buffer.from(await res.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);
    const zipFiles = Object.keys(zip.files);

    const safeProject = sanitizeName("Multi_Service_Project").replace(/\s+/g, "_");

    // Every service gets its own subfolder and README
    for (const svc of svcs) {
      const safeService = sanitizeName(svc.name).replace(/\s+/g, "_");
      expect(zipFiles.some((f) => f.startsWith(`${safeProject}/${safeService}/`))).toBe(true);
      expect(zipFiles).toContain(`${safeProject}/${safeService}/README.md`);
    }

    // Spot-check one canonical folder per service
    assertFolders(
      zipFiles,
      safeProject,
      sanitizeName("Real Estate Listings").replace(/\s+/g, "_"),
      ["01_Raw_Photos"],
    );
    assertFolders(
      zipFiles,
      safeProject,
      sanitizeName("Aerial Mapping").replace(/\s+/g, "_"),
      ["02_Processing/Orthomosaic"],
    );
    assertFolders(
      zipFiles,
      safeProject,
      sanitizeName("3D Modeling").replace(/\s+/g, "_"),
      ["03_Mesh_Model"],
    );
  });

  it("sanitizes OS-illegal characters in projectName and still returns a valid ZIP", async () => {
    const storage = new DatabaseStorage();
    const allServices = await storage.getServices();
    const svc = allServices[0];

    actAs(adminUser);
    const res = await fetch(`${baseUrl}/api/admin/client-portal/download-zip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: 'Project: "Alpha" <2024>',
        serviceIds: [String(svc.id)],
      }),
    });

    expect(res.status).toBe(200);

    const buf = Buffer.from(await res.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);
    const zipFiles = Object.keys(zip.files);

    // Root folder in the ZIP must not contain OS-illegal chars
    const rootEntry = zipFiles[0];
    const rootFolder = rootEntry.split("/")[0];
    expect(rootFolder).not.toMatch(/[/\\<>:"*?|]/);
    expect(zipFiles.some((f) => f.startsWith(`${rootFolder}/`))).toBe(true);
  });

  it("root README lists all selected services with client name and project title", async () => {
    const storage = new DatabaseStorage();
    const allServices = await storage.getServices();
    const first2 = allServices.slice(0, 2);

    actAs(adminUser);
    const res = await fetch(`${baseUrl}/api/admin/client-portal/download-zip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: "Multi-Service_Project",
        clientName: "Big Client",
        serviceIds: first2.map((s) => String(s.id)),
      }),
    });

    expect(res.status).toBe(200);

    const buf = Buffer.from(await res.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);

    const safeProject = sanitizeName("Multi-Service_Project").replace(/\s+/g, "_");
    const rootReadme = await zip.file(`${safeProject}/README.md`)!.async("string");

    expect(rootReadme).toContain("Multi-Service_Project");
    expect(rootReadme).toContain("Big Client");
    for (const svc of first2) {
      expect(rootReadme).toContain(svc.name);
    }
  });
});

// ---------------------------------------------------------------------------
// Table-driven: all 10 canonical services – one folder assertion each
// Ensures every canonical service produces at least its first delivery folder
// in the ZIP returned by the real endpoint.
// ---------------------------------------------------------------------------

const CANONICAL_SPOT_CHECKS: Array<{ name: string; spotFolder: string }> = [
  { name: "Real Estate Listings",                  spotFolder: "01_Raw_Photos" },
  { name: "Property Tours",                        spotFolder: "01_Raw_Footage" },
  { name: "Promotional Content",                   spotFolder: "01_Raw_Photos" },
  { name: "Roof Inspections",                      spotFolder: "01_Raw_Inspection_Photos" },
  { name: "Property & Site Evaluation",            spotFolder: "01_Raw_Photos" },
  { name: "Infrastructure & Structure Inspections",spotFolder: "01_Raw_Inspection_Photos" },
  { name: "Construction Planning & Monitoring",    spotFolder: "01_Raw_Images" },
  { name: "Aerial Mapping",                        spotFolder: "02_Processing/Orthomosaic" },
  { name: "3D Modeling",                           spotFolder: "01_Raw_Images" },
  { name: "Timelapse Creation",                    spotFolder: "01_Raw_Frames" },
];

describe("POST /api/admin/client-portal/download-zip – all 10 canonical services (DB)", () => {
  for (const { name, spotFolder } of CANONICAL_SPOT_CHECKS) {
    it(`${name} ZIP contains "${spotFolder}"`, async () => {
      const storage = new DatabaseStorage();
      const allServices = await storage.getServices();
      const svc = allServices.find((s) => s.name === name);
      expect(svc).toBeDefined();

      actAs(adminUser);
      const res = await fetch(`${baseUrl}/api/admin/client-portal/download-zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: "Canonical_Test",
          serviceIds: [String(svc!.id)],
        }),
      });

      expect(res.status).toBe(200);

      const buf = Buffer.from(await res.arrayBuffer());
      const zip = await JSZip.loadAsync(buf);
      const zipFiles = Object.keys(zip.files);

      const safeProject = sanitizeName("Canonical_Test").replace(/\s+/g, "_");
      const safeService = sanitizeName(svc!.name).replace(/\s+/g, "_");

      assertFolders(zipFiles, safeProject, safeService, [spotFolder]);
    });
  }
});
