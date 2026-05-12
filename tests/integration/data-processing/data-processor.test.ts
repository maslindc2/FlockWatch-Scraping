import { DataProcessor } from "../../../src/modules/data-processing/data-processor";
import { Last30DaysCSVs } from "../../../src/modules/scraper/usda-scraping.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Encodes a plain string into a UTF-16LE ArrayBuffer, mirroring the real
 * USDA CSV files that DataProcessor decodes with TextDecoder("utf-16le").
 */
function encodeUtf16LE(text: string): ArrayBuffer {
    const buf = new ArrayBuffer(text.length * 2);
    const view = new DataView(buf);
    for (let i = 0; i < text.length; i++) {
        view.setUint16(i * 2, text.charCodeAt(i), true); // true = little-endian
    }
    return buf;
}

/**
 * Builds a realistic Map Comparisons CSV string.
 * Row 1 is the file header (skipped by startFromRow: 2).
 * Subsequent rows are data rows.
 */
function buildMapComparisonsCSV(
    rows: Array<Record<string, string>> = []
): ArrayBuffer {
    const header =
        "State Abbreviation\tState Name\tBackyard Flocks\tBirds Affected\tColor\tCommercial Flocks\tLast Reported Detection Text\tTotal Flocks\tState Boundary\tState Label Point\tLatitude (generated)\tLongitude (generated)";

    const dataRows = rows
        .map(
            (r) =>
                `${r.stateAbbr}\t${r.stateName}\t${r.backyardFlocks}\t${r.birdsAffected}\t${r.color ?? "red"}\t${r.commercialFlocks}\t${r.lastReportedDetection}\t${r.totalFlocks}\t\t\t${r.latitude}\t${r.longitude}`
        )
        .join("\n");

    return encodeUtf16LE(`${header}\n${dataRows}`);
}

/** Default valid state row values */
const IOWA_ROW = {
    stateAbbr: "IA",
    stateName: "Iowa",
    backyardFlocks: "3",
    birdsAffected: "1,200",
    commercialFlocks: "8",
    lastReportedDetection: "Last reported detection 1/30/2025.",
    totalFlocks: "11",
    latitude: "41.878",
    longitude: "-93.097",
};

const MINNESOTA_ROW = {
    stateAbbr: "MN",
    stateName: "Minnesota",
    backyardFlocks: "2",
    birdsAffected: "500",
    commercialFlocks: "5",
    lastReportedDetection: "Last reported detection 2/14/2025.",
    totalFlocks: "7",
    latitude: "46.729",
    longitude: "-94.685",
};

/**
 * Builds the Affected Totals CSV used for last-30-day processing.
 * Row 1 is the file header (skipped), row 2 is the single data row.
 */
function buildAffectedTotalsCSV(overrides: Record<string, string> = {}): ArrayBuffer {
    const defaults = {
        commercialFlocks: "10",
        backyardFlocks: "5",
        birdsAffected: "1,234",
    };
    const vals = { ...defaults, ...overrides };

    const header = "1\tCommercial Flocks\tBackyard Flocks\tBirds Affected";
    const row = `Last 30 Days\t${vals.commercialFlocks}\t${vals.backyardFlocks}\t${vals.birdsAffected}`;
    return encodeUtf16LE(`${header}\n${row}`);
}

/**
 * Builds the Confirmed Flocks Total CSV.
 * This file is NOT in traditional CSV form — it's just key\tvalue lines.
 */
function buildConfirmedFlocksTotalCSV(totalFlocks = "15"): ArrayBuffer {
    const content = `Total Flocks\t${totalFlocks}`;
    return encodeUtf16LE(content);
}

// ---------------------------------------------------------------------------

