/**
 * Graphify — token warna & tipe data bersama.
 *
 * Nilai palet dan formatter berasal dari `core.js` supaya identik dengan
 * renderer vanilla di `standalone/`. Tipe TypeScript didefinisikan di sini.
 *
 * Palet: slot kategorikal tetap (--viz-1..8), tidak pernah di-cycle.
 * Warna mengikuti entitas, bukan peringkat. Satu sumbu saja (tidak ada dual axis).
 * Mode terang: aqua/kuning/magenta < 3:1 terhadap surface, sehingga aturan relief
 * berlaku — setiap chart menyediakan label langsung dan tombol "Tabel".
 */

export { VIZ, VIZ_STATUS, VIZ_SOLO, idFmt } from "./core.js";

export interface Datum {
  label: string;
  value: number;
  key?: string;
}

export interface SeriesDatum {
  label: string;
  values: Record<string, number>;
}

export type Fmt = (n: number) => string;
