import multer from "multer";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 20, // একসাথে সর্বোচ্চ 20টি
  },

  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("শুধু image file upload করা যাবে"));
    }
  },
});