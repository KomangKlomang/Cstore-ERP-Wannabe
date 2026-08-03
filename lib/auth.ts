import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE, signToken, verifyToken } from "@/lib/session-token";
import type { Region, Role } from "@/lib/types";

/**
 * Hash bcrypt asli atas string acak — tidak akan pernah cocok dengan password apa pun.
 * Dipakai agar login tetap menjalankan bcrypt.compare walau email tidak terdaftar,
 * sehingga waktu respons tidak membocorkan email mana yang ada di database.
 */
const DUMMY_HASH = "$2b$12$2uzUZXzxghaMk4Y2Jfy0peZ.XMidoAIKgeWDydM6ETjF5lLGwm1si";

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

  // Selalu jalankan bcrypt, walau user tidak ada, supaya durasi request seragam.
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.aktif || !valid) return null;

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, signToken(user.id), {
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

export type Session = {
  id: string;
  nama: string;
  email: string;
  role: Role;
  regions: Region[];
  storeCode: string | null;
  aktif: boolean;
};

export async function getSession(): Promise<Session | null> {
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
    role: user.role as Role,
    regions: user.regions.map((r: { region: string }) => r.region as Region),
    storeCode: user.storeCode,
    aktif: user.aktif,
  };
}
