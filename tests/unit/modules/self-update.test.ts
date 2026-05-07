import { SelfUpdate } from "../../../src/modules/update-data/self-update.service";
import { DataController } from "../../../src/controllers/data.controller";
import { ScraperController } from "../../../src/controllers/scraper.controller";

// Mock both controllers so no DB or browser calls are made
jest.mock("../../../src/controllers/data.controller");
jest.mock("../../../src/controllers/scraper.controller");

const MockedDataController = jest.mocked(DataController);
const MockedScraperController = jest.mocked(ScraperController);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns an ISO date string that is `hoursAgo` hours in the past */
function dateHoursAgo(hoursAgo: number): string {
    const d = new Date();
    d.setHours(d.getHours() - hoursAgo);
    return d.toISOString();
}

const MOCK_FLOCK_DATA = {
    flockCasesByState: [],
    last30Days: [],
};

describe("SelfUpdate", () => {
    let selfUpdate: SelfUpdate;
    let mockGetLastScrapedDate: jest.Mock;
    let mockRunScrapeJob: jest.Mock;
    let mockStopScrapeJob: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockGetLastScrapedDate = jest.fn();
        mockRunScrapeJob = jest.fn();
        mockStopScrapeJob = jest.fn();

        MockedDataController.prototype.getLastScrapedDate =
            mockGetLastScrapedDate;
        MockedScraperController.prototype.runScrapeJob = mockRunScrapeJob;
        MockedScraperController.prototype.stopScrapeJob = mockStopScrapeJob;

        // Set the SCRAPE_URL env var the ScraperController constructor expects
        process.env.SCRAPE_URL = "https://example.com/scrape";

        selfUpdate = new SelfUpdate();
    });

    // -------------------------------------------------------------------------
    // updateIfOutdated - data is fresh (within 24 hours)
    // -------------------------------------------------------------------------
    describe("updateIfOutdated - data is not outdated", () => {
        it("returns void when last scraped date is less than 24 hours ago", async () => {
            mockGetLastScrapedDate.mockResolvedValueOnce(dateHoursAgo(12));

            const result = await selfUpdate.updateIfOutdated();

            expect(result).toBeUndefined();
        });

        it("does not run the scraper when data is fresh", async () => {
            mockGetLastScrapedDate.mockResolvedValueOnce(dateHoursAgo(1));

            await selfUpdate.updateIfOutdated();

            expect(mockRunScrapeJob).not.toHaveBeenCalled();
        });

        it("returns void when last scraped date is exactly 23 hours ago", async () => {
            mockGetLastScrapedDate.mockResolvedValueOnce(dateHoursAgo(23));

            const result = await selfUpdate.updateIfOutdated();

            expect(result).toBeUndefined();
        });
    });

    // -------------------------------------------------------------------------
    // updateIfOutdated - data is outdated (>= 24 hours)
    // -------------------------------------------------------------------------
    describe("updateIfOutdated - data is outdated", () => {
        it("returns FlockData when data is exactly 24 hours old", async () => {
            mockGetLastScrapedDate.mockResolvedValueOnce(dateHoursAgo(24));
            mockRunScrapeJob.mockResolvedValueOnce(MOCK_FLOCK_DATA);

            const result = await selfUpdate.updateIfOutdated();

            expect(result).toBe(MOCK_FLOCK_DATA);
        });

        it("returns FlockData when data is more than 24 hours old", async () => {
            mockGetLastScrapedDate.mockResolvedValueOnce(dateHoursAgo(48));
            mockRunScrapeJob.mockResolvedValueOnce(MOCK_FLOCK_DATA);

            const result = await selfUpdate.updateIfOutdated();

            expect(result).toBe(MOCK_FLOCK_DATA);
        });

        it("calls runScrapeJob exactly once when outdated", async () => {
            mockGetLastScrapedDate.mockResolvedValueOnce(dateHoursAgo(25));
            mockRunScrapeJob.mockResolvedValueOnce(MOCK_FLOCK_DATA);

            await selfUpdate.updateIfOutdated();

            expect(mockRunScrapeJob).toHaveBeenCalledTimes(1);
        });

        it("constructs ScraperController with headless=true", async () => {
            mockGetLastScrapedDate.mockResolvedValueOnce(dateHoursAgo(25));
            mockRunScrapeJob.mockResolvedValueOnce(MOCK_FLOCK_DATA);

            await selfUpdate.updateIfOutdated();

            expect(MockedScraperController).toHaveBeenCalledWith(
                true,
                expect.any(String),
                expect.any(String)
            );
        });

        it("constructs ScraperController with the correct testId attribute", async () => {
            mockGetLastScrapedDate.mockResolvedValueOnce(dateHoursAgo(25));
            mockRunScrapeJob.mockResolvedValueOnce(MOCK_FLOCK_DATA);

            await selfUpdate.updateIfOutdated();

            expect(MockedScraperController).toHaveBeenCalledWith(
                expect.any(Boolean),
                "data-tb-test-id",
                expect.any(String)
            );
        });

        it("constructs ScraperController with SCRAPE_URL from env", async () => {
            mockGetLastScrapedDate.mockResolvedValueOnce(dateHoursAgo(25));
            mockRunScrapeJob.mockResolvedValueOnce(MOCK_FLOCK_DATA);

            await selfUpdate.updateIfOutdated();

            expect(MockedScraperController).toHaveBeenCalledWith(
                expect.any(Boolean),
                expect.any(String),
                "https://example.com/scrape"
            );
        });
    });

    // -------------------------------------------------------------------------
    // updateIfOutdated - boundary conditions for isOutdated
    // -------------------------------------------------------------------------
    describe("updateIfOutdated - isOutdated boundary", () => {
        it("treats a date exactly 1ms under 24 hours as fresh", async () => {
            const almostOutdated = new Date(
                Date.now() - (24 * 60 * 60 * 1000 - 1)
            ).toISOString();
            mockGetLastScrapedDate.mockResolvedValueOnce(almostOutdated);

            const result = await selfUpdate.updateIfOutdated();

            expect(result).toBeUndefined();
            expect(mockRunScrapeJob).not.toHaveBeenCalled();
        });

        it("treats a date exactly 24 hours ago as outdated", async () => {
            const exactlyOutdated = new Date(
                Date.now() - 24 * 60 * 60 * 1000
            ).toISOString();
            mockGetLastScrapedDate.mockResolvedValueOnce(exactlyOutdated);
            mockRunScrapeJob.mockResolvedValueOnce(MOCK_FLOCK_DATA);

            const result = await selfUpdate.updateIfOutdated();

            expect(result).toBe(MOCK_FLOCK_DATA);
        });
    });

    // -------------------------------------------------------------------------
    // updateIfOutdated - DataController error propagates
    // -------------------------------------------------------------------------
    describe("updateIfOutdated - error handling", () => {
        it("propagates errors thrown by getLastScrapedDate", async () => {
            mockGetLastScrapedDate.mockRejectedValueOnce(
                new Error("DB connection failed")
            );

            await expect(selfUpdate.updateIfOutdated()).rejects.toThrow(
                "DB connection failed"
            );
        });

        it("propagates errors thrown by runScrapeJob", async () => {
            mockGetLastScrapedDate.mockResolvedValueOnce(dateHoursAgo(25));
            mockRunScrapeJob.mockRejectedValueOnce(
                new Error("Scrape job failed")
            );

            await expect(selfUpdate.updateIfOutdated()).rejects.toThrow(
                "Scrape job failed"
            );
        });
    });
});