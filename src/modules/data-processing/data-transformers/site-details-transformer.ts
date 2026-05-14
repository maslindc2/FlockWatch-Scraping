import { logger } from "../../../utils/winston-logger";
import {
    SiteDetails,
    HistoricalSummary,
    StatusTransitionSummary,
} from "../site-details.interface";

class SiteDetailsTransformer {
    public static transformData(parsedData: Record<string, string>[]): {
        site_details: SiteDetails[];
        historical_summary: HistoricalSummary;
        status_summary: StatusTransitionSummary;
    } {
        const siteDetails: SiteDetails[] = [];

        parsedData.forEach((row, index) => {
            try {
                const {
                    ["Special ID"]: special_id,
                    ["County Name"]: county,
                    ["State"]: state,
                    ["Production"]: production_type,
                    ["Confirmed Diagnosis"]: confirmed_diagnosis_str,
                    ["Control Area Released"]: status_value,
                    ["Birds Affected"]: birds_affected_str,
                } = row;

                if (!special_id) throw new Error("Missing Special ID");
                if (!county) throw new Error("Missing County Name");
                if (!state) throw new Error("Missing State");
                if (!production_type) throw new Error("Missing Production");
                if (!confirmed_diagnosis_str)
                    throw new Error("Missing Confirmed Diagnosis");
                if (!birds_affected_str)
                    throw new Error("Missing Birds Affected");

                // Skip header-leakage row
                if (status_value === "Control Area Released") {
                    return;
                }

                const confirmed_diagnosis_date = this.parseDDMonYY(
                    confirmed_diagnosis_str
                );

                const { status, releasedDate } = this.parseStatus(status_value);

                const birds_affected = Number(
                    birds_affected_str.replace(/,/g, "")
                );

                if (isNaN(birds_affected))
                    throw new Error("Invalid Birds Affected number");

                siteDetails.push({
                    special_id: special_id.trim(),
                    county: county.trim(),
                    state: state.trim(),
                    production_type: production_type.trim(),
                    confirmed_diagnosis_date,
                    status,
                    control_area_released_date: releasedDate,
                    birds_affected,
                });
            } catch (error) {
                logger.error(
                    `Error transforming row ${index}: ${(error as Error).message}`
                );
                throw new Error(
                    `Data transformation failed at row ${index}: ${(error as Error).message}`,
                    { cause: error }
                );
            }
        });

        const historical_summary = this.computeHistoricalSummary(siteDetails);
        const status_summary = this.computeStatusTransitionSummary(siteDetails);

        return {
            site_details: siteDetails,
            historical_summary,
            status_summary,
        };
    }

    private static parseDDMonYY(dateStr: string): Date {
        const monthMap: Record<string, number> = {
            Jan: 0,
            Feb: 1,
            Mar: 2,
            Apr: 3,
            May: 4,
            Jun: 5,
            Jul: 6,
            Aug: 7,
            Sep: 8,
            Oct: 9,
            Nov: 10,
            Dec: 11,
        };

        const trimmed = dateStr.trim();
        const match = trimmed.match(/^(\d{2})-(\w{3})-(\d{2})$/);

        if (!match) {
            logger.error(`Date ${dateStr} did not match the DD-Mon-YY REGEX!`);
            throw new Error(`Invalid date format: ${dateStr}`);
        }

        const day = parseInt(match[1], 10);
        const monthAbbr = match[2];
        const month = monthMap[monthAbbr];

        if (month === undefined) {
            logger.error(`Invalid month abbreviation: ${monthAbbr}`);
            throw new Error(`Invalid month abbreviation: ${monthAbbr}`);
        }

        const yearShort = parseInt(match[3], 10);
        const year = 2000 + yearShort;

        const date = new Date(Date.UTC(year, month, day));

        if (
            date.getUTCFullYear() !== year ||
            date.getUTCMonth() !== month ||
            date.getUTCDate() !== day
        ) {
            logger.error(`Invalid date value for ${dateStr}`);
            throw new Error(`Invalid date value: ${dateStr}`);
        }

        return date;
    }

    private static parseStatus(value: string): {
        status: "active" | "released" | "na";
        releasedDate?: Date;
    } {
        const trimmed = value.trim();

        if (trimmed === "Active") {
            return { status: "active" };
        }

        if (trimmed === "NA") {
            return { status: "na" };
        }

        try {
            const date = this.parseDDMonYY(trimmed);
            return { status: "released", releasedDate: date };
        } catch {
            logger.error(`Invalid Control Area Released value: ${trimmed}`);
            throw new Error(`Invalid Control Area Released value: ${trimmed}`);
        }
    }

    private static computeHistoricalSummary(
        siteDetails: SiteDetails[]
    ): HistoricalSummary {
        let total_birds_affected_all_time = 0;
        let total_active_sites = 0;
        let total_released_sites = 0;
        let total_na_sites = 0;
        let total_birds_active = 0;

        for (const site of siteDetails) {
            total_birds_affected_all_time += site.birds_affected;

            switch (site.status) {
                case "active":
                    total_active_sites++;
                    total_birds_active += site.birds_affected;
                    break;
                case "released":
                    total_released_sites++;
                    break;
                case "na":
                    total_na_sites++;
                    break;
            }
        }

        return {
            total_birds_affected_all_time,
            total_sites_all_time: siteDetails.length,
            total_active_sites,
            total_released_sites,
            total_na_sites,
            total_birds_active,
        };
    }

    private static computeStatusTransitionSummary(
        siteDetails: SiteDetails[]
    ): StatusTransitionSummary {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let sites_confirmed_last_30_days = 0;
        let sites_released_last_30_days = 0;
        let birds_affected_last_30_days = 0;

        for (const site of siteDetails) {
            const confirmedDate = site.confirmed_diagnosis_date;

            if (confirmedDate >= thirtyDaysAgo) {
                sites_confirmed_last_30_days++;
                birds_affected_last_30_days += site.birds_affected;
            }

            if (
                site.status === "released" &&
                site.control_area_released_date &&
                site.control_area_released_date >= thirtyDaysAgo
            ) {
                sites_released_last_30_days++;
            }
        }

        return {
            sites_confirmed_last_30_days,
            sites_released_last_30_days,
            birds_affected_last_30_days,
        };
    }
}

export { SiteDetailsTransformer };
