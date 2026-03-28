import express from "express";
import pino from "pino";
import { pinoHttp } from "pino-http";
import sharp from "sharp";
import multer, { diskStorage } from "multer";
import { readFile, unlink, stat, mkdir } from "node:fs/promises";
import { StatusCodes } from "http-status-codes";

const uploadDir = "./uploads";

function isSystemError(e: any): e is NodeJS.ErrnoException {
  return e instanceof Error && "code" in e;
}

const logger = pino(
  process.stdout.isTTY
    ? { transport: { target: 'pino-pretty' } }
    : {}
);

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

await createDirectoryIfNotExists(uploadDir);

const upload = multer({
  storage: diskStorage({
    destination(req, file, callback) {
      callback(null, uploadDir)
    },
    filename(req, file, callback) {
      const prefix = Date.now().toString();
      callback(null, prefix + "-" + file.originalname.slice(-50))
    },
  }),
  limits: {
    fieldSize: 10 << 20, // 10 MB
  }
});

const app = express()
const httpLogger = pinoHttp({ logger });

app.use(httpLogger)

app.get("/", function (req, res) {
  req.log.info("entry")
  res.send("use /convert to start converting images\n")
})

app.post("/convert", upload.single("image"), async function (req, res) {
  req.log.info("converting image")

  const filePath = req.file?.path

  if (!filePath) {
    res.status(StatusCodes.BAD_REQUEST).json({
      failed: "file path not found"
    });

    return
  }

  const content = await readFile(filePath)
    .catch((err) => {
      req.log.error({ error: err }, "failed to read image: " + filePath)

      return null
    })

  if (!content) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "failed to read image"
    })

    return
  }

  res.on("close", async () => {
    if (filePath) {
      await unlink(filePath)
        .catch((err) => {
          req.log.error({ error: err }, "failed to clean up image: " + filePath)
        });
    }
  });

  const transformer = sharp(content).resize({
    height: 640,
  }).jpeg();

  transformer.on("error", (err) => {
    req.log.error({ error: err }, "failed to transform image")

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "failed to transform image",
      reason: err,
    });
  });

  transformer.pipe(res);

  return
});

const server = app.listen(8080, (err) => {
  if (err) {
    logger.info({
      error: err,
    }, "failed to start server");

    return
  }

  logger.info("Server listening on port: " + 8080);
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