import crypto from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { SESSION_MAX_AGE, signToken, verifyToken } from "@/lib/session-token";

/** Menyusun token valid secara manual untuk menguji payload yang aneh. */
function forge(payload: object, secret = "test-secret"): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  process.env.AUTH_SECRET = "test-secret";
});

describe("signToken / verifyToken", () => {
  it("bolak-balik mengembalikan user id yang sama", () => {
    const token = signToken("user-123");
    expect(verifyToken(token)).toBe("user-123");
  });

  it("menolak token dengan signature yang diubah", () => {
    const [data] = signToken("user-123").split(".");
    expect(verifyToken(`${data}.signature-palsu`)).toBeNull();
  });

  it("menolak payload yang diutak-atik walau signature lama disertakan", () => {
    const [, sig] = signToken("user-123").split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "admin", exp: Date.now() + HOUR })).toString("base64url");
    expect(verifyToken(`${forged}.${sig}`)).toBeNull();
  });

  it("menolak token yang ditandatangani dengan secret lain", () => {
    const token = signToken("user-123");
    process.env.AUTH_SECRET = "secret-berbeda";
    expect(verifyToken(token)).toBeNull();
  });

  it("menolak token yang sudah kedaluwarsa", () => {
    // Regresi: verifyToken lama tidak pernah memeriksa exp, jadi token curian
    // tetap sah selamanya walau cookie-nya sudah lewat maxAge.
    const issued = Date.now();
    const token = signToken("user-123", issued);

    expect(verifyToken(token, issued + SESSION_MAX_AGE * 1000 - 1000)).toBe("user-123");
    expect(verifyToken(token, issued + SESSION_MAX_AGE * 1000 + 1000)).toBeNull();
  });

  it("menolak token format lama yang tidak punya exp", () => {
    expect(verifyToken(forge({ sub: "user-123", iat: Date.now() }))).toBeNull();
  });

  it("menolak token yang bentuknya salah", () => {
    expect(verifyToken("")).toBeNull();
    expect(verifyToken("tanpa-titik")).toBeNull();
    expect(verifyToken("a.b.c")).toBeNull();
    expect(verifyToken(".")).toBeNull();
  });

  it("menolak payload tanpa sub", () => {
    expect(verifyToken(forge({ exp: Date.now() + HOUR }))).toBeNull();
  });
});
