import { Router, Request, Response } from "express";
import { DataController } from "../controllers/data.controller";
import { logger } from "../utils/winston-logger";

import { ScraperController } from "../controllers/scraper.controller";

const router = Router();


// This is our fetch data route where we receive a GET request for getting the latest Avian Influenza data
router.get("/get-data", async (req: Request, res: Response) => {
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
        // Create the scraper controller instance
        const scrapeController = new ScraperController(true, "data-tb-test-id", process.env.SCRAPE_URL!);    
        
        
        // Listen for our client disconnecting, if that occurs kill the scrape job
        req.on("close", () => {
            scrapeController.stopScrapeJob();
        });
        try {
            const flockData = await scrapeController.runScrapeJob();
            logger.info("Finished scrape job and now sending data to client!");
            res.json(flockData)
            if(res.headersSent) logger.info("Sent data to client!");

        } catch (error) {
            logger.error("Error processing data: ", error);
            res.sendStatus(500).json({ error: "Failed to process data" });
        } finally{
            scrapeController.stopScrapeJob();
        }
    } else {
        logger.error(
            `Invalid Auth ID from IP ${req.ip}, who sent the auth ID ${receivedAuthID}!`
        );
        res.sendStatus(403);
    }
});

export default router;
