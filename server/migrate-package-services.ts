import { db } from "./db";
import { services } from "../shared/schema";

/**
 * This script replaces all existing services with the new package-based service lineup
 */

const newServices = [
  {
    name: "Visual Media Package",
    description: "Comprehensive aerial imagery and immersive 360-degree tours for marketing and documentation.",
    tooltipDescription: "Stunning photos, videos, and virtual tours from the air.",
    aboutServiceContent: "The Visual Media Package combines high-resolution aerial photography, cinematic videography, and interactive 360-degree virtual tours to showcase properties, events, or projects from unique perspectives. Ideal for real estate marketing, event promotion, and construction documentation, this service delivers visually compelling content for clients seeking to engage audiences or document assets.",
    imageUrl: "https://images.unsplash.com/photo-1563589173576-88d5e8f10177?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 90000, // $900 (middle tier for display)
    pricingType: "tiered",
    bundleDiscountPercentage: 50,
    pricingTiers: [
      {
        name: "Basic",
        description: "5 photos, 1-min video, 1 tour",
        exactQuantity: 1,
        quantityType: "exact" as const,
        price: 600,
        priceType: "fixed" as const
      },
      {
        name: "Standard", 
        description: "10 photos, 2-min video, 1 tour",
        exactQuantity: 1,
        quantityType: "exact" as const,
        price: 900,
        priceType: "fixed" as const
      },
      {
        name: "Premium",
        description: "20 photos, 5-min video, 2 tours",
        exactQuantity: 1,
        quantityType: "exact" as const,
        price: 1200,
        priceType: "fixed" as const
      }
    ],
    features: [
      "High-resolution images and 4K videos",
      "Interactive 360-degree tours",
      "Professional editing and fast turnaround",
      "Easy sharing via digital links"
    ],
    whatsIncludedContent: [
      "10 aerial photos (editable to client needs)",
      "2-minute edited aerial video",
      "One interactive 360-degree virtual tour",
      "Digital delivery via secure link",
      "Optional prints or raw footage"
    ],
    possibilities: [
      { title: "Real Estate Listings", description: "Stunning visuals and virtual tours for property marketing" },
      { title: "Event Promotion", description: "Engaging aerial content for tourism and event marketing" },
      { title: "Construction Marketing", description: "Promotional content for construction projects" },
      { title: "Property Inspections", description: "Comprehensive visual documentation" }
    ],
    displayOrder: 1
  },
  {
    name: "Terrain Mapping Package",
    description: "Detailed terrain and surface mapping for planning, analysis, and development.",
    tooltipDescription: "Comprehensive maps for elevation, volume, and site planning.",
    aboutServiceContent: "The Terrain Mapping Package delivers precise 3D elevation models, surface models, topographic contour lines, volumetric calculations, and detailed site maps, ideal for construction, mining, agriculture, and environmental planning. These deliverables share data collection, making bundling efficient, and the DSM is compatible with BIM software for urban planning.",
    imageUrl: "https://images.unsplash.com/photo-1591588582259-e675bd2e6088?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 150000, // $1500 base price
    pricingType: "per_unit",
    unitType: "acre",
    basePriceQuantity: 10,
    additionalPricePerUnit: 8000, // $80 per additional acre
    bundleDiscountPercentage: 50,
    features: [
      "High-accuracy elevation and surface data",
      "Compatible with BIM (DSM) and GIS software",
      "Detailed volumetric calculations",
      "Scalable and customizable outputs"
    ],
    whatsIncludedContent: [
      "DEM, DSM, contour lines, volumetric data, and site map in digital formats (e.g., GeoTIFF)",
      "Access to online viewing platform",
      "Optional printed maps or reports"
    ],
    possibilities: [
      { title: "Construction Planning", description: "Detailed site analysis for construction projects" },
      { title: "Mining Operations", description: "Resource management and volume calculations" },
      { title: "Agricultural Analysis", description: "Field analysis and yield estimation" },
      { title: "Environmental Assessments", description: "Impact studies and monitoring" }
    ],
    displayOrder: 2
  },
  {
    name: "Point Cloud & 3D Modeling",
    description: "Advanced 3D point data and models for engineering and visualization.",
    tooltipDescription: "Detailed 3D data for precise modeling.",
    aboutServiceContent: "The Point Cloud & 3D Modeling service provides high-density 3D point data and detailed 3D models, perfect for architectural visualization, engineering surveys, and heritage preservation. Both deliverables are compatible with BIM software, enhancing integration with construction workflows.",
    imageUrl: "https://images.unsplash.com/photo-1563589173576-88d5e8f10177?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 100000, // $1000 base price
    pricingType: "per_unit",
    unitType: "acre",
    basePriceQuantity: 10,
    additionalPricePerUnit: 5000, // $50 per additional acre
    bundleDiscountPercentage: 50,
    features: [
      "High-density point data",
      "BIM-compatible outputs for engineering",
      "Detailed 3D renderings",
      "Customizable formats and textures"
    ],
    whatsIncludedContent: [
      "Point cloud (.las, .laz) and 3D model (OBJ, FBX)",
      "Access to online viewing platform",
      "Optional animations or walkthroughs"
    ],
    possibilities: [
      { title: "Architectural Design", description: "Detailed models for design visualization" },
      { title: "Engineering Surveys", description: "Precise measurements for engineering projects" },
      { title: "Construction Analysis", description: "3D analysis of construction progress" },
      { title: "Virtual Reality", description: "VR-ready models for immersive experiences" }
    ],
    displayOrder: 3
  },
  {
    name: "Construction Monitoring",
    description: "Regular aerial mapping and 3D data to track construction progress and site changes.",
    tooltipDescription: "Monitor construction with maps and 3D data.",
    aboutServiceContent: "The Construction Monitoring service combines 2D orthomosaic maps and point cloud data with regular drone flights to document and analyze construction progress. Ideal for contractors and project managers, it provides detailed visual and 3D data for project oversight, with point clouds compatible with BIM software.",
    imageUrl: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 70000, // $700 base price per flight
    pricingType: "per_unit",
    unitType: "acre",
    basePriceQuantity: 10,
    additionalPricePerUnit: 4000, // $40 per additional acre
    bundleDiscountPercentage: 50,
    features: [
      "High-resolution 2D maps",
      "BIM-compatible point cloud data",
      "Regular progress updates",
      "Integration with project management tools"
    ],
    whatsIncludedContent: [
      "2D orthomosaic map and point cloud per flight",
      "Progress reports with findings",
      "Digital delivery via online platform"
    ],
    possibilities: [
      { title: "Progress Tracking", description: "Monitor construction advancement over time" },
      { title: "Stakeholder Reporting", description: "Visual reports for project stakeholders" },
      { title: "Quality Control", description: "Ensure work meets specifications" },
      { title: "Site Documentation", description: "Comprehensive project documentation" }
    ],
    displayOrder: 4
  },
  {
    name: "Aerial Photography",
    description: "High-resolution aerial images for marketing, inspections, and documentation.",
    tooltipDescription: "Stunning aerial photos for various needs.",
    aboutServiceContent: "The Aerial Photography Only service delivers high-quality still images from unique aerial perspectives, ideal for real estate, inspections, and event documentation. It's a cost-effective option for clients needing static visuals without video or tours.",
    imageUrl: "https://images.unsplash.com/photo-1563589173576-88d5e8f10177?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 25000, // $250 (middle tier for display)
    pricingType: "tiered",
    bundleDiscountPercentage: 50,
    pricingTiers: [
      {
        name: "Basic",
        description: "5 high-resolution aerial photos",
        exactQuantity: 5,
        quantityType: "exact" as const,
        price: 150,
        priceType: "fixed" as const
      },
      {
        name: "Standard", 
        description: "10 high-resolution aerial photos",
        exactQuantity: 10,
        quantityType: "exact" as const,
        price: 250,
        priceType: "fixed" as const
      },
      {
        name: "Premium",
        description: "20 high-resolution aerial photos",
        exactQuantity: 20,
        quantityType: "exact" as const,
        price: 400,
        priceType: "fixed" as const
      }
    ],
    features: [
      "High-resolution imagery",
      "Custom flight paths",
      "Professional editing",
      "Fast turnaround"
    ],
    whatsIncludedContent: [
      "Edited aerial photos (number based on package)",
      "Digital delivery via secure link",
      "Optional prints"
    ],
    possibilities: [
      { title: "Real Estate Marketing", description: "Showcase properties from aerial perspectives" },
      { title: "Construction Documentation", description: "Document project progress and conditions" },
      { title: "Event Coverage", description: "Capture events from unique viewpoints" },
      { title: "Property Inspections", description: "Visual inspections from the air" }
    ],
    displayOrder: 5
  },
  {
    name: "Aerial Videography",
    description: "Cinematic aerial video footage for promotional and inspection purposes.",
    tooltipDescription: "Dynamic aerial videos for marketing.",
    aboutServiceContent: "The Aerial Videography Only service provides high-quality 4K video footage, perfect for real estate tours, event highlights, and inspections. It focuses on dynamic visuals, offering a cost-effective alternative to the Visual Media Package for clients prioritizing video over photos or tours.",
    imageUrl: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 35000, // $350 (middle tier for display)
    pricingType: "tiered",
    bundleDiscountPercentage: 50,
    pricingTiers: [
      {
        name: "Basic",
        description: "1-minute edited video",
        exactQuantity: 1,
        quantityType: "exact" as const,
        price: 200,
        priceType: "fixed" as const
      },
      {
        name: "Standard",
        description: "2-minute edited video",
        exactQuantity: 2,
        quantityType: "exact" as const,
        price: 350,
        priceType: "fixed" as const
      },
      {
        name: "Premium",
        description: "5-minute edited video",
        exactQuantity: 5,
        quantityType: "exact" as const,
        price: 600,
        priceType: "fixed" as const
      }
    ],
    features: [
      "4K resolution video",
      "Stabilized footage",
      "Professional editing",
      "Customizable flight paths"
    ],
    whatsIncludedContent: [
      "Edited video (length based on package)",
      "Digital delivery via secure link",
      "Optional raw footage"
    ],
    possibilities: [
      { title: "Real Estate Tours", description: "Dynamic property showcase videos" },
      { title: "Event Highlights", description: "Capture memorable moments from the air" },
      { title: "Construction Marketing", description: "Promotional videos for projects" },
      { title: "Infrastructure Inspections", description: "Video documentation of structures" }
    ],
    displayOrder: 6
  },
  {
    name: "Precision Mapping Package",
    description: "High-resolution 2D maps and 3D point cloud data for accurate surveying and analysis.",
    tooltipDescription: "2D maps and 3D point data for surveying.",
    aboutServiceContent: "The Precision Mapping Package delivers georeferenced 2D orthomosaic maps and high-density 3D point cloud data, perfect for land surveying, construction documentation, and environmental monitoring. The point cloud is BIM-compatible, benefiting engineering and construction clients.",
    imageUrl: "https://images.unsplash.com/photo-1591588582259-e675bd2e6088?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 100000, // $1000 base price
    pricingType: "per_unit",
    unitType: "acre",
    basePriceQuantity: 10,
    additionalPricePerUnit: 5000, // $50 per additional acre
    bundleDiscountPercentage: 50,
    features: [
      "High-resolution 2D maps",
      "Accurate 3D point data",
      "Compatible with BIM and GIS software",
      "Precise measurements and georeferencing"
    ],
    whatsIncludedContent: [
      "2D Orthomosaic map in GeoTIFF format",
      "Point cloud in .las or .laz format",
      "Access to online viewing platform",
      "Optional printed maps"
    ],
    possibilities: [
      { title: "Land Surveying", description: "Accurate mapping for surveying projects" },
      { title: "Construction Documentation", description: "Detailed site documentation" },
      { title: "Environmental Analysis", description: "Environmental and agricultural monitoring" },
      { title: "Infrastructure Planning", description: "Planning for infrastructure projects" }
    ],
    displayOrder: 7
  }
];

async function main() {
  try {
    console.log("Starting package services migration...");
    
    // First, delete all existing services
    console.log("Removing existing services...");
    await db.delete(services);
    
    // Insert new services
    console.log("Adding new package services...");
    await db.insert(services).values(newServices);
    
    console.log("Package services migration completed successfully!");
    console.log(`Total services added: ${newServices.length}`);
    
  } catch (error) {
    console.error("Error during package services migration:", error);
    throw error;
  }
}

// Run migration if executed directly
main().catch(console.error);

export { main };