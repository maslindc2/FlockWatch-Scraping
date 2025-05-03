import path from "path";
import { ReadCSV } from "../utils/csv-parser/read-csv";
import { CSVParser } from "../utils/csv-parser/csv-parser";
import { FlockCasesByStateTransformer } from "../utils/csv-parser/transformers/flock-cases-by-state-transformer";
import { IFlockCasesByState } from "../interfaces/i-flock-cases-by-state";
import { logger } from "../utils/winston-logger";

/**
 * This class is responsible for using the CSV headers to extract data and then transform it into an object that Flock Watch Server can store.
 * When adding new CSVs you must declare the CSV headers, filter out any empty columns, write a transformer to convert an array of data into the appropriate fields
 * required. The FlockCasesByStateTransformer serves as an excellent example of what is required for a transformer. Once done return the data.
 */
class DataProcessor {
    // Parse the CSVs, assemble the data into a JS Array matching our interface, and return it
    public async processData(): Promise<IFlockCasesByState[]> {
        try {
            // Map Comparisons.csv for Chickens contains all necessary data, we only need this CSV
            const csvFilePath: string = path.resolve(
                __dirname,
                "../../data/Map Comparisons.csv"
            );
            // Log what file we are parsing
            logger.silly(`Parsing CSV File at ${csvFilePath}`);

            // Read the csv file from the path we provided. USDA uses UTF-16le format not the typical UTF-8
            const csvData: string = await ReadCSV.readCSVFile(csvFilePath, "utf-16le");
            
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
                "Longitude (generated)"
            ];
            // Parse the CSV using the headers from above
            const parsedData: Record<string, string> [] = CSVParser.parseCSV(csvData, "\t", 2, customHeaders)
            // Filter out any data that is 0, we do not need to keep track of states that do not have any outbreaks
            const dataFiltered: Record<string, string>[] = parsedData.filter((row: { [x: string]: string }) => row["State Name"]?.trim() && row["Birds Affected"] !== "0");
            // Transform the data after it's been filtered to match the expected interface IFlockCasesByState
            const transformedData: IFlockCasesByState[] = FlockCasesByStateTransformer.transformData(dataFiltered);
            logger.info("Finished processing CSVs!")
            return transformedData
        } catch (error) {
            logger.error(`Error processing CSV Data: ${error}`)
            throw new Error(`Error processing CSV Data: ${error}`);
        }
    }
}
export {DataProcessor}