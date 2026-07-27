import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

const adapter = new PrismaPg({
  connectionString: env.databaseUrl,
});

export const prisma = new PrismaClient({
  adapter,
  log:
    process.env.NODE_ENV === "development" &&
    process.env.PRISMA_LOG_QUERIES === "true"
      ? ["query", "info", "warn", "error"]
      : ["warn", "error"],
});
