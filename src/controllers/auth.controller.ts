import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { hashPassword, comparePassword } from "../utils/password";
import { signAuthToken } from "../utils/jwt";
import { AppError } from "../middleware/errorHandler";

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6).optional(),
  password: z.string().min(6),
});

export async function register(req: Request, res: Response) {
  const { name, email, phone, password } = req.body as z.infer<typeof registerSchema>;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError("এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট আছে", 409);

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash },
  });

  const token = signAuthToken({ id: user.id, role: user.role, email: user.email });
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("ইমেইল বা পাসওয়ার্ড সঠিক নয়", 401);

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw new AppError("ইমেইল বা পাসওয়ার্ড সঠিক নয়", 401);

  const token = signAuthToken({ id: user.id, role: user.role, email: user.email });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
  });
  if (!user) throw new AppError("User not found", 404);
  res.json({ user });
}
