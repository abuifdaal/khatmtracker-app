// lib/tokens.ts
import crypto from "crypto";
import bcrypt from "bcryptjs";

/** Generate a URL-safe random token (secret part) */
export function generateToken(): string {
  return crypto.randomBytes(24).toString("base64url"); // ~32 chars
}

/** Hash the token for storage (never store plain text) */
export async function hashToken(token: string): Promise<string> {
  // 10 rounds is plenty for our use here
  return bcrypt.hash(token, 10);
}

/** Compare a plain token with a stored bcrypt hash */
export async function compareToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}

/**
 * The manage URL will look like /p/<tokenId>.<secret>
 * Example: /p/0f3e3c1a-...-d9e2.NmVxQ2tVb3...
 * We split on the first '.' to get both parts.
 */
export function splitManageToken(mixed: string): { id: string; secret: string } | null {
  const dot = mixed.indexOf(".");
  if (dot <= 0) return null;
  return { id: mixed.slice(0, dot), secret: mixed.slice(dot + 1) };
}