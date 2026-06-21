/**
 * Populates service_addons links if the table is empty.
 *
 * Handles the case where the DB was seeded with 11 services+addons via the
 * init-db seed path but the addon-link insertion failed mid-way, leaving the
 * service_addons table empty. Idempotent: no-op if any links already exist.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

export async function populateServiceAddonLinks() {
  const count = await db.execute(sql`SELECT COUNT(*) AS n FROM service_addons`);
  const n = Number((count.rows[0] as { n: string }).n);
  if (n > 0) {
    console.log(`[addon-links] ${n} links already exist — skipping.`);
    return;
  }

  console.log("[addon-links] service_addons is empty — populating links...");

  // Fetch addon IDs by name
  const addonRows = await db.execute(sql`
    SELECT id, name FROM addons ORDER BY id
  `);
  const addonMap: Record<string, number> = {};
  for (const r of addonRows.rows as { id: number; name: string }[]) {
    addonMap[r.name] = r.id;
  }

  // Fetch service IDs by name
  const svcRows = await db.execute(sql`
    SELECT id, name FROM services
  `);
  const svcMap: Record<string, number> = {};
  for (const r of svcRows.rows as { id: number; name: string }[]) {
    svcMap[r.name] = r.id;
  }

  const A = addonMap;
  const S = svcMap;

  const links: { serviceId: number; addonId: number; isEnabled: boolean }[] = [
    // Real Estate Listings
    { serviceId: S["Real Estate Listings"],        addonId: A["Extra 5 Photos"],                      isEnabled: true  },
    { serviceId: S["Real Estate Listings"],        addonId: A["Social Media Crop Pack"],               isEnabled: true  },
    // Promotional Content
    { serviceId: S["Promotional Content"],         addonId: A["Extra Edited Video Cut"],               isEnabled: true  },
    { serviceId: S["Promotional Content"],         addonId: A["Extended Site Coverage"],               isEnabled: true  },
    // Roof Inspections
    { serviceId: S["Roof Inspections"],            addonId: A["Additional Structure on Same Property"],isEnabled: true  },
    { serviceId: S["Roof Inspections"],            addonId: A["Follow-Up Visit"],                      isEnabled: true  },
    { serviceId: S["Roof Inspections"],            addonId: A["Thermal Imaging"],                      isEnabled: false },
    // Property & Site Evaluation
    { serviceId: S["Property & Site Evaluation"],  addonId: A["Follow-Up Visit"],                      isEnabled: true  },
    { serviceId: S["Property & Site Evaluation"],  addonId: A["Extended Property Coverage"],           isEnabled: true  },
    // Structural Inspections
    { serviceId: S["Structural Inspections"],      addonId: A["Additional Structure on Same Site"],    isEnabled: true  },
    { serviceId: S["Structural Inspections"],      addonId: A["Follow-Up Visit"],                      isEnabled: true  },
    { serviceId: S["Structural Inspections"],      addonId: A["Thermal Imaging"],                      isEnabled: false },
    // Aerial Mapping
    { serviceId: S["Aerial Mapping"],              addonId: A["Custom CAD/GIS Export Formatting"],     isEnabled: true  },
    // Construction Monitoring / Timelapse
    { serviceId: S["Construction Monitoring / Timelapse"], addonId: A["Additional One-Off Monitoring Flight"], isEnabled: true },
    // 3D Digital Twin
    { serviceId: S["3D Digital Twin"],             addonId: A["Rendered Fly-Through Video Export"],    isEnabled: true  },
    { serviceId: S["3D Digital Twin"],             addonId: A["Custom-Branded Embeddable Viewer"],     isEnabled: true  },
    // Foundation to Finish
    { serviceId: S["Foundation to Finish"],        addonId: A["Extended/Upgraded Project Story Video"],isEnabled: false },
  ];

  let inserted = 0;
  for (const link of links) {
    if (!link.serviceId || !link.addonId) {
      console.warn(`[addon-links] Skipping link — service or addon not found`);
      continue;
    }
    await db.execute(sql`
      INSERT INTO service_addons (service_id, addon_id, is_enabled)
      VALUES (${link.serviceId}, ${link.addonId}, ${link.isEnabled})
    `);
    inserted++;
  }

  console.log(`[addon-links] Inserted ${inserted} service-addon links.`);
}
