import { LastReportDateService } from "../modules/last-report-date/last-report-date.service";
import { logger } from "../utils/winston-logger";

class DataController {
    private lastReportDateService: LastReportDateService;
    constructor() {
        this.lastReportDateService = new LastReportDateService();
    }
    // get the auth ID from our last report date service and return a promise of type string
    public async getServerAuthID(): Promise<string> {
        try {
            const data = await this.lastReportDateService.getAuthID();
            return data!.auth_id;
        } catch (error) {
            logger.error(`Error fetching Auth ID: ${error}`);
            return "";
        }
    }
    public async getLastScrapedDate(): Promise<string> {
        try {
            const data = await this.lastReportDateService.getLastScrapedDate();
            if (!data) {
                throw new Error("Last Scraped Date not found!");
            }
            const date = data.last_scraped_date;
            if (!date) {
                throw new Error(
                    "Last Scraped Date document exists but no date field!"
                );
            }
            return String(date);
        } catch (error) {
            logger.error(`Error fetching Last Scraped Date: ${error}`);
            throw error;
        }
    }
}
export { DataController };
