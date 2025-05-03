import { Router, Request, Response } from "express";
import { DataController } from "../controllers/data-controller";
import { logger } from "../utils/winston-logger";
import { DataProcessor } from "../services/data-processor";

const router = Router();

// This is our process data route where we receive a request for getting the latest Avian Influenza data
router.post("/process-data", async (req: Request, res: Response) => {
    // Store the authentication ID we got from Flock Watch Server
    const authHeader = req.headers.authorization;
    const receivedAuthID = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

    // Create an instance for our DataController
    const dataController = new DataController();
    // Get the AuthID from our MongoDB (this is the same model shared between FlockWatch Server and FlockWatch Scraping)
    const expectedAuthID = await dataController.getServerAuthID();
    // If the Auth ID matches
    if (receivedAuthID === expectedAuthID) {
        // Report that we are scraping
        logger.info(`Received valid scrape request! Starting job...`);
        const dataProcessor = new DataProcessor();

        res.json(await dataProcessor.processData());
    } else {
        logger.error(`Invalid authID from IP ${req.ip}, who sent the auth ID ${receivedAuthID}!`);
        res.sendStatus(403);
    }
});
export default router;