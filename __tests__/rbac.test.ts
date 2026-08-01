import { describe, it, expect } from "vitest";
import { can, inScope, scopeLabel, PERMISSION_MATRIX, MODULES } from "@/lib/rbac";
import type { User } from "@/lib/types";

const mkUser = (role: User["role"], overrides: Partial<User> = {}): User => ({
  id: "u1",
  nama: "Test",
  email: "test@test.com",
  role,
  regions: [],
  aktif: true,
  mfaAktif: false,
  ...overrides,
});

describe("can()", () => {
  it("returns false for null user", () => {
    expect(can(null, "dashboard")).toBe(false);
  });

  it("returns false for inactive user", () => {
    const user = mkUser("MDM", { aktif: false });
    expect(can(user, "dashboard")).toBe(false);
  });

  it("MDM has full access to all modules", () => {
    const user = mkUser("MDM");
    for (const mod of MODULES) {
      expect(can(user, mod, "view")).toBe(true);
      expect(can(user, mod, "create")).toBe(true);
      expect(can(user, mod, "edit")).toBe(true);
      expect(can(user, mod, "delete")).toBe(true);
      expect(can(user, mod, "approve")).toBe(true);
    }
  });

  it("CREW can only access konten module", () => {
    const user = mkUser("CREW");
    expect(can(user, "konten", "view")).toBe(true);
    expect(can(user, "konten", "create")).toBe(true);
    expect(can(user, "konten", "edit")).toBe(true);
    expect(can(user, "dashboard")).toBe(false);
    expect(can(user, "product")).toBe(false);
    expect(can(user, "users")).toBe(false);
  });

  it("CREW cannot delete or approve konten", () => {
    const user = mkUser("CREW");
    expect(can(user, "konten", "delete")).toBe(false);
    expect(can(user, "konten", "approve")).toBe(false);
  });

  it("CATEGORY_OFFICER can CRUD product but not approve", () => {
    const user = mkUser("CATEGORY_OFFICER");
    expect(can(user, "product", "view")).toBe(true);
    expect(can(user, "product", "create")).toBe(true);
    expect(can(user, "product", "edit")).toBe(true);
    expect(can(user, "product", "delete")).toBe(true);
    expect(can(user, "product", "approve")).toBe(false);
  });

  it("BUYER can CRUD kontrak and principal", () => {
    const user = mkUser("BUYER");
    expect(can(user, "kontrak", "create")).toBe(true);
    expect(can(user, "kontrak", "delete")).toBe(true);
    expect(can(user, "principal", "edit")).toBe(true);
  });

  it("ADMIN_IT can only access users, audit, platform, laporan, plu, quality", () => {
    const user = mkUser("ADMIN_IT");
    expect(can(user, "users", "create")).toBe(true);
    expect(can(user, "audit", "view")).toBe(true);
    expect(can(user, "product")).toBe(false);
    expect(can(user, "kontrak")).toBe(false);
  });

  it("SPV_AREA can view+edit store but not create/delete", () => {
    const user = mkUser("SPV_AREA");
    expect(can(user, "store", "view")).toBe(true);
    expect(can(user, "store", "edit")).toBe(true);
    expect(can(user, "store", "create")).toBe(false);
    expect(can(user, "store", "delete")).toBe(false);
  });
});

describe("inScope()", () => {
  it("returns false for null user", () => {
    expect(inScope(null, "JBTK")).toBe(false);
  });

  it("user with no regions is in scope for everything", () => {
    const user = mkUser("MDM");
    expect(inScope(user, "JBTK")).toBe(true);
    expect(inScope(user, "SBY")).toBe(true);
  });

  it("user with specific regions is only in scope for those", () => {
    const user = mkUser("SPV_AREA", { regions: ["JBTK", "SRG"] });
    expect(inScope(user, "JBTK")).toBe(true);
    expect(inScope(user, "SRG")).toBe(true);
    expect(inScope(user, "BDG")).toBe(false);
    expect(inScope(user, "SBY")).toBe(false);
  });

  it("undefined region is always in scope", () => {
    const user = mkUser("SPV_AREA", { regions: ["JBTK"] });
    expect(inScope(user, undefined)).toBe(true);
  });
});

describe("scopeLabel()", () => {
  it("returns dash for null user", () => {
    expect(scopeLabel(null)).toBe("-");
  });

  it("returns store code for crew with storeCode", () => {
    const user = mkUser("CREW", { storeCode: "JKT-001" });
    expect(scopeLabel(user)).toBe("Toko JKT-001");
  });

  it("returns 'Semua region' for user with no region restriction", () => {
    const user = mkUser("MDM");
    expect(scopeLabel(user)).toBe("Semua region");
  });

  it("returns joined regions", () => {
    const user = mkUser("SPV_AREA", { regions: ["JBTK", "SRG"] });
    expect(scopeLabel(user)).toBe("JBTK, SRG");
  });
});
