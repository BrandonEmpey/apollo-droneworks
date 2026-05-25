import type { Express } from "express";
import { db } from "./db";
import { clientFiles } from "@shared/schema";
import { lt, eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

const isAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.isAdmin) return next();
  res.status(403).json({ message: "Forbidden" });
};

export function registerFileManagementRoutes(app: Express) {
  // GET /api/admin/expired-files — files whose expiresAt is in the past
  app.get("/api/admin/expired-files", isAdmin, async (req, res) => {
    try {
      const now = new Date();
      const rows = await db
        .select()
        .from(clientFiles)
        .where(lt(clientFiles.expiresAt, now));

      // Map to the shape admin-settings.tsx expects
      const result = rows.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        fileType: f.fileType,
        size: f.size,
        uploadedAt: f.uploadedAt?.toISOString() ?? null,
        expiresAtDate: f.expiresAt?.toISOString() ?? null,
        projectId: f.projectId,
        clientId: f.clientId,
        keywords: [],
      }));

      res.json(result);
    } catch (err) {
      console.error("Error fetching expired files:", err);
      res.status(500).json({ message: "Failed to fetch expired files" });
    }
  });

  // DELETE /api/admin/files/:id — permanently delete a client file
  app.delete("/api/admin/files/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

      const [file] = await db.select().from(clientFiles).where(eq(clientFiles.id, id));
      if (!file) return res.status(404).json({ message: "File not found" });

      // Try to remove from disk if it's a local path (not an external URL)
      if (file.fileUrl && !file.fileUrl.startsWith("http")) {
        const localPath = path.join(process.cwd(), "public", file.fileUrl.replace(/^\//, ""));
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      }

      await db.delete(clientFiles).where(eq(clientFiles.id, id));
      res.status(204).end();
    } catch (err) {
      console.error("Error deleting client file:", err);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // PUT /api/admin/files/:id/extend — update expiry date
  app.put("/api/admin/files/:id/extend", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

      const { expiresAtDate } = req.body;
      if (!expiresAtDate) return res.status(400).json({ message: "expiresAtDate is required" });

      const newDate = new Date(expiresAtDate);
      if (isNaN(newDate.getTime())) return res.status(400).json({ message: "Invalid date" });

      const [updated] = await db
        .update(clientFiles)
        .set({ expiresAt: newDate })
        .where(eq(clientFiles.id, id))
        .returning();

      if (!updated) return res.status(404).json({ message: "File not found" });
      res.json(updated);
    } catch (err) {
      console.error("Error extending file expiry:", err);
      res.status(500).json({ message: "Failed to extend file expiry" });
    }
  });
}
