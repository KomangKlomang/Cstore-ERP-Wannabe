import { describe, expect, it } from "vitest";
import { UploadError, safeExtension, sanitizeSegment } from "@/lib/upload";

describe("sanitizeSegment", () => {
  it("membiarkan segment yang wajar", () => {
    expect(sanitizeSegment("product")).toBe("product");
    expect(sanitizeSegment("a1b2-c3_d4")).toBe("a1b2-c3_d4");
  });

  it("menghapus komponen path traversal", () => {
    // Regresi: entityType/entityId dulu langsung masuk path.join, jadi
    // "../../.." bisa menulis file di luar folder uploads.
    expect(sanitizeSegment("../../etc")).toBe("etc");
    expect(sanitizeSegment("..\\..\\windows")).toBe("windows");
    expect(sanitizeSegment("a/b/c")).toBe("abc");
  });

  it("menolak segment yang jadi kosong setelah dibersihkan", () => {
    expect(() => sanitizeSegment("../..")).toThrow(UploadError);
    expect(() => sanitizeSegment("///")).toThrow(UploadError);
    expect(() => sanitizeSegment("  ")).toThrow(UploadError);
  });

  it("memotong segment yang terlalu panjang", () => {
    expect(sanitizeSegment("x".repeat(200))).toHaveLength(64);
  });
});

describe("safeExtension", () => {
  it("mengizinkan gambar dan dokumen", () => {
    expect(safeExtension("foto.jpg")).toBe(".jpg");
    expect(safeExtension("LOGO.PNG")).toBe(".png");
    expect(safeExtension("kontrak.pdf")).toBe(".pdf");
    expect(safeExtension("data.xlsx")).toBe(".xlsx");
  });

  it("menolak tipe file yang bisa tereksekusi di browser", () => {
    // Folder uploads disajikan statis oleh Nginx — .html/.svg jadi XSS tersimpan.
    expect(() => safeExtension("payload.html")).toThrow(UploadError);
    expect(() => safeExtension("payload.svg")).toThrow(UploadError);
    expect(() => safeExtension("payload.js")).toThrow(UploadError);
    expect(() => safeExtension("shell.php")).toThrow(UploadError);
  });

  it("menolak file tanpa ekstensi", () => {
    expect(() => safeExtension("README")).toThrow(UploadError);
  });

  it("hanya melihat ekstensi terakhir", () => {
    expect(() => safeExtension("gambar.png.html")).toThrow(UploadError);
    expect(safeExtension("laporan.final.pdf")).toBe(".pdf");
  });
});
