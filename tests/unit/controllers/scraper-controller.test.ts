import { ScraperController } from "../../../src/controllers/scraper.controller";
import { ScraperContext } from "../../../src/modules/scraper/scraper.context";
import { USDAScrapingService } from "../../../src/modules/scraper/usda-scraping.service";
import { DataProcessor } from "../../../src/modules/data-processing/data-processor";

jest.mock("../../../src/modules/scraper/scraper.context");
jest.mock("../../../src/modules/scraper/usda-scraping.service");
jest.mock("../../../src/modules/data-processing/data-processor");

const MockedScraperContext = jest.mocked(ScraperContext);
const MockedUSDAScrapingService = jest.mocked(USDAScrapingService);
const MockedDataProcessor = jest.mocked(DataProcessor);

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const MOCK_MAP_COMPARISON_CSV = new ArrayBuffer(8);
const MOCK_LAST_30_DAYS_CSVS = {
    affectedTotalsCSV: new ArrayBuffer(8) as SharedArrayBuffer,
    confirmedFlocksTotalCSV: new ArrayBuffer(8) as SharedArrayBuffer,
};
const MOCK_EXPORT_TO_CSV_DATA = new ArrayBuffer(16);

const MOCK_FLOCK_CASES = [
    {
        state_abbreviation: "IA",
        state: "Iowa",
        birds_affected: 1200,
        backyard_flocks: 3,
        commercial_flocks: 8,
        total_flocks: 11,
        latitude: 41.878,
        longitude: -93.097,
        last_reported_detection: new Date("2025-01-30T00:00:00.000Z"),
    },
];

const MOCK_LAST_30_DAYS = [
    {
        period_name: "last_30_days",
        total_birds_affected: 1234,
        total_flocks_affected: 15,
        total_backyard_flocks_affected: 5,
        total_commercial_flocks_affected: 10,
    },
];

const MOCK_SITE_DETAILS = [
    {
        special_id: "LaGrange 89",
        county: "Lagrange",
        state: "Indiana",
        production_type: "Commercial Duck Breeder",
        confirmed_diagnosis_date: new Date("2026-05-08T00:00:00.000Z"),
        status: "active" as const,
        birds_affected: 4600,
    },
];

const MOCK_HISTORICAL_SUMMARY = {
    total_birds_affected_all_time: 100000,
    total_sites_all_time: 50,
    total_active_sites: 5,
    total_released_sites: 30,
    total_na_sites: 15,
    total_birds_active: 10000,
};

const MOCK_STATUS_SUMMARY = {
    sites_confirmed_last_30_days: 3,
    sites_released_last_30_days: 2,
    birds_affected_last_30_days: 5000,
};

