import * as dotenvx from "@dotenvx/dotenvx";
import { App } from "./app";
import { logger } from "./utils/winston-logger";

dotenvx.config();

/**
 * The port the server listens on, derived from the PORT env variable or defaults to 8080.
 */
const PORT: number = Number(process.env.PORT) || 8080;
/**
 * The MongoDB connection string from environment variables.
 */
const mongoDBConnection = process.env.MONGODB_URI;

if (!mongoDBConnection) {
    throw new Error("MONGODB_URI is not defined in the environment variables!");
}

/** The Express application instance. */
const server = new App().app;

server.listen(PORT, () => logger.info(`Starting server on port: ${PORT}`));
