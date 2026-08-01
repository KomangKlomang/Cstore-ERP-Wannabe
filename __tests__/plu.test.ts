import { describe, it, expect } from "vitest";
import {
  PREFIX_PLU,
  KAPASITAS_PLU,
  kodePlu,
  seriDariSubDept,
  nomorBerikutnya,
  pemakaiSlot,
  ringkasanPlu,
  tabrakanPlu,
} from "@/lib/plu";
import type { PluAllocation, SeriPlu } from "@/lib/types";

let allocId = 0;
const mkAlloc = (no: number, seri: SeriPlu, sku: string): PluAllocation => ({
  id: `alloc-${++allocId}`,
  no,
  terpakai: { [seri]: sku } as Partial<Record<SeriPlu, string>>,
});

describe("kodePlu()", () => {
  it("generates correct PLU code with zero-padded number", () => {
    expect(kodePlu("DEVICE", 1)).toBe("110001");
    expect(kodePlu("DEVICE", 42)).toBe("110042");
    expect(kodePlu("DEVICE", 9999)).toBe("119999");
  });

  it("uses correct prefix per seri", () => {
    expect(kodePlu("CARTRIDGE", 1)).toBe("120001");
    expect(kodePlu("LIQUID", 1)).toBe("130001");
    expect(kodePlu("TOBACCO STICK", 1)).toBe("140001");
    expect(kodePlu("CIGARETTE", 1)).toBe("170001");
    expect(kodePlu("NEW ITEM EXTERNAL", 1)).toBe("190001");
  });
});

describe("seriDariSubDept()", () => {
  it("maps known sub-dept codes to correct seri", () => {
    expect(seriDariSubDept("11")).toBe("DEVICE");
    expect(seriDariSubDept("12")).toBe("CARTRIDGE");
    expect(seriDariSubDept("13")).toBe("LIQUID");
    expect(seriDariSubDept("14")).toBe("TOBACCO STICK");
    expect(seriDariSubDept("15")).toBe("PARTS");
    expect(seriDariSubDept("16")).toBe("ACCESSORIES");
    expect(seriDariSubDept("21")).toBe("CIGARETTE");
    expect(seriDariSubDept("22")).toBe("LIGHTER");
  });

  it("defaults to NEW ITEM EXTERNAL for unknown codes", () => {
    expect(seriDariSubDept("99")).toBe("NEW ITEM EXTERNAL");
    expect(seriDariSubDept("00")).toBe("NEW ITEM EXTERNAL");
    expect(seriDariSubDept("")).toBe("NEW ITEM EXTERNAL");
  });
});

describe("nomorBerikutnya()", () => {
  it("returns 1 when no allocations exist", () => {
    expect(nomorBerikutnya([], "DEVICE")).toBe(1);
  });

  it("returns next available number skipping used ones", () => {
    const allocs: PluAllocation[] = [mkAlloc(1, "DEVICE", "SKU-A"), mkAlloc(2, "DEVICE", "SKU-B")];
    expect(nomorBerikutnya(allocs, "DEVICE")).toBe(3);
  });

  it("fills gaps in numbering", () => {
    const allocs: PluAllocation[] = [mkAlloc(1, "DEVICE", "SKU-A"), mkAlloc(3, "DEVICE", "SKU-B")];
    expect(nomorBerikutnya(allocs, "DEVICE")).toBe(2);
  });

  it("returns 1 for an unused seri even if others are allocated", () => {
    const allocs: PluAllocation[] = [mkAlloc(1, "DEVICE", "SKU-A")];
    expect(nomorBerikutnya(allocs, "CARTRIDGE")).toBe(1);
  });
});

describe("pemakaiSlot()", () => {
  it("returns undefined for empty slot", () => {
    expect(pemakaiSlot([], "DEVICE", 1)).toBeUndefined();
  });

  it("returns SKU that occupies the slot", () => {
    const allocs: PluAllocation[] = [mkAlloc(5, "DEVICE", "SKU-X")];
    expect(pemakaiSlot(allocs, "DEVICE", 5)).toBe("SKU-X");
  });
});

describe("ringkasanPlu()", () => {
  it("returns summary for all seri with correct counts", () => {
    const allocs: PluAllocation[] = [mkAlloc(1, "DEVICE", "SKU-A"), mkAlloc(2, "DEVICE", "SKU-B")];
    const summary = ringkasanPlu(allocs);
    const device = summary.find((s) => s.seri === "DEVICE")!;
    expect(device.terpakai).toBe(2);
    expect(device.tersedia).toBe(KAPASITAS_PLU - 2);
    expect(device.prefix).toBe("11");
  });

  it("returns 0 used for seri with no allocations", () => {
    const summary = ringkasanPlu([]);
    for (const s of summary) {
      expect(s.terpakai).toBe(0);
      expect(s.tersedia).toBe(KAPASITAS_PLU);
    }
  });
});

describe("tabrakanPlu()", () => {
  it("returns empty array when no collisions", () => {
    const allocs: PluAllocation[] = [mkAlloc(1, "DEVICE", "SKU-A"), mkAlloc(2, "DEVICE", "SKU-B")];
    expect(tabrakanPlu(allocs)).toEqual([]);
  });

  it("detects collision when two SKUs share same slot in same seri", () => {
    const allocs: PluAllocation[] = [
      { id: "c1", no: 1, terpakai: { DEVICE: "SKU-A" } },
      { id: "c2", no: 1, terpakai: { DEVICE: "SKU-B" } },
    ];
    const collisions = tabrakanPlu(allocs);
    expect(collisions.length).toBe(1);
    expect(collisions[0].seri).toBe("DEVICE");
    expect(collisions[0].no).toBe(1);
    expect(collisions[0].pemakai).toEqual(["SKU-A", "SKU-B"]);
  });
});

describe("PREFIX_PLU", () => {
  it("has 9 seri entries", () => {
    expect(Object.keys(PREFIX_PLU)).toHaveLength(9);
  });

  it("all prefixes are 2-digit strings", () => {
    for (const prefix of Object.values(PREFIX_PLU)) {
      expect(prefix).toMatch(/^\d{2}$/);
    }
  });
});

describe("KAPASITAS_PLU", () => {
  it("is 8889", () => {
    expect(KAPASITAS_PLU).toBe(8889);
  });
});
