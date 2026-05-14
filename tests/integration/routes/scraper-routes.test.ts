import request from "supertest";
import { Application } from "express";

// ---------------------------------------------------------------------------
// Mocks must be declared before any imports that pull in the real modules.
// jest.mock calls are hoisted to the top of the file by Jest.
// ---------------------------------------------------------------------------

jest.mock("../../../src/db/database.service");
jest.mock("../../../src/controllers/data.controller");
jest.mock("../../../src/controllers/scraper.controller");

// Set env vars at module scope so they are in place before App is instantiated.
// App evaluates AUTO_UPDATE in the constructor, not at import time, so this is
// sufficient — we do NOT need jest.resetModules().
process.env.AUTO_UPDATE = "false";
process.env.SCRAPE_URL = "https://example.com/scrape";
process.env.MONGODB_URI = "mongodb://localhost:27017/test";

import { DatabaseService } from "../../../src/db/database.service";
import { DataController } from "../../../src/controllers/data.controller";
import { ScraperController } from "../../../src/controllers/scraper.controller";
import { App } from "../../../src/app";

const MockedDatabaseService = jest.mocked(DatabaseService);
const MockedDataController = jest.mocked(DataController);
const MockedScraperController = jest.mocked(ScraperController);

const MOCK_FLOCK_DATA = {
    flockCasesByState: [
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
    ],
    last30Days: [
        {
            period_name: "last_30_days",
            total_birds_affected: 1234,
            total_flocks_affected: 15,
            total_backyard_flocks_affected: 5,
            total_commercial_flocks_affected: 10,
        },
    ],
};

