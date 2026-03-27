import express from "express";
import pino from "pino";
import { pinoHttp } from "pino-http";
import sharp from "sharp";
import multer, { diskStorage} from "multer";
import { readFile, unlink } from "node:fs/promises";
import { StatusCodes } from "http-status-codes";

const upload = multer({
  storage: diskStorage({ 
    destination() {
      return "./uploads"
    },
    filename(req, file, callback) {
      const prefix = Date.now().toString();
      callback(null,  prefix + file.originalname.slice(-50))
    },
  }),
  limits: {
    fieldSize: 10 << 20, // 10 MB
  }
})

const app = express()
const logger = pino({
  // formatters
});
const httpLogger = pinoHttp({ logger });

app.use(httpLogger)

app.get("/", function (req, res) {
  req.log.info("entry")
  res.send("use /convert to start converting images\n")
})

app.get("/convert", upload.single("image"), async function (req, res) {
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
})

app.listen(8080, () => {
  logger.info("Server listening on port: " + 8080);
});