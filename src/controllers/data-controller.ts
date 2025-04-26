import { LastReportDateService } from "../services/model-services/last-report-date-service";
import { logger } from "../utils/winston-logger";

class DataController {
    private lastReportDateService: LastReportDateService;

    constructor() {
        this.lastReportDateService = new LastReportDateService();
    }

    public async getServerAuthID(): Promise<string> {
        try {
            const data = await this.lastReportDateService.getAuthID();
            return data!.authID;
        } catch (error) {
            logger.error(`Error fetching Last Report Date: ${error}`);
            return "";
        }
    }
}
export { DataController };