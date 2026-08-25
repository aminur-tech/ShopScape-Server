import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type AuthTokenPayload = {
  id: string;
  role: "CUSTOMER" | "ADMIN";
  email: string;
};

export function signAuthToken(payload: AuthTokenPayload): string {
  const options: jwt.SignOptions = { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}

export type CheckoutTokenPayload = {
  email: string;
  purpose: "CHECKOUT";
};

export function signCheckoutToken(email: string): string {
  return jwt.sign({ email, purpose: "CHECKOUT" }, env.JWT_SECRET, { expiresIn: "15m" });
}

export function verifyCheckoutToken(token: string): CheckoutTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as CheckoutTokenPayload;
  if (decoded.purpose !== "CHECKOUT") {
    throw new Error("Invalid token purpose");
  }
  return decoded;
}
