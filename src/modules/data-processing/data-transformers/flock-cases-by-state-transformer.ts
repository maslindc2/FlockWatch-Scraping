import { logger } from "../../../utils/winston-logger";
import { FlockCasesByState } from "../flock-cases-by-state.interface";

/**
 * Flock Watch uses transformers to transform an array of data into the fields and datatype required for a particular model.
 * Each species will require it's own transformer of course as USDA structures the data differently for each species.
 */
class FlockCasesByStateTransformer {
    /**
     * Transform data's responsibility is to transform the data we extracted from the Map Comparisons.csv
     * into the structure needed for our Flock Cases by state model.
     * @param parsedData: Record containing the column and the value
     * @returns: Structured object for our Flock Watch Server to update the models, is of type IFlockCases
     */
    public static transformData(
        parsedData: Record<string, string>[]
    ): FlockCasesByState[] {
        const transformedData: FlockCasesByState[] = [];
        parsedData.forEach((row, index) => {
            try {
                // Define the JS object that each state's fields will contain
                const {
                    ["State Abbreviation"]: state_abbreviation,
                    ["State Name"]: state,
                    ["Backyard Flocks"]: backyard_flocks_str,
                    ["Commercial Flocks"]: commercial_flocks_str,
                    ["Birds Affected"]: birds_affected_str,
                    ["Total Flocks"]: total_flocks_str,
                    ["Latitude (generated)"]: latitude_str,
                    ["Longitude (generated)"]: longitude_str,
                    ["Last Reported Detection Text"]:
                        last_reported_detection_str,
                } = row;

                // Check to make sure all of the required fields have been extracted and that they exist
                if (!state_abbreviation)
                    throw new Error("Missing State Abbreviation");
                if (!state) throw new Error("Missing State Name");
                if (!backyard_flocks_str)
                    throw new Error("Missing Backyard Flocks");
                if (!commercial_flocks_str)
                    throw new Error("Missing Commercial Flocks");
                if (!birds_affected_str)
                    throw new Error("Missing Birds Affected");
                if (!total_flocks_str) throw new Error("Missing Total Flocks");
                if (!latitude_str) throw new Error("Missing Latitude");
                if (!longitude_str) throw new Error("Missing Longitude");
                if (!last_reported_detection_str)
                    throw new Error("Missing Last Reported Detection Text");

                // Parse the fields into the expected data type
                const backyard_flocks = Number(
                    backyard_flocks_str.replace(/,/g, "")
                );
                const commercial_flocks = Number(
                    commercial_flocks_str.replace(/,/g, "")
                );
                const birds_affected = Number(
                    birds_affected_str.replace(/,/g, "")
                );
                const total_flocks = Number(total_flocks_str.replace(/,/g, ""));
                const latitude = parseFloat(latitude_str);
                const longitude = parseFloat(longitude_str);

                // If we failed to parse any of the above fields correctly and instead got NaN throw an error
                if (isNaN(backyard_flocks))
                    throw new Error("Invalid Backyard Flocks number");
                if (isNaN(commercial_flocks))
                    throw new Error("Invalid Commercial Flocks number");
                if (isNaN(birds_affected))
                    throw new Error("Invalid Birds Affected number");
                if (isNaN(total_flocks))
                    throw new Error("Invalid Total Flocks number");
                if (isNaN(latitude)) throw new Error("Invalid Latitude");
                if (isNaN(longitude)) throw new Error("Invalid Longitude");

                // Remove the last reported detect an restructure it to convert to JS's Date datatype
                const last_reported_detection = this.extractDate(
                    last_reported_detection_str
                );

                // Push all the values onto our JS object
                transformedData.push({
                    state_abbreviation,
                    state,
                    backyard_flocks,
                    commercial_flocks,
                    birds_affected,
                    total_flocks,
                    latitude,
                    longitude,
                    last_reported_detection,
                });
            } catch (error) {
                logger.error(
                    `Error transforming row ${index}: ${(error as Error).message}`
                );
                throw new Error(
                    `Data transformation failed at row ${index}: ${(error as Error).message}`
                );
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

        const [, monthStr, dayStr, yearStr] = match.map(Number);
        const month = Number(monthStr);
        const day = Number(dayStr);
        const year = Number(yearStr);

        const date = new Date(Date.UTC(year, month - 1, day));

        if (
            date.getUTCFullYear() !== year ||
            date.getUTCMonth() + 1 !== month ||
            date.getUTCDate() !== day
        ) {
            logger.error(`Invalid date value for ${dateAsString}`);
            throw new Error(`Invalid date value: ${dateAsString}`);
        }

        return date;
    }
}

export { FlockCasesByStateTransformer };
