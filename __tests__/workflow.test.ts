import { describe, it, expect } from "vitest";
import { TRANSISI, STATUS_FINAL } from "@/lib/workflow";
import type { UsulanStatus } from "@/lib/types";

describe("TRANSISI state machine", () => {
  it("DRAFT can only go to SUBMITTED", () => {
    expect(TRANSISI.DRAFT).toEqual(["SUBMITTED"]);
  });

  it("SUBMITTED can go to ON_PROGRESS, APPROVED, or DECLINED", () => {
    expect(TRANSISI.SUBMITTED).toEqual(["ON_PROGRESS", "APPROVED", "DECLINED"]);
  });

  it("ON_PROGRESS can go to APPROVED or DECLINED", () => {
    expect(TRANSISI.ON_PROGRESS).toEqual(["APPROVED", "DECLINED"]);
  });

  it("APPROVED is a terminal state", () => {
    expect(TRANSISI.APPROVED).toEqual([]);
  });

  it("DECLINED is a terminal state", () => {
    expect(TRANSISI.DECLINED).toEqual([]);
  });

  it("STATUS_FINAL contains only APPROVED and DECLINED", () => {
    expect(STATUS_FINAL).toEqual(["APPROVED", "DECLINED"]);
  });

  it("all statuses in TRANSISI are valid UsulanStatus values", () => {
    const allStatuses: UsulanStatus[] = ["DRAFT", "SUBMITTED", "ON_PROGRESS", "APPROVED", "DECLINED"];
    const keys = Object.keys(TRANSISI);
    expect(keys).toEqual(allStatuses);
  });

  it("no state can transition to DRAFT", () => {
    for (const targets of Object.values(TRANSISI)) {
      expect(targets).not.toContain("DRAFT");
    }
  });

  it("terminal states have no outgoing transitions", () => {
    for (const status of STATUS_FINAL) {
      expect(TRANSISI[status]).toEqual([]);
    }
  });
});
