import { DataProcessor } from "../modules/data-processing/data-processor";
import { FlockCasesByState } from "../modules/data-processing/flock-cases-by-state.interface";
import { Last30Days } from "../modules/data-processing/last-30-days.interface";
import { ScraperContext } from "../modules/scraper/scraper.context";
import { Last30DaysCSVs, USDAScrapingService } from "../modules/scraper/usda-scraping.service";
import { logger } from "../utils/winston-logger";

type FlockData = {
    flock_cases_by_state: FlockCasesByState[]
    period_summaries: Last30Days[]
}

class ScraperController {

    private scrapeContext!: ScraperContext;
    private closed!: boolean;

    constructor(isHeadless:boolean, testIdAttribute: string, urlToScrape: string) {
        this.scrapeContext = new ScraperContext(isHeadless, testIdAttribute, urlToScrape);
        this.closed = false;
    }
    
    public async initContext() {
        await this.scrapeContext.setupBrowser();
    }

    public async stopScrapeJob(): Promise<void>{
        if(this.closed) return;
        this.closed = true;
        await this.scrapeContext.close();
    }

    public async runScrapeJob(): Promise<FlockData> {
        try {
            
            // Create the scraping service
            const usdaScrapeService = new USDAScrapingService(this.scrapeContext);
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

            // Return the data to the client
            return {
                flock_cases_by_state: flockCasesByState,
                period_summaries: periodSummaries,
            };
        } catch (error) {
            if(this.closed) return Promise.reject(error);
            logger.error("Error processing data: ", error);
            throw new Error(`Error processing data: ${error}`);
        }
    }
}
export{ScraperController, FlockData}