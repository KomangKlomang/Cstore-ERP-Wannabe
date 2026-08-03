import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

type Client = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma?: Client };

function createClient(): Client {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL belum diset. Copy .env.example ke .env lalu isi connection string PostgreSQL.");
  }
  const pool = new pg.Pool({ connectionString });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

function getClient(): Client {
  if (!globalForPrisma.prisma) {
    const client = createClient();
    // Di dev, Next.js me-reload modul tiap perubahan — cache di global supaya
    // tidak menumpuk connection pool sampai Postgres kehabisan slot.
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
    else return (globalForPrisma.prisma = client);
  }
  return globalForPrisma.prisma;
}

/**
 * Dibuat lazy lewat Proxy: `next build` mengimpor semua route handler untuk
 * dianalisis, dan koneksi tidak boleh dibuat (atau gagal) hanya karena impor.
 */
export const prisma: Client = new Proxy({} as Client, {
  get(_target, prop) {
    const client = getClient() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
