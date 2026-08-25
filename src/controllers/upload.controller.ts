import type { Request, Response } from "express";
import { randomUUID } from "crypto";

import { supabaseAdmin } from "../config/supabase";
import { env } from "../config/env";
import { AppError } from "../middleware/errorHandler";

export async function handleUpload(req: Request, res: Response) {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw new AppError("কোনো ফাইল পাওয়া যায়নি", 400);
  }

  if (!supabaseAdmin) {
    throw new AppError(
      "ছবি আপলোড কনফিগার করা হয়নি (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY সেট করুন)",
      500
    );
  }

  const uploadedUrls: string[] = [];

  for (const file of files) {
    const ext =
      file.originalname.split(".").pop()?.toLowerCase() || "jpg";

    const path = `${
      req.uploadFolder ?? "misc"
    }/${Date.now()}-${randomUUID()}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new AppError(
        `আপলোড ব্যর্থ হয়েছে: ${error.message}`,
        500
      );
    }

    const { data } = supabaseAdmin.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(path);

    uploadedUrls.push(data.publicUrl);
  }

  res.status(201).json({
    success: true,
    message: `${uploadedUrls.length}টি ছবি সফলভাবে আপলোড হয়েছে`,
    urls: uploadedUrls,
  });
}