import crypto from "node:crypto";

export const SESSION_COOKIE = "mms-session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

/**
 * Secret wajib ada di production. Tanpa ini fallback-nya publik di source code,
 * artinya siapa pun bisa membuat cookie sesi atas nama user mana pun.
 */
export function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET wajib diset di production — sesi bisa dipalsukan tanpa itu.");
  }
  return "dev-secret-change-me";
}

/** Perbandingan waktu-konstan agar signature tidak bisa ditebak byte per byte. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function signToken(userId: string, now = Date.now()): string {
  const payload = { sub: userId, iat: now, exp: now + SESSION_MAX_AGE * 1000 };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

/** Mengembalikan user id, atau null kalau signature salah / token kedaluwarsa. */
export function verifyToken(token: string, now = Date.now()): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  if (!data || !sig) return null;

  const expected = crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
  if (!safeEqual(sig, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    if (typeof payload?.sub !== "string" || !payload.sub) return null;
    // Token tanpa exp berasal dari format lama — tolak, jangan dianggap abadi.
    if (typeof payload.exp !== "number" || now >= payload.exp) return null;
    return payload.sub;
  } catch {
    return null;
  }
}
