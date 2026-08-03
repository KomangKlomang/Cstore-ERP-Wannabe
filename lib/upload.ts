import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
const MAX_FILE_SIZE = (Number(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024;

/**
 * Ekstensi yang boleh diunggah. Folder uploads disajikan statis oleh Nginx,
 * jadi .html/.svg/.js sengaja tidak diizinkan — file itu akan tereksekusi
 * di domain yang sama dan jadi celah XSS tersimpan.
 */
const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".pdf",
  ".csv",
  ".xls",
  ".xlsx",
  ".doc",
  ".docx",
]);

export class UploadError extends Error {}

export interface UploadResult {
  storagePath: string;
  nama: string;
  tipe: string;
  ukuran: number;
}

/**
 * entityType & entityId datang dari form request, jadi tidak boleh langsung
 * masuk ke path.join — nilai seperti "../../etc" akan menulis di luar UPLOAD_DIR.
 */
export function sanitizeSegment(value: string): string {
  const cleaned = value.trim().replace(/[^A-Za-z0-9_-]/g, "");
  if (!cleaned) throw new UploadError("entityType dan entityId hanya boleh huruf, angka, - dan _");
  return cleaned.slice(0, 64);
}

export function safeExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new UploadError(`Tipe file ${ext || "(tanpa ekstensi)"} tidak diizinkan`);
  }
  return ext;
}

export async function saveFile(file: File, entityType: string, entityId: string): Promise<UploadResult> {
  if (file.size === 0) throw new UploadError("File kosong");
  if (file.size > MAX_FILE_SIZE) {
    throw new UploadError(`File terlalu besar (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
  }

  const ext = safeExtension(file.name);
  const type = sanitizeSegment(entityType);
  const id = sanitizeSegment(entityId);
  const filename = `${crypto.randomBytes(8).toString("hex")}${ext}`;

  const dir = path.join(UPLOAD_DIR, type, id);
  await fs.mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), buffer);

  return {
    storagePath: `/uploads/${type}/${id}/${filename}`,
    nama: path.basename(file.name).slice(0, 255),
    tipe: file.type || "application/octet-stream",
    ukuran: file.size,
  };
}

export async function deleteFile(storagePath: string) {
  const relative = storagePath.replace(/^\/uploads\//, "");
  const fullPath = path.resolve(UPLOAD_DIR, relative);

  // Tolak path hasil traversal ("../") yang keluar dari UPLOAD_DIR.
  if (fullPath !== UPLOAD_DIR && !fullPath.startsWith(UPLOAD_DIR + path.sep)) {
    throw new UploadError("Path file tidak valid");
  }

  try {
    await fs.unlink(fullPath);
  } catch {
    // file sudah tidak ada
  }
}
