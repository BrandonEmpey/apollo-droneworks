import { db } from '../server/db';
import { sql } from 'drizzle-orm';

const FOLDER_STRUCTURES: Record<string, string[]> = {
  "Real Estate Listings": [
    "01_Raw_Photos", "02_Edited_Photos", "03_Final_Delivery", "04_Client_Gallery",
  ],
  "Property Tours": [
    "01_Raw_Footage", "02_Edited_Tour", "03_Final_Video", "04_Photos",
  ],
  "Promotional Content": [
    "01_Raw_Photos", "02_Raw_Footage", "03_Edited_Content", "04_Social_Formats", "05_Final_Delivery",
  ],
  "Roof Inspections": [
    "01_Raw_Inspection_Photos", "02_Annotated_Images", "03_Inspection_Report",
  ],
  "Property & Site Evaluation": [
    "01_Raw_Photos", "02_Raw_Footage", "03_Annotated_Report", "04_Final_Delivery",
  ],
  "Infrastructure & Structure Inspections": [
    "01_Raw_Inspection_Photos", "02_Annotated_Images", "03_Compliance_Report", "04_Final_Delivery",
  ],
  "Construction Planning & Monitoring": [
    "01_Raw_Images", "02_Point_Cloud", "03_Topographic_Maps", "04_Progress_Reports", "05_GIS_Export",
  ],
  "Aerial Mapping": [
    "01_Flight_&_Data_Capture",
    "02_Processing/Orthomosaic",
    "02_Processing/Elevation_Data",
    "02_Processing/Contour_Maps",
    "02_Processing/Volumetric_Reports",
    "03_Deliverables/GIS_Files",
    "03_Deliverables/CAD_Exports",
    "03_Deliverables/Client_Formats",
    "Raw_Data",
    "Edited_Assets",
  ],
  "3D Modeling": [
    "01_Raw_Images", "02_Point_Cloud", "03_Mesh_Model", "04_Textured_Model", "05_Walkthrough_Video", "06_Final_Export",
  ],
  "Timelapse Creation": [
    "01_Raw_Frames", "02_Processed_Timelapse", "03_Final_Video", "04_Archive",
  ],
};

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const [name, folders] of Object.entries(FOLDER_STRUCTURES)) {
    const pgArray = `{${folders.map(f => `"${f}"`).join(",")}}`;
    const result = await db.execute(
      sql`UPDATE services
          SET folder_structure = ${pgArray}::text[]
          WHERE name = ${name}
            AND (folder_structure IS NULL OR folder_structure = '{}')
          RETURNING id`
    );
    const count = result.rows.length;
    if (count > 0) {
      console.log(`  Updated ${count} row(s) for "${name}"`);
      updated += count;
    } else {
      console.log(`  Skipped "${name}" (already populated or not found)`);
      skipped++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
