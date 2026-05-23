/**
 * This script migrates services to have sequential IDs 1-7
 */

import { db } from "./db";
import { services, serviceAddons } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

const serviceData = [
  {
    oldId: 25,
    newId: 1,
    name: 'Visual Media Package',
    description: 'Comprehensive aerial imagery and immersive 360-degree tours for marketing and documentation.',
    price: 90000,
    imageUrl: '/uploads/file-1751491014760-463247023.jpg',
  },
  {
    oldId: 26,
    newId: 2,
    name: 'Terrain Mapping Package',
    description: 'Detailed terrain and surface mapping for planning, analysis, and development.',
    price: 150000,
    imageUrl: 'https://images.unsplash.com/photo-1591588582259-e675bd2e6088?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  },
  {
    oldId: 27,
    newId: 3,
    name: 'Point Cloud & 3D Modeling',
    description: 'Advanced 3D point data and models for engineering and visualization.',
    price: 100000,
    imageUrl: 'https://images.unsplash.com/photo-1563589173576-88d5e8f10177?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  },
  {
    oldId: 28,
    newId: 4,
    name: 'Construction Monitoring',
    description: 'Regular aerial mapping and 3D data to track construction progress and site changes.',
    price: 70000,
    imageUrl: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  },
  {
    oldId: 29,
    newId: 5,
    name: 'Aerial Photography',
    description: 'High-resolution aerial images for marketing, inspections, and documentation.',
    price: 25000,
    imageUrl: 'https://images.unsplash.com/photo-1563589173576-88d5e8f10177?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  },
  {
    oldId: 30,
    newId: 6,
    name: 'Aerial Videography',
    description: 'Cinematic aerial video footage for promotional and inspection purposes.',
    price: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  },
  {
    oldId: 31,
    newId: 7,
    name: 'Precision Mapping Package',
    description: 'Ultra-high resolution maps for critical measurements and analysis.',
    price: 200000,
    imageUrl: 'https://images.unsplash.com/photo-1591588582259-e675bd2e6088?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  }
];

async function migrateToSequentialIds() {
  try {
    console.log("Starting migration to sequential service IDs...");

    // Get current services to preserve all data
    const currentServices = await db.select().from(services).where(inArray(services.id, [25, 26, 27, 28, 29, 30, 31]));
    
    // Get current service-addon relationships
    const currentServiceAddons = await db.select().from(serviceAddons).where(inArray(serviceAddons.serviceId, [25, 26, 27, 28, 29, 30, 31]));
    
    console.log(`Found ${currentServices.length} services and ${currentServiceAddons.length} service-addon relationships`);

    await db.transaction(async (tx) => {
      // Delete existing service-addon relationships
      await tx.delete(serviceAddons).where(inArray(serviceAddons.serviceId, [25, 26, 27, 28, 29, 30, 31]));
      
      // Delete existing services
      await tx.delete(services).where(inArray(services.id, [25, 26, 27, 28, 29, 30, 31]));
      
      // Recreate services with new sequential IDs, preserving all original data
      for (const service of currentServices) {
        const mapping = serviceData.find(s => s.oldId === service.id);
        if (!mapping) continue;

        await tx.insert(services).values({
          ...service, // Keep all original data
          id: mapping.newId // Override only the ID
        });
      }
      
      // Recreate service-addon relationships with new service IDs
      for (const serviceAddon of currentServiceAddons) {
        const mapping = serviceData.find(s => s.oldId === serviceAddon.serviceId);
        if (!mapping) continue;

        await tx.insert(serviceAddons).values({
          serviceId: mapping.newId,
          addonId: serviceAddon.addonId,
          isEnabled: serviceAddon.isEnabled,
          customPrice: serviceAddon.customPrice,
        });
      }
    });

    console.log("Migration completed successfully!");
    
    // Verify results
    const newServices = await db.select().from(services).where(inArray(services.id, [1, 2, 3, 4, 5, 6, 7]));
    console.log("New services:", newServices.map(s => ({ id: s.id, name: s.name })));
    
    const newServiceAddons = await db.select().from(serviceAddons).where(inArray(serviceAddons.serviceId, [1, 2, 3, 4, 5, 6, 7]));
    console.log("New service-addon relationships:", newServiceAddons.map(sa => ({ serviceId: sa.serviceId, addonId: sa.addonId })));

  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

migrateToSequentialIds().catch(console.error);