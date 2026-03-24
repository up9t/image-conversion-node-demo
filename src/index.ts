import express, { type Request, type Response } from "express";

const app = express()

app.get("/", function (_req: Request, res: Response) {
  res.send("use /convert endpoint to start converting images\n")
})

app.post("/convert", function (_req: Request, _res: Response) {
})


app.listen(8080, () => {
  console.log("server listening")
})

