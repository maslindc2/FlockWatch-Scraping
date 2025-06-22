import path from "path";
import { DataProcessor } from "../../../src/services/data-processor";
import { Logger } from "winston";
import { ReadCSV } from "../../../src/utils/csv-parser/read-csv";
import { CSVParser } from "../../../src/utils/csv-parser/csv-parser";
import { IFlockCasesByState } from "../../../src/interfaces/i-flock-cases-by-state";

describe("Data Processor Unit Test", () => {
    // Create variables for the spy instances that we will be using for these tests
    let csvParserSpy: jest.SpyInstance;

    // Set the functions to spy on and what to resolve them to
    beforeEach(() => {
        csvParserSpy = jest.spyOn(CSVParser, "parseCSV");
    });

    it("should transform the data into the correct format when data-processor is called", async () => {
        // This will be our fake CSV Data that we will return when CSVParser.parseCSV is called.
        const fakeCSVData = [
            {
                "State Abbreviation": "WI",
                "State Name": "Wisconsin",
                "Backyard Flocks": "20",
                "Birds Affected": "3,685,424",
                Color: "19",
                "Commercial Flocks": "19",
                "Last Reported Detection Text":
                    "Last reported detection 12/27/2024.",
                "Total Flocks": "39",
                "State Boundary": "MultiPolygon",
                "State Label": "",
                "Latitude (generated)": "44.947205162",
                "Longitude (generated)": "-90.336235388",
            },
        ];

        // Headers that the processor will use for Map Comparisons
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

        // Get the spy to return our fake CSV data which can then be passed into filter and transform stages
        csvParserSpy.mockReturnValue(fakeCSVData);
        
        const mockCSVData = new ArrayBuffer(1024); // Mock CSV data

        // Call data processor and store the results
        const dataProcessor = new DataProcessor(mockCSVData);

        // Call process data to get the fake data turned into the expected datatype
        const transformedData: IFlockCasesByState[] = await dataProcessor.processData();

        // Expect the csv parser to be called with a string, the delimiter, and starting row, as well as the correct column headers
        expect(csvParserSpy).toHaveBeenCalledWith(
            expect.any(String),
            "\t",
            2,
            customHeaders
        );

        // Expect the fakeCSVData to be transformed into the correct format
        expect(transformedData).toEqual([
            {
                stateAbbreviation: "WI",
                state: "Wisconsin",
                backyardFlocks: 20,
                commercialFlocks: 19,
                birdsAffected: 3685424,
                totalFlocks: 39,
                latitude: 44.947205162,
                longitude: -90.336235388,
                lastReportedDate: new Date("2024-12-27T00:00:00.000Z"),
            },
        ]);
    });
    it("should handle missing or empty data gracefully", async() => {
        // Create fake data with birds affected, backyard flocks, commercial flocks set to 0
        const fakeCSVData = [
            {
                "State Abbreviation": "TX",
                "State Name": "Texas",
                "Backyard Flocks": "0",
                "Birds Affected": "0",
                Color: "19",
                "Commercial Flocks": "0",
                "Last Reported Detection Text":
                    "Last reported detection 12/27/2024.",
                "Total Flocks": "0",
                "State Boundary": "MultiPolygon",
                "State Label": "",
                "Latitude (generated)": "31.13037444",
                "Longitude (generated)": "-98.63463882",
            },
        ];
        // Return the fake data when our parse function is called
        csvParserSpy.mockReturnValue(fakeCSVData);
        // create an ArrayBuffer as DataProcessor requires one
        const mockCSVData = new ArrayBuffer(1024); 
        // Call data processor and store the results
        const dataProcessor = new DataProcessor(mockCSVData);
        // Get the transformed data back, since we provided 0 for birds affected, backyard flocks, commercial flocks we end up filtering this state out
        const transformedData: IFlockCasesByState[] = await dataProcessor.processData();
        // Expect the array to be empty as there is no data for that state.
        expect(transformedData.length).toBe(0);
    });
    it("should throw error when CSV parsing fails", async() => {
        csvParserSpy.mockImplementation(() => {
            throw new Error("CSV Processing Failed!");
        });
        const dataProcessor = new DataProcessor(new ArrayBuffer(1024));
        await expect(dataProcessor.processData()).rejects.toThrow("Failed to process CSV Data: Error: CSV Processing Failed!");
    });
    afterEach(() => {
        csvParserSpy.mockRestore();
    });
});
