import { mkdir, stat } from "node:fs/promises";
import { createServer } from "node:http";
import config from "./config.js";
import app from "./httpServer.js";
import logger from "./logger.js";

function isSystemError(e: unknown): e is NodeJS.ErrnoException {
  return e instanceof Error && "code" in e;
}

async function createDirectoryIfNotExists(dir: string) {
  const stats = await stat(dir).catch((err) => {
    return err as Error;
  });

  if (isSystemError(stats) && stats.code === "ENOENT") {
    const res = await mkdir(dir, { recursive: true }).catch((err) => {
      return err as Error;
    });

    if (res instanceof Error) {
      return res;
    }

    return;
  }

  if (stats instanceof Error) {
    return stats;
  }

  if (!stats.isDirectory()) {
    return new Error(`${dir} is not a directory`);
  }

  return;
}

const err = await createDirectoryIfNotExists(config.uploadDir);

if (err) {
  logger.error({ error: err }, "failed to create upload directory");
  process.exit(1);
}

const host = config.host;
const port = config.port;

const server = createServer(app).listen(port, host, () => {
  logger.info(`Server listening on: ${host}:${port}`);
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received, performing graceful shutdown.");

  server.close(() => {
    logger.info("Server closed.");
  });
});

process.on("uncaughtException", (err) => {
  logger.error({ error: err }, "uncaught exception");
});

process.on("unhandledRejection", (err, promise) => {
  logger.error({ error: err, promise }, "unhandled rejection");
});
