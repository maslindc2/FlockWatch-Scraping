import { CSVParser } from "./csv/csv-parser";
import { FlockCasesByStateTransformer } from "./data-transformers/flock-cases-by-state-transformer";
import { Last30DaysTransformer } from "./data-transformers/last-30-day-totals-transformer";
import { Last30DaysCSVs } from "../scraper/usda-scraping.service";
import { FlockCasesByState } from "./flock-cases-by-state.interface";
import { Last30Days } from "./last-30-days.interface";
import { logger } from "../../utils/winston-logger";

type ParseCSVConfig = {
    csvHeaders: string[];
    delimiter: string;
    startFromRow: number;
};

/**
 * This class is responsible for using the CSV headers to extract data and then transform it into an object that Flock Watch Server can store.
 * When adding new CSVs you must declare the CSV headers, filter out any empty columns, write a transformer to convert an array of data into the appropriate fields
 * required. The FlockCasesByStateTransformer serves as an excellent example of what is required for a transformer. Once done return the data.
 */
class DataProcessor {
    private async parseCSVData(
        parseConfig: ParseCSVConfig,
        csvData: any
    ): Promise<Record<string, string>[]> {
        const decoder = new TextDecoder("utf-16le");
        const csvString = decoder.decode(csvData);

        // Parse the CSV using the headers from above, the delimiter, and starting row
        const parsedData: Record<string, string>[] = CSVParser.parseCSV(
            csvString,
            parseConfig.delimiter,
            parseConfig.startFromRow,
            parseConfig.csvHeaders
        );
        return parsedData;
    }

    // Parse the CSV and assemble the data into a JS Array matching our interface, and return it
    public async processMapComparisonsCSV(
        mapComparisonCSV: any
    ): Promise<FlockCasesByState[]> {
        try {
            // Define the columns that we will be reading from
            const customHeaders: string[] = [
                "State Abbreviation",
                "State Name",
                "Backyard Flocks",
                "Birds Affected",
                "Color",
                "Commercial Flocks",
                "Last Reported Detection Text",
                "Total Flocks",
                "State Boundary",
                "State Label",
                "Latitude (generated)",
                "Longitude (generated)",
            ];

            const parseConfig: ParseCSVConfig = {
                csvHeaders: customHeaders,
                delimiter: "\t",
                startFromRow: 2,
            };

            const parsedData = await this.parseCSVData(
                parseConfig,
                mapComparisonCSV
            );

            // Filter out any data that is 0, we do not need to keep track of states that do not have any outbreaks
            const dataFiltered: Record<string, string>[] = parsedData.filter(
                (row: { [x: string]: string }) =>
                    row["State Name"]?.trim() && row["Birds Affected"] !== "0"
            );

            // Transform the data after it's been filtered to match the expected interface IFlockCasesByState
            const transformedData: FlockCasesByState[] =
                FlockCasesByStateTransformer.transformData(dataFiltered);

            logger.info("Finished processing CSVs!");

            return transformedData;
        } catch (error) {
            logger.error(`Error processing CSV Data: ${error}`);
            throw new Error(`Failed to process CSV Data: ${error}`);
        }
    }

    // Parse the CSVs required for the last 30 day totals and assemble and return the data
    public async processLast30DayTotalsCSVs(
        last30DayTotalsCSVs: Last30DaysCSVs
    ): Promise<Last30Days[]> {
        const affectedTotalsCSV = last30DayTotalsCSVs.affectedTotalsCSV;

        const affectedTotalsHeaders: string[] = [
            "1",
            "Commercial Flocks (last 30 days)",
            "Backyard Flocks (last 30 days)",
            "Birds Affected (last 30 days)",
        ];

        const affectedTotalsParseConfig: ParseCSVConfig = {
            csvHeaders: affectedTotalsHeaders,
            delimiter: "\t",
            startFromRow: 2,
        };

        // Store the processed data
        const affectedTotalsData = await this.parseCSVData(
            affectedTotalsParseConfig,
            affectedTotalsCSV
        );

        //Store the CSV for Confirmed Flocks Total
        const confirmedFlocksTotalCSV =
            last30DayTotalsCSVs.confirmedFlocksTotalCSV;

        // Decode and split the CSV strings
        // We can't use CSV Parser because this data is not in the traditional CSV style
        const decoder = new TextDecoder("utf-16le");
        const confirmedFlocksLinesDecoded = decoder.decode(
            confirmedFlocksTotalCSV
        );
        const confirmedFlocksLines = confirmedFlocksLinesDecoded
            .trim()
            .split(/\r?\n/);

        // Process the array of strings to create the confirmed flocks object
        const confirmedFlockTotals: Record<string, string> = {};
        for (const line of confirmedFlocksLines) {
            const [key, value] = line.split("\t").map((s) => s.trim());
            confirmedFlockTotals[key] = value;
        }

        // Send parsed data to transformer and then return that transformed data
        const transformedData: Last30Days = Last30DaysTransformer.transformData(
            affectedTotalsData,
            confirmedFlockTotals
        );

        return [transformedData];
    }
}
export { DataProcessor };
