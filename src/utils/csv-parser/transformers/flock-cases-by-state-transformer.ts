import { IFlockCasesByState } from "../../../interfaces/i-flock-cases-by-state";
import { logger } from "../../winston-logger";

/**
 * Flock Watch uses transformers to transform an array of data into the fields and datatype required for a particular model.
 * Each species will require it's own transformer of course as USDA structures the data differently for each species.
 */
class FlockCasesByStateTransformer
{
    /**
     * Transform data's responsibility is to transform the data we extracted from the Map Comparisons.csv 
     * into the structure needed for our Flock Cases by state model.
     * @param parsedData: Record containing the column and the value
     * @returns: Structured object for our Flock Watch Server to update the models, is of type IFlockCases
     */
    public static transformData(parsedData: Record<string, string>[]): IFlockCasesByState[] {
        const transformedData: IFlockCasesByState[] = [];
        parsedData.forEach((row, index) => {
            try {
                // Define the JS object that each state's fields will contain
                const {
                    ["State Abbreviation"]: stateAbbreviation,
                    ["State Name"]: state,
                    ["Backyard Flocks"]: backyardFlocksStr,
                    ["Commercial Flocks"]: commercialFlocksStr,
                    ["Birds Affected"]: birdsAffectedStr,
                    ["Total Flocks"]: totalFlocksStr,
                    ["Latitude (generated)"]: latitudeStr,
                    ["Longitude (generated)"]: longitudeStr,
                    ["Last Reported Detection Text"]: lastReportedDetectionStr
                } = row;

                // Check to make sure all of the required fields have been extracted and that they exist
                if (!stateAbbreviation) throw new Error("Missing State Abbreviation");
                if (!state) throw new Error("Missing State Name");
                if (!backyardFlocksStr) throw new Error("Missing Backyard Flocks");
                if (!commercialFlocksStr) throw new Error("Missing Commercial Flocks");
                if (!birdsAffectedStr) throw new Error("Missing Birds Affected");
                if (!totalFlocksStr) throw new Error("Missing Total Flocks");
                if (!latitudeStr) throw new Error("Missing Latitude");
                if (!longitudeStr) throw new Error("Missing Longitude");
                if (!lastReportedDetectionStr) throw new Error("Missing Last Reported Detection Text");

                // Parse the fields into the expected data type
                const backyardFlocks = Number(backyardFlocksStr.replace(/,/g, ""));
                const commercialFlocks = Number(commercialFlocksStr.replace(/,/g, ""));
                const birdsAffected = Number(birdsAffectedStr.replace(/,/g, ""));
                const totalFlocks = Number(totalFlocksStr.replace(/,/g, ""));
                const latitude = parseFloat(latitudeStr);
                const longitude = parseFloat(longitudeStr);

                // If we failed to parse any of the above fields correctly and instead got NaN throw an error
                if (isNaN(backyardFlocks)) throw new Error("Invalid Backyard Flocks number");
                if (isNaN(commercialFlocks)) throw new Error("Invalid Commercial Flocks number");
                if (isNaN(birdsAffected)) throw new Error("Invalid Birds Affected number");
                if (isNaN(totalFlocks)) throw new Error("Invalid Total Flocks number");
                if (isNaN(latitude)) throw new Error("Invalid Latitude");
                if (isNaN(longitude)) throw new Error("Invalid Longitude");
                
                // Remove the last reported detect an restructure it to convert to JS's Date datatype
                const lastReportedDate = this.extractDate(lastReportedDetectionStr);
                // If we cannot convert the date correctly throw an error
                if (!lastReportedDate) throw new Error("Failed to extract last reported date");

                // Push all the values onto our JS object 
                transformedData.push({
                    stateAbbreviation,
                    state,
                    backyardFlocks,
                    commercialFlocks,
                    birdsAffected,
                    totalFlocks,
                    latitude,
                    longitude,
                    lastReportedDate,
                });
            } catch (error) {
                logger.error(`Error transforming row ${index}: ${(error as Error).message}`);
                throw new Error(`Data transformation failed at row ${index}: ${(error as Error).message}`);
            }
        });
        // Return the object
        return transformedData;
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