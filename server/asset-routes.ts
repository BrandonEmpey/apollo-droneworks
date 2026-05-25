import type { Express } from "express";
import { db } from "./db";
import { businessAssets } from "@shared/schema";
import { eq } from "drizzle-orm";

// MACRS 5-year GDS half-year convention percentages
const MACRS_5_RATES = [0.20, 0.32, 0.192, 0.1152, 0.1152, 0.0576];

export interface DepreciationScheduleRow {
  year: number;
  bookValue: number;
  annualDepreciation: number;
  accumulatedDepreciation: number;
  remainingValue: number;
}

export interface AssetWithDepreciation {
  id: number;
  name: string;
  type: string;
  description: string | null;
  serialNumber: string | null;
  purchasePrice: number;
  purchaseDate: string;
  salvageValue: number;
  usefulLifeYears: number;
  expectedReplacementDate: string | null;
  depreciationMethod: string;
  vehicleMileageMethod: string | null;
  totalMilesAtPurchase: number | null;
  currentMiles: number | null;
  monthlyInsuranceCost: number;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Computed
  currentBookValue: number;
  totalDepreciationToDate: number;
  annualDepreciation: number;
  monthlyDepreciation: number;
  schedule: DepreciationScheduleRow[];
  yearsInService: number;
}

function computeDepreciation(asset: {
  purchasePrice: string | number;
  salvageValue: string | number | null;
  usefulLifeYears: number;
  depreciationMethod: string;
  purchaseDate: string;
}): {
  schedule: DepreciationScheduleRow[];
  currentBookValue: number;
  totalDepreciationToDate: number;
  annualDepreciation: number;
  monthlyDepreciation: number;
  yearsInService: number;
} {
  const cost = parseFloat(String(asset.purchasePrice));
  const salvage = parseFloat(String(asset.salvageValue ?? 0));
  const life = asset.usefulLifeYears;
  const method = asset.depreciationMethod;

  const purchaseYear = new Date(asset.purchaseDate).getFullYear();
  const currentYear = new Date().getFullYear();
  const yearsInService = Math.max(0, currentYear - purchaseYear);

  const schedule: DepreciationScheduleRow[] = [];

  if (method === 'section-179') {
    // Full deduction year 1
    schedule.push({
      year: purchaseYear,
      bookValue: cost,
      annualDepreciation: cost - salvage,
      accumulatedDepreciation: cost - salvage,
      remainingValue: salvage,
    });
    const annual = cost - salvage;
    const current = yearsInService >= 1 ? salvage : cost;
    return {
      schedule,
      currentBookValue: current,
      totalDepreciationToDate: cost - current,
      annualDepreciation: 0,
      monthlyDepreciation: 0,
      yearsInService,
    };
  }

  if (method === 'macrs-5') {
    let accumulated = 0;
    let bookValue = cost;
    const rates = MACRS_5_RATES;
    for (let i = 0; i < rates.length; i++) {
      const annual = cost * rates[i];
      accumulated += annual;
      const remaining = Math.max(salvage, cost - accumulated);
      schedule.push({
        year: purchaseYear + i,
        bookValue: bookValue,
        annualDepreciation: annual,
        accumulatedDepreciation: accumulated,
        remainingValue: remaining,
      });
      bookValue = remaining;
    }
  } else {
    // Straight-line
    const annual = (cost - salvage) / life;
    let accumulated = 0;
    let bookValue = cost;
    for (let i = 0; i < life; i++) {
      accumulated += annual;
      const remaining = Math.max(salvage, cost - accumulated);
      schedule.push({
        year: purchaseYear + i,
        bookValue: bookValue,
        annualDepreciation: annual,
        accumulatedDepreciation: accumulated,
        remainingValue: remaining,
      });
      bookValue = remaining;
    }
  }

  const currentRow = schedule[Math.min(yearsInService, schedule.length - 1)];
  const currentBookValue = yearsInService >= schedule.length
    ? salvage
    : schedule[yearsInService]?.remainingValue ?? salvage;

  const totalDepreciationToDate = cost - currentBookValue;
  const nextAnnual = yearsInService < schedule.length
    ? schedule[yearsInService]?.annualDepreciation ?? 0
    : 0;

  return {
    schedule,
    currentBookValue,
    totalDepreciationToDate,
    annualDepreciation: nextAnnual,
    monthlyDepreciation: nextAnnual / 12,
    yearsInService,
  };
}

function enrichAsset(row: any): AssetWithDepreciation {
  const dep = computeDepreciation(row);
  return {
    ...row,
    purchasePrice: parseFloat(row.purchasePrice),
    salvageValue: parseFloat(row.salvageValue ?? 0),
    monthlyInsuranceCost: parseFloat(row.monthlyInsuranceCost ?? 0),
    ...dep,
  };
}

