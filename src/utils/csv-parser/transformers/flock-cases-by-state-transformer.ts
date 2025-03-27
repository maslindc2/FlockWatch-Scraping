import { IFlockCasesTransformed } from "../../../interfaces/i-flock-cases-transformed";
import { logger } from "../../winston-logger";

/**
 * Flock Watch uses transformers to transform an array of data into the fields and datatype required for a particular model.
 * Each species will require it's own transformer of course as USDA structures the data differently for each species.
 */
class FlockCasesByStateTransformer
{
    public static transformData(parsedData: Record<string, string>[]): IFlockCasesTransformed[] {
        const transformData: IFlockCasesTransformed[] = [];
        parsedData.map((row, index) => {
            try {
                if (!row["State Abbreviation"] || !row["State Name"] || !row["Backyard Flocks"] || !row["Birds Affected"] || !row["Commercial Flocks"] || !row["Total Flocks"] || !row["Latitude (generated)"] || !row["Longitude (generated)"] || !row["Last Reported Detection Text"]) {
                    logger.error(`Missing required field(s) in row ${index}`);
                    throw new Error(`Missing required field(s) in row ${index}. The parsed data is missing a required field in ${parsedData}`);
                }
                const transFormedRow: IFlockCasesTransformed =  {
                    stateAbbreviation: row["State Abbreviation"],
                    state: row["State Name"],
                    backyardFlocks:
                        Number(row["Backyard Flocks"].replace(/,/g, "")) || 0,
                    commercialFlocks:
                        Number(row["Commercial Flocks"].replace(/,/g, "")) || 0,
                    birdsAffected:
                        Number(row["Birds Affected"].replace(/,/g, "")) || 0,
                    totalFlocks:
                        Number(row["Total Flocks"].replace(/,/g, "")) || 0,
                    latitude: parseFloat(row["Latitude (generated)"]),
                    longitude: parseFloat(row["Longitude (generated)"]),
                    lastReportedDate: this.extractDate(
                        row["Last Reported Detection Text"]
                    ),
                };
                transformData.push(transFormedRow);
            } catch (error) {
                logger.error(`Error transforming row at ${index}: ${error}`);
                throw new Error(`Error transforming row at ${index} is either incomplete or invalid. Stopping Data Processing!`);
            }
            
        });
        return transformData;
    }
    /**
     * This takes in a string like "Last reported detection 1/30/2025." and converts it to 1/30/2025
     * then we restructure it to pass to JavaScript's Date datatype and create a JavaScript Date
     * @param dateAsString Takes in a string containing the date.
     * @returns Converts the date into a JavaScript Date Object
     */
    private static extractDate(dateAsString: string): Date {
        const match = dateAsString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    
        if (!match) {
            logger.error(`Date ${dateAsString} did not match the Date REGEX!`);
            throw new Error(`Invalid date format: ${dateAsString}`);
        }
    
        const [, month, day, year] = match.map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
    
        if (isNaN(date.getTime())) {
            logger.error(`Invalid date value for ${dateAsString}`);
            throw new Error(`Invalid date value: ${dateAsString}`);
        }
    
        return date;
    }
}

export{FlockCasesByStateTransformer}