import { IFlockCasesByState } from "../../../src/interfaces/i-flock-cases-by-state";
import { logger } from "../../../src/utils/winston-logger";
import { FlockCasesByStateTransformer } from "../../../src/utils/csv-parser/transformers/flock-cases-by-state-transformer";

describe("Flock Cases By State Transformer Unit Tests", () => {
    it("should transform fake CSV data into the expected IFlockCasesByState type", () => {
        const extractDateSpy = jest.spyOn(FlockCasesByStateTransformer as any, "extractDate");
        const fakeFilteredData: Record<string, string>[] = [
            {
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
            }
        ]

        const transformedData = FlockCasesByStateTransformer.transformData(fakeFilteredData);

        expect(extractDateSpy).toHaveBeenCalledWith('Last reported detection 12/27/2024.');

        expect(extractDateSpy).toHaveReturnedWith(new Date("2024-12-27T00:00:00.000Z"));

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

    describe("Check if any required fields are missing an error should be thrown indicating the missing field", ()=> {
        it("should throw Missing State Abbreviation error when the State Abbreviation key does not exist", () => {
            // Filtered Data that has a missing State Abbreviation field
            const fakeFilteredData: Record<string, string>[] = [
                {
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
                }
            ]
            
            expect(() => FlockCasesByStateTransformer.transformData(fakeFilteredData)).toThrow(new Error("Data transformation failed at row 0: Missing State Abbreviation"));
        });
        it("should throw Missing State Name error when the State Name key does not exist", () => {
            // Filtered Data that has a missing State Name field
            const fakeFilteredData: Record<string, string>[] = [
                {
                    'State Abbreviation': 'WI',
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
                }
            ]
            
            expect(() => FlockCasesByStateTransformer.transformData(fakeFilteredData)).toThrow(new Error("Data transformation failed at row 0: Missing State Name"));
        });
        it("should throw Missing Backyard Flocks error when the Backyard Flocks key does not exist", () => {
            // Filtered Data that has a missing Backyard Flocks field
            const fakeFilteredData: Record<string, string>[] = [
                {
                    'State Abbreviation': 'WI',
                    'State Name': 'Wisconsin',
                    'Birds Affected': '3,685,424',
                    Color: '19',
                    'Commercial Flocks': '19',
                    'Last Reported Detection Text': 'Last reported detection 12/27/2024.',
                    'Total Flocks': '39',
                    'State Boundary': 'MultiPolygon',
                    'State Label': '',
                    'Latitude (generated)': '44.947205162',
                    'Longitude (generated)': '-90.336235388'
                }
            ]
            
            expect(() => FlockCasesByStateTransformer.transformData(fakeFilteredData)).toThrow(new Error("Data transformation failed at row 0: Missing Backyard Flocks"));
        });
        it("should throw Missing Commercial Flocks error when the Commercial Flocks key does not exist", () => {
            // Filtered Data that has a missing Commercial Flocks field
            const fakeFilteredData: Record<string, string>[] = [
                {
                    'State Abbreviation': 'WI',
                    'State Name': 'Wisconsin',
                    'Backyard Flocks': '20',
                    Color: '19',
                    'Last Reported Detection Text': 'Last reported detection 12/27/2024.',
                    'Total Flocks': '39',
                    'State Boundary': 'MultiPolygon',
                    'State Label': '',
                    'Latitude (generated)': '44.947205162',
                    'Longitude (generated)': '-90.336235388'
                }
            ]
            
            expect(() => FlockCasesByStateTransformer.transformData(fakeFilteredData)).toThrow(new Error("Data transformation failed at row 0: Missing Commercial Flocks"));
        });
        it("should throw Missing Last Reported Detection Text error when the Last Reported Detection Text key does not exist", () => {
            // Filtered Data that has a missing Last Reported Detection Text field
            const fakeFilteredData: Record<string, string>[] = [
                {
                    'State Abbreviation': 'WI',
                    'State Name': 'Wisconsin',
                    'Backyard Flocks': '20',
                    'Birds Affected': '3,685,424',
                    Color: '19',
                    'Commercial Flocks': '19',
                    'Total Flocks': '39',
                    'State Boundary': 'MultiPolygon',
                    'State Label': '',
                    'Latitude (generated)': '44.947205162',
                    'Longitude (generated)': '-90.336235388'
                }
            ]
            
            expect(() => FlockCasesByStateTransformer.transformData(fakeFilteredData)).toThrow(new Error("Data transformation failed at row 0: Missing Last Reported Detection Text"));
        });
        it("should throw Missing Birds Affected error when the Birds Affected key does not exist", () => {
            // Filtered Data that has a missing Birds Affected field
            const fakeFilteredData: Record<string, string>[] = [
                {
                    'State Abbreviation': 'WI',
                    'State Name': 'Wisconsin',
                    'Backyard Flocks': '20',
                    Color: '19',
                    'Commercial Flocks': '19',
                    'Last Reported Detection Text': 'Last reported detection 12/27/2024.',
                    'Total Flocks': '39',
                    'State Boundary': 'MultiPolygon',
                    'State Label': '',
                    'Latitude (generated)': '44.947205162',
                    'Longitude (generated)': '-90.336235388'
                }
            ]
            
            expect(() => FlockCasesByStateTransformer.transformData(fakeFilteredData)).toThrow(new Error("Data transformation failed at row 0: Missing Birds Affected"));
        });
        it("should throw Missing Total Flocks error when the Total Flocks key does not exist", () => {
            // Filtered Data that has a missing Total Flocks field
            const fakeFilteredData: Record<string, string>[] = [
                {
                    'State Abbreviation': 'WI',
                    'State Name': 'Wisconsin',
                    'Backyard Flocks': '20',
                    'Birds Affected': '3,685,424',
                    Color: '19',
                    'Commercial Flocks': '19',
                    'Last Reported Detection Text': 'Last reported detection 12/27/2024.',
                    'State Boundary': 'MultiPolygon',
                    'State Label': '',
                    'Latitude (generated)': '44.947205162',
                    'Longitude (generated)': '-90.336235388'
                }
            ]
            
            expect(() => FlockCasesByStateTransformer.transformData(fakeFilteredData)).toThrow(new Error("Data transformation failed at row 0: Missing Total Flocks"));
        });
        it("should throw Missing Latitude error when the Latitude key does not exist", () => {
            // Filtered Data that has a missing Latitude field
            const fakeFilteredData: Record<string, string>[] = [
                {
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
                    'Longitude (generated)': '-90.336235388'
                }
            ]
            
            expect(() => FlockCasesByStateTransformer.transformData(fakeFilteredData)).toThrow(new Error("Data transformation failed at row 0: Missing Latitude"));
        });
        it("should throw Missing Longitude error when the Longitude key does not exist", () => {
            // Filtered Data that has a missing Longitude field
            const fakeFilteredData: Record<string, string>[] = [
                {
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
                }
            ]
            
            expect(() => FlockCasesByStateTransformer.transformData(fakeFilteredData)).toThrow(new Error("Data transformation failed at row 0: Missing Longitude"));
        });
    });
    describe("If any fields fail to be typecast correctly an error should be thrown indicating which field failed", () => {
        it("should throw an Invalid Backyard Flocks number error when Backyard Flocks is not a number", () => {
            // Using our filtered data except Backyard Flocks is a string that says "Twenty" instead of 20
            const fakeFilteredData: Record<string, string>[] = [
                {
                    'State Abbreviation': 'WI',
                    'State Name': 'Wisconsin',
                    'Backyard Flocks': 'Twenty',
                    'Birds Affected': '3,685,424',
                    Color: '19',
                    'Commercial Flocks': '19',
                    'Last Reported Detection Text': 'Last reported detection 12/27/2024.',
                    'Total Flocks': '39',
                    'State Boundary': 'MultiPolygon',
                    'State Label': '',
                    'Latitude (generated)': '44.947205162',
                    'Longitude (generated)': '-90.336235388'
                }
            ]

            expect(() => FlockCasesByStateTransformer.transformData(fakeFilteredData)).toThrow(new Error("Data transformation failed at row 0: Invalid Backyard Flocks number"));
        });
        it("should throw an Invalid Commercial Flocks number error when Commercial Flocks is not a number", () => {
            // Using our filtered data except Commercial Flocks is a string that says "Nineteen" instead of 19
            const fakeFilteredData: Record<string, string>[] = [
                {
                    'State Abbreviation': 'WI',
                    'State Name': 'Wisconsin',
                    'Backyard Flocks': '20',
                    'Birds Affected': '3,685,424',
                    Color: '19',
                    'Commercial Flocks': 'Nineteen',
                    'Last Reported Detection Text': 'Last reported detection 12/27/2024.',
                    'Total Flocks': '39',
                    'State Boundary': 'MultiPolygon',
                    'State Label': '',
                    'Latitude (generated)': '44.947205162',
                    'Longitude (generated)': '-90.336235388'
                }
            ]

            expect(() => FlockCasesByStateTransformer.transformData(fakeFilteredData)).toThrow(new Error("Data transformation failed at row 0: Invalid Commercial Flocks number")); 
        });
        it("should throw an Invalid Birds Affected number error when Birds Affected is not a number", () => {
            // Using our filtered data except Birds Affected is a string that says "3.6 Million" instead of 3,685,424
            const fakeFilteredData: Record<string, string>[] = [
                {
                    'State Abbreviation': 'WI',
                    'State Name': 'Wisconsin',
                    'Backyard Flocks': '20',
                    'Birds Affected': '3.6 Million',
                    Color: '19',
                    'Commercial Flocks': '19',
                    'Last Reported Detection Text': 'Last reported detection 12/27/2024.',
                    'Total Flocks': '39',
                    'State Boundary': 'MultiPolygon',
                    'State Label': '',
                    'Latitude (generated)': '44.947205162',
                    'Longitude (generated)': '-90.336235388'
                }
            ]

            expect(() => FlockCasesByStateTransformer.transformData(fakeFilteredData)).toThrow(new Error("Data transformation failed at row 0: Invalid Birds Affected number"));
            
        });
        it("should throw an Invalid Total Flocks number error when Total Flocks is not a number", () => {
            // Using our filtered data except Total Flocks is a string that says "Thirty-Nine" instead of 39
            const fakeFilteredData: Record<string, string>[] = [
                {
                    'State Abbreviation': 'WI',
                    'State Name': 'Wisconsin',
                    'Backyard Flocks': '20',
                    'Birds Affected': '3,685,424',
                    Color: '19',
                    'Commercial Flocks': '19',
                    'Last Reported Detection Text': 'Last reported detection 12/27/2024.',
                    'Total Flocks': 'Thirty-Nine',
                    'State Boundary': 'MultiPolygon',
                    'State Label': '',
                    'Latitude (generated)': '44.947205162',
                    'Longitude (generated)': '-90.336235388'
                }
            ]

            expect(() => FlockCasesByStateTransformer.transformData(fakeFilteredData)).toThrow(new Error("Data transformation failed at row 0: Invalid Total Flocks number"));
            
        });
        it("should throw an Invalid Latitude error when Latitude is not a number", () => {
            // Using our filtered data except Latitude is a string that says "Forty-Four point 94" instead of 44.947205162
            const fakeFilteredData: Record<string, string>[] = [
                {
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
                    'Latitude (generated)': 'Forty-Four point 94',
                    'Longitude (generated)': '-90.336235388'
                }
            ]

            expect(() => FlockCasesByStateTransformer.transformData(fakeFilteredData)).toThrow(new Error("Data transformation failed at row 0: Invalid Latitude"));
            
        });
        it("should throw an Invalid Longitude error when Longitude is not a number", () => {
            // Using our filtered data except Longitude is a string that says "Negative -90 point 33" instead of -90.336235388
            const fakeFilteredData: Record<string, string>[] = [
                {
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
                    'Longitude (generated)': 'Negative -90 point 33'
                }
            ]

            expect(() => FlockCasesByStateTransformer.transformData(fakeFilteredData)).toThrow(new Error("Data transformation failed at row 0: Invalid Longitude"));
            
        });
    });

    describe("Check if the extract date function fails to extract the last reported detection text", ()=>{
        it("extractDate should throw an invalid date format if it does not match the regex", () =>{
            const extractDateSpy = jest.spyOn(FlockCasesByStateTransformer as any, "extractDate");
            const fakeFilteredData: Record<string, string>[] = [
                {
                    'State Abbreviation': 'WI',
                    'State Name': 'Wisconsin',
                    'Backyard Flocks': '20',
                    'Birds Affected': '3,685,424',
                    Color: '19',
                    'Commercial Flocks': '19',
                    'Last Reported Detection Text': 'Last reported detection.',
                    'Total Flocks': '39',
                    'State Boundary': 'MultiPolygon',
                    'State Label': '',
                    'Latitude (generated)': '44.947205162',
                    'Longitude (generated)': '-90.336235388'
                }
            ]

            expect(() => FlockCasesByStateTransformer.transformData(fakeFilteredData)).toThrow(new Error("Data transformation failed at row 0: Invalid date format: Last reported detection."));
            expect(extractDateSpy).toHaveBeenCalledWith('Last reported detection.');
            
        });
        it("extractDate should throw an invalid date value if the provided date is not a real date", () =>{
            const extractDateSpy = jest.spyOn(FlockCasesByStateTransformer as any, "extractDate");
            // Using the last reported detection to be February 30th which is not a real date
            const fakeFilteredData: Record<string, string>[] = [
                {
                    'State Abbreviation': 'WI',
                    'State Name': 'Wisconsin',
                    'Backyard Flocks': '20',
                    'Birds Affected': '3,685,424',
                    Color: '19',
                    'Commercial Flocks': '19',
                    'Last Reported Detection Text': 'Last reported detection 2/30/2025.',
                    'Total Flocks': '39',
                    'State Boundary': 'MultiPolygon',
                    'State Label': '',
                    'Latitude (generated)': '44.947205162',
                    'Longitude (generated)': '-90.336235388'
                }
            ]

            expect(() => FlockCasesByStateTransformer.transformData(fakeFilteredData)).toThrow(new Error("Data transformation failed at row 0: Invalid date value: Last reported detection 2/30/2025."));
            expect(extractDateSpy).toHaveBeenCalledWith('Last reported detection.');
        });
    })
});