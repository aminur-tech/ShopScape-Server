import type { Request, Response } from "express";
import { randomUUID } from "crypto";

import { supabaseAdmin } from "../config/supabase";
import { env } from "../config/env";
import { AppError } from "../middleware/errorHandler";

export async function handleUpload(
  req: Request,
  res: Response
) {
  const files = req.files as Express.Multer.File[] | undefined;

  if (!files || files.length === 0) {
    throw new AppError(
      "কোনো ফাইল পাওয়া যায়নি",
      400
    );
  }

  if (!supabaseAdmin) {
    throw new AppError(
      "Supabase upload configuration পাওয়া যায়নি। SUPABASE_URL এবং SUPABASE_SERVICE_ROLE_KEY check করুন।",
      500
    );
  }

  if (!env.SUPABASE_STORAGE_BUCKET) {
    throw new AppError(
      "SUPABASE_STORAGE_BUCKET সেট করা হয়নি।",
      500
    );
  }

  const uploadedUrls: string[] = [];

  for (const file of files) {
    if (!file.buffer) {
      throw new AppError(
        `File buffer পাওয়া যায়নি: ${file.originalname}`,
        400
      );
    }

    const ext =
      file.originalname
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    const folder =
      req.uploadFolder ?? "misc";

    const fileName = `${Date.now()}-${randomUUID()}.${ext}`;

    const path = `${folder}/${fileName}`;

    const { error } =
      await supabaseAdmin.storage
        .from(env.SUPABASE_STORAGE_BUCKET)
        .upload(
          path,
          file.buffer,
          {
            contentType: file.mimetype,
            upsert: false,
          }
        );

    if (error) {
      console.error(
        "Supabase Storage upload error:",
        error
      );

      throw new AppError(
        `আপলোড ব্যর্থ হয়েছে: ${error.message}`,
        500
      );
    }

    const { data } =
      supabaseAdmin.storage
        .from(env.SUPABASE_STORAGE_BUCKET)
        .getPublicUrl(path);

    if (!data?.publicUrl) {
      throw new AppError(
        "ছবির public URL তৈরি করা যায়নি",
        500
      );
    }

    uploadedUrls.push(
      data.publicUrl
    );
  }

  return res.status(201).json({
    success: true,
    message: `${uploadedUrls.length}টি ছবি সফলভাবে আপলোড হয়েছে`,
    urls: uploadedUrls,
  });
}