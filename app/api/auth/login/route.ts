import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth";
import { ApiError, handleApiError, readJson, requireString } from "@/lib/api";

const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 10;

/**
 * Rate limit sederhana per IP. In-memory, jadi hanya berlaku per instance —
 * cukup untuk memperlambat brute force pada deploy single-server.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string) {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  if (entry.count >= MAX_ATTEMPTS) {
    throw new ApiError(429, "Terlalu banyak percobaan login. Coba lagi beberapa menit.");
  }
  entry.count += 1;
}

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    rateLimit(ip);

    const body = await readJson(req);
    const email = requireString(body, "email", "Email");
    const password = requireString(body, "password", "Password");

    const user = await login(email, password);
    if (!user) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    attempts.delete(ip);
    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err);
  }
}
