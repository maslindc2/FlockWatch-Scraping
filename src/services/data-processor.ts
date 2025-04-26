import path from "path";
import { ReadCSV } from "../utils/csv-parser/read-csv";
import { CSVParser } from "../utils/csv-parser/csv-parser";
import { FlockCasesByStateTransformer } from "../utils/csv-parser/transformers/flock-cases-by-state-transformer";
import { IFlockCasesByState } from "../interfaces/i-flock-cases-by-state";
import { logger } from "../utils/winston-logger";

class DataProcessor {
    public async processData(): Promise<IFlockCasesByState[]> {
        try {
            const csvFilePath: string = path.resolve(
                __dirname,
                "../../data/Map Comparisons.csv"
            );
            logger.silly(`Parsing CSV File at ${csvFilePath}`);

            const csvData: string = ReadCSV.readCSVFile(csvFilePath, "utf-16le")
            
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
            
            const parsedData: Record<string, string> [] = CSVParser.parseCSV(csvData, "\t", 2, customHeaders)
            
            const dataFiltered: Record<string, string>[] = parsedData.filter((row: { [x: string]: string }) => row["State Name"]?.trim() && row["Birds Affected"] !== "0");
            
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