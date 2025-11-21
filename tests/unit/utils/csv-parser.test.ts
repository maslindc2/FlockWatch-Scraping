import { CSVParser } from "../../../src/modules/data-processing/csv/csv-parser";
describe("Test CSVParser class", () => {
    it("should return an empty array when an empty string is provided for the fileContent", () => {
        const delimiter = "\t";
        const startFromRow = 1;
        const res = CSVParser.parseCSV("", delimiter, startFromRow, true);
        expect(res).toStrictEqual([]);
    });
    it("should return an array containing objects and their associated values when a csv string is provided for the fileContent", () => {
        const csvString = `
        Alice,30,New York
        Bob,25,Los Angeles
        Charlie,35,Chicago
        `.trim();

        const delimiter = ",";
        const startFromRow = 1;
        const columns = ["fullName", "years", "location"];

        const res = CSVParser.parseCSV(
            csvString,
            delimiter,
            startFromRow,
            columns
        );

        expect(res).toStrictEqual([
            { fullName: "Alice", years: "30", location: "New York" },
            { fullName: "Bob", years: "25", location: "Los Angeles" },
            { fullName: "Charlie", years: "35", location: "Chicago" },
        ]);
    });
    it("should throw an error when startFromRow is out of bounds", () => {
        const malformedCSV = `"name","age"\n"John",25\n"Jane"`;
        const delimiter = ",";
        const startFromRow = 1;
        expect(() =>
            CSVParser.parseCSV(malformedCSV, delimiter, startFromRow, false)
        ).toThrow(
            new Error(
                "CSV is malformed resulted in Error: Invalid Record Length: expect 2, got 1 on line 3"
            )
        );
    });
});
