/** M8 — export bulky. Semua diproses di browser, tanpa server & tanpa internet. */

export interface Column<T> {
  key: string;
  header: string;
  value: (row: T) => string | number | undefined;
}

function esc(v: string | number | undefined): string {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function stamp(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

/** CSV dengan separator `;` + BOM — langsung terbaca rapi oleh Excel Indonesia. */
export function exportCSV<T>(rows: T[], cols: Column<T>[], filename: string) {
  const head = cols.map((c) => esc(c.header)).join(";");
  const body = rows.map((r) => cols.map((c) => esc(c.value(r))).join(";")).join("\n");
  download(new Blob(["﻿" + head + "\n" + body], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}

/**
 * Excel (.xls) berbasis SpreadsheetML sederhana — dibuka Excel/LibreOffice tanpa
 * dependensi eksternal, sehingga tetap jalan offline.
 */
export function exportExcel<T>(rows: T[], cols: Column<T>[], filename: string, sheet = "Data") {
  const esch = (v: unknown) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const head = `<tr>${cols.map((c) => `<th>${esch(c.header)}</th>`).join("")}</tr>`;
  const body = rows
    .map((r) => `<tr>${cols.map((c) => `<td>${esch(c.value(r))}</td>`).join("")}</tr>`)
    .join("");

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8" />
<xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${esch(sheet)}</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>
<style>th{background:#eee;font-weight:bold;border:1px solid #999}td{border:1px solid #ccc}</style>
</head><body><table>${head}${body}</table></body></html>`;

  download(new Blob(["﻿" + html], { type: "application/vnd.ms-excel;charset=utf-8" }), `${filename}.xls`);
}

/** Export PDF = dialog cetak browser (Save as PDF). Tidak butuh library eksternal. */
export function exportPDF() {
  window.print();
}

/* ------------------------------------------------------------- M10 upload file */

export const MAX_UPLOAD_BYTES = 1.5 * 1024 * 1024;

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Gagal membaca file"));
    fr.readAsDataURL(file);
  });
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
