import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import crypto from "node:crypto";

const SESSION_COOKIE = "mms-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

function signToken(userId: string): string {
  const payload = { sub: userId, iat: Date.now() };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const secret = process.env.AUTH_SECRET || "dev-secret-change-me";
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verifyToken(token: string): string | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const secret = process.env.AUTH_SECRET || "dev-secret-change-me";
  const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.aktif) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

  const token = signToken(user.id);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return { id: user.id, nama: user.nama, email: user.email, role: user.role };
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = verifyToken(token);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { regions: true },
  });
  if (!user || !user.aktif) return null;
  return {
    id: user.id,
    nama: user.nama,
    email: user.email,
    role: user.role,
    regions: user.regions.map((r: { region: string }) => r.region),
    storeCode: user.storeCode,
  };
}
