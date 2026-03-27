import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET || "alpha-sigma-alumni-db-secret-key";

export type Role = "admin" | "board_member" | "viewer";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const computed = crypto.scryptSync(password, salt, 64).toString("hex");
  return hash === computed;
}

export function createSessionToken(userId: number, username: string, role: string): string {
  const payload = `${userId}:${username}:${role}:${Date.now()}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64");
}

export function verifySessionToken(token: string): { userId: number; username: string; role: Role } | null {
  try {
    const decoded = Buffer.from(token, "base64").toString();
    const parts = decoded.split(":");
    const sig = parts.pop()!;
    const payload = parts.slice(0, 4).join(":");
    const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
    if (sig !== expected) return null;
    return { userId: Number(parts[0]), username: parts[1], role: parts[2] as Role };
  } catch {
    return null;
  }
}
