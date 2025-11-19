import { LastReportDateModel } from "./last-report-date.model";

class LastReportDateService {
    // This will query the last report date model and only return the last scraped date field
    public async getLastScrapedDate() {
        return LastReportDateModel.getModel
            .findOne({ last_scraped_date: { $exists: true } })
            .select("-_id -__v -auth_id")
            .lean();
    }
    // Only get the authID
    public async getAuthID() {
        return LastReportDateModel.getModel
            .findOne({ auth_id: { $exists: true } })
            .select("-_id -__v -last_scraped_date")
            .lean();
    }
    /**
     * On server start this will be executed, if the mongoDB is being created for the first time
     * This will create an entry with the date last scraped, scrape frequency, and auth id.
     */
    public async initializeLastReportDate() {
        const existingRecord = await LastReportDateModel.getModel
            .findOne()
            .lean();
        if (!existingRecord) {
            const modelObj = {
                last_scraped_date: new Date(),
                auth_id: crypto.randomUUID(),
            };
            return await LastReportDateModel.getModel.create(modelObj);
        } else {
            return existingRecord;
        }
    }
}
export { LastReportDateService };
