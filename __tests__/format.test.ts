import { describe, it, expect } from "vitest";
import {
  fmtRp,
  fmtNum,
  fmtRpShort,
  fmtNumShort,
  fmtTgl,
  fmtTglJam,
  daysUntil,
  pct,
  fmtDurasi,
  slug,
} from "@/lib/format";

describe("fmtRp()", () => {
  it("formats number as Indonesian Rupiah", () => {
    const result = fmtRp(1500000);
    expect(result).toContain("1.500.000");
    expect(result).toContain("Rp");
  });

  it("handles zero", () => {
    expect(fmtRp(0)).toContain("0");
  });
});

describe("fmtRpShort()", () => {
  it("formats billions as M (Miliar)", () => {
    expect(fmtRpShort(2_500_000_000)).toBe("Rp 2.5 M");
  });

  it("formats millions as jt (juta)", () => {
    expect(fmtRpShort(15_000_000)).toBe("Rp 15 jt");
  });

  it("formats thousands as rb (ribu)", () => {
    expect(fmtRpShort(250_000)).toBe("Rp 250 rb");
  });

  it("falls back to full format for small numbers", () => {
    const result = fmtRpShort(500);
    expect(result).toContain("500");
  });

  it("handles negative billions", () => {
    expect(fmtRpShort(-3_000_000_000)).toBe("Rp -3.0 M");
  });
});

describe("fmtNumShort()", () => {
  it("formats millions", () => {
    expect(fmtNumShort(1_500_000)).toBe("1.5jt");
  });

  it("formats thousands", () => {
    expect(fmtNumShort(2_500)).toBe("2.5rb");
  });

  it("returns plain number for small values", () => {
    expect(fmtNumShort(42)).toBe("42");
  });
});

describe("fmtTgl()", () => {
  it("formats ISO date to Indonesian format", () => {
    expect(fmtTgl("2026-07-31")).toBe("31 Jul 2026");
  });

  it("formats full ISO datetime", () => {
    expect(fmtTgl("2026-01-15T10:30:00Z")).toBe("15 Jan 2026");
  });

  it("returns dash for undefined", () => {
    expect(fmtTgl(undefined)).toBe("-");
  });

  it("returns dash for empty string", () => {
    expect(fmtTgl("")).toBe("-");
  });

  it("handles all months", () => {
    expect(fmtTgl("2026-05-01")).toBe("1 Mei 2026");
    expect(fmtTgl("2026-12-25")).toBe("25 Des 2026");
  });
});

describe("fmtTglJam()", () => {
  it("includes time for full ISO datetime", () => {
    expect(fmtTglJam("2026-07-31T14:30:00Z")).toBe("31 Jul 2026 14:30");
  });

  it("falls back to date-only for short strings", () => {
    expect(fmtTglJam("2026-07-31")).toBe("31 Jul 2026");
  });

  it("returns dash for undefined", () => {
    expect(fmtTglJam(undefined)).toBe("-");
  });
});

describe("daysUntil()", () => {
  it("returns positive days for future date", () => {
    expect(daysUntil("2026-01-10", "2026-01-01")).toBe(9);
  });

  it("returns negative days for past date", () => {
    expect(daysUntil("2026-01-01", "2026-01-10")).toBe(-9);
  });

  it("returns 0 for same date", () => {
    expect(daysUntil("2026-06-15", "2026-06-15")).toBe(0);
  });
});

describe("pct()", () => {
  it("calculates percentage with one decimal", () => {
    expect(pct(1, 3)).toBeCloseTo(33.3, 0);
  });

  it("returns 0 for zero total", () => {
    expect(pct(5, 0)).toBe(0);
  });

  it("returns 100 for equal values", () => {
    expect(pct(10, 10)).toBe(100);
  });
});

describe("fmtDurasi()", () => {
  it("formats minutes and seconds", () => {
    expect(fmtDurasi(125)).toBe("2m 5d");
  });

  it("formats seconds only", () => {
    expect(fmtDurasi(45)).toBe("45d");
  });

  it("returns dash for zero", () => {
    expect(fmtDurasi(0)).toBe("-");
  });
});

describe("slug()", () => {
  it("converts to lowercase kebab-case", () => {
    expect(slug("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slug("C Store #1 — Jakarta!")).toBe("c-store-1-jakarta");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slug("  --test--  ")).toBe("test");
  });
});
