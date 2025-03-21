import * as dotenv from "dotenv";
import { App } from "./app";
import { logger } from "./utils/winston-logger";

const PORT: number = 8081;

dotenv.config();

const mongoDBConnection = process.env.MONGODB_URI;

if (!mongoDBConnection) {
    throw new Error("MONGODB_URI is not defined in the environment variables!");
}
const server = new App().app;
server.listen(PORT, () => logger.info(`Starting server on port: ${PORT}`));
