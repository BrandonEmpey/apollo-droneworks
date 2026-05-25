/**
 * Run once:  npx tsx server/seed-demo-projects.ts
 * Creates demo clients + projects + deliverables so the project dashboard
 * has real data to display.
 */
import { db } from "./db";
import { customers, clientProjects, projectDeliverables } from "@shared/schema";
import { getDefaultDeliverables } from "@shared/deliverables-map";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding demo clients & projects…");

  // ── Clients ────────────────────────────────────────────────────────────────
  const clientDefs = [
    {
      name: "Sarah Mitchell",
      email: "smitchell@century21stgeorge.com",
      phone: "(435) 555-0101",
      company: "Century 21 St. George",
    },
    {
      name: "Derek Holt",
      email: "dholt@ironcountyconstruction.com",
      phone: "(435) 555-0188",
      company: "Iron County Construction LLC",
    },
    {
      name: "Karen Baxter",
      email: "kbaxter@wcfarmbureau.org",
      phone: "(435) 555-0247",
      company: "Washington Co. Farm Bureau",
    },
    {
      name: "Marcus Webb",
      email: "marcus@webbdevelopment.com",
      phone: "(435) 555-0319",
      company: "Webb Development Group",
    },
  ];

  const createdClients: { id: number; name: string }[] = [];
  for (const c of clientDefs) {
    const existing = await db.select().from(customers).where(eq(customers.email, c.email));
    if (existing.length) {
      console.log(`  Client already exists: ${c.name}`);
      createdClients.push({ id: existing[0].id, name: c.name });
      continue;
    }
    const [created] = await db.insert(customers).values({ ...c, status: "active" }).returning();
    createdClients.push({ id: created.id, name: c.name });
    console.log(`  Created client: ${c.name} (id=${created.id})`);
  }

  const [sarah, derek, karen, marcus] = createdClients;

  // Helper: days from today
  const daysFromNow = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
  };

  // ── Projects ───────────────────────────────────────────────────────────────
  const projectDefs = [
    // Sarah Mitchell — real estate agent
    {
      clientId: sarah.id,
      name: "2847 Desert Vista Dr — Listing Shoot",
      droneType: "air-3s",
      dueDate: daysFromNow(4),
      selectedServices: [1, 2],   // Real Estate Listings + Property Tours
      address: "2847 Desert Vista Dr, St. George, UT",
      status: "active",
      deliverableOverrides: [] as { name: string; dueDate: Date }[],
    },
    {
      clientId: sarah.id,
      name: "Mountain View Estates — 12-Lot Subdivision",
      droneType: "matrice-4e",
      dueDate: daysFromNow(-5),  // already completed
      selectedServices: [1],
      address: "Washington City, UT",
      status: "completed",
      deliverableOverrides: [],
    },

    // Derek Holt — construction
    {
      clientId: derek.id,
      name: "Cedar City Medical Center — Phase 2 Progress",
      droneType: "matrice-4e",
      dueDate: daysFromNow(2),   // urgent
      selectedServices: [7],      // Construction Planning & Monitoring
      address: "Cedar City, UT",
      status: "active",
      deliverableOverrides: [
        { name: "Monthly Progress Report — May (PDF)", dueDate: daysFromNow(2) },
        { name: "Monthly Progress Report — June (PDF)", dueDate: daysFromNow(32) },
        { name: "Monthly Progress Report — July (PDF)", dueDate: daysFromNow(62) },
      ],
    },
    {
      clientId: derek.id,
      name: "Highway 56 Interchange — Site Survey",
      droneType: "matrice-4e",
      dueDate: daysFromNow(11),
      selectedServices: [8],      // Aerial Mapping
      address: "Cedar City, UT",
      status: "active",
      deliverableOverrides: [],
    },

    // Karen Baxter — agriculture
    {
      clientId: karen.id,
      name: "Spring Crop Survey — 400 Acres",
      droneType: "matrice-4e",
      dueDate: daysFromNow(7),
      selectedServices: [8],      // Aerial Mapping (NDVI/orthomosaic)
      address: "Washington County, UT",
      status: "active",
      deliverableOverrides: [],
    },

    // Marcus Webb — developer
    {
      clientId: marcus.id,
      name: "Desert Ridge Subdivision — Pre-Dev Survey",
      droneType: "matrice-4e",
      dueDate: daysFromNow(14),
      selectedServices: [7, 8, 9], // Construction + Mapping + 3D Model
      address: "Hurricane, UT",
      status: "active",
      deliverableOverrides: [],
    },
    {
      clientId: marcus.id,
      name: "Ivins Commercial Lot — Promotional Video",
      droneType: "air-3s",
      dueDate: daysFromNow(3),
      selectedServices: [3],      // Promotional Content
      address: "Ivins, UT",
      status: "active",
      deliverableOverrides: [],
    },
  ];

  for (const p of projectDefs) {
    const [project] = await db.insert(clientProjects).values({
      name: p.name,
      clientId: p.clientId,
      droneType: p.droneType,
      dueDate: p.dueDate,
      selectedServices: p.selectedServices,
      address: p.address,
      status: p.status,
    }).returning();

    console.log(`  Created project: "${p.name}" (id=${project.id})`);

    // Use override deliverables (construction monitoring) or auto-seed from service map
    const delivs = p.deliverableOverrides.length
      ? p.deliverableOverrides.map(o => ({ name: o.name, type: "pdf", dueDate: o.dueDate }))
      : getDefaultDeliverables(p.selectedServices).map(d => ({ name: d.name, type: d.type, dueDate: p.dueDate }));

    if (delivs.length) {
      // For completed projects, mark all deliverables as delivered
      const status = p.status === "completed" ? "delivered" : "pending";

      // Sprinkle in some in-progress statuses for active projects to make the
      // dashboard look realistic
      await db.insert(projectDeliverables).values(
        delivs.map((d, i) => ({
          projectId: project.id,
          name: d.name,
          type: d.type,
          status: p.status === "completed"
            ? "delivered"
            : i === 0 ? "ready"       // first deliverable ready
            : i === 1 ? "processing"  // second in progress
            : "pending",
          dueDate: d.dueDate,
        }))
      );
      console.log(`    → ${delivs.length} deliverables seeded`);
    }
  }

  console.log("\nDemo seed complete.");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
