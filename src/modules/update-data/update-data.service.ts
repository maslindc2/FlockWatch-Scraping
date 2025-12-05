import { DataController } from "../../controllers/data.controller"
import { FlockData, ScraperController } from "../../controllers/scraper.controller";

class UpdateData {
    public async syncIfOutdated(): Promise<FlockData | void> {
        const dataController = new DataController();
        const lastDateUpdated = await dataController.getLastScrapedDate();
        if(!this.isOutdated(lastDateUpdated)){
            return;    
        }
        const controller = new ScraperController();
        const flockData = await controller.runScrapeJob();
        return flockData;
    }
    private isOutdated(lastDate: string): boolean {
        const now = new Date();
        const last = new Date(lastDate);
        const diffInMs = now.getTime() - last.getTime();
        return diffInMs >= 24 * 60 * 60 * 1000; // 24 hours
    }
}

export {UpdateData}