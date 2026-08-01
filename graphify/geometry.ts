/**
 * Graphify — helper geometri SVG.
 *
 * Implementasinya ada di `core.js` (JavaScript polos) supaya renderer vanilla
 * pada `standalone/` memakai perhitungan yang sama persis — tidak ada risiko
 * skala sumbu atau bentuk batang berbeda antara aplikasi dan halaman .html.
 * Berkas ini hanya meneruskannya ke sisi TypeScript/React.
 */

export { barPathH, barPathV, niceMax } from "./core.js";
