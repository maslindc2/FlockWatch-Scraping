import { LastReportDateService } from "../modules/last-report-date/last-report-date.service";
import { logger } from "../utils/winston-logger";

/**
 * Handles data-related operations by delegating to the LastReportDateService.
 * Provides methods for retrieving the server auth ID and last scraped date from MongoDB.
 */
class DataController {
    private lastReportDateService: LastReportDateService;
    constructor() {
        this.lastReportDateService = new LastReportDateService();
    }
    /**
     * Retrieves the auth ID from the last report date service.
     * @returns A promise resolving to the auth ID string, or empty string on failure.
     */
    public async getServerAuthID(): Promise<string> {
        try {
            const data = await this.lastReportDateService.getAuthID();
            return data!.auth_id;
        } catch (error) {
            logger.error(`Error fetching Auth ID: ${error}`);
            return "";
        }
    }
    /**
     * Retrieves the last scraped date from MongoDB via LastReportDateService.
     * @returns A promise resolving to the date string.
     * @throws If the date document or date field is missing.
     */
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
