import type { Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import yauzl from "yauzl";
import { storage } from "./storage";

// Configure multer for file uploads
const upload = multer({ 
  dest: 'temp-uploads/',
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  }
});

// Enhanced 3DVista tour validation
async function validate3DVistaTour(tourDir: string): Promise<{
  isValid: boolean;
  entryPoint: string | null;
  errors: string[];
  stats: {
    htmlFiles: number;
    jsFiles: number;
    cssFiles: number;
    imageFiles: number;
    totalFiles: number;
  };
}> {
  const errors: string[] = [];
  const stats = { htmlFiles: 0, jsFiles: 0, cssFiles: 0, imageFiles: 0, totalFiles: 0 };
  let entryPoint: string | null = null;

  try {
    const files = await fs.readdir(tourDir, { recursive: true });
    stats.totalFiles = files.length;

    for (const file of files) {
      const filePath = file.toString().toLowerCase();
      
      if (filePath.endsWith('.html')) {
        stats.htmlFiles++;
        if (filePath.includes('index.html') || filePath.includes('tour.html')) {
          entryPoint = file.toString();
        }
      } else if (filePath.endsWith('.js')) {
        stats.jsFiles++;
      } else if (filePath.endsWith('.css')) {
        stats.cssFiles++;
      } else if (filePath.match(/\.(jpg|jpeg|png|webp)$/)) {
        stats.imageFiles++;
      }
    }

    // Set default entry point if none found
    if (!entryPoint && stats.htmlFiles > 0) {
      const htmlFiles = files.filter(f => f.toString().toLowerCase().endsWith('.html'));
      entryPoint = htmlFiles[0].toString();
    }

    // Validation checks
    if (stats.htmlFiles === 0) {
      errors.push("No HTML entry point found. 3DVista tours require an HTML file.");
    }
    if (stats.jsFiles === 0) {
      errors.push("No JavaScript files found. 3DVista tours require player scripts.");
    }
    if (stats.imageFiles === 0) {
      errors.push("No image files found. Virtual tours require panoramic images.");
    }

    return {
      isValid: errors.length === 0,
      entryPoint,
      errors,
      stats
    };
  } catch (error) {
    return {
      isValid: false,
      entryPoint: null,
      errors: [`Failed to validate tour structure: ${error}`],
      stats
    };
  }
}

// Extract ZIP file with proper structure preservation
async function extractZipFile(zipPath: string, extractDir: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
        return;
      }

      zipfile.readEntry();
      
      zipfile.on("entry", (entry) => {
        if (/\/$/.test(entry.fileName)) {
          // Directory entry
          const dirPath = path.join(extractDir, entry.fileName);
          fs.mkdir(dirPath, { recursive: true }).then(() => {
            zipfile.readEntry();
          }).catch(reject);
        } else {
          // File entry
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(err);
              return;
            }

            const filePath = path.join(extractDir, entry.fileName);
            const fileDir = path.dirname(filePath);
            
            fs.mkdir(fileDir, { recursive: true }).then(() => {
              const writeStream = require('fs').createWriteStream(filePath);
              readStream.pipe(writeStream);
              
              writeStream.on('close', () => {
                zipfile.readEntry();
              });
              
              writeStream.on('error', reject);
            }).catch(reject);
          });
        }
      });

      zipfile.on("end", () => {
        resolve(true);
      });

      zipfile.on("error", reject);
    });
  });
}

