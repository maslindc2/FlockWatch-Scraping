import { DataController } from "../../controllers/data.controller";
import {
    FlockData,
    ScraperController,
} from "../../controllers/scraper.controller";
import { logger } from "../../utils/winston-logger";

/**
 * Handles automatic self-updating of data. Checks if the stored data is older than 24 hours,
 * and if so, runs a new scrape job and returns the fresh data for delivery to Flock Watch Server.
 */
class SelfUpdate {
    /**
     * Checks if the stored data is outdated (older than 24h) and, if so, runs a new scrape.
     * @returns FlockData if an update was needed and completed, or void if data is current.
     */
    public async updateIfOutdated(): Promise<FlockData | void> {
        const dataController = new DataController();
        const lastDateUpdated = await dataController.getLastScrapedDate();
        if (!this.isOutdated(lastDateUpdated)) {
            return;
        }
        logger.info("DB is outdated gathering latest data!");
        const scrapeController = new ScraperController(
            true,
            "data-tb-test-id",
            process.env.SCRAPE_URL!
        );
        const flockData = await scrapeController.runScrapeJob();
        return flockData;
    }
    /**
     * Determines whether the given date string is older than 24 hours from now.
     * @param lastDate - ISO date string of the last update.
     * @returns True if the date is more than 24 hours in the past.
     */
    private isOutdated(lastDate: string): boolean {
        const now = new Date();
        const last = new Date(lastDate);
        const diffInMs = now.getTime() - last.getTime();
        return diffInMs >= 24 * 60 * 60 * 1000; // 24 hours
    }
}

export { SelfUpdate };
