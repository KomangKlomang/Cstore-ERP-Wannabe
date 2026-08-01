import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE = (Number(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024;

export interface UploadResult {
  storagePath: string;
  nama: string;
  tipe: string;
  ukuran: number;
}

export async function saveFile(file: File, entityType: string, entityId: string): Promise<UploadResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File terlalu besar (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
  }

  const ext = path.extname(file.name) || ".bin";
  const hash = crypto.randomBytes(8).toString("hex");
  const filename = `${hash}${ext}`;
  const dir = path.join(UPLOAD_DIR, entityType, entityId);

  await fs.mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, buffer);

  return {
    storagePath: `/uploads/${entityType}/${entityId}/${filename}`,
    nama: file.name,
    tipe: file.type,
    ukuran: file.size,
  };
}

export async function deleteFile(storagePath: string) {
  const fullPath = path.join(UPLOAD_DIR, storagePath.replace(/^\/uploads\//, ""));
  try {
    await fs.unlink(fullPath);
  } catch {
    // file already gone
  }
}
