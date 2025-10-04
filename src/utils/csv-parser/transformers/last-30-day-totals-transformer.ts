import { ILast30Days } from "../../../interfaces/i-last-30-days-stats";
import { logger } from "../../winston-logger";

/**
 * Transforms the 30-day summary data from the USDA CSVs into
 * a structured object for use in the Flock Watch server models.
 */
class Last30DaysTransformer {
    /**
     * Transform data’s responsibility is to take the affectedTotalsData and confirmedFlockTotals
     * and extract the (last 30 days) values into an ILast30Days object.
     * @param affectedTotalsData Array of records parsed from the Affected Totals CSV
     * @param confirmedFlockTotals Object parsed from the Confirmed Flock Totals CSV
     * @returns Structured ILast30Days object
     */
    public static transformData(
        affectedTotalsData: Record<string, string>[],
        confirmedFlockTotals: Record<string, string>
    ): ILast30Days {
        try {
            if (!affectedTotalsData?.length) {
                throw new Error("Missing affectedTotalsData");
            }

            if (!confirmedFlockTotals) {
                throw new Error("Missing confirmedFlockTotals");
            }

            const affectedTotals = affectedTotalsData[0];

            const birdsAffectedStr =
                affectedTotals["Birds Affected (last 30 days)"];
            const totalFlocksStr =
                confirmedFlockTotals["Total Flocks (last 30 days)"];
            const backyardFlocksStr =
                affectedTotals["Backyard Flocks (last 30 days)"];
            const commercialFlocksStr =
                affectedTotals["Commercial Flocks (last 30 days)"];

            if (!birdsAffectedStr)
                throw new Error("Missing Birds Affected (last 30 days)");
            if (!totalFlocksStr)
                throw new Error("Missing Total Flocks (last 30 days)");
            if (!backyardFlocksStr)
                throw new Error("Missing Backyard Flocks (last 30 days)");
            if (!commercialFlocksStr)
                throw new Error("Missing Commercial Flocks (last 30 days)");

            const totalBirdsAffected = this.parseNumber(birdsAffectedStr);
            const totalFlocksAffected = this.parseNumber(totalFlocksStr);
            const totalBackyardFlocksAffected =
                this.parseNumber(backyardFlocksStr);
            const totalCommercialFlocksAffected =
                this.parseNumber(commercialFlocksStr);

            if (isNaN(totalBirdsAffected))
                throw new Error("Invalid Birds Affected number");
            if (isNaN(totalFlocksAffected))
                throw new Error("Invalid Total Flocks number");
            if (isNaN(totalBackyardFlocksAffected))
                throw new Error("Invalid Backyard Flocks number");
            if (isNaN(totalCommercialFlocksAffected))
                throw new Error("Invalid Commercial Flocks number");

            return {
                totalBirdsAffected,
                totalFlocksAffected,
                totalBackyardFlocksAffected,
                totalCommercialFlocksAffected,
            };
        } catch (error) {
            logger.error(
                `Error transforming 30-day data: ${(error as Error).message}`
            );
            throw new Error(
                `30-day data transformation failed: ${(error as Error).message}`
            );
        }
    }

    /**
     * Parses a string into a number, handling commas and suffixes like M (millions) or K (thousands)
     * @param value String value to parse
     * @returns Parsed numeric value
     */
    private static parseNumber(value: string): number {
        if (!value) return 0;
        const trimmed = value.trim().toUpperCase();

        if (trimmed.endsWith("M")) {
            return parseFloat(trimmed.replace("M", "")) * 1_000_000;
        } else if (trimmed.endsWith("K")) {
            return parseFloat(trimmed.replace("K", "")) * 1_000;
        } else {
            return parseFloat(trimmed.replace(/,/g, "")) || 0;
        }
    }
}

export { Last30DaysTransformer };
