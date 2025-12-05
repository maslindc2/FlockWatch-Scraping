import { Router, Request, Response } from "express";
import { DataController } from "../controllers/data.controller";
import { logger } from "../utils/winston-logger";
import { Last30Days } from "../modules/data-processing/last-30-days.interface";
import { FlockCasesByState } from "../modules/data-processing/flock-cases-by-state.interface";
import { DataProcessor } from "../modules/data-processing/data-processor";
import { UpdateData } from "../modules/update-data/update-data.service";
import {
    Last30DaysCSVs,
    USDAScrapingService,
} from "../modules/scraper/usda-scraping.service";
import { ScraperController } from "../controllers/scraper.controller";

const router = Router();

// This is our process data route where we receive a request for getting the latest Avian Influenza data
router.post("/process-data", async (req: Request, res: Response) => {
    // Store the authentication ID we got from Flock Watch Server
    const authHeader = req.headers.authorization;
    const receivedAuthID = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : null;

    // Create an instance for our DataController
    const dataController = new DataController();
    // Get the AuthID from our MongoDB (this is the same model shared between FlockWatch Server and FlockWatch Scraping)
    const expectedAuthID = await dataController.getServerAuthID();
    // If the Auth ID matches
    if (receivedAuthID === expectedAuthID) {
        // Report that we are scraping
        logger.info(`Received valid scrape request! Starting job...`);
        try {
            const controller = new ScraperController();
            const flockData = await controller.runScrapeJob();
            res.json(flockData);
        } catch (error) {
            logger.error("Error processing data: ", error);
            res.sendStatus(500).json({ error: "Failed to process data" });
        }
    } else {
        logger.error(
            `Invalid Auth ID from IP ${req.ip}, who sent the auth ID ${receivedAuthID}!`
        );
        res.sendStatus(403);
    }
});

router.get("/manual-update", async (req: Request, res: Response) => {
    // Check if we are out of date and if so run scrape job and send it to FW Server
    const dataUpdate = new UpdateData();
    const result = await dataUpdate.syncIfOutdated();
    res.json(result);
});
export default router;
