import multer from "multer";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_SIZE_BYTES,
    files: 20,
  },

  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(
        new Error(
          "শুধুমাত্র JPG, PNG, WEBP, GIF অথবা AVIF ছবি আপলোড করা যাবে"
        )
      );

      return;
    }

    cb(null, true);
  },
});