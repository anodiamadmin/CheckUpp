import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./db/prisma";
import os from "os";
import { logEvent, serializeErrorForLogs } from "./observability/logger";

const getApiBaseUrls = () => {
  const urls = new Set<string>();
  urls.add(`http://localhost:${env.port}${env.apiPrefix}`);

  try {
    const interfaces = os.networkInterfaces();
    Object.values(interfaces).forEach((interfaceGroup) => {
      interfaceGroup?.forEach((entry) => {
        if (!entry) return;
        if (entry.family !== "IPv4") return;
        if (entry.internal) return;
        urls.add(`http://${entry.address}:${env.port}${env.apiPrefix}`);
      });
    });
  } catch (error) {
    console.warn("Could not enumerate local network interfaces:", error);
  }

  return Array.from(urls);
};

const server = app.listen(env.port, () => {
  console.log(`CheckUpp API listening on port ${env.port}`);
  console.log(`Environment: ${env.nodeEnv}`);
  console.log(`API prefix: ${env.apiPrefix}`);
  console.log("Reachable API base URLs:");
  getApiBaseUrls().forEach((url) => {
    console.log(`  - ${url}`);
  });
});

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down...`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("uncaughtExceptionMonitor", (error, origin) => {
  logEvent("error", "process.uncaught_exception", {
    origin,
    error: serializeErrorForLogs(error),
  });
});
