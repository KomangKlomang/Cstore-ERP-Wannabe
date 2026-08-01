/**
 * Menjalankan `next dev` dengan cwd terkunci ke root proyek ini.
 * Dipakai oleh preview harness yang cwd-nya berada di folder lain.
 * Untuk penggunaan normal cukup `npm run dev` dari folder proyek.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const port = process.env.PORT ?? "3010";

const child = spawn(process.execPath, [nextBin, "dev", "--port", port], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