export function registerAssetRoutes(app: Express) {
  // GET all assets
  app.get("/api/admin/assets", async (req, res) => {
    if (!req.isAuthenticated() || !(req.user as any)?.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const rows = await db.select().from(businessAssets).orderBy(businessAssets.name);
      res.json(rows.map(enrichAsset));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  // GET single asset
  app.get("/api/admin/assets/:id", async (req, res) => {
    if (!req.isAuthenticated() || !(req.user as any)?.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const [row] = await db.select().from(businessAssets)
        .where(eq(businessAssets.id, parseInt(req.params.id)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(enrichAsset(row));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch asset" });
    }
  });

  // POST create asset
  app.post("/api/admin/assets", async (req, res) => {
    if (!req.isAuthenticated() || !(req.user as any)?.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const {
        name, type, description, serialNumber, purchasePrice, purchaseDate,
        salvageValue, usefulLifeYears, expectedReplacementDate, depreciationMethod,
        vehicleMileageMethod, totalMilesAtPurchase, currentMiles,
        monthlyInsuranceCost, isActive, notes,
      } = req.body;

      const [created] = await db.insert(businessAssets).values({
        name,
        type: type || 'other',
        description: description || null,
        serialNumber: serialNumber || null,
        purchasePrice: String(purchasePrice),
        purchaseDate,
        salvageValue: String(salvageValue || 0),
        usefulLifeYears: parseInt(usefulLifeYears) || 5,
        expectedReplacementDate: expectedReplacementDate || null,
        depreciationMethod: depreciationMethod || 'straight-line',
        vehicleMileageMethod: vehicleMileageMethod || null,
        totalMilesAtPurchase: totalMilesAtPurchase ? parseInt(totalMilesAtPurchase) : null,
        currentMiles: currentMiles ? parseInt(currentMiles) : null,
        monthlyInsuranceCost: String(monthlyInsuranceCost || 0),
        isActive: isActive !== false,
        notes: notes || null,
      }).returning();

      res.status(201).json(enrichAsset(created));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to create asset" });
    }
  });

  // PUT update asset
  app.put("/api/admin/assets/:id", async (req, res) => {
    if (!req.isAuthenticated() || !(req.user as any)?.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const {
        name, type, description, serialNumber, purchasePrice, purchaseDate,
        salvageValue, usefulLifeYears, expectedReplacementDate, depreciationMethod,
        vehicleMileageMethod, totalMilesAtPurchase, currentMiles,
        monthlyInsuranceCost, isActive, notes,
      } = req.body;

      const [updated] = await db.update(businessAssets)
        .set({
          name,
          type: type || 'other',
          description: description || null,
          serialNumber: serialNumber || null,
          purchasePrice: String(purchasePrice),
          purchaseDate,
          salvageValue: String(salvageValue || 0),
          usefulLifeYears: parseInt(usefulLifeYears) || 5,
          expectedReplacementDate: expectedReplacementDate || null,
          depreciationMethod: depreciationMethod || 'straight-line',
          vehicleMileageMethod: vehicleMileageMethod || null,
          totalMilesAtPurchase: totalMilesAtPurchase ? parseInt(totalMilesAtPurchase) : null,
          currentMiles: currentMiles ? parseInt(currentMiles) : null,
          monthlyInsuranceCost: String(monthlyInsuranceCost || 0),
          isActive: isActive !== false,
          notes: notes || null,
          updatedAt: new Date(),
        })
        .where(eq(businessAssets.id, parseInt(req.params.id)))
        .returning();

      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(enrichAsset(updated));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to update asset" });
    }
  });

  // DELETE asset
  app.delete("/api/admin/assets/:id", async (req, res) => {
    if (!req.isAuthenticated() || !(req.user as any)?.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      await db.delete(businessAssets).where(eq(businessAssets.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

  // GET depreciation summary for job costing
  // Returns monthly cost per asset type, suitable for per-job cost breakdown
  app.get("/api/admin/assets/summary/job-costing", async (req, res) => {
    if (!req.isAuthenticated() || !(req.user as any)?.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const rows = await db.select().from(businessAssets)
        .where(eq(businessAssets.isActive, true));

      const enriched = rows.map(enrichAsset);

      const totalMonthlyDepreciation = enriched.reduce((sum, a) => sum + a.monthlyDepreciation, 0);
      const totalMonthlyInsurance = enriched.reduce((sum, a) => sum + a.monthlyInsuranceCost, 0);

      const byType = enriched.reduce((acc: Record<string, any>, a) => {
        if (!acc[a.type]) acc[a.type] = { monthlyDepreciation: 0, monthlyInsurance: 0, assets: [] };
        acc[a.type].monthlyDepreciation += a.monthlyDepreciation;
        acc[a.type].monthlyInsurance += a.monthlyInsuranceCost;
        acc[a.type].assets.push({ id: a.id, name: a.name, monthlyDepreciation: a.monthlyDepreciation });
        return acc;
      }, {});

      res.json({
        totalMonthlyDepreciation,
        totalMonthlyInsurance,
        totalMonthlyOverhead: totalMonthlyDepreciation + totalMonthlyInsurance,
        byType,
        assets: enriched,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to compute job costing summary" });
    }
  });
}
