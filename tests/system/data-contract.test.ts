import { DataProcessor } from "../../src/modules/data-processing/data-processor";
import { FlockDataSchema } from "../../../FlockWatch-Server/src/validation/flock-data.schema";
import { Last30DaysCSVs } from "../../src/modules/scraper/usda-scraping.service";


function encodeUtf16LE(text: string): ArrayBuffer {
    const buf = new ArrayBuffer(text.length * 2);
    const view = new DataView(buf);
    for (let i = 0; i < text.length; i++) {
        view.setUint16(i * 2, text.charCodeAt(i), true);
    }
    return buf;
}

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

const IOWA = {
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

const MINNESOTA = {
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

const CALIFORNIA = {
    stateAbbr: "CA",
    stateName: "California",
    backyardFlocks: "6",
    birdsAffected: "8,900",
    commercialFlocks: "12",
    lastReportedDetection: "Last reported detection 3/1/2025.",
    totalFlocks: "18",
    latitude: "36.778",
    longitude: "-119.418",
};

function buildAffectedTotalsCSV(
    overrides: Record<string, string> = {}
): ArrayBuffer {
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

function buildConfirmedFlocksTotalCSV(totalFlocks = "15"): ArrayBuffer {
    const content = `Total Flocks\t${totalFlocks}`;
    return encodeUtf16LE(content);
}

function buildExportToCsvCSV(
    rows: Array<Record<string, string>> = []
): ArrayBuffer {
    const header =
        "Special ID\tCounty Name\tState\tProduction\tConfirmed Diagnosis\tControl Area Released\tBirds Affected";
    const dataRows = rows
        .map(
            (r) =>
                `${r.specialId}\t${r.county}\t${r.state}\t${r.production}\t${r.confirmedDiagnosis}\t${r.controlAreaReleased}\t${r.birdsAffected}`
        )
        .join("\n");
    return encodeUtf16LE(`${header}\n${dataRows}`);
}

const ACTIVE_SITE = {
    specialId: "LaGrange 89",
    county: "Lagrange",
    state: "Indiana",
    production: "Commercial Duck Breeder",
    confirmedDiagnosis: "08-May-26",
    controlAreaReleased: "Active",
    birdsAffected: "4,600",
};

const RELEASED_SITE = {
    specialId: "Big Stone 03",
    county: "Big Stone",
    state: "Minnesota",
    production: "Commercial Turkey Meat Bird",
    confirmedDiagnosis: "17-Apr-26",
    controlAreaReleased: "08-May-26",
    birdsAffected: "63,000",
};

const NA_SITE = {
    specialId: "Meade 01",
    county: "Meade",
    state: "South Dakota",
    production: "WOAH Non-Poultry",
    confirmedDiagnosis: "27-Apr-26",
    controlAreaReleased: "NA",
    birdsAffected: "60",
};

describe("Data Contract: Scraping output vs Server Zod schema", () => {
    let processor: DataProcessor;

    beforeEach(() => {
        processor = new DataProcessor();
    });

    describe("FlockCasesByState contract", () => {
        it("passes Zod validation for a single state", async () => {
            const csv = buildMapComparisonsCSV([IOWA]);
            const result = await processor.processMapComparisonsCSV(csv);

            const parseResult = FlockDataSchema.shape.flock_cases_by_state.safeParse(result);
            expect(parseResult.success).toBe(true);
        });

        it("passes Zod validation for multiple states", async () => {
            const csv = buildMapComparisonsCSV([IOWA, MINNESOTA, CALIFORNIA]);
            const result = await processor.processMapComparisonsCSV(csv);

            const parseResult = FlockDataSchema.shape.flock_cases_by_state.safeParse(result);
            expect(parseResult.success).toBe(true);
        });

        it("state_abbreviation is uppercase (matches ^[A-Z]{2}$)", async () => {
            const csv = buildMapComparisonsCSV([IOWA]);
            const result = await processor.processMapComparisonsCSV(csv);

            expect(result[0].state_abbreviation).toMatch(/^[A-Z]{2}$/);
        });

        it("state_abbreviation is exactly 2 characters", async () => {
            const csv = buildMapComparisonsCSV([MINNESOTA]);
            const result = await processor.processMapComparisonsCSV(csv);

            expect(result[0].state_abbreviation).toHaveLength(2);
        });

        it("state name is a non-empty string", async () => {
            const csv = buildMapComparisonsCSV([IOWA]);
            const result = await processor.processMapComparisonsCSV(csv);

            expect(result[0].state).toBe("Iowa");
        });

        it("birds_affected is a non-negative number", async () => {
            const csv = buildMapComparisonsCSV([IOWA]);
            const result = await processor.processMapComparisonsCSV(csv);

            expect(result[0].birds_affected).toBe(1200);
            expect(result[0].birds_affected).toBeGreaterThanOrEqual(0);
        });

        it("backyard_flocks is a non-negative number", async () => {
            const csv = buildMapComparisonsCSV([IOWA]);
            const result = await processor.processMapComparisonsCSV(csv);

            expect(result[0].backyard_flocks).toBe(3);
            expect(result[0].backyard_flocks).toBeGreaterThanOrEqual(0);
        });

        it("commercial_flocks is a non-negative number", async () => {
            const csv = buildMapComparisonsCSV([IOWA]);
            const result = await processor.processMapComparisonsCSV(csv);

            expect(result[0].commercial_flocks).toBe(8);
            expect(result[0].commercial_flocks).toBeGreaterThanOrEqual(0);
        });

        it("total_flocks is a non-negative number", async () => {
            const csv = buildMapComparisonsCSV([IOWA]);
            const result = await processor.processMapComparisonsCSV(csv);

            expect(result[0].total_flocks).toBe(11);
            expect(result[0].total_flocks).toBeGreaterThanOrEqual(0);
        });

        it("latitude is between -90 and 90", async () => {
            const csv = buildMapComparisonsCSV([IOWA]);
            const result = await processor.processMapComparisonsCSV(csv);

            expect(result[0].latitude).toBeCloseTo(41.878);
            expect(result[0].latitude).toBeGreaterThanOrEqual(-90);
            expect(result[0].latitude).toBeLessThanOrEqual(90);
        });

        it("longitude is between -180 and 180", async () => {
            const csv = buildMapComparisonsCSV([IOWA]);
            const result = await processor.processMapComparisonsCSV(csv);

            expect(result[0].longitude).toBeCloseTo(-93.097);
            expect(result[0].longitude).toBeGreaterThanOrEqual(-180);
            expect(result[0].longitude).toBeLessThanOrEqual(180);
        });

        it("last_reported_detection is a Date object", async () => {
            const csv = buildMapComparisonsCSV([IOWA]);
            const result = await processor.processMapComparisonsCSV(csv);

            expect(result[0].last_reported_detection).toBeInstanceOf(Date);
        });

        it("filters out Puerto Rico (state_abbreviation PR)", async () => {
            const prRow = { ...IOWA, stateAbbr: "PR", stateName: "Puerto Rico" };
            const csv = buildMapComparisonsCSV([prRow, MINNESOTA]);
            const result = await processor.processMapComparisonsCSV(csv);

            expect(result).toHaveLength(1);
            expect(result[0].state_abbreviation).toBe("MN");
        });
    });

    describe("Last30Days contract", () => {
        it("passes Zod validation", async () => {
            const csvs: Last30DaysCSVs = {
                affectedTotalsCSV: buildAffectedTotalsCSV() as SharedArrayBuffer,
                confirmedFlocksTotalCSV: buildConfirmedFlocksTotalCSV() as SharedArrayBuffer,
            };
            const result = await processor.processLast30DayTotalsCSVs(csvs);

            const parseResult = FlockDataSchema.shape.period_summaries.safeParse(result);
            expect(parseResult.success).toBe(true);
        });

        it("period_name is a non-empty string", async () => {
            const csvs: Last30DaysCSVs = {
                affectedTotalsCSV: buildAffectedTotalsCSV() as SharedArrayBuffer,
                confirmedFlocksTotalCSV: buildConfirmedFlocksTotalCSV() as SharedArrayBuffer,
            };
            const result = await processor.processLast30DayTotalsCSVs(csvs);

            expect(result[0].period_name).toBe("last_30_days");
        });

        it("total_birds_affected is a non-negative number", async () => {
            const csvs: Last30DaysCSVs = {
                affectedTotalsCSV: buildAffectedTotalsCSV({ birdsAffected: "50K" }) as SharedArrayBuffer,
                confirmedFlocksTotalCSV: buildConfirmedFlocksTotalCSV() as SharedArrayBuffer,
            };
            const result = await processor.processLast30DayTotalsCSVs(csvs);

            expect(result[0].total_birds_affected).toBe(50000);
            expect(result[0].total_birds_affected).toBeGreaterThanOrEqual(0);
        });

        it("total_flocks_affected is a non-negative number", async () => {
            const csvs: Last30DaysCSVs = {
                affectedTotalsCSV: buildAffectedTotalsCSV() as SharedArrayBuffer,
                confirmedFlocksTotalCSV: buildConfirmedFlocksTotalCSV("20") as SharedArrayBuffer,
            };
            const result = await processor.processLast30DayTotalsCSVs(csvs);

            expect(result[0].total_flocks_affected).toBe(20);
        });

        it("returns at most 1 element (Zod max: 4)", async () => {
            const csvs: Last30DaysCSVs = {
                affectedTotalsCSV: buildAffectedTotalsCSV() as SharedArrayBuffer,
                confirmedFlocksTotalCSV: buildConfirmedFlocksTotalCSV() as SharedArrayBuffer,
            };
            const result = await processor.processLast30DayTotalsCSVs(csvs);

            expect(result.length).toBeLessThanOrEqual(4);
        });
    });

    describe("SiteDetails contract", () => {
        it("passes Zod validation for all statuses", async () => {
            const csv = buildExportToCsvCSV([ACTIVE_SITE, RELEASED_SITE, NA_SITE]);
            const result = await processor.processExportToCsvCSV(csv);

            const parseResult = FlockDataSchema.shape.site_details.safeParse(result.site_details);
            expect(parseResult.success).toBe(true);
        });

        it("special_id is a non-empty string", async () => {
            const csv = buildExportToCsvCSV([ACTIVE_SITE]);
            const result = await processor.processExportToCsvCSV(csv);

            expect(result.site_details[0].special_id).toBe("LaGrange 89");
        });

        it("county is a non-empty string", async () => {
            const csv = buildExportToCsvCSV([ACTIVE_SITE]);
            const result = await processor.processExportToCsvCSV(csv);

            expect(result.site_details[0].county).toBe("Lagrange");
        });

        it("state is a non-empty string", async () => {
            const csv = buildExportToCsvCSV([ACTIVE_SITE]);
            const result = await processor.processExportToCsvCSV(csv);

            expect(result.site_details[0].state).toBe("Indiana");
        });

        it("production_type is a non-empty string", async () => {
            const csv = buildExportToCsvCSV([ACTIVE_SITE]);
            const result = await processor.processExportToCsvCSV(csv);

            expect(result.site_details[0].production_type).toBe("Commercial Duck Breeder");
        });

        it("status is a valid enum value", async () => {
            const csv = buildExportToCsvCSV([ACTIVE_SITE, RELEASED_SITE, NA_SITE]);
            const result = await processor.processExportToCsvCSV(csv);

            const validStatuses = ["active", "released", "na"];
            for (const site of result.site_details) {
                expect(validStatuses).toContain(site.status);
            }
        });

        it("birds_affected is a non-negative number", async () => {
            const csv = buildExportToCsvCSV([ACTIVE_SITE]);
            const result = await processor.processExportToCsvCSV(csv);

            expect(result.site_details[0].birds_affected).toBe(4600);
            expect(result.site_details[0].birds_affected).toBeGreaterThanOrEqual(0);
        });

        it("confirmed_diagnosis_date is a Date", async () => {
            const csv = buildExportToCsvCSV([ACTIVE_SITE]);
            const result = await processor.processExportToCsvCSV(csv);

            expect(result.site_details[0].confirmed_diagnosis_date).toBeInstanceOf(Date);
        });

        it("control_area_released_date is absent for active sites", async () => {
            const csv = buildExportToCsvCSV([ACTIVE_SITE]);
            const result = await processor.processExportToCsvCSV(csv);

            expect(result.site_details[0].control_area_released_date).toBeUndefined();
        });

        it("control_area_released_date is a Date for released sites", async () => {
            const csv = buildExportToCsvCSV([RELEASED_SITE]);
            const result = await processor.processExportToCsvCSV(csv);

            expect(result.site_details[0].control_area_released_date).toBeInstanceOf(Date);
        });

        it("control_area_released_date is absent for na sites", async () => {
            const csv = buildExportToCsvCSV([NA_SITE]);
            const result = await processor.processExportToCsvCSV(csv);

            expect(result.site_details[0].control_area_released_date).toBeUndefined();
        });
    });

    describe("HistoricalSummary contract", () => {
        it("passes Zod validation", async () => {
            const csv = buildExportToCsvCSV([ACTIVE_SITE, RELEASED_SITE, NA_SITE]);
            const result = await processor.processExportToCsvCSV(csv);

            const parseResult = FlockDataSchema.shape.historical_summary.safeParse(result.historical_summary);
            expect(parseResult.success).toBe(true);
        });

        it("computes correct totals across multiple sites", async () => {
            const csv = buildExportToCsvCSV([ACTIVE_SITE, RELEASED_SITE, NA_SITE]);
            const result = await processor.processExportToCsvCSV(csv);

            expect(result.historical_summary.total_birds_affected_all_time).toBe(67660);
            expect(result.historical_summary.total_sites_all_time).toBe(3);
            expect(result.historical_summary.total_active_sites).toBe(1);
            expect(result.historical_summary.total_released_sites).toBe(1);
            expect(result.historical_summary.total_na_sites).toBe(1);
            expect(result.historical_summary.total_birds_active).toBe(4600);
        });

        it("all numeric fields are non-negative", async () => {
            const csv = buildExportToCsvCSV([ACTIVE_SITE]);
            const result = await processor.processExportToCsvCSV(csv);

            const hs = result.historical_summary;
            expect(hs.total_birds_affected_all_time).toBeGreaterThanOrEqual(0);
            expect(hs.total_sites_all_time).toBeGreaterThanOrEqual(0);
            expect(hs.total_active_sites).toBeGreaterThanOrEqual(0);
            expect(hs.total_released_sites).toBeGreaterThanOrEqual(0);
            expect(hs.total_na_sites).toBeGreaterThanOrEqual(0);
            expect(hs.total_birds_active).toBeGreaterThanOrEqual(0);
        });
    });

    describe("StatusTransitionSummary contract", () => {
        it("passes Zod validation", async () => {
            const csv = buildExportToCsvCSV([ACTIVE_SITE]);
            const result = await processor.processExportToCsvCSV(csv);

            const parseResult = FlockDataSchema.shape.status_summary.safeParse(result.status_summary);
            expect(parseResult.success).toBe(true);
        });

        it("all numeric fields are non-negative", async () => {
            const csv = buildExportToCsvCSV([ACTIVE_SITE]);
            const result = await processor.processExportToCsvCSV(csv);

            expect(result.status_summary.sites_confirmed_last_30_days).toBeGreaterThanOrEqual(0);
            expect(result.status_summary.sites_released_last_30_days).toBeGreaterThanOrEqual(0);
            expect(result.status_summary.birds_affected_last_30_days).toBeGreaterThanOrEqual(0);
        });
    });

    describe("Full FlockData contract (all 5 sections combined)", () => {
        it("passes Zod validation for a complete realistic dataset", async () => {
            const mapCSV = buildMapComparisonsCSV([IOWA, MINNESOTA, CALIFORNIA]);
            const casesByState = await processor.processMapComparisonsCSV(mapCSV);

            const periodCSVs: Last30DaysCSVs = {
                affectedTotalsCSV: buildAffectedTotalsCSV() as SharedArrayBuffer,
                confirmedFlocksTotalCSV: buildConfirmedFlocksTotalCSV() as SharedArrayBuffer,
            };
            const periodSummaries = await processor.processLast30DayTotalsCSVs(periodCSVs);

            const exportCSV = buildExportToCsvCSV([ACTIVE_SITE, RELEASED_SITE, NA_SITE]);
            const { site_details, historical_summary, status_summary } =
                await processor.processExportToCsvCSV(exportCSV);

            const flockData = {
                flock_cases_by_state: casesByState,
                period_summaries: periodSummaries,
                site_details,
                historical_summary,
                status_summary,
            };

            const parseResult = FlockDataSchema.safeParse(flockData);
            if (!parseResult.success) {
                console.error(
                    "Zod validation errors:",
                    JSON.stringify(parseResult.error.issues, null, 2)
                );
            }
            expect(parseResult.success).toBe(true);
        });
    });
});
