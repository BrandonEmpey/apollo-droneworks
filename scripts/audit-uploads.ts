/**
 * Audit script: cross-reference every file under public/uploads/ subfolders
 * against all DB image columns and frontend code references.
 *
 * Run:  npx tsx scripts/audit-uploads.ts
 *
 * Output: prints KEPT / ORPHAN status for every file found, and exits with a
 * non-zero code if any orphans remain.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { db } from "../server/db";
import {
  services,
  blogPosts,
  testimonials,
  aboutPageContent,
  galleries,
  heroSlides,
  industryTiles,
} from "../shared/schema";

const UPLOADS_ROOT = path.resolve("public/uploads");

async function collectDbRefs(): Promise<Set<string>> {
  const refs = new Set<string>();

  const add = (v: string | null | undefined) => {
    if (v && v.startsWith("/uploads/")) refs.add(v);
  };

  const addArray = (arr: unknown) => {
    if (Array.isArray(arr)) arr.forEach((v) => add(v as string));
  };

  const [svcRows, blogRows, testRows, aboutRows, galleryRows, heroRows, industryRows] =
    await Promise.all([
      db.select().from(services),
      db.select().from(blogPosts),
      db.select().from(testimonials),
      db.select().from(aboutPageContent),
      db.select().from(galleries),
      db.select().from(heroSlides),
      db.select().from(industryTiles),
    ]);

  svcRows.forEach((r) => {
    add(r.imageUrl);
    addArray(r.images);
  });
  blogRows.forEach((r) => add(r.imageUrl));
  testRows.forEach((r) => add(r.imageUrl));
  aboutRows.forEach((r) => add(r.imageUrl));
  galleryRows.forEach((r) => {
    add(r.url);
    add(r.thumbnail);
  });
  heroRows.forEach((r) => add(r.url));
  industryRows.forEach((r) => add(r.imageUrl));

  return refs;
}

function collectCodeRefs(): Set<string> {
  const refs = new Set<string>();
  try {
    const out = execSync(
      `grep -r --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.html" --include="*.mdx" -oh '/uploads/[^"'"'"' )>]*' .`,
      { encoding: "utf8" }
    );
    out
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((p) => refs.add(p));
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status !== 1) {
      console.warn("Warning: code-ref grep failed unexpectedly:", err);
    }
    // exit code 1 = no matches found — expected, not an error
  }
  return refs;
}

function walkDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walkDir(full) : [full];
    });
}

async function main() {
  const dbRefs = await collectDbRefs();
  const codeRefs = collectCodeRefs();
  const allRefs = new Set([...dbRefs, ...codeRefs]);

  const files = walkDir(UPLOADS_ROOT);

  const orphans: string[] = [];
  const kept: string[] = [];

  for (const abs of files) {
    const rel = "/" + path.relative("public", abs).replace(/\\/g, "/");
    if (allRefs.has(rel)) {
      kept.push(rel);
    } else {
      orphans.push(rel);
    }
  }

  console.log("\n=== KEPT (referenced) ===");
  kept.sort().forEach((f) => console.log("  KEPT    ", f));

  console.log("\n=== ORPHAN (not referenced) ===");
  if (orphans.length === 0) {
    console.log("  (none — all files are referenced)");
  } else {
    orphans.sort().forEach((f) => console.log("  ORPHAN  ", f));
  }

  console.log(`\nSummary: ${kept.length} kept, ${orphans.length} orphan(s)`);

  if (orphans.length > 0) {
    console.error("\nOrphan files detected. Delete them and re-run this script.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
