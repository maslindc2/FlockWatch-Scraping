import path from "path";
import { ReadCSV } from "../utils/csv-parser/read-csv";
import { CSVParser } from "../utils/csv-parser/csv-parser";
import { FlockCasesByStateTransformer } from "../utils/csv-parser/transformers/flock-cases-by-state-transformer";
import { logger } from "../utils/winston-logger";

class DataProcessor {
    public async processData() {
        try {
            const csvFilePath = path.resolve(
                __dirname,
                "../../data/Map Comparisons.csv"
            );
            logger.silly(`Parsing CSV File at ${csvFilePath}`);
            const csvData = ReadCSV.readCSVFile(csvFilePath, "utf-16le")
            const customHeaders = [
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
                "Longitude (generated)"
            ];
            const parsedData = CSVParser.parseCSV(csvData, "\t", 2, customHeaders)
            const dataFiltered = parsedData.filter((row: { [x: string]: string }) => row["State Name"]?.trim() && row["Birds Affected"] !== "0");
            const transformedData = FlockCasesByStateTransformer.transformData(dataFiltered);
            return transformedData
        } catch (error) {
            logger.error(`Error processing CSV Data: ${error}`)
            throw new Error(`Error processing CSV Data: ${error}`);
        }
    }
}
export {DataProcessor}