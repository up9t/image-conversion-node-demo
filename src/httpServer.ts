import { readFile, unlink } from "node:fs/promises";
import express from "express";
import { StatusCodes } from "http-status-codes";
import multer, { diskStorage } from "multer";
import { pinoHttp } from "pino-http";
import sharp from "sharp";
import config from "./config.js";
import logger from "./logger.js";

const fileStore = multer({
  storage: diskStorage({
    destination(_req, _file, callback) {
      callback(null, config.uploadDir);
    },
    filename(_req, file, callback) {
      const prefix = Date.now().toString();
      callback(null, `${prefix}-${file.originalname.slice(-50)}`);
    },
  }),
  limits: {
    fieldSize: 10 << 20, // 10 MB
  },
});

const app = express();
const httpLogger = pinoHttp({ logger });

app.use(httpLogger);

app.get("/", (_req, res) => {
  res.status(StatusCodes.OK).send("use /convert to start converting images.\n");
});

app.post("/convert", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const err = await new Promise<Error | null>((resolve, reject) => {
    fileStore.single("image")(req, res, (err) => {
      if (err) {
        return reject(err as Error);
      }
      resolve(null);
    });
  });

  const filePath = req.file?.path;

  res.on("close", async () => {
    if (filePath) {
      await unlink(filePath).catch((err) => {
        req.log.error({ error: err }, `failed to clean up image: ${filePath}`);
      });
    }
  });

  if (err) {
    res.status(StatusCodes.BAD_REQUEST).json({
      message: "failed to upload file",
      error: err,
    });

    return;
  }

  if (!filePath) {
    res.status(StatusCodes.BAD_REQUEST).json({
      failed: "file path not found",
    });

    return;
  }

  const formatToMimeType = {
    webp: "image/webp",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
  } satisfies Partial<Record<keyof sharp.FormatEnum, string>>;

  const FALLBACK_FORMAT = "webp";
  const format =
    (req.body?.format as keyof typeof formatToMimeType) || FALLBACK_FORMAT;

  if (!Object.hasOwn(formatToMimeType, format)) {
    res.status(StatusCodes.BAD_REQUEST).json({
      message: `available formats: ${Object.keys(formatToMimeType).join(", ")}`,
      error: "invalid format",
    });

    return;
  }

  const content = await readFile(filePath).catch((err) => {
    req.log.error({ error: err }, `failed to read image: ${filePath}`);

    return null;
  });

  if (!content) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "failed to read image",
    });

    return;
  }

  req.log.info(`converting to ${format}`);

  const transformer = sharp(content)
    .resize({
      height: 640,
    })
    .toFormat(format);

  res.setHeader("content-type", formatToMimeType[format]);

  transformer.on("error", (err) => {
    req.log.error({ error: err }, "failed to transform image");

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "failed to transform image",
      reason: err,
    });
  });

  transformer.pipe(res);

  return;
});

export default app;
