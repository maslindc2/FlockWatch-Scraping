import * as Mongoose from "mongoose";
import { LastReportDate } from "./last-report-date.interface";

/**
 * This model is used for scheduling scrape jobs currently USDA updates weekdays by 12 pm eastern time.
 * We can use lastScrapeDate to determine if the scrapers need to run or not
 * currentUpdateTime will store the USDA update time in this case 12PM EST
 */
class LastReportDateModel {
    private static schema = new Mongoose.Schema<LastReportDate>(
        {
            last_scraped_date: Date,
            auth_id: String,
        },
        { collection: "last-report-date" }
    );

    public static getModel = Mongoose.model<LastReportDate>(
        "last-report-date",
        this.schema
    );
}

export { LastReportDateModel };
