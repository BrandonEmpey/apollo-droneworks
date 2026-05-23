import { db } from "./db";
import { services } from "../shared/schema";

/**
 * This script replaces all existing services with the new service lineup
 */

const newServices = [
  {
    name: "Aerial Photography",
    description: "Capture stunning high-resolution images from the sky for marketing, inspections, and more.",
    tooltipDescription: "High-quality aerial photos for various applications.",
    aboutServiceContent: "Our Aerial Photography service provides breathtaking images taken from unique perspectives using advanced drones. Whether you need to showcase a property, document a construction site, or capture an event, our experienced pilots and photographers deliver exceptional results, perfect for real estate marketing, construction documentation, event coverage, and inspections of hard-to-reach areas.",
    imageUrl: "https://images.unsplash.com/photo-1563589173576-88d5e8f10177?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 25000, // $250 (middle tier for display)
    pricingType: "tiered",
    bundleDiscountPercentage: 50,
    pricingTiers: [
      {
        name: "Basic",
        exactQuantity: 5,
        quantityType: "exact" as const,
        price: 150,
        priceType: "fixed" as const,
        description: "5 high-resolution aerial photos"
      },
      {
        name: "Standard", 
        exactQuantity: 10,
        quantityType: "exact" as const,
        price: 250,
        priceType: "fixed" as const,
        description: "10 high-resolution aerial photos"
      },
      {
        name: "Premium",
        exactQuantity: 20,
        quantityType: "exact" as const,
        price: 400,
        priceType: "fixed" as const,
        description: "20 high-resolution aerial photos"
      }
    ],
    features: [
      "High-resolution images",
      "Custom flight paths", 
      "Fast turnaround time",
      "Professional editing"
    ],
    whatsIncludedContent: [
      "A set of edited aerial photographs (number based on package)",
      "Digital delivery via secure link",
      "Optional prints or other formats upon request"
    ],
    possibilities: [
      { title: "Real Estate Marketing", description: "Showcase properties from unique aerial perspectives" },
      { title: "Construction Documentation", description: "Document project progress and site conditions" },
      { title: "Event Coverage", description: "Capture events from dynamic aerial viewpoints" },
      { title: "Hard-to-Reach Inspections", description: "Safely inspect areas that are difficult to access" }
    ],
    displayOrder: 1
  },
  {
    name: "Aerial Videography",
    description: "Professional video footage from the air, perfect for promotional videos, inspections, and more.",
    tooltipDescription: "Cinematic aerial videos for diverse needs.",
    aboutServiceContent: "Our Aerial Videography service offers high-quality video footage captured by drones, providing a dynamic and engaging way to present your project or event. From smooth flyovers to detailed inspections, our videos are tailored to meet your specific requirements, ideal for real estate tours, construction progress videos, event highlights, and infrastructure inspections.",
    imageUrl: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 35000, // $350 (middle tier)
    pricingType: "tiered",
    bundleDiscountPercentage: 50,
    pricingTiers: [
      {
        name: "Basic",
        exactQuantity: 1,
        quantityType: "exact" as const,
        price: 200,
        priceType: "fixed" as const,
        description: "1-minute edited video"
      },
      {
        name: "Standard",
        exactQuantity: 2,
        quantityType: "exact" as const,
        price: 350,
        priceType: "fixed" as const,
        description: "2-minute edited video"
      },
      {
        name: "Premium",
        exactQuantity: 5,
        quantityType: "exact" as const,
        price: 600,
        priceType: "fixed" as const,
        description: "5-minute edited video"
      }
    ],
    features: [
      "4K video resolution",
      "Stabilized footage",
      "Customizable flight paths",
      "Professional editing"
    ],
    whatsIncludedContent: [
      "Edited video footage (length based on package)",
      "Digital delivery via secure link",
      "Optional raw footage upon request"
    ],
    possibilities: [
      { title: "Real Estate Tours", description: "Create engaging property tour videos" },
      { title: "Construction Progress", description: "Document project advancement over time" },
      { title: "Event Highlights", description: "Capture memorable moments from aerial perspectives" },
      { title: "Infrastructure Inspections", description: "Detailed video inspection of structures" }
    ],
    displayOrder: 2
  },
  {
    name: "2D Orthomosaic",
    description: "High-resolution, georeferenced 2D maps for accurate measurements and analysis.",
    tooltipDescription: "Detailed aerial maps for surveying and planning.",
    aboutServiceContent: "Our 2D Orthomosaic service provides a detailed, top-down view of your site, created by stitching together multiple aerial images. These maps are corrected for distortions and georeferenced, allowing for precise measurements and integration with GIS software, ideal for land surveying, construction site documentation, agricultural field analysis, and environmental monitoring.",
    imageUrl: "https://images.unsplash.com/photo-1591588582259-e675bd2e6088?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 50000, // $500 base price
    pricingType: "per_unit",
    unitType: "acre",
    basePriceQuantity: 10,
    additionalPricePerUnit: 3000, // $30 per additional acre
    bundleDiscountPercentage: 50,
    features: [
      "High-resolution imagery",
      "Accurate georeferencing",
      "Compatible with CAD and GIS software",
      "Fast turnaround time"
    ],
    whatsIncludedContent: [
      "2D Orthomosaic map in digital format (e.g., GeoTIFF)",
      "Access to online viewing platform",
      "Optional printed maps"
    ],
    possibilities: [
      { title: "Land Surveying", description: "Precise mapping for boundary and topographic surveys" },
      { title: "Construction Documentation", description: "Detailed site documentation and progress tracking" },
      { title: "Agricultural Analysis", description: "Field analysis for crop monitoring and management" },
      { title: "Environmental Monitoring", description: "Track environmental changes over time" }
    ],
    displayOrder: 3
  },
  {
    name: "Digital Elevation Model (DEM)",
    description: "3D terrain elevation data for hydrological and land-use planning.",
    tooltipDescription: "Elevation maps for terrain analysis.",
    aboutServiceContent: "A Digital Elevation Model (DEM) provides a 3D representation of the terrain's surface, essential for understanding elevation changes and planning accordingly. Our DEMs are generated from high-precision drone data and can be used in applications like flood risk assessment, urban and rural planning, mining, and environmental impact studies.",
    imageUrl: "https://images.unsplash.com/photo-1563589173576-88d5e8f10177?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 60000, // $600 base price
    pricingType: "per_unit",
    unitType: "acre",
    basePriceQuantity: 10,
    additionalPricePerUnit: 3000, // $30 per additional acre
    bundleDiscountPercentage: 50,
    features: [
      "High accuracy",
      "Detailed elevation data",
      "Compatible with CAD and GIS software",
      "Customizable resolution"
    ],
    whatsIncludedContent: [
      "DEM in standard formats (e.g., GeoTIFF)",
      "Optional contour lines",
      "Access to online viewing platform"
    ],
    possibilities: [
      { title: "Flood Risk Assessment", description: "Analyze drainage patterns and flood zones" },
      { title: "Urban Planning", description: "Plan development based on terrain characteristics" },
      { title: "Mining Operations", description: "Assess terrain for resource extraction planning" },
      { title: "Environmental Studies", description: "Analyze environmental impact and changes" }
    ],
    displayOrder: 4
  },
  {
    name: "Digital Surface Model (DSM)",
    description: "3D surface elevation including buildings and vegetation, ideal for urban planning.",
    tooltipDescription: "Surface elevation maps for urban analysis.",
    aboutServiceContent: "Our Digital Surface Model (DSM) offers a 3D representation of the surface, including buildings, vegetation, and other features, crucial for urban planning, forestry, and infrastructure projects. Generated from high-precision drone data, it complements services like 2D Orthomosaic and 3D Model.",
    imageUrl: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 60000, // $600 base price
    pricingType: "per_unit",
    unitType: "acre",
    basePriceQuantity: 10,
    additionalPricePerUnit: 3000, // $30 per additional acre
    bundleDiscountPercentage: 50,
    features: [
      "Includes above-ground features",
      "High resolution",
      "Compatible with BIM software for urban planning",
      "Detailed surface data"
    ],
    whatsIncludedContent: [
      "DSM in standard formats (e.g., GeoTIFF)",
      "Access to online viewing platform",
      "Optional contour lines"
    ],
    possibilities: [
      { title: "Urban Planning", description: "Plan development considering existing structures" },
      { title: "Forestry Management", description: "Analyze vegetation and canopy coverage" },
      { title: "Infrastructure Design", description: "Design around existing surface features" },
      { title: "Disaster Response", description: "Assess damage and plan recovery efforts" }
    ],
    displayOrder: 5
  },
  {
    name: "Point Cloud",
    description: "Detailed 3D point data for precise modeling and analysis.",
    tooltipDescription: "3D point data for advanced modeling.",
    aboutServiceContent: "Our Point Cloud service delivers a set of data points in 3D space, created from drone imagery, ideal for detailed modeling, surveying, and engineering applications. It complements 3D Models and DSM, offering enhanced value when bundled.",
    imageUrl: "https://images.unsplash.com/photo-1591588582259-e675bd2e6088?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 70000, // $700 base price
    pricingType: "per_unit",
    unitType: "acre",
    basePriceQuantity: 10,
    additionalPricePerUnit: 3000, // $30 per additional acre
    bundleDiscountPercentage: 50,
    features: [
      "High-density point data",
      "Compatible with BIM software for engineering",
      "Precise measurements",
      "Customizable output formats"
    ],
    whatsIncludedContent: [
      "Point cloud data in standard formats (e.g., .las, .laz)",
      "Access to online viewing platform",
      "Optional processed models"
    ],
    possibilities: [
      { title: "Architectural Modeling", description: "Create detailed building models from point data" },
      { title: "Engineering Surveys", description: "Precise measurements for engineering projects" },
      { title: "Construction Analysis", description: "Analyze construction progress and accuracy" },
      { title: "Heritage Preservation", description: "Document historic structures in detail" }
    ],
    displayOrder: 6
  },
  {
    name: "3D Model",
    description: "Detailed 3D representations for architecture, engineering, and visualization.",
    tooltipDescription: "Realistic 3D models for design and visualization.",
    aboutServiceContent: "Our 3D Model service creates a three-dimensional representation of your site or structure, perfect for architecture, engineering, and entertainment industries. It integrates seamlessly with BIM software, enhancing value when combined with Point Cloud and DSM.",
    imageUrl: "https://images.unsplash.com/photo-1563589173576-88d5e8f10177?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 80000, // $800 base price
    pricingType: "per_unit",
    unitType: "acre",
    basePriceQuantity: 10,
    additionalPricePerUnit: 3000, // $30 per additional acre
    bundleDiscountPercentage: 50,
    features: [
      "High-detail 3D rendering",
      "Compatible with BIM software for construction",
      "Customizable textures and views",
      "Professional quality output"
    ],
    whatsIncludedContent: [
      "3D model in standard formats (e.g., OBJ, FBX)",
      "Access to online viewing platform",
      "Optional animations or walkthroughs"
    ],
    possibilities: [
      { title: "Architectural Visualization", description: "Visualize designs before construction" },
      { title: "Engineering Design", description: "Detailed models for engineering analysis" },
      { title: "Marketing Presentations", description: "Impressive visuals for client presentations" },
      { title: "Virtual Reality", description: "VR-ready models for immersive experiences" }
    ],
    displayOrder: 7
  },
  {
    name: "Contour Lines",
    description: "Elevation contour lines for topographic mapping and analysis.",
    tooltipDescription: "Topographic contour maps for elevation.",
    aboutServiceContent: "Our Contour Lines service generates lines connecting points of equal elevation, essential for topographic mapping, hiking maps, and land development planning. It complements DEM and 2D Orthomosaic, offering efficiency and value when bundled.",
    imageUrl: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 50000, // $500 base price
    pricingType: "per_unit",
    unitType: "acre",
    basePriceQuantity: 10,
    additionalPricePerUnit: 3000, // $30 per additional acre
    bundleDiscountPercentage: 50,
    features: [
      "Accurate elevation representation",
      "Compatible with GIS software",
      "Detailed and scalable",
      "Fast processing"
    ],
    whatsIncludedContent: [
      "Contour line map in digital format",
      "Access to online viewing platform",
      "Optional printed maps"
    ],
    possibilities: [
      { title: "Topographic Mapping", description: "Create detailed elevation maps" },
      { title: "Land Development", description: "Plan development based on topography" },
      { title: "Outdoor Recreation", description: "Maps for hiking and recreational activities" },
      { title: "Environmental Studies", description: "Analyze terrain for environmental impact" }
    ],
    displayOrder: 8
  },
  {
    name: "Volumetric Data",
    description: "Measurements of volume for stockpiles, excavations, and more.",
    tooltipDescription: "Volume calculations for material management.",
    aboutServiceContent: "Our Volumetric Data service provides precise measurements of volume, ideal for managing stockpiles, excavations, and other material quantities in mining, construction, and agriculture. It enhances value when combined with DEM and 2D Orthomosaic.",
    imageUrl: "https://images.unsplash.com/photo-1591588582259-e675bd2e6088?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 60000, // $600 base price
    pricingType: "per_unit",
    unitType: "acre",
    basePriceQuantity: 10,
    additionalPricePerUnit: 3000, // $30 per additional acre
    bundleDiscountPercentage: 50,
    features: [
      "Accurate volume calculations",
      "High precision",
      "Compatible with CAD software",
      "Detailed reporting"
    ],
    whatsIncludedContent: [
      "Volumetric data report",
      "Digital delivery of calculations",
      "Access to online viewing platform"
    ],
    possibilities: [
      { title: "Mining Operations", description: "Calculate material volumes for extraction" },
      { title: "Construction Management", description: "Track material quantities and progress" },
      { title: "Agricultural Yield", description: "Estimate crop yields and storage needs" },
      { title: "Environmental Assessment", description: "Measure environmental impact volumes" }
    ],
    displayOrder: 9
  },
  {
    name: "Roof Inspection",
    description: "Detailed inspection of roofs using drones, identifying issues without the need for climbing.",
    tooltipDescription: "Safe and efficient roof inspections.",
    aboutServiceContent: "Our Roof Inspection service utilizes drones to capture high-resolution images and videos of roofs, allowing for thorough inspections without the risks associated with climbing. Ideal for homeowners, insurance companies, and contractors.",
    imageUrl: "https://images.unsplash.com/photo-1563589173576-88d5e8f10177?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 30000, // $300 per roof
    pricingType: "flat",
    bundleDiscountPercentage: 50,
    features: [
      "High-resolution imagery",
      "Detailed reports",
      "Identification of damage and wear",
      "Fast and safe"
    ],
    whatsIncludedContent: [
      "Aerial photos and videos of the roof",
      "Inspection report highlighting issues",
      "Recommendations for repairs if needed"
    ],
    possibilities: [
      { title: "Pre-Purchase Inspections", description: "Assess roof condition before buying" },
      { title: "Insurance Claims", description: "Document damage for insurance purposes" },
      { title: "Maintenance Checks", description: "Regular inspection for preventive maintenance" },
      { title: "Storm Damage Assessment", description: "Quick assessment after severe weather" }
    ],
    displayOrder: 10
  },
  {
    name: "Infrastructure Inspection",
    description: "Comprehensive inspection of infrastructure such as bridges, power lines, and pipelines using drones.",
    tooltipDescription: "Efficient inspection of hard-to-reach infrastructure.",
    aboutServiceContent: "Our Infrastructure Inspection service leverages drone technology to inspect critical infrastructure safely and efficiently, providing detailed visual data for assessing condition and identifying potential issues. It complements Roof Inspection for broader property assessments.",
    imageUrl: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 50000, // $500 per structure
    pricingType: "flat",
    bundleDiscountPercentage: 50,
    features: [
      "High-resolution imagery and video",
      "Access to hard-to-reach areas",
      "Detailed inspection reports",
      "Reduced downtime and risk"
    ],
    whatsIncludedContent: [
      "Aerial photos and videos of the infrastructure",
      "Inspection report with findings",
      "Recommendations for maintenance or repairs"
    ],
    possibilities: [
      { title: "Bridge Inspections", description: "Safe inspection of bridge structures" },
      { title: "Power Line Monitoring", description: "Monitor electrical infrastructure" },
      { title: "Pipeline Assessments", description: "Inspect pipeline integrity and condition" },
      { title: "Cell Tower Inspections", description: "Assess communication tower condition" }
    ],
    displayOrder: 11
  },
  {
    name: "Construction Monitoring",
    description: "Regular drone flights to monitor construction progress and document changes over time.",
    tooltipDescription: "Track construction progress with aerial data.",
    aboutServiceContent: "Our Construction Monitoring service provides periodic drone flights to capture the progress of your construction project, allowing for better project management, documentation, and communication with stakeholders. It can be combined with Aerial Photography and Site Mapping for comprehensive documentation.",
    imageUrl: "https://images.unsplash.com/photo-1591588582259-e675bd2e6088?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 40000, // $400 per flight
    pricingType: "flat",
    bundleDiscountPercentage: 50,
    features: [
      "Regular updates (e.g., weekly, monthly)",
      "High-resolution images and videos",
      "Time-lapse videos",
      "Integration with project management tools"
    ],
    whatsIncludedContent: [
      "Scheduled drone flights",
      "Edited photos and videos",
      "Progress reports",
      "Online access to data"
    ],
    possibilities: [
      { title: "Project Management", description: "Track progress and identify issues early" },
      { title: "Stakeholder Communication", description: "Keep stakeholders informed with visual updates" },
      { title: "Marketing Promotion", description: "Document project for promotional purposes" },
      { title: "Quality Control", description: "Monitor work quality and compliance" }
    ],
    displayOrder: 12
  },
  {
    name: "Site Mapping",
    description: "Detailed maps of sites including topography and features for planning and development.",
    tooltipDescription: "Comprehensive site maps for planning.",
    aboutServiceContent: "Our Site Mapping service creates detailed maps of your site, including topography, features, and other relevant data, essential for planning and development. It overlaps with 2D Orthomosaic and DEM, offering efficiency and value when bundled.",
    imageUrl: "https://images.unsplash.com/photo-1563589173576-88d5e8f10177?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 50000, // $500 base price
    pricingType: "per_unit",
    unitType: "acre",
    basePriceQuantity: 10,
    additionalPricePerUnit: 3000, // $30 per additional acre
    bundleDiscountPercentage: 50,
    features: [
      "High-resolution mapping",
      "Includes topographic data",
      "Compatible with GIS software",
      "Detailed and accurate"
    ],
    whatsIncludedContent: [
      "Site map in digital format",
      "Access to online viewing platform",
      "Optional printed maps"
    ],
    possibilities: [
      { title: "Construction Planning", description: "Plan construction based on detailed site data" },
      { title: "Land Development", description: "Develop land with comprehensive site knowledge" },
      { title: "Environmental Assessments", description: "Assess environmental impact and conditions" },
      { title: "Infrastructure Design", description: "Design infrastructure with accurate site data" }
    ],
    displayOrder: 13
  },
  {
    name: "Virtual Tours",
    description: "Interactive 360-degree tours for immersive property exploration.",
    tooltipDescription: "Immersive virtual property tours.",
    aboutServiceContent: "Our Virtual Tours service offers interactive 360-degree tours, allowing clients to explore properties remotely in detail, perfect for real estate, tourism, and marketing. It complements Aerial Photography and Videography for a comprehensive presentation.",
    imageUrl: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    price: 40000, // $400 per tour
    pricingType: "flat",
    bundleDiscountPercentage: 50,
    features: [
      "High-resolution 360-degree imagery",
      "Interactive navigation",
      "Easy sharing via link",
      "Professional editing"
    ],
    whatsIncludedContent: [
      "Interactive virtual tour",
      "Digital delivery via secure link",
      "Access to online viewing platform"
    ],
    possibilities: [
      { title: "Real Estate Marketing", description: "Show properties to remote buyers" },
      { title: "Tourism Promotion", description: "Showcase destinations and attractions" },
      { title: "Event Venues", description: "Display venues for event planning" },
      { title: "Remote Inspections", description: "Allow remote property inspections" }
    ],
    displayOrder: 14
  }
];

async function main() {
  try {
    console.log("Starting service migration...");
    
    // First, delete all existing services
    console.log("Removing existing services...");
    await db.delete(services);
    
    // Insert new services
    console.log("Adding new services...");
    await db.insert(services).values(newServices);
    
    console.log("Service migration completed successfully!");
    console.log(`Total services added: ${newServices.length}`);
    
  } catch (error) {
    console.error("Error during service migration:", error);
    throw error;
  }
}

// Run migration if executed directly
main().catch(console.error);

export { main };