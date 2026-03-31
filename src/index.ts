import { createServer } from "node:http";
import app from "./httpServer.js";
import logger from "./logger.js";
import { stat, mkdir } from "node:fs/promises";
import config from "./config.js";

function isSystemError(e: any): e is NodeJS.ErrnoException {
  return e instanceof Error && "code" in e;
}

async function createDirectoryIfNotExists(dir: string) {
  const stats = await stat(dir).catch((err) => {
    return err as Error;
  });

  if (isSystemError(stats) && stats.code === "ENOENT") {
    await mkdir(dir).catch((err) => {
      if (err) {
        logger.info({ error: err }, "failed to create upload directory");

        process.exit(1)
      }
    });
  }
}

await createDirectoryIfNotExists(config.uploadDir);

const host = config.host;
const port = config.port;

const server = createServer(app).listen(port, host, () => {
  logger.info("Server listening on: " + `${host}:${port}`);
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received, performing graceful shutdown");

  server.close(() => {
    logger.info("Server closed");
  });
});

process.on("uncaughtException", (err) => {
  logger.error({ error: err }, "uncaught exception");
});

process.on("unhandledRejection", (err, promise) => {
  logger.error({ error: err, promise }, "unhandled rejection");
});