describe("ScraperController", () => {
    let mockSetupBrowser: jest.Mock;
    let mockClose: jest.Mock;
    let mockGetBrowser: jest.Mock;
    let mockGetAllTimeTotals: jest.Mock;
    let mockGetLast30Days: jest.Mock;
    let mockGetExportToCsvData: jest.Mock;
    let mockProcessMapComparisonsCSV: jest.Mock;
    let mockProcessLast30DayTotalsCSVs: jest.Mock;
    let mockProcessExportToCsvCSV: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // ScraperContext mocks
        mockSetupBrowser = jest.fn().mockResolvedValue(undefined);
        mockClose = jest.fn().mockResolvedValue(undefined);
        // Return a truthy browser object so initContext is not called by default
        mockGetBrowser = jest.fn().mockReturnValue({ connected: true });

        MockedScraperContext.prototype.setupBrowser = mockSetupBrowser;
        MockedScraperContext.prototype.close = mockClose;
        MockedScraperContext.prototype.getBrowser = mockGetBrowser;

        // USDAScrapingService mocks
        mockGetAllTimeTotals = jest
            .fn()
            .mockResolvedValue(MOCK_MAP_COMPARISON_CSV);
        mockGetLast30Days = jest.fn().mockResolvedValue(MOCK_LAST_30_DAYS_CSVS);
        mockGetExportToCsvData = jest
            .fn()
            .mockResolvedValue(MOCK_EXPORT_TO_CSV_DATA);

        MockedUSDAScrapingService.prototype.getAllTimeTotals =
            mockGetAllTimeTotals;
        MockedUSDAScrapingService.prototype.getLast30Days = mockGetLast30Days;
        MockedUSDAScrapingService.prototype.getExportToCsvData =
            mockGetExportToCsvData;

        // DataProcessor mocks
        mockProcessMapComparisonsCSV = jest
            .fn()
            .mockResolvedValue(MOCK_FLOCK_CASES);
        mockProcessLast30DayTotalsCSVs = jest
            .fn()
            .mockResolvedValue(MOCK_LAST_30_DAYS);
        mockProcessExportToCsvCSV = jest.fn().mockResolvedValue({
            site_details: MOCK_SITE_DETAILS,
            historical_summary: MOCK_HISTORICAL_SUMMARY,
            status_summary: MOCK_STATUS_SUMMARY,
        });

        MockedDataProcessor.prototype.processMapComparisonsCSV =
            mockProcessMapComparisonsCSV;
        MockedDataProcessor.prototype.processLast30DayTotalsCSVs =
            mockProcessLast30DayTotalsCSVs;
        MockedDataProcessor.prototype.processExportToCsvCSV =
            mockProcessExportToCsvCSV;
    });

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    describe("constructor", () => {
        it("creates a ScraperContext with the provided arguments", () => {
            new ScraperController(
                true,
                "data-tb-test-id",
                "https://example.com"
            );

            expect(MockedScraperContext).toHaveBeenCalledWith(
                true,
                "data-tb-test-id",
                "https://example.com"
            );
        });

        it("creates a ScraperContext with headless=false when specified", () => {
            new ScraperController(
                false,
                "data-tb-test-id",
                "https://example.com"
            );

            expect(MockedScraperContext).toHaveBeenCalledWith(
                false,
                expect.any(String),
                expect.any(String)
            );
        });
    });

    // -------------------------------------------------------------------------
    // runScrapeJob - happy path
    // -------------------------------------------------------------------------
    describe("runScrapeJob - successful scrape", () => {
        let controller: ScraperController;

        beforeEach(() => {
            controller = new ScraperController(
                true,
                "data-tb-test-id",
                "https://example.com"
            );
        });

        it("returns a FlockData object with flock_cases_by_state", async () => {
            const result = await controller.runScrapeJob();

            expect(result).toHaveProperty("flock_cases_by_state");
        });

        it("returns a FlockData object with period_summaries", async () => {
            const result = await controller.runScrapeJob();

            expect(result).toHaveProperty("period_summaries");
        });

        it("returns a FlockData object with site_details", async () => {
            const result = await controller.runScrapeJob();

            expect(result).toHaveProperty("site_details");
        });

        it("returns a FlockData object with historical_summary", async () => {
            const result = await controller.runScrapeJob();

            expect(result).toHaveProperty("historical_summary");
        });

        it("returns a FlockData object with status_summary", async () => {
            const result = await controller.runScrapeJob();

            expect(result).toHaveProperty("status_summary");
        });

        it("populates flock_cases_by_state with the processed data", async () => {
            const result = await controller.runScrapeJob();

            expect(result.flock_cases_by_state).toBe(MOCK_FLOCK_CASES);
        });

        it("populates period_summaries with the processed data", async () => {
            const result = await controller.runScrapeJob();

            expect(result.period_summaries).toBe(MOCK_LAST_30_DAYS);
        });

        it("populates site_details with the processed data", async () => {
            const result = await controller.runScrapeJob();

            expect(result.site_details).toBe(MOCK_SITE_DETAILS);
        });

        it("populates historical_summary with the processed data", async () => {
            const result = await controller.runScrapeJob();

            expect(result.historical_summary).toBe(MOCK_HISTORICAL_SUMMARY);
        });

        it("populates status_summary with the processed data", async () => {
            const result = await controller.runScrapeJob();

            expect(result.status_summary).toBe(MOCK_STATUS_SUMMARY);
        });

        it("calls getAllTimeTotals exactly once", async () => {
            await controller.runScrapeJob();

            expect(mockGetAllTimeTotals).toHaveBeenCalledTimes(1);
        });

        it("calls getLast30Days exactly once", async () => {
            await controller.runScrapeJob();

            expect(mockGetLast30Days).toHaveBeenCalledTimes(1);
        });

        it("calls getExportToCsvData exactly once", async () => {
            await controller.runScrapeJob();

            expect(mockGetExportToCsvData).toHaveBeenCalledTimes(1);
        });

        it("calls processMapComparisonsCSV with the CSV from getAllTimeTotals", async () => {
            await controller.runScrapeJob();

            expect(mockProcessMapComparisonsCSV).toHaveBeenCalledWith(
                MOCK_MAP_COMPARISON_CSV
            );
        });

        it("calls processLast30DayTotalsCSVs with the CSVs from getLast30Days", async () => {
            await controller.runScrapeJob();

            expect(mockProcessLast30DayTotalsCSVs).toHaveBeenCalledWith(
                MOCK_LAST_30_DAYS_CSVS
            );
        });

        it("calls processExportToCsvCSV with the CSV from getExportToCsvData", async () => {
            await controller.runScrapeJob();

            expect(mockProcessExportToCsvCSV).toHaveBeenCalledWith(
                MOCK_EXPORT_TO_CSV_DATA
            );
        });

        it("calls getExportToCsvData after getLast30Days", async () => {
            await controller.runScrapeJob();

            const getLast30DaysOrder =
                mockGetLast30Days.mock.invocationCallOrder[0];
            const getExportToCsvOrder =
                mockGetExportToCsvData.mock.invocationCallOrder[0];

            expect(getExportToCsvOrder).toBeGreaterThan(getLast30DaysOrder);
        });

        it("calls stopScrapeJob (closes the context) on success", async () => {
            await controller.runScrapeJob();

            expect(mockClose).toHaveBeenCalled();
        });
    });

    // -------------------------------------------------------------------------
    // runScrapeJob - browser context not initialised
    // -------------------------------------------------------------------------
    describe("runScrapeJob - no browser context yet", () => {
        it("calls setupBrowser when getBrowser returns falsy", async () => {
            // Simulate context not yet initialised
            mockGetBrowser.mockReturnValue(null);

            const controller = new ScraperController(
                true,
                "data-tb-test-id",
                "https://example.com"
            );

            await controller.runScrapeJob();

            expect(mockSetupBrowser).toHaveBeenCalledTimes(1);
        });
    });

    // -------------------------------------------------------------------------
    // runScrapeJob - error handling
    // -------------------------------------------------------------------------
    describe("runScrapeJob - error handling", () => {
        let controller: ScraperController;

        beforeEach(() => {
            controller = new ScraperController(
                true,
                "data-tb-test-id",
                "https://example.com"
            );
        });

        it("throws when getAllTimeTotals rejects", async () => {
            mockGetAllTimeTotals.mockRejectedValueOnce(
                new Error("Playwright failed")
            );

            await expect(controller.runScrapeJob()).rejects.toThrow(
                "Error processing data"
            );
        });

        it("throws when getLast30Days rejects", async () => {
            mockGetLast30Days.mockRejectedValueOnce(
                new Error("Playwright failed")
            );

            await expect(controller.runScrapeJob()).rejects.toThrow(
                "Error processing data"
            );
        });

        it("throws when processMapComparisonsCSV rejects", async () => {
            mockProcessMapComparisonsCSV.mockRejectedValueOnce(
                new Error("CSV parse error")
            );

            await expect(controller.runScrapeJob()).rejects.toThrow(
                "Error processing data"
            );
        });

        it("throws when processLast30DayTotalsCSVs rejects", async () => {
            mockProcessLast30DayTotalsCSVs.mockRejectedValueOnce(
                new Error("CSV parse error")
            );

            await expect(controller.runScrapeJob()).rejects.toThrow(
                "Error processing data"
            );
        });

        it("throws when getExportToCsvData rejects", async () => {
            mockGetExportToCsvData.mockRejectedValueOnce(
                new Error("Playwright failed")
            );

            await expect(controller.runScrapeJob()).rejects.toThrow(
                "Error processing data"
            );
        });

        it("throws when processExportToCsvCSV rejects", async () => {
            mockProcessExportToCsvCSV.mockRejectedValueOnce(
                new Error("CSV parse error")
            );

            await expect(controller.runScrapeJob()).rejects.toThrow(
                "Error processing data"
            );
        });

        it("returns a rejected promise when an error occurs after the job was externally stopped", async () => {
            mockGetAllTimeTotals.mockRejectedValueOnce(
                new Error("Playwright failed")
            );
            await controller.stopScrapeJob();

            await expect(controller.runScrapeJob()).rejects.toThrow(
                "Playwright failed"
            );
        });
    });

    // -------------------------------------------------------------------------
    // stopScrapeJob
    // -------------------------------------------------------------------------
    describe("stopScrapeJob", () => {
        it("calls scrapeContext.close()", async () => {
            const controller = new ScraperController(
                true,
                "data-tb-test-id",
                "https://example.com"
            );

            await controller.stopScrapeJob();

            expect(mockClose).toHaveBeenCalledTimes(1);
        });

        it("is idempotent — calling it twice only closes the context once", async () => {
            const controller = new ScraperController(
                true,
                "data-tb-test-id",
                "https://example.com"
            );

            await controller.stopScrapeJob();
            await controller.stopScrapeJob();

            expect(mockClose).toHaveBeenCalledTimes(1);
        });
    });
});