describe("DataProcessor", () => {
    let processor: DataProcessor;

    beforeEach(() => {
        processor = new DataProcessor();
    });

    // -------------------------------------------------------------------------
    // processMapComparisonsCSV
    // -------------------------------------------------------------------------
    describe("processMapComparisonsCSV", () => {
        describe("valid input - single state", () => {
            it("returns one FlockCasesByState record for one data row", async () => {
                const csv = buildMapComparisonsCSV([IOWA_ROW]);
                const result = await processor.processMapComparisonsCSV(csv);

                expect(result).toHaveLength(1);
            });

            it("maps state_abbreviation correctly", async () => {
                const csv = buildMapComparisonsCSV([IOWA_ROW]);
                const result = await processor.processMapComparisonsCSV(csv);

                expect(result[0].state_abbreviation).toBe("IA");
            });

            it("maps state name correctly", async () => {
                const csv = buildMapComparisonsCSV([IOWA_ROW]);
                const result = await processor.processMapComparisonsCSV(csv);

                expect(result[0].state).toBe("Iowa");
            });

            it("parses birds_affected stripping commas", async () => {
                const csv = buildMapComparisonsCSV([IOWA_ROW]);
                const result = await processor.processMapComparisonsCSV(csv);

                expect(result[0].birds_affected).toBe(1200);
            });

            it("parses last_reported_detection as a Date", async () => {
                const csv = buildMapComparisonsCSV([IOWA_ROW]);
                const result = await processor.processMapComparisonsCSV(csv);

                expect(result[0].last_reported_detection).toBeInstanceOf(Date);
            });

            it("parses latitude and longitude as floats", async () => {
                const csv = buildMapComparisonsCSV([IOWA_ROW]);
                const result = await processor.processMapComparisonsCSV(csv);

                expect(result[0].latitude).toBeCloseTo(41.878);
                expect(result[0].longitude).toBeCloseTo(-93.097);
            });
        });

        describe("valid input - multiple states", () => {
            it("returns a record for every data row", async () => {
                const csv = buildMapComparisonsCSV([IOWA_ROW, MINNESOTA_ROW]);
                const result = await processor.processMapComparisonsCSV(csv);

                expect(result).toHaveLength(2);
            });

            it("preserves row order", async () => {
                const csv = buildMapComparisonsCSV([IOWA_ROW, MINNESOTA_ROW]);
                const result = await processor.processMapComparisonsCSV(csv);

                expect(result[0].state_abbreviation).toBe("IA");
                expect(result[1].state_abbreviation).toBe("MN");
            });
        });

        describe("zero birds affected filtering", () => {
            it("filters out rows where Birds Affected is 0", async () => {
                const zeroRow = { ...IOWA_ROW, birdsAffected: "0" };
                const csv = buildMapComparisonsCSV([zeroRow, MINNESOTA_ROW]);
                const result = await processor.processMapComparisonsCSV(csv);

                expect(result).toHaveLength(1);
                expect(result[0].state_abbreviation).toBe("MN");
            });

            it("returns an empty array when all rows have zero birds affected", async () => {
                const zeroIowa = { ...IOWA_ROW, birdsAffected: "0" };
                const zeroMN = { ...MINNESOTA_ROW, birdsAffected: "0" };
                const csv = buildMapComparisonsCSV([zeroIowa, zeroMN]);
                const result = await processor.processMapComparisonsCSV(csv);

                expect(result).toHaveLength(0);
            });
        });

        describe("Puerto Rico filtering", () => {
            it("filters out rows where State Abbreviation is PR", async () => {
                const prRow = {
                    ...IOWA_ROW,
                    stateAbbr: "PR",
                    stateName: "Puerto Rico",
                };
                const csv = buildMapComparisonsCSV([prRow, MINNESOTA_ROW]);
                const result = await processor.processMapComparisonsCSV(csv);

                expect(result).toHaveLength(1);
                expect(result[0].state_abbreviation).toBe("MN");
            });
        });
    });

    // -------------------------------------------------------------------------
    // processLast30DayTotalsCSVs
    // -------------------------------------------------------------------------
    describe("processLast30DayTotalsCSVs", () => {
        describe("valid input", () => {
            it("returns an array with exactly one Last30Days record", async () => {
                const csvs: Last30DaysCSVs = {
                    affectedTotalsCSV: buildAffectedTotalsCSV() as SharedArrayBuffer,
                    confirmedFlocksTotalCSV:
                        buildConfirmedFlocksTotalCSV() as SharedArrayBuffer,
                };

                const result = await processor.processLast30DayTotalsCSVs(csvs);

                expect(result).toHaveLength(1);
            });

            it("sets period_name to last_30_days", async () => {
                const csvs: Last30DaysCSVs = {
                    affectedTotalsCSV: buildAffectedTotalsCSV() as SharedArrayBuffer,
                    confirmedFlocksTotalCSV:
                        buildConfirmedFlocksTotalCSV() as SharedArrayBuffer,
                };

                const result = await processor.processLast30DayTotalsCSVs(csvs);

                expect(result[0].period_name).toBe("last_30_days");
            });

            it("parses total_birds_affected stripping commas", async () => {
                const csvs: Last30DaysCSVs = {
                    affectedTotalsCSV: buildAffectedTotalsCSV() as SharedArrayBuffer,
                    confirmedFlocksTotalCSV:
                        buildConfirmedFlocksTotalCSV() as SharedArrayBuffer,
                };

                const result = await processor.processLast30DayTotalsCSVs(csvs);

                expect(result[0].total_birds_affected).toBe(1234);
            });

            it("parses total_flocks_affected from confirmedFlocksTotalCSV", async () => {
                const csvs: Last30DaysCSVs = {
                    affectedTotalsCSV: buildAffectedTotalsCSV() as SharedArrayBuffer,
                    confirmedFlocksTotalCSV:
                        buildConfirmedFlocksTotalCSV("20") as SharedArrayBuffer,
                };

                const result = await processor.processLast30DayTotalsCSVs(csvs);

                expect(result[0].total_flocks_affected).toBe(20);
            });

            it("parses total_backyard_flocks_affected", async () => {
                const csvs: Last30DaysCSVs = {
                    affectedTotalsCSV: buildAffectedTotalsCSV() as SharedArrayBuffer,
                    confirmedFlocksTotalCSV:
                        buildConfirmedFlocksTotalCSV() as SharedArrayBuffer,
                };

                const result = await processor.processLast30DayTotalsCSVs(csvs);

                expect(result[0].total_backyard_flocks_affected).toBe(5);
            });

            it("parses total_commercial_flocks_affected", async () => {
                const csvs: Last30DaysCSVs = {
                    affectedTotalsCSV: buildAffectedTotalsCSV() as SharedArrayBuffer,
                    confirmedFlocksTotalCSV:
                        buildConfirmedFlocksTotalCSV() as SharedArrayBuffer,
                };

                const result = await processor.processLast30DayTotalsCSVs(csvs);

                expect(result[0].total_commercial_flocks_affected).toBe(10);
            });
        });

        describe("K/M suffix handling passes through the full pipeline", () => {
            it("correctly handles a K suffix in Birds Affected", async () => {
                const csvs: Last30DaysCSVs = {
                    affectedTotalsCSV: buildAffectedTotalsCSV({
                        birdsAffected: "50K",
                    }) as SharedArrayBuffer,
                    confirmedFlocksTotalCSV:
                        buildConfirmedFlocksTotalCSV() as SharedArrayBuffer,
                };

                const result = await processor.processLast30DayTotalsCSVs(csvs);

                expect(result[0].total_birds_affected).toBe(50_000);
            });

            it("correctly handles an M suffix in Birds Affected", async () => {
                const csvs: Last30DaysCSVs = {
                    affectedTotalsCSV: buildAffectedTotalsCSV({
                        birdsAffected: "2M",
                    }) as SharedArrayBuffer,
                    confirmedFlocksTotalCSV:
                        buildConfirmedFlocksTotalCSV() as SharedArrayBuffer,
                };

                const result = await processor.processLast30DayTotalsCSVs(csvs);

                expect(result[0].total_birds_affected).toBe(2_000_000);
            });
        });
    });
});