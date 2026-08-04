import { DataProcessor } from "../modules/data-processing/data-processor";
import { FlockCasesByState } from "../modules/data-processing/flock-cases-by-state.interface";
import { Last30Days } from "../modules/data-processing/last-30-days.interface";
import {
    SiteDetails,
    HistoricalSummary,
    StatusTransitionSummary,
} from "../modules/data-processing/site-details.interface";
import { ScraperContext } from "../modules/scraper/scraper.context";
import {
    Last30DaysCSVs,
    USDAScrapingService,
} from "../modules/scraper/usda-scraping.service";
import { logger } from "../utils/winston-logger";

/**
 * Represents the processed data returned from a scrape job.
 */
type FlockData = {
    flock_cases_by_state: FlockCasesByState[];
    period_summaries: Last30Days[];
    site_details: SiteDetails[];
    historical_summary: HistoricalSummary;
    status_summary: StatusTransitionSummary;
};

/**
 * Controller responsible for orchestrating web scraping operations.
 * Manages the browser lifecycle, runs the USDA scraping service,
 * and processes scraped CSV data into structured formats.
 */
class ScraperController {
    private scrapeContext!: ScraperContext;
    private closed!: boolean;

    /**
     * Creates the scraping controller with the specified configuration.
     * @param isHeadless - Whether to run the browser in headless mode.
     * @param testIdAttribute - Test ID attribute to target buttons Tableau buttons.
     * @param urlToScrape - URL pointing directly to the USDA Tableau Data Widget.
     */
    constructor(
        isHeadless: boolean,
        testIdAttribute: string,
        urlToScrape: string
    ) {
        this.scrapeContext = new ScraperContext(
            isHeadless,
            testIdAttribute,
            urlToScrape
        );
        this.closed = false;
    }

    /**
     * Initializes the browser context by setting up the Playwright browser and page.
     */
    private async initContext() {
        await this.scrapeContext.setupBrowser();
    }

    /**
     * Stops the current scrape job and closes the browser context if still open.
     */
    public async stopScrapeJob(): Promise<void> {
        if (this.closed) return;
        this.closed = true;
        await this.scrapeContext.close();
    }

    /**
     * Runs the complete scrape job: fetches all-time totals, last-30-day totals,
     * and export-to-CSV data from the USDA site, then processes each into structured FlockData.
     * @returns The fully processed flock data including cases by state, period summaries, and site details.
     */
    public async runScrapeJob(): Promise<FlockData> {
        try {
            if (
                !this.scrapeContext.getBrowser() &&
                !this.scrapeContext.getBrowser()
            ) {
                logger.info("No context has been made yet!");
                await this.initContext();
            }
            // Create the scraping service
            const usdaScrapeService = new USDAScrapingService(
                this.scrapeContext
            );
            // Get the All Time US Data for each state
            const mapComparisonCSV = await usdaScrapeService.getAllTimeTotals();
            // Get the last 30 day totals for the entire United States
            const last30DayTotalsCSVs: Last30DaysCSVs =
                await usdaScrapeService.getLast30Days();

            // Get the ExportToCsv site-level data
            const exportToCsvData =
                await usdaScrapeService.getExportToCsvData();

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

            // Process the ExportToCsv CSV
            const { site_details, historical_summary, status_summary } =
                await dataProcessor.processExportToCsvCSV(exportToCsvData);

            await this.stopScrapeJob();

            // Return the data to the client
            return {
                flock_cases_by_state: flockCasesByState,
                period_summaries: periodSummaries,
                site_details,
                historical_summary,
                status_summary,
            };
        } catch (error) {
            if (this.closed) return Promise.reject(error);
            logger.error("Error processing data: ", error);
            throw new Error(`Error processing data: ${error}`, {
                cause: error,
            });
        }
    }
}
export { ScraperController };
export type { FlockData };
