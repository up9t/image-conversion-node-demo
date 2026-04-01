export default {
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT),
  uploadDir: String(process.env.UPLOAD_DIR),
  maxFileSize: 10 << 20, // 10 MB
} as const satisfies Record<string, string | number>;
