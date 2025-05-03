import fs from "fs/promises";
import { logger } from "../winston-logger";

export class ReadCSV {
    /**
     * Use FS to read a file synchronously and output the raw data
     * @param filePath takes in the file path as type string uses the path library to resolve the path
     * @param fileEncoding only accepts BufferEncoding options for the file's encoding
     * @throws Throws error if the file is missing or does not exist
     * @returns raw data from the csv file, pass this to the parseCSV function
     */
    public static async readCSVFile(
        filePath: string,
        fileEncoding: BufferEncoding
    ): Promise<string> {
        try {
            const data = await fs.readFile(filePath, {
                encoding: fileEncoding,
            });
            return data;
        } catch (error) {
            logger.error(`Error reading CSV File at ${filePath}`);
            logger.error(error);
            return "";
        }
    }
}
