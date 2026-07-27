import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { env } from "./config/env";
import { prisma } from "./db/prisma";
import { errorHandler } from "./middlewares/error-handler";
import { notFound } from "./middlewares/not-found";
import { requestObservability } from "./middlewares/request-observability";
import { apiRouter } from "./routes";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(requestObservability);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (
        env.allowedOrigins.includes("*") ||
        env.allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS policy"));
    },
    credentials: true,
  }),
);

app.use(
  rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use(express.json({ limit: env.requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: env.requestBodyLimit }));
if (env.nodeEnv !== "production") {
  app.use(morgan("dev"));
}
app.use(
  "/uploads",
  express.static(path.resolve(process.cwd(), env.walletUploadsDir)),
);

app.get("/healthz", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "OK",
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    },
  });
});

app.get("/readyz", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      message: "OK",
      data: {
        status: "ready",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.use(env.apiPrefix, apiRouter);

app.use(notFound);
app.use(errorHandler);
