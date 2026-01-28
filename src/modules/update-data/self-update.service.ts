import { DataController } from "../../controllers/data.controller"
import { FlockData, ScraperController } from "../../controllers/scraper.controller";
import { logger } from "../../utils/winston-logger";

class SelfUpdate {
    public async updateIfOutdated(): Promise<FlockData | void> {
        const dataController = new DataController();
        const lastDateUpdated = await dataController.getLastScrapedDate();
        if(!this.isOutdated(lastDateUpdated)){
            return;
        }
        logger.info("DB is outdated gathering latest data!");
        const scrapeController = new ScraperController(true, "data-tb-test-id", process.env.SCRAPE_URL!);
        const flockData = await scrapeController.runScrapeJob();
        return flockData;
    }
    private isOutdated(lastDate: string): boolean {
        const now = new Date();
        const last = new Date(lastDate);
        const diffInMs = now.getTime() - last.getTime();
        return diffInMs >= 24 * 60 * 60 * 1000; // 24 hours
    }
}

export {SelfUpdate}