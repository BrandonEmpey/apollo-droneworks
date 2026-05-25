import { Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "./db";
import {
  clientProjects,
  projectDeliverables,
  projectFiles,
  customers,
  services,
} from "@shared/schema";
import { getDefaultDeliverables } from "@shared/deliverables-map";
import { eq, desc, asc, and, isNull, ne, inArray } from "drizzle-orm";
import { requireAuth } from "./auth";

// ── multer setup ────────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "project-files");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500 MB

// ── helpers ─────────────────────────────────────────────────────────────────
function isAdmin(req: any): boolean {
  return req.isAuthenticated?.() && req.user?.isAdmin;
}

function adminOnly(req: Request, res: Response): boolean {
  if (!isAdmin(req)) {
    res.status(req.isAuthenticated?.() ? 403 : 401).json({ message: "Admin access required" });
    return false;
  }
  return true;
}

// Returns the nearest pending/processing deliverable due date for a project
function nearestDueDate(deliverables: any[]): Date | null {
  const active = deliverables
    .filter(d => d.status !== "delivered" && d.dueDate)
    .map(d => new Date(d.dueDate));
  if (!active.length) return null;
  return active.sort((a, b) => a.getTime() - b.getTime())[0];
}

export function registerProjectWorkflowRoutes(app: Express) {

  // ── Admin: project dashboard (clients with projects) ───────────────────
  // GET /api/admin/project-dashboard
  // Returns all customers who have ≥1 project, each with their projects +
  // deliverables. Sorted by the nearest incomplete deliverable due date.
  app.get("/api/admin/project-dashboard", requireAuth, async (req: any, res) => {
    if (!adminOnly(req, res)) return;
    try {
      const allProjects = await db
        .select()
        .from(clientProjects)
        .orderBy(asc(clientProjects.createdAt));

      if (!allProjects.length) return res.json([]);

      const projectIds = allProjects.map(p => p.id);
      const allDeliverables = await db
        .select()
        .from(projectDeliverables)
        .where(inArray(projectDeliverables.projectId, projectIds));

      const clientIds = Array.from(new Set(allProjects.map(p => p.clientId)));
      const allCustomers = await db
        .select()
        .from(customers)
        .where(inArray(customers.id, clientIds));

      // Group projects by client
      const clientMap: Record<number, any> = {};
      for (const c of allCustomers) {
        clientMap[c.id] = { ...c, projects: [] };
      }

      for (const p of allProjects) {
        const delivs = allDeliverables.filter(d => d.projectId === p.id);
        const completed = delivs.filter(d => d.status === "delivered" || d.status === "ready").length;
        const total = delivs.length;
        const nearest = nearestDueDate(delivs);
        clientMap[p.clientId]?.projects.push({
          ...p,
          deliverableCount: total,
          completedCount: completed,
          nearestDueDate: nearest,
        });
      }

      // Sort each client's projects by nearest due date
      const clientList = Object.values(clientMap).map((c: any) => {
        c.projects.sort((a: any, b: any) => {
          if (!a.nearestDueDate) return 1;
          if (!b.nearestDueDate) return -1;
          return new Date(a.nearestDueDate).getTime() - new Date(b.nearestDueDate).getTime();
        });
        // The client's urgency = its most urgent active project
        const clientNearest = c.projects
          .map((p: any) => p.nearestDueDate)
          .filter(Boolean)
          .sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;
        return { ...c, nearestDueDate: clientNearest };
      });

      // Sort client list by nearest due date
      clientList.sort((a: any, b: any) => {
        if (!a.nearestDueDate) return 1;
        if (!b.nearestDueDate) return -1;
        return new Date(a.nearestDueDate).getTime() - new Date(b.nearestDueDate).getTime();
      });

      res.json(clientList);
    } catch (err) {
      console.error("project-dashboard error:", err);
      res.status(500).json({ message: "Failed to load project dashboard" });
    }
  });

  // ── Admin: get single client with their projects ───────────────────────
  app.get("/api/admin/clients/:clientId/projects", requireAuth, async (req: any, res) => {
    if (!adminOnly(req, res)) return;
    try {
      const clientId = parseInt(req.params.clientId);
      const [customer] = await db.select().from(customers).where(eq(customers.id, clientId));
      if (!customer) return res.status(404).json({ message: "Client not found" });

      const projects = await db
        .select()
        .from(clientProjects)
        .where(eq(clientProjects.clientId, clientId))
        .orderBy(asc(clientProjects.createdAt));

      const projectIds = projects.map(p => p.id);
      const delivs = projectIds.length
        ? await db.select().from(projectDeliverables).where(inArray(projectDeliverables.projectId, projectIds))
        : [];

      const enriched = projects.map(p => {
        const pd = delivs.filter(d => d.projectId === p.id);
        return {
          ...p,
          deliverableCount: pd.length,
          completedCount: pd.filter(d => d.status === "delivered" || d.status === "ready").length,
          nearestDueDate: nearestDueDate(pd),
        };
      });

      res.json({ customer, projects: enriched });
    } catch (err) {
      console.error("client projects error:", err);
      res.status(500).json({ message: "Failed to load client projects" });
    }
  });

  // ── Admin: create project (with optional inline client) ────────────────
  app.post("/api/admin/projects", requireAuth, async (req: any, res) => {
    if (!adminOnly(req, res)) return;
    try {
      const {
        // inline client creation fields
        newClient,
        // project fields
        clientId: existingClientId,
        name,
        description,
        selectedServices,
        droneType,
        dueDate,
        address,
        notes,
      } = req.body;

      let clientId: number = existingClientId;

      // Inline client creation
      if (newClient) {
        const [created] = await db
          .insert(customers)
          .values({
            name: newClient.name,
            email: newClient.email,
            phone: newClient.phone,
            company: newClient.company ?? null,
            status: "active",
          })
          .returning();
        clientId = created.id;
      }

      if (!clientId) return res.status(400).json({ message: "clientId is required" });

      // Create the project
      const [project] = await db
        .insert(clientProjects)
        .values({
          name,
          description: description ?? null,
          clientId,
          selectedServices: selectedServices ?? [],
          droneType: droneType ?? null,
          dueDate: dueDate ? new Date(dueDate) : null,
          address: address ?? null,
          notes: notes ?? null,
          status: "active",
        })
        .returning();

      // Auto-seed deliverables from service map
      const serviceIds: number[] = Array.isArray(selectedServices) ? selectedServices : [];
      const defaults = getDefaultDeliverables(serviceIds);
      const deliverableDueDate = dueDate ? new Date(dueDate) : null;

      if (defaults.length) {
        await db.insert(projectDeliverables).values(
          defaults.map(d => ({
            projectId: project.id,
            name: d.name,
            type: d.type,
            status: "pending",
            dueDate: deliverableDueDate,
          }))
        );
      }

      const seededDeliverables = await db
        .select()
        .from(projectDeliverables)
        .where(eq(projectDeliverables.projectId, project.id));

      res.status(201).json({ project, deliverables: seededDeliverables });
    } catch (err) {
      console.error("create project error:", err);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // ── Admin: get single project with deliverables + files ────────────────
  app.get("/api/admin/projects/:id", requireAuth, async (req: any, res) => {
    if (!adminOnly(req, res)) return;
    try {
      const id = parseInt(req.params.id);
      const [project] = await db.select().from(clientProjects).where(eq(clientProjects.id, id));
      if (!project) return res.status(404).json({ message: "Project not found" });

      const [customer] = await db.select().from(customers).where(eq(customers.id, project.clientId));
      const deliverables = await db
        .select()
        .from(projectDeliverables)
        .where(eq(projectDeliverables.projectId, id))
        .orderBy(asc(projectDeliverables.dueDate));
      const files = await db
        .select()
        .from(projectFiles)
        .where(eq(projectFiles.projectId, id))
        .orderBy(desc(projectFiles.uploadedAt));

      res.json({ project, customer, deliverables, files });
    } catch (err) {
      console.error("get project error:", err);
      res.status(500).json({ message: "Failed to load project" });
    }
  });

  // ── Admin: update project ──────────────────────────────────────────────
  app.put("/api/admin/projects/:id", requireAuth, async (req: any, res) => {
    if (!adminOnly(req, res)) return;
    try {
      const id = parseInt(req.params.id);
      const { name, description, droneType, dueDate, status, address, notes, selectedServices } = req.body;

      const [updated] = await db
        .update(clientProjects)
        .set({
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(droneType !== undefined && { droneType }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(status !== undefined && { status }),
          ...(address !== undefined && { address }),
          ...(notes !== undefined && { notes }),
          ...(selectedServices !== undefined && { selectedServices }),
          updatedAt: new Date(),
        })
        .where(eq(clientProjects.id, id))
        .returning();

      if (!updated) return res.status(404).json({ message: "Project not found" });
      res.json(updated);
    } catch (err) {
      console.error("update project error:", err);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // ── Admin: add deliverable ─────────────────────────────────────────────
  app.post("/api/admin/projects/:id/deliverables", requireAuth, async (req: any, res) => {
    if (!adminOnly(req, res)) return;
    try {
      const projectId = parseInt(req.params.id);
      const { name, type, dueDate, notes } = req.body;
      if (!name) return res.status(400).json({ message: "name is required" });

      const [deliverable] = await db
        .insert(projectDeliverables)
        .values({
          projectId,
          name,
          type: type ?? "other",
          status: "pending",
          dueDate: dueDate ? new Date(dueDate) : null,
          notes: notes ?? null,
        })
        .returning();

      res.status(201).json(deliverable);
    } catch (err) {
      console.error("add deliverable error:", err);
      res.status(500).json({ message: "Failed to add deliverable" });
    }
  });

  // ── Admin: update deliverable ──────────────────────────────────────────
  app.put("/api/admin/deliverables/:id", requireAuth, async (req: any, res) => {
    if (!adminOnly(req, res)) return;
    try {
      const id = parseInt(req.params.id);
      const { name, type, status, dueDate, fileUrl, notes } = req.body;

      const [updated] = await db
        .update(projectDeliverables)
        .set({
          ...(name !== undefined && { name }),
          ...(type !== undefined && { type }),
          ...(status !== undefined && { status }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(fileUrl !== undefined && { fileUrl }),
          ...(notes !== undefined && { notes }),
          updatedAt: new Date(),
        })
        .where(eq(projectDeliverables.id, id))
        .returning();

      if (!updated) return res.status(404).json({ message: "Deliverable not found" });
      res.json(updated);
    } catch (err) {
      console.error("update deliverable error:", err);
      res.status(500).json({ message: "Failed to update deliverable" });
    }
  });

  // ── Admin: delete deliverable ──────────────────────────────────────────
  app.delete("/api/admin/deliverables/:id", requireAuth, async (req: any, res) => {
    if (!adminOnly(req, res)) return;
    try {
      const id = parseInt(req.params.id);
      await db.delete(projectDeliverables).where(eq(projectDeliverables.id, id));
      res.json({ message: "Deleted" });
    } catch (err) {
      console.error("delete deliverable error:", err);
      res.status(500).json({ message: "Failed to delete deliverable" });
    }
  });

  // ── Admin: upload raw project files ───────────────────────────────────
  app.post(
    "/api/admin/projects/:id/files",
    requireAuth,
    upload.array("files", 100),
    async (req: any, res) => {
      if (!adminOnly(req, res)) return;
      try {
        const projectId = parseInt(req.params.id);
        const fileType = (req.body.fileType as string) ?? "other";
        const uploadedFiles = req.files as Express.Multer.File[];

        if (!uploadedFiles?.length) {
          return res.status(400).json({ message: "No files received" });
        }

        const inserted = await db
          .insert(projectFiles)
          .values(
            uploadedFiles.map(f => ({
              projectId,
              fileName: f.originalname,
              filePath: `/uploads/project-files/${f.filename}`,
              fileType,
              fileSize: f.size,
            }))
          )
          .returning();

        res.status(201).json(inserted);
      } catch (err) {
        console.error("file upload error:", err);
        res.status(500).json({ message: "Failed to upload files" });
      }
    }
  );

  // ── Admin: delete a raw file ──────────────────────────────────────────
  app.delete("/api/admin/files/:id", requireAuth, async (req: any, res) => {
    if (!adminOnly(req, res)) return;
    try {
      const id = parseInt(req.params.id);
      const [file] = await db.select().from(projectFiles).where(eq(projectFiles.id, id));
      if (!file) return res.status(404).json({ message: "File not found" });

      // Remove from disk
      const disk = path.join(process.cwd(), file.filePath);
      if (fs.existsSync(disk)) fs.unlinkSync(disk);

      await db.delete(projectFiles).where(eq(projectFiles.id, id));
      res.json({ message: "Deleted" });
    } catch (err) {
      console.error("delete file error:", err);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // ── Client portal: current user's projects + deliverables ─────────────
  app.get("/api/portal/projects", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Find the customer record linked to this user
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.userId, userId));

      if (!customer) return res.json([]);

      const projects = await db
        .select()
        .from(clientProjects)
        .where(eq(clientProjects.clientId, customer.id))
        .orderBy(desc(clientProjects.createdAt));

      if (!projects.length) return res.json([]);

      const projectIds = projects.map(p => p.id);
      const delivs = await db
        .select()
        .from(projectDeliverables)
        .where(inArray(projectDeliverables.projectId, projectIds))
        .orderBy(asc(projectDeliverables.dueDate));

      const result = projects.map(p => ({
        ...p,
        deliverables: delivs.filter(d => d.projectId === p.id),
      }));

      res.json(result);
    } catch (err) {
      console.error("portal projects error:", err);
      res.status(500).json({ message: "Failed to load projects" });
    }
  });

  // Serve uploaded project files statically
  app.use("/uploads/project-files", (req, res, next) => {
    if (!req.isAuthenticated?.()) return res.status(401).json({ message: "Unauthorized" });
    next();
  });
}
