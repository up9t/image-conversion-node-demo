import pino from "pino";

const isDev =  process.env["NODE_ENV"] === "development";

const logger = pino(
    isDev 
    ? { transport: { target: 'pino-pretty' } }
    : {}
);

export default logger;