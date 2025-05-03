import * as dotenv from "dotenv";
import { App } from "./app";
import { logger } from "./utils/winston-logger";

dotenv.config();

// Define the port number from our env variables otherwise use fallback 8080 port for our Scraping system
const PORT: number = Number(process.env.PORT) || 8080
// Get the MongoDB connection string
const mongoDBConnection = process.env.MONGODB_URI;
// If we were not able to get it throw an error
if (!mongoDBConnection) {
    throw new Error("MONGODB_URI is not defined in the environment variables!");
}
// Start the scraping express server
const server = new App().app;
// Listen for requests and log that we are starting
server.listen(PORT, () => logger.info(`Starting server on port: ${PORT}`));
