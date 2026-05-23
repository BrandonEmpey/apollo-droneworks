import type { Express, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  validateAerialImageFile,
  AERIAL_REJECTION_MESSAGE,
} from "./ai/image-validator";

function isAdmin(req: Request, res: Response, next: NextFunction) {
  const user: Express.User | undefined = req.user;
  if (req.isAuthenticated?.() && user?.isAdmin) return next();
  return res.status(403).json({ error: "Forbidden" });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

/**
 * Express middleware that runs the aerial-only AI vision check on the
 * file just accepted by multer. Rejects non-compliant images with a 400
 * and removes the saved file. Fails open if the validator cannot run.
 */
export async function enforceAerialImageRule(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const file = req.file;
  if (!file || !file.mimetype?.startsWith("image/")) return next();
  try {
    const result = await validateAerialImageFile(file.path, file.mimetype);
    if (!result.compliant) {
      try { fs.unlinkSync(file.path); } catch { /* noop */ }
      return res.status(400).json({
        error: AERIAL_REJECTION_MESSAGE,
        reason: result.reason,
      });
    }
    return next();
  } catch (err) {
    console.error("[enforceAerialImageRule] unexpected error:", err);
    return next();
  }
}

export function registerUploadRoutes(app: Express) {
  // Multer error wrapper that converts file-filter rejections (e.g. non
  // image/video MIME) into a clean JSON 400 instead of an HTML error page.
  const uploadSingleFile = (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        return res.status(400).json({ error: message });
      }
      next();
    });
  };

  // Image upload endpoint (admin-only marketing surface — runs aerial check)
  app.post(
    '/api/upload/image',
    isAdmin,
    uploadSingleFile,
    (req, res, next) => {
      // Hard-reject non-image MIME types at the route level so nothing
      // can bypass the aerial validator by uploading e.g. a PDF or video
      // through the marketing-image endpoint.
      if (req.file && !req.file.mimetype?.startsWith('image/')) {
        try { fs.unlinkSync(req.file.path); } catch { /* noop */ }
        return res.status(400).json({ error: 'Only image files are allowed on /api/upload/image' });
      }
      return next();
    },
    enforceAerialImageRule,
    (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ url: fileUrl });
      } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
      }
    },
  );

  // Video upload endpoint (admin-only marketing surface)
  app.post('/api/upload/video', isAdmin, uploadSingleFile, (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!req.file.mimetype.startsWith('video/')) {
        return res.status(400).json({ error: 'Only video files are allowed' });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    } catch (error) {
      console.error('Video upload error:', error);
      res.status(500).json({ error: 'Video upload failed' });
    }
  });
}
