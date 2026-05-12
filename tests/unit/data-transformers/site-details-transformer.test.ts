import { SiteDetailsTransformer } from "../../../src/modules/data-processing/data-transformers/site-details-transformer";
import {
    SiteDetails,
    HistoricalSummary,
    StatusTransitionSummary,
} from "../../../src/modules/data-processing/site-details.interface";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildValidRow(
    overrides: Record<string, string> = {}
): Record<string, string> {
    return {
        "Special ID": "LaGrange 89",
        "County Name": "Lagrange",
        State: "Indiana",
        Production: "Commercial Duck Breeder",
        "Confirmed Diagnosis": "08-May-26",
        "Control Area Released": "Active",
        "Birds Affected": "4,600",
        ...overrides,
    };
}

describe("SiteDetailsTransformer", () => {
    // -------------------------------------------------------------------------
    // Happy path - each field
    // -------------------------------------------------------------------------
    describe("transformData - valid input", () => {
        let result: {
            site_details: SiteDetails[];
            historical_summary: HistoricalSummary;
            status_summary: StatusTransitionSummary;
        };

        beforeEach(() => {
            result = SiteDetailsTransformer.transformData([buildValidRow()]);
        });

        it("returns one site record for one valid row", () => {
            expect(result.site_details).toHaveLength(1);
        });

        it("maps special_id correctly", () => {
            expect(result.site_details[0].special_id).toBe("LaGrange 89");
        });

        it("maps county correctly", () => {
            expect(result.site_details[0].county).toBe("Lagrange");
        });

        it("maps state correctly", () => {
            expect(result.site_details[0].state).toBe("Indiana");
        });

        it("maps production_type correctly", () => {
            expect(result.site_details[0].production_type).toBe(
                "Commercial Duck Breeder"
            );
        });

        it("parses birds_affected stripping commas", () => {
            expect(result.site_details[0].birds_affected).toBe(4600);
        });

        it("converts confirmed_diagnosis_date to a Date", () => {
            expect(
                result.site_details[0].confirmed_diagnosis_date
            ).toBeInstanceOf(Date);
        });

        it("sets confirmed_diagnosis_date to the correct UTC date", () => {
            const date = result.site_details[0].confirmed_diagnosis_date;
            expect(date.getUTCFullYear()).toBe(2026);
            expect(date.getUTCMonth()).toBe(4); // May = 4
            expect(date.getUTCDate()).toBe(8);
        });

        it("parses status as active for 'Active'", () => {
            expect(result.site_details[0].status).toBe("active");
        });

        it("does not set control_area_released_date when status is active", () => {
            expect(
                result.site_details[0].control_area_released_date
            ).toBeUndefined();
        });
    });

    // -------------------------------------------------------------------------
    // Status parsing
    // -------------------------------------------------------------------------
    describe("transformData - status parsing", () => {
        it("parses status as released when Control Area Released is a date", () => {
            const result = SiteDetailsTransformer.transformData([
                buildValidRow({ "Control Area Released": "08-May-26" }),
            ]);
            expect(result.site_details[0].status).toBe("released");
            expect(
                result.site_details[0].control_area_released_date
            ).toBeInstanceOf(Date);
            const date =
                result.site_details[0].control_area_released_date as Date;
            expect(date.getUTCFullYear()).toBe(2026);
            expect(date.getUTCMonth()).toBe(4);
            expect(date.getUTCDate()).toBe(8);
        });

        it("parses status as na for 'NA'", () => {
            const result = SiteDetailsTransformer.transformData([
                buildValidRow({ "Control Area Released": "NA" }),
            ]);
            expect(result.site_details[0].status).toBe("na");
            expect(
                result.site_details[0].control_area_released_date
            ).toBeUndefined();
        });

        it("throws for an unrecognised status value", () => {
            expect(() =>
                SiteDetailsTransformer.transformData([
                    buildValidRow({ "Control Area Released": "Unknown" }),
                ])
            ).toThrow("Invalid Control Area Released value");
        });
    });

    // -------------------------------------------------------------------------
    // Multiple rows
    // -------------------------------------------------------------------------
    describe("transformData - multiple valid rows", () => {
        it("returns a record for every row", () => {
            const rows = [
                buildValidRow({ "Special ID": "Site 001" }),
                buildValidRow({ "Special ID": "Site 002" }),
                buildValidRow({ "Special ID": "Site 003" }),
            ];
            const result = SiteDetailsTransformer.transformData(rows);
            expect(result.site_details).toHaveLength(3);
        });

        it("returns empty site_details for an empty input array", () => {
            const result = SiteDetailsTransformer.transformData([]);
            expect(result.site_details).toEqual([]);
        });
    });

    // -------------------------------------------------------------------------
    // Header leakage row
    // -------------------------------------------------------------------------
    describe("transformData - header leakage row", () => {
        it("skips a row where Control Area Released equals the column header", () => {
            const rows = [
                buildValidRow({
                    "Control Area Released": "Control Area Released",
                }),
                buildValidRow({ "Special ID": "Site 001" }),
            ];
            const result = SiteDetailsTransformer.transformData(rows);
            expect(result.site_details).toHaveLength(1);
            expect(result.site_details[0].special_id).toBe("Site 001");
        });
    });

    // -------------------------------------------------------------------------
    // Comma-formatted bird counts
    // -------------------------------------------------------------------------
    describe("transformData - comma-formatted numbers", () => {
        it("correctly parses large comma-formatted Birds Affected", () => {
            const result = SiteDetailsTransformer.transformData([
                buildValidRow({ "Birds Affected": "1,234,567" }),
            ]);
            expect(result.site_details[0].birds_affected).toBe(1234567);
        });

        it("correctly parses a plain number without commas", () => {
            const result = SiteDetailsTransformer.transformData([
                buildValidRow({ "Birds Affected": "60" }),
            ]);
            expect(result.site_details[0].birds_affected).toBe(60);
        });
    });

    // -------------------------------------------------------------------------
    // Date parsing (DD-Mon-YY)
    // -------------------------------------------------------------------------
    describe("transformData - DD-Mon-YY date parsing", () => {
        it("parses 01-Apr-22 correctly", () => {
            const result = SiteDetailsTransformer.transformData([
                buildValidRow({ "Confirmed Diagnosis": "01-Apr-22" }),
            ]);
            const date = result.site_details[0].confirmed_diagnosis_date;
            expect(date.getUTCFullYear()).toBe(2022);
            expect(date.getUTCMonth()).toBe(3); // April = 3
            expect(date.getUTCDate()).toBe(1);
        });

        it("parses 31-Oct-25 correctly", () => {
            const result = SiteDetailsTransformer.transformData([
                buildValidRow({ "Confirmed Diagnosis": "31-Oct-25" }),
            ]);
            const date = result.site_details[0].confirmed_diagnosis_date;
            expect(date.getUTCFullYear()).toBe(2025);
            expect(date.getUTCMonth()).toBe(9); // October = 9
            expect(date.getUTCDate()).toBe(31);
        });

        it("throws when the date string has no recognisable pattern", () => {
            expect(() =>
                SiteDetailsTransformer.transformData([
                    buildValidRow({ "Confirmed Diagnosis": "No date here" }),
                ])
            ).toThrow(/Invalid date format/);
        });

        it("throws when the month abbreviation is invalid", () => {
            expect(() =>
                SiteDetailsTransformer.transformData([
                    buildValidRow({ "Confirmed Diagnosis": "08-Xyz-26" }),
                ])
            ).toThrow(/Invalid month abbreviation/);
        });

        it("throws when the date values are out of range", () => {
            expect(() =>
                SiteDetailsTransformer.transformData([
                    buildValidRow({ "Confirmed Diagnosis": "32-Jan-26" }),
                ])
            ).toThrow(/Invalid date value/);
        });
    });

    // -------------------------------------------------------------------------
    // Missing required fields
    // -------------------------------------------------------------------------
    describe("transformData - missing required fields", () => {
        const requiredFields: Array<[string, string]> = [
            ["Special ID", "Missing Special ID"],
            ["County Name", "Missing County Name"],
            ["State", "Missing State"],
            ["Production", "Missing Production"],
            ["Confirmed Diagnosis", "Missing Confirmed Diagnosis"],
            ["Birds Affected", "Missing Birds Affected"],
        ];

        test.each(requiredFields)(
            "throws when '%s' is missing",
            (field, expectedMessage) => {
                expect(() =>
                    SiteDetailsTransformer.transformData([
                        buildValidRow({ [field]: "" }),
                    ])
                ).toThrow(expectedMessage);
            }
        );
    });

    // -------------------------------------------------------------------------
    // Non-numeric birds_affected
    // -------------------------------------------------------------------------
    describe("transformData - non-numeric birds_affected", () => {
        it("throws when Birds Affected cannot be parsed as a number", () => {
            expect(() =>
                SiteDetailsTransformer.transformData([
                    buildValidRow({ "Birds Affected": "not-a-number" }),
                ])
            ).toThrow("Invalid Birds Affected number");
        });
    });

    // -------------------------------------------------------------------------
    // HistoricalSummary computation
    // -------------------------------------------------------------------------
    describe("transformData - HistoricalSummary", () => {
        it("computes correct totals with mixed statuses", () => {
            const rows = [
                buildValidRow({
                    "Special ID": "Site 001",
                    "Birds Affected": "1,000",
                    "Control Area Released": "Active",
                }),
                buildValidRow({
                    "Special ID": "Site 002",
                    "Birds Affected": "2,000",
                    "Control Area Released": "08-May-26",
                }),
                buildValidRow({
                    "Special ID": "Site 003",
                    "Birds Affected": "3,000",
                    "Control Area Released": "NA",
                }),
            ];
            const result = SiteDetailsTransformer.transformData(rows);
            expect(result.historical_summary.total_birds_affected_all_time).toBe(
                6000
            );
            expect(result.historical_summary.total_sites_all_time).toBe(3);
            expect(result.historical_summary.total_active_sites).toBe(1);
            expect(result.historical_summary.total_released_sites).toBe(1);
            expect(result.historical_summary.total_na_sites).toBe(1);
            expect(result.historical_summary.total_birds_active).toBe(1000);
        });

        it("returns zeros for an empty input", () => {
            const result = SiteDetailsTransformer.transformData([]);
            expect(result.historical_summary.total_birds_affected_all_time).toBe(
                0
            );
            expect(result.historical_summary.total_sites_all_time).toBe(0);
            expect(result.historical_summary.total_active_sites).toBe(0);
            expect(result.historical_summary.total_released_sites).toBe(0);
            expect(result.historical_summary.total_na_sites).toBe(0);
            expect(result.historical_summary.total_birds_active).toBe(0);
        });
    });

    // -------------------------------------------------------------------------
    // StatusTransitionSummary computation
    // -------------------------------------------------------------------------
    describe("transformData - StatusTransitionSummary", () => {
        it("computes correct 30-day counts", () => {
            const today = new Date();
            const daysAgo = (n: number): string => {
                const d = new Date(today);
                d.setDate(d.getDate() - n);
                const day = String(d.getDate()).padStart(2, "0");
                const months = [
                    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
                ];
                const month = months[d.getMonth()];
                const year = String(d.getFullYear()).slice(-2);
                return `${day}-${month}-${year}`;
            };
            const recentlyConfirmed = daysAgo(5);
            const oldConfirmed = daysAgo(60);
            const recentlyReleased = daysAgo(10);

            const rows = [
                buildValidRow({
                    "Special ID": "Recent",
                    "Confirmed Diagnosis": recentlyConfirmed,
                    "Birds Affected": "500",
                    "Control Area Released": "Active",
                }),
                buildValidRow({
                    "Special ID": "Old",
                    "Confirmed Diagnosis": oldConfirmed,
                    "Birds Affected": "1,000",
                    "Control Area Released": "Active",
                }),
                buildValidRow({
                    "Special ID": "Released Recent",
                    "Confirmed Diagnosis": oldConfirmed,
                    "Birds Affected": "2,000",
                    "Control Area Released": recentlyReleased,
                }),
            ];
            const result = SiteDetailsTransformer.transformData(rows);
            expect(result.status_summary.sites_confirmed_last_30_days).toBe(1);
            expect(result.status_summary.sites_released_last_30_days).toBe(1);
            expect(result.status_summary.birds_affected_last_30_days).toBe(500);
        });
    });
});