export function registerVirtualTourRoutes(app: Express) {
  // Get all virtual tours for admin
  app.get("/api/admin/virtual-tours", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const tours = await storage.getAllVirtualTours();
      res.json(tours);
    } catch (error) {
      console.error("Error fetching virtual tours:", error);
      res.status(500).json({ message: "Failed to fetch virtual tours" });
    }
  });

  // Enhanced upload endpoint for 3DVista tours
  app.post("/api/admin/virtual-tours/upload", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const file = req.file as Express.Multer.File;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { name, description, tourType, projectId, has2dMaps, has3dModels, isPublic, uploadMode, entryPoint } = req.body;
      
      // Generate unique tour path
      const tourPath = `${tourType}-${Date.now()}`;
      const tourDir = path.join('public', 'tours', tourPath);
      
      // Create tour directory
      await fs.mkdir(tourDir, { recursive: true });

      let finalEntryPoint = entryPoint || 'index.html';
      let validationResult: any;

      if (uploadMode === 'zip' && file.originalname.toLowerCase().endsWith('.zip')) {
        // Handle ZIP file extraction
        console.log(`Extracting ZIP file: ${file.originalname}`);
        
        try {
          await extractZipFile(file.path, tourDir);
          
          // Validate extracted tour structure
          validationResult = await validate3DVistaTour(tourDir);
          
          if (!validationResult.isValid) {
            // Clean up on validation failure
            await fs.rmdir(tourDir, { recursive: true });
            return res.status(400).json({ 
              message: "Invalid 3DVista tour structure", 
              errors: validationResult.errors 
            });
          }
          
          finalEntryPoint = validationResult.entryPoint || 'index.html';
          
        } catch (error) {
          console.error("ZIP extraction failed:", error);
          return res.status(400).json({ message: "Failed to extract ZIP file" });
        }
      } else {
        // Handle individual file upload (legacy support)
        const fileName = file.originalname;
        const filePath = path.join(tourDir, fileName);
        
        // Move file to tour directory
        await fs.rename(file.path, filePath);
        
        // For single files, assume it's the entry point if it's HTML
        if (fileName.toLowerCase().endsWith('.html')) {
          finalEntryPoint = fileName;
        }
      }

      // Calculate file size
      const stats = await fs.stat(file.path).catch(() => null);
      const fileSizeMb = stats ? Math.round((stats.size / 1024 / 1024) * 100) / 100 : 0;
      
      let totalSize = 0;
      let hasIndexHtml = false;
      
      // Process uploaded files
      for (const file of files) {
        const destinationPath = path.join(tourDir, file.originalname);
        await fs.copyFile(file.path, destinationPath);
        await fs.unlink(file.path); // Clean up temp file
        
        totalSize += file.size;
        if (file.originalname === 'index.html') {
          hasIndexHtml = true;
        }
      }
      
      if (!hasIndexHtml) {
        // Clean up and return error
        await fs.rmdir(tourDir, { recursive: true });
        return res.status(400).json({ message: "Tour must include an index.html file" });
      }
      
      // Save tour metadata to database
      const tourData = {
        name,
        description: description || null,
        projectId: projectId ? parseInt(projectId) : null,
        tourPath,
        isPublic: isPublic === 'true' || isPublic === true,
        hasVrMode: false, // VR removed as requested
        fileSizeMb: Math.round(totalSize / (1024 * 1024) * 10) / 10,
        status: "active",
        panoramaCount: 0, // Could be determined by analyzing files
        has2dMaps: has2dMaps === 'true' || has2dMaps === true,
        has3dModels: has3dModels === 'true' || has3dModels === true,
        tourType,
      };
      
      const tour = await storage.createVirtualTour(tourData);
      
      res.json({ 
        message: "Virtual tour uploaded successfully",
        tour 
      });
      
    } catch (error) {
      console.error("Error uploading virtual tour:", error);
      res.status(500).json({ message: "Failed to upload virtual tour" });
    }
  });

  // Delete virtual tour
  app.delete("/api/admin/virtual-tours/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const tourId = parseInt(req.params.id);
      const tour = await storage.getVirtualTour(tourId);
      
      if (!tour) {
        return res.status(404).json({ message: "Virtual tour not found" });
      }
      
      // Delete tour files
      const tourDir = path.join('public', 'tours', tour.tourPath);
      try {
        await fs.rmdir(tourDir, { recursive: true });
      } catch (error) {
        console.error("Error deleting tour files:", error);
      }
      
      // Delete from database
      await storage.deleteVirtualTour(tourId);
      
      res.json({ message: "Virtual tour deleted successfully" });
      
    } catch (error) {
      console.error("Error deleting virtual tour:", error);
      res.status(500).json({ message: "Failed to delete virtual tour" });
    }
  });

  // Get all projects for dropdown
  app.get("/api/admin/projects", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });
}