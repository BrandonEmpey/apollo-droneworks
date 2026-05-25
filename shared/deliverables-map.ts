export interface DefaultDeliverable {
  name: string;
  type: string;
}

// Maps service ID to the default deliverables auto-seeded when a project is created.
// type values: photo | video | geotiff | pointcloud | pdf | model | kmz | csv | other
export const DELIVERABLES_BY_SERVICE: Record<number, DefaultDeliverable[]> = {
  // Real Estate Listings
  1: [
    { name: "Edited Aerial Photos (JPG set)", type: "photo" },
    { name: "Highlight Video (60–90 sec MP4)", type: "video" },
    { name: "MLS-Ready Image Set (optimized JPGs)", type: "photo" },
  ],
  // Property Tours
  2: [
    { name: "Cinematic Property Tour (2–4 min MP4)", type: "video" },
    { name: "Social Media Cut (30–60 sec)", type: "video" },
  ],
  // Promotional Content
  3: [
    { name: "Brand/Event Video (1–3 min MP4)", type: "video" },
    { name: "Aerial Photo Set (JPG)", type: "photo" },
    { name: "Social Media Cuts (multiple formats)", type: "video" },
  ],
  // Roof Inspections
  4: [
    { name: "Annotated Inspection Report (PDF)", type: "pdf" },
    { name: "Full Resolution Photo Set (JPG)", type: "photo" },
    { name: "Inspection Walkthrough Video (MP4)", type: "video" },
  ],
  // Property & Site Evaluation
  5: [
    { name: "Annotated Inspection Report (PDF)", type: "pdf" },
    { name: "Full Resolution Photo Set (JPG)", type: "photo" },
    { name: "Aerial Overview Video (MP4)", type: "video" },
    { name: "Geo-Tagged KMZ File", type: "kmz" },
  ],
  // Infrastructure & Structure Inspections
  6: [
    { name: "Annotated Defect Report (PDF)", type: "pdf" },
    { name: "Full Resolution Photo Set (JPG)", type: "photo" },
    { name: "Inspection Video (MP4)", type: "video" },
  ],
  // Construction Planning & Monitoring
  7: [
    { name: "Georeferenced Orthomosaic (GeoTIFF)", type: "geotiff" },
    { name: "Digital Surface Model – DSM (GeoTIFF)", type: "geotiff" },
    { name: "Digital Terrain Model – DTM (GeoTIFF)", type: "geotiff" },
    { name: "Point Cloud (LAS/LAZ)", type: "pointcloud" },
    { name: "Volume Calculations Report (PDF)", type: "pdf" },
    { name: "Styled Map Export (PDF via QGIS)", type: "pdf" },
  ],
  // Aerial Mapping
  8: [
    { name: "Georeferenced Orthomosaic (GeoTIFF)", type: "geotiff" },
    { name: "Digital Surface Model – DSM (GeoTIFF)", type: "geotiff" },
    { name: "Contour Lines (SHP/DXF)", type: "other" },
    { name: "Styled Map Export (PDF via QGIS)", type: "pdf" },
    { name: "KMZ for Google Earth", type: "kmz" },
  ],
  // 3D Modeling
  9: [
    { name: "Textured 3D Mesh (OBJ/GLB)", type: "model" },
    { name: "Point Cloud (LAS/LAZ)", type: "pointcloud" },
    { name: "Measurements Report (PDF)", type: "pdf" },
  ],
  // Timelapse Creation
  10: [
    { name: "Timelapse Video (MP4)", type: "video" },
    { name: "Milestone Frame Set (JPG)", type: "photo" },
  ],
};

export function getDefaultDeliverables(serviceIds: number[]): DefaultDeliverable[] {
  const seen = new Set<string>();
  const result: DefaultDeliverable[] = [];
  for (const id of serviceIds) {
    for (const d of DELIVERABLES_BY_SERVICE[id] ?? []) {
      if (!seen.has(d.name)) {
        seen.add(d.name);
        result.push(d);
      }
    }
  }
  return result;
}
