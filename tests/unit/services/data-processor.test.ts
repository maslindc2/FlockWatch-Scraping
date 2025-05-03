import path from "path";
import {DataProcessor} from "../../../src/services/data-processor";
import { Logger } from "winston";
import { ReadCSV } from "../../../src/utils/csv-parser/read-csv";
import { CSVParser } from "../../../src/utils/csv-parser/csv-parser";
import { IFlockCasesByState } from "../../../src/interfaces/i-flock-cases-by-state";

describe("Data Processor Unit Test", () => {
    // Create variables for the spy instances that we will be using for these tests
    let pathResolveMock: jest.MockInstance<string, string[], any>;
    let readCSVFileSpy: jest.SpyInstance<ReadCSV>;
    let csvParserSpy: jest.SpyInstance<CSVParser>;

    // Set the functions to spy on and what to resolve them to
    beforeEach(() => {
        pathResolveMock = jest.fn(path.resolve).mockReturnValue("");
        readCSVFileSpy = jest.spyOn(ReadCSV, "readCSVFile");
        csvParserSpy = jest.spyOn(CSVParser, "parseCSV");
    });
    it("should transform the data into the correct format when data-processor is called", async () => {
        // This will be our fake CSV Data that we will return when CSVParser.parseCSV is called.
        const fakeCSVData = [{
            'State Abbreviation': 'WI',
            'State Name': 'Wisconsin',
            'Backyard Flocks': '20',
            'Birds Affected': '3,685,424',
            Color: '19',
            'Commercial Flocks': '19',
            'Last Reported Detection Text': 'Last reported detection 12/27/2024.',
            'Total Flocks': '39',
            'State Boundary': 'MultiPolygon',
            'State Label': '',
            'Latitude (generated)': '44.947205162',
            'Longitude (generated)': '-90.336235388'
        }];
        
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
            "Longitude (generated)"
        ];

        // Mock read csv file to return empty data to avoid file not found issues
        readCSVFileSpy.mockReturnValue("");

        // Get the spy to return our fake CSV data which can then be passed into filter and transform stages
        csvParserSpy.mockReturnValue(fakeCSVData);
        // Call data processor and store the results
        const dataProcessor = new DataProcessor();
        
        const res:IFlockCasesByState[] = await dataProcessor.processData();

        // Expect the ReadCSV.readCSVFile to be called with a path that ends with /data/Map Comparisons.csv, and the correct format
        expect(readCSVFileSpy).toHaveBeenCalledWith(expect.stringMatching(/[/\\]data[/\\]Map Comparisons\.csv$/), "utf-16le");
        
        // Expect the csv parser to be called with a string, the delimiter, and starting row, as well as the correct column headers
        expect(csvParserSpy).toHaveBeenCalledWith(expect.any(String), "\t", 2, customHeaders);
        
        // Expect the fakeCSVData to be transformed into the correct format
        expect(res).toEqual([
            {
              stateAbbreviation: 'WI',
              state: 'Wisconsin',
              backyardFlocks: 20,
              commercialFlocks: 19,
              birdsAffected: 3685424,
              totalFlocks: 39,
              latitude: 44.947205162,
              longitude: -90.336235388,
              lastReportedDate: new Date("2024-12-27T00:00:00.000Z")
            }
        ]);
    })
    afterEach(() => {
        pathResolveMock.mockRestore();
        readCSVFileSpy.mockRestore();
        csvParserSpy.mockRestore();
    });
});