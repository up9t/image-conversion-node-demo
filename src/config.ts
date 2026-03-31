export default {
  host: process.env["HOST"] ?? "0.0.0.0",
  port: Number(process.env["PORT"] ?? 8080),
  uploadDir: process.env["UPLOAD_DIR"] ?? "./uploads",
  maxFileSize: 10 << 20, // 10 MB
} as const satisfies Record<string, string | number>;