import multer from "multer";

declare global {
  namespace Express {
    interface Request {
      uploadFolder?: string;
    }
  }
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Memory storage - files are buffered in RAM then streamed straight to
// Supabase Storage, never written to local disk.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error("শুধুমাত্র JPG, PNG, WEBP বা GIF ছবি আপলোড করা যাবে"));
      return;
    }
    cb(null, true);
  },
});
