import { NextResponse } from "next/server";
import { getSession, type Session } from "@/lib/auth";
import { can, type ModuleKey, type Permission } from "@/lib/rbac";
import { UploadError } from "@/lib/upload";

/** Error yang aman ditampilkan ke client, lengkap dengan status HTTP-nya. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Cek sesi DAN izin modul. Sebelumnya route hanya cek "sudah login atau belum",
 * artinya Crew pun bisa menghapus produk lewat API walau menu-nya disembunyikan.
 */
export async function requirePermission(modul: ModuleKey, perm: Permission = "view"): Promise<Session> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Silakan login terlebih dahulu");
  if (!can(session, modul, perm)) {
    throw new ApiError(403, "Anda tidak punya izin untuk aksi ini");
  }
  return session;
}

/** req.json() melempar SyntaxError untuk body rusak — tanpa ini jadi 500, bukan 400. */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    throw new ApiError(400, "Body request bukan JSON yang valid");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ApiError(400, "Body request harus berupa object JSON");
  }
  return parsed as Record<string, unknown>;
}

export function requireString(body: Record<string, unknown>, field: string, label = field): string {
  const value = body[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, `${label} wajib diisi`);
  }
  return value.trim();
}

export function optionalString(body: Record<string, unknown>, field: string): string | undefined {
  const value = body[field];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new ApiError(400, `${field} harus berupa teks`);
  return value.trim();
}

export function optionalNumber(body: Record<string, unknown>, field: string): number | undefined {
  const value = body[field];
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) throw new ApiError(400, `${field} harus berupa angka`);
  return num;
}

export function optionalEnum<T extends string>(
  body: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
): T | undefined {
  const value = body[field];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ApiError(400, `${field} harus salah satu dari: ${allowed.join(", ")}`);
  }
  return value as T;
}

function prismaErrorCode(err: unknown): string | null {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}

/**
 * Menerjemahkan error jadi response. Sebelumnya constraint Prisma (mis. kode
 * produk duplikat) bocor sebagai 500 dengan stack trace di body.
 */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof UploadError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  switch (prismaErrorCode(err)) {
    case "P2002":
      return NextResponse.json({ error: "Data dengan kode/nilai unik itu sudah ada" }, { status: 409 });
    case "P2003":
      return NextResponse.json(
        { error: "Referensi tidak valid (principal/kategori tidak ditemukan)" },
        { status: 400 },
      );
    case "P2025":
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
  }

  console.error("[api] unhandled error:", err);
  return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
}
