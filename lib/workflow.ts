import type { UsulanStatus } from "@/lib/types";

/**
 * IMP-2 — state machine eksplisit untuk usulan NPD & Tag.
 * Board hanya punya field `Status`; di sini transisinya dibatasi supaya
 * jejak approval tidak bisa dilompati.
 */
export const TRANSISI: Record<UsulanStatus, UsulanStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["ON_PROGRESS", "APPROVED", "DECLINED"],
  ON_PROGRESS: ["APPROVED", "DECLINED"],
  APPROVED: [],
  DECLINED: [],
};

export const STATUS_FINAL: UsulanStatus[] = ["APPROVED", "DECLINED"];
