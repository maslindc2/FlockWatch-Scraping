import { CSVParser } from "../../../src/modules/data-processing/csv/csv-parser";

describe("CSVParser", () => {
    // -------------------------------------------------------------------------
    // parseCSV - empty / falsy input
    // -------------------------------------------------------------------------
    describe("when fileContent is empty", () => {
        it("returns an empty array for an empty string", () => {
            const result = CSVParser.parseCSV("", "\t", 1, true);
            expect(result).toEqual([]);
        });

        it("returns an empty array when fileContent is null", () => {
            const result = CSVParser.parseCSV(null as any, "\t", 1);
            expect(result).toEqual([]);
        });

        it("returns an empty array when fileContent is undefined", () => {
            const result = CSVParser.parseCSV(undefined as any, "\t", 1);
            expect(result).toEqual([]);
        });
    });

    describe("when columns parameter uses the default value", () => {
        it("defaults columns to true (use first row as headers)", () => {
            const content = "state\tcount\nTexas\t500";
            const result = CSVParser.parseCSV(content, "\t", 1);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({ state: "Texas", count: "500" });
        });
    });

    // -------------------------------------------------------------------------
    // parseCSV - tab-delimited input with custom string[] headers
    // -------------------------------------------------------------------------
    describe("when given valid tab-delimited content with custom headers", () => {
        // Simulates what DataProcessor supplies: a header row that gets skipped
        // (startFromRow: 2) and one data row.
        const headers = ["State Name", "Birds Affected", "Total Flocks"];

        // Row 1 is the original file header (skipped by startFromRow: 2)
        // Row 2 is the first real data row
        const tabContent = [
            "State Name\tBirds Affected\tTotal Flocks",
            "Iowa\t1234\t56",
        ].join("\n");

        it("returns one record matching the custom headers", () => {
            const result = CSVParser.parseCSV(tabContent, "\t", 2, headers);
            expect(result).toHaveLength(1);
        });

        it("maps values to the correct header keys", () => {
            const result = CSVParser.parseCSV(tabContent, "\t", 2, headers);
            expect(result[0]).toEqual({
                "State Name": "Iowa",
                "Birds Affected": "1234",
                "Total Flocks": "56",
            });
        });
    });

    // -------------------------------------------------------------------------
    // parseCSV - startFromRow skipping
    // -------------------------------------------------------------------------
    describe("startFromRow behaviour", () => {
        const headers = ["Name", "Value"];

        const content = ["skip this line", "also skip", "Real Name\t99"].join(
            "\n"
        );

        it("skips the correct number of leading rows", () => {
            const result = CSVParser.parseCSV(content, "\t", 3, headers);
            expect(result).toHaveLength(1);
            expect(result[0]["Name"]).toBe("Real Name");
            expect(result[0]["Value"]).toBe("99");
        });
    });

    // -------------------------------------------------------------------------
    // parseCSV - boolean columns flag (auto-detect headers from first row)
    // -------------------------------------------------------------------------
    describe("when columns is true (auto-detect from first parsed row)", () => {
        // startFromRow: 1 means the first line is used as the header row
        const content = ["state\tcount", "Texas\t500"].join("\n");

        it("uses the first row as column names", () => {
            const result = CSVParser.parseCSV(content, "\t", 1, true);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({ state: "Texas", count: "500" });
        });
    });

    // -------------------------------------------------------------------------
    // parseCSV - multiple rows
    // -------------------------------------------------------------------------
    describe("when given multiple data rows", () => {
        const headers = ["State", "Birds"];
        const content = [
            "State\tBirds",
            "Iowa\t1000",
            "Minnesota\t2000",
            "Indiana\t3000",
        ].join("\n");

        it("returns a record for every data row", () => {
            const result = CSVParser.parseCSV(content, "\t", 2, headers);
            expect(result).toHaveLength(3);
        });

        it("preserves row order", () => {
            const result = CSVParser.parseCSV(content, "\t", 2, headers);
            expect(result[0]["State"]).toBe("Iowa");
            expect(result[1]["State"]).toBe("Minnesota");
            expect(result[2]["State"]).toBe("Indiana");
        });
    });

    // -------------------------------------------------------------------------
    // parseCSV - malformed / unparseable CSV throws
    // -------------------------------------------------------------------------
    describe("when the CSV is malformed", () => {
        it("throws an error describing the malformed CSV", () => {
            // Providing mismatched column count with strict csv-parse options
            // forces a parse error. We supply a header array that expects 3
            // columns but every row only has 1 value with no delimiter.
            const malformed = ["col1\tcol2\tcol3", "onlyOneValue"].join("\n");

            expect(() =>
                CSVParser.parseCSV(malformed, "\t", 2, ["col1", "col2", "col3"])
            ).toThrow(/CSV is malformed/);
        });
    });

    // -------------------------------------------------------------------------
    // parseCSV - trims whitespace from values
    // -------------------------------------------------------------------------
    describe("whitespace trimming", () => {
        const headers = ["State", "Birds"];
        const content = ["State\tBirds", "  Iowa  \t  1000  "].join("\n");

        it("trims leading and trailing whitespace from cell values", () => {
            const result = CSVParser.parseCSV(content, "\t", 2, headers);
            expect(result[0]["State"]).toBe("Iowa");
            expect(result[0]["Birds"]).toBe("1000");
        });
    });
});
