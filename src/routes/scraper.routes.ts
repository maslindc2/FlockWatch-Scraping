import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { DataController } from "../controllers/data.controller";
import { logger } from "../utils/winston-logger";

import { ScraperController } from "../controllers/scraper.controller";

const router = Router();

const scrapeLimiter = rateLimit({
    windowMs: 30 * 1000,
    max: 1,
    message: { error: "Too many requests. Please wait before scraping again." },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
});

// This is our fetch data route where we receive a GET request for getting the latest Avian Influenza data
router.get("/get-data", scrapeLimiter, async (req: Request, res: Response) => {
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
        const scrapeController = new ScraperController(
            true,
            "data-tb-test-id",
            process.env.SCRAPE_URL!
        );

        // Listen for our client disconnecting, if that occurs kill the scrape job
        req.on("close", () => {
            scrapeController.stopScrapeJob();
        });
        try {
            const flockData = await scrapeController.runScrapeJob();
            logger.info("Finished scrape job and now sending data to client!");
            res.json(flockData);
            if (res.headersSent) logger.info("Sent data to client!");
        } catch (error) {
            logger.error("Error processing data: ", error);
            res.status(500).json({ error: "Failed to process data" });
        } finally {
            scrapeController.stopScrapeJob();
        }
    } else {
        logger.error(`Invalid Auth ID from IP ${req.ip}!`);
        res.sendStatus(403);
    }
});

export default router;
