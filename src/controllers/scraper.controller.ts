import { DataProcessor } from "../modules/data-processing/data-processor";
import { FlockCasesByState } from "../modules/data-processing/flock-cases-by-state.interface";
import { Last30Days } from "../modules/data-processing/last-30-days.interface";
import { Last30DaysCSVs, USDAScrapingService } from "../modules/scraper/usda-scraping.service";
import { logger } from "../utils/winston-logger";

type FlockData = {
    flock_cases_by_state: FlockCasesByState[]
    period_summaries: Last30Days[]
}

class ScraperController {
    public async runScrapeJob(): Promise<FlockData> {
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
            const serverData = {
                flock_cases_by_state: flockCasesByState,
                period_summaries: periodSummaries,
            };
            return serverData
        } catch (error) {
            logger.error("Error processing data: ", error);
            throw new Error(`Error processing data: ${error}`);
        }
    }
}
export{ScraperController, FlockData}