describe("Scraper Routes", () => {
    let app: Application;
    let mockGetServerAuthID: jest.Mock;
    let mockRunScrapeJob: jest.Mock;
    let mockStopScrapeJob: jest.Mock;

    beforeAll(async () => {
        // Prevent DatabaseService.connect from opening a real connection
        MockedDatabaseService.connect = jest.fn().mockResolvedValue(undefined);

        mockGetServerAuthID = jest.fn();
        mockRunScrapeJob = jest.fn();
        mockStopScrapeJob = jest.fn();

        MockedDataController.prototype.getServerAuthID = mockGetServerAuthID;
        MockedScraperController.prototype.runScrapeJob = mockRunScrapeJob;
        MockedScraperController.prototype.stopScrapeJob = mockStopScrapeJob;

        // Instantiate App once — all tests share the same express instance.
        // The mock assignments above are in place before the constructor runs
        // because we set them in this beforeAll before calling new App().
        app = new App().app;

        // Allow the async serverStart() inside the App constructor to settle
        await new Promise((resolve) => setTimeout(resolve, 100));
    });

    beforeEach(() => {
        // clearAllMocks resets call history but NOT implementations, so we
        // only need to restore prototype assignments here.
        jest.clearAllMocks();

        MockedDataController.prototype.getServerAuthID = mockGetServerAuthID;
        MockedScraperController.prototype.runScrapeJob = mockRunScrapeJob;
        MockedScraperController.prototype.stopScrapeJob = mockStopScrapeJob;
    });

    // -------------------------------------------------------------------------
    // GET / - default root route
    // -------------------------------------------------------------------------
    describe("GET /", () => {
        it("returns 200 with the default message", async () => {
            const res = await request(app).get("/");

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ message: "Nothing here but us Robots" });
        });
    });

    // -------------------------------------------------------------------------
    // GET /scraper/get-data - auth validation
    // -------------------------------------------------------------------------
    describe("GET /scraper/get-data - auth validation", () => {
        it("returns 403 when no Authorization header is provided", async () => {
            mockGetServerAuthID.mockResolvedValueOnce("valid-auth-id");

            const res = await request(app).get("/scraper/get-data");

            expect(res.status).toBe(403);
        });

        it("returns 403 when the Authorization header has the wrong token", async () => {
            mockGetServerAuthID.mockResolvedValueOnce("valid-auth-id");

            const res = await request(app)
                .get("/scraper/get-data")
                .set("Authorization", "Bearer wrong-auth-id");

            expect(res.status).toBe(403);
        });

        it("returns 403 when the Authorization header is malformed (no Bearer prefix)", async () => {
            mockGetServerAuthID.mockResolvedValueOnce("valid-auth-id");

            const res = await request(app)
                .get("/scraper/get-data")
                .set("Authorization", "valid-auth-id");

            expect(res.status).toBe(403);
        });

        it("returns 403 when the auth token is an empty string after Bearer", async () => {
            mockGetServerAuthID.mockResolvedValueOnce("valid-auth-id");

            const res = await request(app)
                .get("/scraper/get-data")
                .set("Authorization", "Bearer ");

            expect(res.status).toBe(403);
        });
    });

    // -------------------------------------------------------------------------
    // GET /scraper/get-data - valid auth, successful scrape
    // -------------------------------------------------------------------------
    describe("GET /scraper/get-data - valid auth", () => {
        const VALID_AUTH_ID = "valid-auth-id";

        beforeEach(() => {
            mockGetServerAuthID.mockResolvedValue(VALID_AUTH_ID);
            mockRunScrapeJob.mockResolvedValue(MOCK_FLOCK_DATA);
            mockStopScrapeJob.mockResolvedValue(undefined);
        });

        it("returns 200 when the correct auth token is provided", async () => {
            const res = await request(app)
                .get("/scraper/get-data")
                .set("Authorization", `Bearer ${VALID_AUTH_ID}`);

            expect(res.status).toBe(200);
        });

        it("returns the flock data as JSON", async () => {
            const res = await request(app)
                .get("/scraper/get-data")
                .set("Authorization", `Bearer ${VALID_AUTH_ID}`);

            expect(res.body).toHaveProperty("flockCasesByState");
            expect(res.body).toHaveProperty("last30Days");
        });

        it("calls runScrapeJob exactly once", async () => {
            await request(app)
                .get("/scraper/get-data")
                .set("Authorization", `Bearer ${VALID_AUTH_ID}`);

            expect(mockRunScrapeJob).toHaveBeenCalledTimes(1);
        });

        it("calls stopScrapeJob in the finally block", async () => {
            await request(app)
                .get("/scraper/get-data")
                .set("Authorization", `Bearer ${VALID_AUTH_ID}`);

            expect(mockStopScrapeJob).toHaveBeenCalled();
        });

        it("constructs ScraperController with headless=true", async () => {
            await request(app)
                .get("/scraper/get-data")
                .set("Authorization", `Bearer ${VALID_AUTH_ID}`);

            expect(MockedScraperController).toHaveBeenCalledWith(
                true,
                expect.any(String),
                expect.any(String)
            );
        });
    });

    // -------------------------------------------------------------------------
    // GET /scraper/get-data - scrape job throws
    // -------------------------------------------------------------------------
    describe("GET /scraper/get-data - scrape job error", () => {
        it("returns 500 when runScrapeJob throws", async () => {
            mockGetServerAuthID.mockResolvedValue("valid-auth-id");
            mockRunScrapeJob.mockRejectedValueOnce(
                new Error("Playwright failed")
            );
            mockStopScrapeJob.mockResolvedValue(undefined);

            const res = await request(app)
                .get("/scraper/get-data")
                .set("Authorization", "Bearer valid-auth-id");

            expect(res.status).toBe(500);
        });

        it("still calls stopScrapeJob when runScrapeJob throws", async () => {
            mockGetServerAuthID.mockResolvedValue("valid-auth-id");
            mockRunScrapeJob.mockRejectedValueOnce(
                new Error("Playwright failed")
            );
            mockStopScrapeJob.mockResolvedValue(undefined);

            await request(app)
                .get("/scraper/get-data")
                .set("Authorization", "Bearer valid-auth-id");

            expect(mockStopScrapeJob).toHaveBeenCalled();
        });
    });
});
