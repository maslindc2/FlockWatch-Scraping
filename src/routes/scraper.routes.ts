import { Router, Request, Response } from "express";
import { DataController } from "../controllers/data.controller";
import { logger } from "../utils/winston-logger";
import { Last30Days } from "../modules/data-processing/last-30-days.interface";
import { FlockCasesByState } from "../modules/data-processing/flock-cases-by-state.interface";
import { DataProcessor } from "../modules/data-processing/data-processor";
import {
    Last30DaysCSVs,
    USDAScrapingService,
} from "../modules/scraper/usda-scraping.service";

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
            // Create the scraping service
            const usdaScrapeService = new USDAScrapingService();
            // Get the All Time US Data for each state
            const mapComparisonCSV = await usdaScrapeService.getAllTimeTotals();
            // Get the last 30 day totals for the entire United States
            const last30DayTotalsCSVs: Last30DaysCSVs =
                await usdaScrapeService.getLast30Days();
            // Create a data processor object
            const dataProcessor = new DataProcessor();

            // Process the mapComparisons CSV
            const flockCasesByState: FlockCasesByState[] =
                await dataProcessor.processMapComparisonsCSV(mapComparisonCSV);

            // Process the last 30 day totals
            const periodSummaries: Last30Days[] =
                await dataProcessor.processLast30DayTotalsCSVs(
                    last30DayTotalsCSVs
                );

            // Assemble an object for returning to the client
            const responseData = {
                flock_cases_by_state: flockCasesByState,
                period_summaries: periodSummaries,
            };
            res.json(responseData);
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
export default router;
