/**
 * This script creates and initializes the about_page_content table to store editable About page content
 */
import { pool, db } from "./db";
import { aboutPageContent } from "@shared/schema";
import { sql } from "drizzle-orm";

// Initial content for About page
const initialMissionContent = {
  section: "mission",
  title: "Our Mission",
  content: `Apollo DroneWorks delivers cutting-edge drone services tailored to construction companies and real estate agents. Providing high-resolution aerial images and actionable insights to streamline projects, boost efficiency and showcase the final product.

Using state-of-the-art drones, advanced mapping software and Artificial Intelligence, we offer precise, safe, and cost-effective solutions for site analysis, progress tracking, and asset documentation.

From real estate photography to detailed 3D modeling, our services empower clients to make informed decisions, reduce costs, and enhance project outcomes.`,
  imageUrl: "/uploads/about/aerial-southern-utah.png",
  displayOrder: 1,
  isVisible: true,
};

const initialValuesContent = [
  {
    section: "values",
    title: "Excellence",
    content: "We strive for excellence in every aspect of our work, from the quality of our imagery to the precision of our data collection and the responsiveness of our customer service.",
    imageUrl: null,
    displayOrder: 1,
    isVisible: true,
  },
  {
    section: "values",
    title: "Innovation",
    content: "We continuously explore new technologies and techniques to expand our capabilities and provide innovative solutions that exceed client expectations.",
    imageUrl: null,
    displayOrder: 2,
    isVisible: true,
  },
  {
    section: "values",
    title: "Integrity",
    content: "We conduct business with the highest level of ethics and transparency, building trust with our clients through honest communication and reliable service.",
    imageUrl: null,
    displayOrder: 3,
    isVisible: true,
  },
];

const initialCertificationsContent = [
  {
    section: "certifications",
    title: "FAA Part 107 Certification",
    content: "All our pilots are FAA Part 107 certified commercial drone operators, ensuring legal compliance and operational knowledge.",
    imageUrl: null,
    displayOrder: 1,
    isVisible: true,
  },
  {
    section: "certifications",
    title: "Liability Insurance",
    content: "Comprehensive liability insurance coverage for all operations, providing peace of mind for our clients.",
    imageUrl: null,
    displayOrder: 2,
    isVisible: true,
  },
  {
    section: "certifications",
    title: "Airspace Authorization",
    content: "LAANC (Low Altitude Authorization and Notification Capability) certified for operations in controlled airspace.",
    imageUrl: null,
    displayOrder: 3,
    isVisible: true,
  },
  {
    section: "certifications",
    title: "Professional Equipment",
    content: "Fleet of professional-grade drones with redundant safety systems and high-resolution cameras.",
    imageUrl: null,
    displayOrder: 4,
    isVisible: true,
  },
];

async function migrateAboutPageContent() {
  // Check if about_page_content table exists
  try {
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'about_page_content'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log("Creating about_page_content table...");
      
      // Create table using schema definition
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS about_page_content (
          id SERIAL PRIMARY KEY,
          section TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          image_url TEXT,
          display_order INTEGER NOT NULL DEFAULT 0,
          is_visible BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        CREATE INDEX about_page_section_order_idx ON about_page_content (section, display_order);
      `);
      
      console.log("About page content table created successfully");
      
      // Populate with initial data
      console.log("Populating about page content with initial data...");
      
      // Insert mission content
      await db.insert(aboutPageContent).values(initialMissionContent);
      
      // Insert values content
      for (const value of initialValuesContent) {
        await db.insert(aboutPageContent).values(value);
      }
      
      // Insert certifications content
      for (const cert of initialCertificationsContent) {
        await db.insert(aboutPageContent).values(cert);
      }
      
      console.log("About page content populated successfully");
    } else {
      console.log("About page content table already exists, skipping creation");
      
      // Check if data exists
      const contentCount = await pool.query(`
        SELECT COUNT(*) FROM about_page_content;
      `);
      
      if (parseInt(contentCount.rows[0].count) === 0) {
        console.log("About page content is empty, populating with initial data...");
        
        // Insert mission content
        await db.insert(aboutPageContent).values(initialMissionContent);
        
        // Insert values content
        for (const value of initialValuesContent) {
          await db.insert(aboutPageContent).values(value);
        }
        
        // Insert certifications content
        for (const cert of initialCertificationsContent) {
          await db.insert(aboutPageContent).values(cert);
        }
        
        console.log("About page content populated successfully");
      } else {
        console.log("About page content already exists, skipping population");
      }
    }
    
    console.log("About page content migration completed successfully!");
    return true;
  } catch (error) {
    console.error("Error migrating about page content:", error);
    return false;
  }
}

export { migrateAboutPageContent };