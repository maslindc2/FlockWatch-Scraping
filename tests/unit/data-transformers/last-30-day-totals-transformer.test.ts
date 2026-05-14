import { Last30DaysTransformer } from "../../../src/modules/data-processing/data-transformers/last-30-day-totals-transformer";
import { Last30Days } from "../../../src/modules/data-processing/last-30-days.interface";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a valid affectedTotalsData array. Individual fields can be overridden. */
function buildAffectedTotals(
    overrides: Record<string, string> = {}
): Record<string, string>[] {
    return [
        {
            "1": "Last 30 Days",
            "Commercial Flocks": "10",
            "Backyard Flocks": "5",
            "Birds Affected": "1,234",
            ...overrides,
        },
    ];
}

/** Builds a valid confirmedFlockTotals object. Individual fields can be overridden. */
function buildConfirmedFlockTotals(
    overrides: Record<string, string> = {}
): Record<string, string> {
    return {
        "Total Flocks": "15",
        ...overrides,
    };
}

describe("Last30DaysTransformer", () => {
    // -------------------------------------------------------------------------
    // Happy path
    // -------------------------------------------------------------------------
    describe("transformData - valid input", () => {
        let result: Last30Days;

        beforeEach(() => {
            result = Last30DaysTransformer.transformData(
                buildAffectedTotals(),
                buildConfirmedFlockTotals()
            );
        });

        it("sets period_name to 'last_30_days'", () => {
            expect(result.period_name).toBe("last_30_days");
        });

        it("parses total_birds_affected stripping commas", () => {
            expect(result.total_birds_affected).toBe(1234);
        });

        it("parses total_flocks_affected from confirmedFlockTotals", () => {
            expect(result.total_flocks_affected).toBe(15);
        });

        it("parses total_backyard_flocks_affected", () => {
            expect(result.total_backyard_flocks_affected).toBe(5);
        });

        it("parses total_commercial_flocks_affected", () => {
            expect(result.total_commercial_flocks_affected).toBe(10);
        });

        it("returns an object with all required Last30Days fields", () => {
            const keys: (keyof Last30Days)[] = [
                "period_name",
                "total_birds_affected",
                "total_flocks_affected",
                "total_backyard_flocks_affected",
                "total_commercial_flocks_affected",
            ];
            keys.forEach((key) => expect(result).toHaveProperty(key));
        });
    });

    // -------------------------------------------------------------------------
    // parseNumber - empty / falsy value handling
    // -------------------------------------------------------------------------
    describe("parseNumber - empty value", () => {
        it("returns 0 for an empty string value", () => {
            const result = (Last30DaysTransformer as any).parseNumber("");
            expect(result).toBe(0);
        });

        it("returns 0 for null value", () => {
            const result = (Last30DaysTransformer as any).parseNumber(null);
            expect(result).toBe(0);
        });
    });

    // -------------------------------------------------------------------------
    // parseNumber - K / M suffix handling (tested via transformData)
    // -------------------------------------------------------------------------
    describe("parseNumber - suffix parsing", () => {
        it("parses a value ending in K as thousands", () => {
            const result = Last30DaysTransformer.transformData(
                buildAffectedTotals({ "Birds Affected": "50K" }),
                buildConfirmedFlockTotals()
            );
            expect(result.total_birds_affected).toBe(50_000);
        });

        it("parses a value ending in M as millions", () => {
            const result = Last30DaysTransformer.transformData(
                buildAffectedTotals({ "Birds Affected": "2.5M" }),
                buildConfirmedFlockTotals()
            );
            expect(result.total_birds_affected).toBe(2_500_000);
        });

        it("parses a lowercase 'k' suffix correctly", () => {
            const result = Last30DaysTransformer.transformData(
                buildAffectedTotals({ "Birds Affected": "10k" }),
                buildConfirmedFlockTotals()
            );
            expect(result.total_birds_affected).toBe(10_000);
        });

        it("parses a lowercase 'm' suffix correctly", () => {
            const result = Last30DaysTransformer.transformData(
                buildAffectedTotals({ "Birds Affected": "1m" }),
                buildConfirmedFlockTotals()
            );
            expect(result.total_birds_affected).toBe(1_000_000);
        });

        it("parses Total Flocks with a K suffix from confirmedFlockTotals", () => {
            const result = Last30DaysTransformer.transformData(
                buildAffectedTotals(),
                buildConfirmedFlockTotals({ "Total Flocks": "100K" })
            );
            expect(result.total_flocks_affected).toBe(100_000);
        });
    });

    // -------------------------------------------------------------------------
    // parseNumber - comma-formatted numbers
    // -------------------------------------------------------------------------
    describe("parseNumber - comma-formatted numbers", () => {
        it("strips commas from Birds Affected", () => {
            const result = Last30DaysTransformer.transformData(
                buildAffectedTotals({ "Birds Affected": "1,000,000" }),
                buildConfirmedFlockTotals()
            );
            expect(result.total_birds_affected).toBe(1_000_000);
        });

        it("strips commas from Commercial Flocks", () => {
            const result = Last30DaysTransformer.transformData(
                buildAffectedTotals({ "Commercial Flocks": "1,500" }),
                buildConfirmedFlockTotals()
            );
            expect(result.total_commercial_flocks_affected).toBe(1500);
        });
    });

    // -------------------------------------------------------------------------
    // Missing / empty affectedTotalsData
    // -------------------------------------------------------------------------
    describe("transformData - missing affectedTotalsData", () => {
        it("throws when affectedTotalsData is an empty array", () => {
            expect(() =>
                Last30DaysTransformer.transformData(
                    [],
                    buildConfirmedFlockTotals()
                )
            ).toThrow("Missing affectedTotalsData");
        });

        it("throws when affectedTotalsData is null", () => {
            expect(() =>
                Last30DaysTransformer.transformData(
                    null as any,
                    buildConfirmedFlockTotals()
                )
            ).toThrow("Missing affectedTotalsData");
        });
    });

    // -------------------------------------------------------------------------
    // Missing confirmedFlockTotals
    // -------------------------------------------------------------------------
    describe("transformData - missing confirmedFlockTotals", () => {
        it("throws when confirmedFlockTotals is null", () => {
            expect(() =>
                Last30DaysTransformer.transformData(
                    buildAffectedTotals(),
                    null as any
                )
            ).toThrow("Missing confirmedFlockTotals");
        });
    });

    // -------------------------------------------------------------------------
    // Missing individual fields
    // -------------------------------------------------------------------------
    describe("transformData - missing individual fields", () => {
        it("throws when Birds Affected is missing", () => {
            expect(() =>
                Last30DaysTransformer.transformData(
                    buildAffectedTotals({ "Birds Affected": "" }),
                    buildConfirmedFlockTotals()
                )
            ).toThrow("Missing Birds Affected");
        });

        it("throws when Total Flocks is missing", () => {
            expect(() =>
                Last30DaysTransformer.transformData(
                    buildAffectedTotals(),
                    buildConfirmedFlockTotals({ "Total Flocks": "" })
                )
            ).toThrow("Missing Total Flocks");
        });

        it("throws when Backyard Flocks is missing", () => {
            expect(() =>
                Last30DaysTransformer.transformData(
                    buildAffectedTotals({ "Backyard Flocks": "" }),
                    buildConfirmedFlockTotals()
                )
            ).toThrow("Missing Backyard Flocks");
        });

        it("throws when Commercial Flocks is missing", () => {
            expect(() =>
                Last30DaysTransformer.transformData(
                    buildAffectedTotals({ "Commercial Flocks": "" }),
                    buildConfirmedFlockTotals()
                )
            ).toThrow("Missing Commercial Flocks");
        });
    });

    // -------------------------------------------------------------------------
    // Non-numeric values
    // -------------------------------------------------------------------------
    describe("transformData - non-numeric field values", () => {
        const cases: Array<
            [string, Record<string, string>, Record<string, string>, string]
        > = [
            [
                "Birds Affected",
                { "Birds Affected": "not-a-number" },
                {},
                "Invalid Birds Affected number",
            ],
            [
                "Total Flocks",
                {},
                { "Total Flocks": "not-a-number" },
                "Invalid Total Flocks number",
            ],
            [
                "Backyard Flocks",
                { "Backyard Flocks": "not-a-number" },
                {},
                "Invalid Backyard Flocks number",
            ],
            [
                "Commercial Flocks",
                { "Commercial Flocks": "not-a-number" },
                {},
                "Invalid Commercial Flocks number",
            ],
        ];

        test.each(cases)(
            "throws when '%s' cannot be parsed as a number",
            (_, affectedOverrides, confirmedOverrides, expectedMessage) => {
                expect(() =>
                    Last30DaysTransformer.transformData(
                        buildAffectedTotals(affectedOverrides),
                        buildConfirmedFlockTotals(confirmedOverrides)
                    )
                ).toThrow(expectedMessage);
            }
        );
    });
});
