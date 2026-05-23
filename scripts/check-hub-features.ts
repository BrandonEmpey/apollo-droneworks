#!/usr/bin/env tsx
/**
 * check-hub-features.ts
 *
 * Build-time guard: ensures every hub card in adminSections (admin-overview.tsx)
 * stays in sync with the real <TabsTrigger> labels rendered in each hub page.
 *
 * The script reads its source of truth from admin-overview.tsx itself:
 *   - Hub title + features list  → parsed from the adminSections array
 *   - Hub → source file mapping  → parsed from the comment block above adminSections
 *
 * Two checks are performed per hub (bidirectional):
 *   A. Every feature listed in adminSections must appear as a tab in the source file.
 *      (catches overview cards that reference a renamed/removed tab)
 *   B. Every tab in the source file (first TabsList only) must appear in adminSections.
 *      (catches new tabs added to a hub page without updating the overview card)
 *
 * Run manually:  npx tsx scripts/check-hub-features.ts
 * Wired into:    lint validation step
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const OVERVIEW_FILE = "client/src/pages/admin/admin-overview.tsx";

// ---------------------------------------------------------------------------
// Parse hub → source file mapping from the comment block in admin-overview.tsx
// The block looks like:
//   // Hub → source file mapping:
//   //   Business Intelligence  → client/src/pages/admin/analytics.tsx
// ---------------------------------------------------------------------------
function parseHubSourceMap(overviewContent: string): Map<string, string> {
  const mapping = new Map<string, string>();
  // Match lines: //   Hub Name  → client/src/...tsx  (→ is Unicode U+2192)
  const lineRegex = /\/\/\s+(.+?)\s+\u2192\s+(client\/src\/.+?\.tsx)/g;
  let m: RegExpExecArray | null;
  while ((m = lineRegex.exec(overviewContent)) !== null) {
    mapping.set(m[1].trim(), m[2].trim());
  }
  return mapping;
}

// ---------------------------------------------------------------------------
// Parse adminSections from the overview file.
// Returns a list of { title, features } objects in document order.
// ---------------------------------------------------------------------------
function parseAdminSections(overviewContent: string): Array<{ title: string; features: string[] }> {
  // Grab the array body between "const adminSections = [" and the closing "];"
  const arrayBodyMatch = overviewContent.match(/const adminSections\s*=\s*\[([\s\S]*?)\];/);
  if (!arrayBodyMatch) {
    throw new Error(`Could not locate adminSections array in ${OVERVIEW_FILE}`);
  }
  const arrayBody = arrayBodyMatch[1];

  // Extract titles in order
  const titles: string[] = [];
  const titleRe = /title:\s*"([^"]+)"/g;
  let tm: RegExpExecArray | null;
  while ((tm = titleRe.exec(arrayBody)) !== null) {
    titles.push(tm[1]);
  }

  // Extract features arrays in order
  const featureLists: string[][] = [];
  const featuresRe = /features:\s*\[([^\]]*)\]/g;
  let fm: RegExpExecArray | null;
  while ((fm = featuresRe.exec(arrayBody)) !== null) {
    const inner = fm[1];
    const items = [...inner.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    featureLists.push(items);
  }

  if (titles.length !== featureLists.length) {
    throw new Error(
      `Parsed ${titles.length} titles but ${featureLists.length} features arrays — ` +
        `adminSections structure may have changed in ${OVERVIEW_FILE}`
    );
  }

  return titles.map((title, i) => ({ title, features: featureLists[i] }));
}

// ---------------------------------------------------------------------------
// Extract visible text labels from the *first* <TabsList>…</TabsList> in a file.
// Only the first TabsList is examined so that nested secondary tab lists
// (e.g. sub-tabs within a tab panel) are not included.
//
// Handles three common JSX patterns:
//   1. Simple:    <TabsTrigger value="x">Label</TabsTrigger>
//   2. With icon: <TabsTrigger value="x"><Icon />{"\n"}  Label{"\n"}</TabsTrigger>
//   3. With span: <TabsTrigger value="x"><Icon />{"\n"}  <span>Label</span></TabsTrigger>
// ---------------------------------------------------------------------------
function extractFirstTabListLabels(filePath: string): string[] {
  const content = readFileSync(resolve(filePath), "utf-8");

  // Grab the first <TabsList>…</TabsList> block
  const tabsListMatch = content.match(/<TabsList[^>]*>([\s\S]*?)<\/TabsList>/);
  if (!tabsListMatch) return [];

  const listBody = tabsListMatch[1];
  const labels: string[] = [];
  const triggerRe = /<TabsTrigger[^>]*>([\s\S]*?)<\/TabsTrigger>/g;
  let m: RegExpExecArray | null;

  while ((m = triggerRe.exec(listBody)) !== null) {
    let inner = m[1];
    // Remove self-closing JSX tags (e.g. icon components like <Users className="..." />)
    inner = inner.replace(/<[A-Z][^>]*\/>/g, "");
    // Strip remaining opening/closing tags but preserve their text content
    inner = inner.replace(/<[^>]+>/g, " ");
    // Strip JSX expression nodes (e.g. {"\n"}, {/* comment */}, {someVar})
    inner = inner.replace(/\{[^}]*\}/g, " ");
    const text = inner.replace(/\s+/g, " ").trim();
    if (text) labels.push(text);
  }

  return labels;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
let overviewContent: string;
try {
  overviewContent = readFileSync(resolve(OVERVIEW_FILE), "utf-8");
} catch {
  console.error(`[hub-features] ERROR: Cannot read ${OVERVIEW_FILE}`);
  process.exit(1);
}

const hubSourceMap = parseHubSourceMap(overviewContent);
const adminSections = parseAdminSections(overviewContent);

let errors = 0;

for (const section of adminSections) {
  const sourceFile = hubSourceMap.get(section.title);
  if (!sourceFile) continue; // hub has no tab-based source file mapping — skip

  let tabLabels: string[];
  try {
    tabLabels = extractFirstTabListLabels(sourceFile);
  } catch {
    console.error(
      `[hub-features] ERROR: Cannot read source file for hub "${section.title}": ${sourceFile}`
    );
    errors++;
    continue;
  }

  // Check A: every overview feature must exist as a tab label
  for (const feature of section.features) {
    if (!tabLabels.includes(feature)) {
      console.error(
        `[hub-features] MISMATCH (A) in hub card "${section.title}": ` +
          `overview feature "${feature}" has no matching TabsTrigger in ${sourceFile}`
      );
      console.error(
        `  Actual first-TabsList labels: [${tabLabels.map((l) => `"${l}"`).join(", ")}]`
      );
      errors++;
    }
  }

  // Check B: every tab label must be listed in overview features
  for (const label of tabLabels) {
    if (!section.features.includes(label)) {
      console.error(
        `[hub-features] MISMATCH (B) in hub card "${section.title}": ` +
          `tab "${label}" in ${sourceFile} is not listed in adminSections.features`
      );
      console.error(
        `  adminSections features: [${section.features.map((f) => `"${f}"`).join(", ")}]`
      );
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(
    `\n[hub-features] ${errors} error(s) found.\n` +
      `  Fix: keep adminSections in ${OVERVIEW_FILE}\n` +
      `  in sync with the actual TabsTrigger labels in each hub's source file.\n`
  );
  process.exit(1);
} else {
  console.log(
    "[hub-features] OK — all hub card features match their source file tab labels (bidirectional)."
  );
}
