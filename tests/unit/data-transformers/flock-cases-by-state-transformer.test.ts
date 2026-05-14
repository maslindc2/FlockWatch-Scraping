import { FlockCasesByStateTransformer } from "../../../src/modules/data-processing/data-transformers/flock-cases-by-state-transformer";
import { FlockCasesByState } from "../../../src/modules/data-processing/flock-cases-by-state.interface";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a fully valid raw row. Individual fields can be overridden per test. */
function buildValidRow(
    overrides: Record<string, string> = {}
): Record<string, string> {
    return {
        "State Abbreviation": "IA",
        "State Name": "Iowa",
        "Backyard Flocks": "5",
        "Commercial Flocks": "12",
        "Birds Affected": "1,234",
        "Total Flocks": "17",
        "Latitude (generated)": "41.878",
        "Longitude (generated)": "-93.097",
        "Last Reported Detection Text": "Last reported detection 1/30/2025.",
        Color: "red",
        "State Boundary": "",
        "State Label Point": "",
        ...overrides,
    };
}

describe("FlockCasesByStateTransformer", () => {
    // -------------------------------------------------------------------------
    // Happy path
    // -------------------------------------------------------------------------
    describe("transformData - valid input", () => {
        let result: FlockCasesByState[];

        beforeEach(() => {
            result = FlockCasesByStateTransformer.transformData([
                buildValidRow(),
            ]);
        });

        it("returns one record for one valid row", () => {
            expect(result).toHaveLength(1);
        });

        it("maps state_abbreviation correctly", () => {
            expect(result[0].state_abbreviation).toBe("IA");
        });

        it("maps state correctly", () => {
            expect(result[0].state).toBe("Iowa");
        });

        it("parses birds_affected stripping commas", () => {
            expect(result[0].birds_affected).toBe(1234);
        });

        it("parses backyard_flocks as a number", () => {
            expect(result[0].backyard_flocks).toBe(5);
        });

        it("parses commercial_flocks as a number", () => {
            expect(result[0].commercial_flocks).toBe(12);
        });

        it("parses total_flocks as a number", () => {
            expect(result[0].total_flocks).toBe(17);
        });

        it("parses latitude as a float", () => {
            expect(result[0].latitude).toBeCloseTo(41.878);
        });

        it("parses longitude as a float", () => {
            expect(result[0].longitude).toBeCloseTo(-93.097);
        });

        it("converts last_reported_detection to a Date", () => {
            expect(result[0].last_reported_detection).toBeInstanceOf(Date);
        });

        it("sets last_reported_detection to the correct UTC date", () => {
            const date = result[0].last_reported_detection as Date;
            expect(date.getUTCFullYear()).toBe(2025);
            expect(date.getUTCMonth()).toBe(0); // January = 0
            expect(date.getUTCDate()).toBe(30);
        });
    });

    // -------------------------------------------------------------------------
    // Multiple rows
    // -------------------------------------------------------------------------
    describe("transformData - multiple valid rows", () => {
        it("returns a record for every row", () => {
            const rows = [
                buildValidRow({
                    "State Abbreviation": "IA",
                    "State Name": "Iowa",
                }),
                buildValidRow({
                    "State Abbreviation": "MN",
                    "State Name": "Minnesota",
                }),
                buildValidRow({
                    "State Abbreviation": "IN",
                    "State Name": "Indiana",
                }),
            ];
            const result = FlockCasesByStateTransformer.transformData(rows);
            expect(result).toHaveLength(3);
        });

        it("returns an empty array for an empty input array", () => {
            const result = FlockCasesByStateTransformer.transformData([]);
            expect(result).toEqual([]);
        });
    });

    // -------------------------------------------------------------------------
    // Puerto Rico filtering
    // -------------------------------------------------------------------------
    describe("transformData - Puerto Rico row", () => {
        it("skips a row where State Abbreviation is PR", () => {
            const rows = [
                buildValidRow({
                    "State Abbreviation": "PR",
                    "State Name": "Puerto Rico",
                }),
                buildValidRow({
                    "State Abbreviation": "IA",
                    "State Name": "Iowa",
                }),
            ];
            const result = FlockCasesByStateTransformer.transformData(rows);
            expect(result).toHaveLength(1);
            expect(result[0].state_abbreviation).toBe("IA");
        });

        it("returns an empty array when the only row is PR", () => {
            const rows = [
                buildValidRow({
                    "State Abbreviation": "PR",
                    "State Name": "Puerto Rico",
                }),
            ];
            const result = FlockCasesByStateTransformer.transformData(rows);
            expect(result).toHaveLength(0);
        });
    });

    // -------------------------------------------------------------------------
    // Comma-formatted large numbers
    // -------------------------------------------------------------------------
    describe("transformData - comma-formatted numbers", () => {
        it("correctly parses large comma-formatted Birds Affected", () => {
            const result = FlockCasesByStateTransformer.transformData([
                buildValidRow({ "Birds Affected": "1,234,567" }),
            ]);
            expect(result[0].birds_affected).toBe(1234567);
        });

        it("correctly parses large comma-formatted Total Flocks", () => {
            const result = FlockCasesByStateTransformer.transformData([
                buildValidRow({ "Total Flocks": "10,000" }),
            ]);
            expect(result[0].total_flocks).toBe(10000);
        });
    });

    // -------------------------------------------------------------------------
    // Missing required fields
    // -------------------------------------------------------------------------
    describe("transformData - missing required fields", () => {
        const requiredFields: Array<[string, string]> = [
            ["State Abbreviation", "Missing State Abbreviation"],
            ["State Name", "Missing State Name"],
            ["Backyard Flocks", "Missing Backyard Flocks"],
            ["Commercial Flocks", "Missing Commercial Flocks"],
            ["Birds Affected", "Missing Birds Affected"],
            ["Total Flocks", "Missing Total Flocks"],
            ["Latitude (generated)", "Missing Latitude"],
            ["Longitude (generated)", "Missing Longitude"],
            [
                "Last Reported Detection Text",
                "Missing Last Reported Detection Text",
            ],
        ];

        test.each(requiredFields)(
            "throws when '%s' is missing",
            (field, expectedMessage) => {
                expect(() =>
                    FlockCasesByStateTransformer.transformData([
                        buildValidRow({ [field]: "" }),
                    ])
                ).toThrow(expectedMessage);
            }
        );
    });

    // -------------------------------------------------------------------------
    // Non-numeric values produce NaN -> throws
    // -------------------------------------------------------------------------
    describe("transformData - non-numeric field values", () => {
        const numericFields: Array<[string, string]> = [
            ["Backyard Flocks", "Invalid Backyard Flocks number"],
            ["Commercial Flocks", "Invalid Commercial Flocks number"],
            ["Birds Affected", "Invalid Birds Affected number"],
            ["Total Flocks", "Invalid Total Flocks number"],
            ["Latitude (generated)", "Invalid Latitude"],
            ["Longitude (generated)", "Invalid Longitude"],
        ];

        test.each(numericFields)(
            "throws when '%s' cannot be parsed as a number",
            (field, expectedMessage) => {
                expect(() =>
                    FlockCasesByStateTransformer.transformData([
                        buildValidRow({ [field]: "not-a-number" }),
                    ])
                ).toThrow(expectedMessage);
            }
        );
    });

    // -------------------------------------------------------------------------
    // Date extraction edge cases
    // -------------------------------------------------------------------------
    describe("transformData - date extraction", () => {
        it("parses a single-digit month and day correctly", () => {
            const result = FlockCasesByStateTransformer.transformData([
                buildValidRow({
                    "Last Reported Detection Text":
                        "Last reported detection 3/5/2025.",
                }),
            ]);
            const date = result[0].last_reported_detection as Date;
            expect(date.getUTCMonth()).toBe(2); // March = 2
            expect(date.getUTCDate()).toBe(5);
        });

        it("throws when the date string has no recognisable date pattern", () => {
            expect(() =>
                FlockCasesByStateTransformer.transformData([
                    buildValidRow({
                        "Last Reported Detection Text": "No date here",
                    }),
                ])
            ).toThrow(/Invalid date format/);
        });

        it("throws when the date values are out of range", () => {
            expect(() =>
                FlockCasesByStateTransformer.transformData([
                    buildValidRow({
                        "Last Reported Detection Text":
                            "Last reported detection 13/99/2025.",
                    }),
                ])
            ).toThrow(/Invalid date value/);
        });
    });
});
