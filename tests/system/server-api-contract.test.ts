process.env.AUTO_UPDATE = "false";
process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_MAX = "100";

import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { FlockCasesByStateService } from "../../../FlockWatch-Server/src/modules/flock-cases-by-state/flock-cases-by-state.service";
import { USSummaryService } from "../../../FlockWatch-Server/src/modules/us-summary/us-summary.service";
import { SiteDetailsService } from "../../../FlockWatch-Server/src/modules/site-details/site-details.service";
import { HistoricalSummaryService } from "../../../FlockWatch-Server/src/modules/historical-summary/historical-summary.service";
import { StatusSummaryService } from "../../../FlockWatch-Server/src/modules/status-summary/status-summary.service";
import type { Express } from "express";

let mongod: MongoMemoryServer;
let app: Express;

const startMongo = async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;

    // Connect the Server's own Mongoose instance (used by its service classes/models).
    // We require() instead of import() to avoid "--experimental-vm-modules" requirement.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serverMongoose = require("../../../FlockWatch-Server/node_modules/mongoose");
    await serverMongoose.connect(uri);
};

const stopMongo = async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serverMongoose = require("../../../FlockWatch-Server/node_modules/mongoose");
    await serverMongoose.disconnect();
    await mongod.stop();
};

const clearData = async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serverMongoose = require("../../../FlockWatch-Server/node_modules/mongoose");
    const collections = serverMongoose.connection.collections;
    for (const key in collections) {
        // Preserve auth ID across POST tests within a single describe block
        if (key === "last-report-date") continue;
        await collections[key].deleteMany({});
    }
};

describe("Server API contract", () => {
    beforeAll(async () => {
        await startMongo();
        // Load the App once via require() and keep the instance for all tests.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { App } = require("../../../FlockWatch-Server/src/app");
        const server = new App();
        app = server.app;
    });

    afterAll(async () => {
        await stopMongo();
    });

    afterEach(async () => {
        await clearData();
    });

    describe("GET /", () => {
        it("returns welcome message", async () => {
            const res = await request(app)
                .get("/")
                .expect("Content-Type", /json/)
                .expect(200);
            expect(res.body.message).toBe("Nothing here but us Chickens");
        });
    });

    describe("GET /data/flock-cases", () => {
        const stateData = [
            {
                state_abbreviation: "IA",
                state: "Iowa",
                backyard_flocks: 3,
                commercial_flocks: 8,
                birds_affected: 1200,
                total_flocks: 11,
                latitude: 41.878,
                longitude: -93.097,
                last_reported_detection: new Date("2025-01-30"),
            },
            {
                state_abbreviation: "MN",
                state: "Minnesota",
                backyard_flocks: 2,
                commercial_flocks: 5,
                birds_affected: 500,
                total_flocks: 7,
                latitude: 46.729,
                longitude: -94.685,
                last_reported_detection: new Date("2025-02-14"),
            },
        ];

        beforeEach(async () => {
            const svc = new FlockCasesByStateService();
            await svc.createOrUpdateStateData(stateData);
        });

        it("returns all flock cases as array under data key", async () => {
            const res = await request(app)
                .get("/data/flock-cases")
                .expect(200);

            expect(res.body).toHaveProperty("data");
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data).toHaveLength(2);
        });

        it("each record has the expected shape", async () => {
            const res = await request(app)
                .get("/data/flock-cases")
                .expect(200);

            const entry = res.body.data[0];
            expect(entry).toHaveProperty("state_abbreviation");
            expect(entry).toHaveProperty("state");
            expect(entry).toHaveProperty("backyard_flocks");
            expect(entry).toHaveProperty("commercial_flocks");
            expect(entry).toHaveProperty("birds_affected");
            expect(entry).toHaveProperty("total_flocks");
            expect(entry).toHaveProperty("latitude");
            expect(entry).toHaveProperty("longitude");
            expect(entry).toHaveProperty("last_reported_detection");
            expect(typeof entry.birds_affected).toBe("number");
            expect(typeof entry.state_abbreviation).toBe("string");
        });

        it("includes metadata with last_scraped_date", async () => {
            const res = await request(app)
                .get("/data/flock-cases")
                .expect(200);

            expect(res.body).toHaveProperty("metadata");
        });
    });

    describe("GET /data/flock-cases/:stateAbbreviation", () => {
        beforeEach(async () => {
            const svc = new FlockCasesByStateService();
            await svc.createOrUpdateStateData([
                {
                    state_abbreviation: "IA",
                    state: "Iowa",
                    backyard_flocks: 3,
                    commercial_flocks: 8,
                    birds_affected: 1200,
                    total_flocks: 11,
                    latitude: 41.878,
                    longitude: -93.097,
                    last_reported_detection: new Date("2025-01-30"),
                },
            ]);
        });

        it("returns the state case for a valid abbreviation", async () => {
            const res = await request(app)
                .get("/data/flock-cases/IA")
                .expect(200);

            expect(res.body.data.state_abbreviation).toBe("IA");
            expect(res.body.data.state).toBe("Iowa");
        });

        it("returns 404 for non-existent state", async () => {
            await request(app)
                .get("/data/flock-cases/ZZ")
                .expect(404);
        });

        it("returns 400 for invalid abbreviation format", async () => {
            await request(app)
                .get("/data/flock-cases/ABC")
                .expect(400);
        });
    });

    describe("GET /data/us-summary", () => {
        beforeEach(async () => {
            const svc = new USSummaryService();
            await svc.upsertUSSummary({
                key: "us-summary",
                all_time_totals: {
                    total_states_affected: 51,
                    total_birds_affected: 1000000,
                    total_flocks_affected: 500,
                    total_backyard_flocks_affected: 300,
                    total_commercial_flocks_affected: 200,
                },
                period_summaries: [
                    {
                        period_name: "last_7_days",
                        total_birds_affected: 10000,
                        total_flocks_affected: 20,
                        total_backyard_flocks_affected: 10,
                        total_commercial_flocks_affected: 10,
                    },
                    {
                        period_name: "last_30_days",
                        total_birds_affected: 50000,
                        total_flocks_affected: 100,
                        total_backyard_flocks_affected: 50,
                        total_commercial_flocks_affected: 50,
                    },
                ],
            });
        });

        it("returns all-time totals and period summaries", async () => {
            const res = await request(app)
                .get("/data/us-summary")
                .expect(200);

            expect(res.body.data.all_time_totals.total_birds_affected).toBe(
                1000000
            );
            expect(res.body.data.all_time_totals.total_states_affected).toBe(
                51
            );
            expect(
                res.body.data.period_summaries.last_7_days.total_birds_affected
            ).toBe(10000);
            expect(
                res.body.data.period_summaries.last_30_days.total_birds_affected
            ).toBe(50000);
        });

        it("includes metadata", async () => {
            const res = await request(app)
                .get("/data/us-summary")
                .expect(200);

            expect(res.body).toHaveProperty("metadata");
        });
    });

    describe("GET /data/sites", () => {
        beforeEach(async () => {
            const svc = new SiteDetailsService();
            await svc.upsertSiteDetails([
                {
                    special_id: "Site-001",
                    county: "County A",
                    state: "Iowa",
                    production_type: "Commercial Broiler Breeder",
                    confirmed_diagnosis_date: new Date("2025-01-15"),
                    status: "active",
                    birds_affected: 1000,
                },
                {
                    special_id: "Site-002",
                    county: "County B",
                    state: "Minnesota",
                    production_type: "Commercial Turkey Meat Bird",
                    confirmed_diagnosis_date: new Date("2025-02-01"),
                    status: "released",
                    control_area_released_date: new Date("2025-03-01"),
                    birds_affected: 5000,
                },
                {
                    special_id: "Site-003",
                    county: "County C",
                    state: "South Dakota",
                    production_type: "WOAH Non-Poultry",
                    confirmed_diagnosis_date: new Date("2025-01-20"),
                    status: "na",
                    birds_affected: 50,
                },
                {
                    special_id: "Site-004",
                    county: "County D",
                    state: "Iowa",
                    production_type: "Commercial Broiler Breeder",
                    confirmed_diagnosis_date: new Date("2025-03-01"),
                    status: "active",
                    birds_affected: 2000,
                },
            ]);
        });

        it("returns paginated sites with total count", async () => {
            const res = await request(app)
                .get("/data/sites")
                .expect(200);

            expect(res.body.data).toHaveLength(4);
            expect(res.body.total).toBe(4);
            expect(res.body.page).toBe(1);
            expect(res.body.limit).toBe(100);
            expect(res.body.totalPages).toBe(1);
        });

        it("supports page and limit query params", async () => {
            const res = await request(app)
                .get("/data/sites?page=1&limit=2")
                .expect(200);

            expect(res.body.data).toHaveLength(2);
            expect(res.body.total).toBe(4);
            expect(res.body.page).toBe(1);
            expect(res.body.limit).toBe(2);
            expect(res.body.totalPages).toBe(2);
        });

        it("each site has the expected shape", async () => {
            const res = await request(app)
                .get("/data/sites")
                .expect(200);

            const site = res.body.data[0];
            expect(site).toHaveProperty("special_id");
            expect(site).toHaveProperty("county");
            expect(site).toHaveProperty("state");
            expect(site).toHaveProperty("production_type");
            expect(site).toHaveProperty("confirmed_diagnosis_date");
            expect(site).toHaveProperty("status");
            expect(site).toHaveProperty("birds_affected");
            expect(typeof site.birds_affected).toBe("number");
        });
    });

    describe("GET /data/sites/status/:status", () => {
        beforeEach(async () => {
            const svc = new SiteDetailsService();
            await svc.upsertSiteDetails([
                {
                    special_id: "S1",
                    county: "A",
                    state: "IA",
                    production_type: "Commercial",
                    confirmed_diagnosis_date: new Date("2025-01-01"),
                    status: "active",
                    birds_affected: 100,
                },
                {
                    special_id: "S2",
                    county: "B",
                    state: "MN",
                    production_type: "Commercial",
                    confirmed_diagnosis_date: new Date("2025-02-01"),
                    status: "released",
                    control_area_released_date: new Date("2025-03-01"),
                    birds_affected: 200,
                },
                {
                    special_id: "S3",
                    county: "C",
                    state: "SD",
                    production_type: "Backyard",
                    confirmed_diagnosis_date: new Date("2025-01-15"),
                    status: "na",
                    birds_affected: 10,
                },
            ]);
        });

        it("filters by active status", async () => {
            const res = await request(app)
                .get("/data/sites/status/active")
                .expect(200);

            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].status).toBe("active");
        });

        it("filters by released status", async () => {
            const res = await request(app)
                .get("/data/sites/status/released")
                .expect(200);

            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].status).toBe("released");
        });

        it("filters by na status", async () => {
            const res = await request(app)
                .get("/data/sites/status/na")
                .expect(200);

            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].status).toBe("na");
        });

        it("returns 400 for invalid status", async () => {
            await request(app)
                .get("/data/sites/status/invalid")
                .expect(400);
        });
    });

    describe("GET /data/sites/production-type/:productionType", () => {
        beforeEach(async () => {
            const svc = new SiteDetailsService();
            await svc.upsertSiteDetails([
                {
                    special_id: "S1",
                    county: "A",
                    state: "IA",
                    production_type: "Commercial Broiler Breeder",
                    confirmed_diagnosis_date: new Date("2025-01-01"),
                    status: "active",
                    birds_affected: 100,
                },
                {
                    special_id: "S2",
                    county: "B",
                    state: "MN",
                    production_type: "Commercial Table Eggs",
                    confirmed_diagnosis_date: new Date("2025-02-01"),
                    status: "released",
                    control_area_released_date: new Date("2025-03-01"),
                    birds_affected: 200,
                },
                {
                    special_id: "S3",
                    county: "C",
                    state: "IA",
                    production_type: "Commercial Broiler Breeder",
                    confirmed_diagnosis_date: new Date("2025-03-01"),
                    status: "active",
                    birds_affected: 150,
                },
            ]);
        });

        it("filters by production type", async () => {
            const res = await request(app)
                .get(
                    "/data/sites/production-type/Commercial%20Broiler%20Breeder"
                )
                .expect(200);

            expect(res.body.data).toHaveLength(2);
            expect(res.body.data[0].production_type).toBe(
                "Commercial Broiler Breeder"
            );
        });

        it("is case-insensitive", async () => {
            const res = await request(app)
                .get(
                    "/data/sites/production-type/COMMERCIAL%20BROILER%20BREEDER"
                )
                .expect(200);

            expect(res.body.data).toHaveLength(2);
        });

        it("returns empty for non-existent type", async () => {
            const res = await request(app)
                .get("/data/sites/production-type/Nonexistent")
                .expect(200);

            expect(res.body.data).toEqual([]);
        });
    });

    describe("GET /data/sites/production-types", () => {
        beforeEach(async () => {
            const svc = new SiteDetailsService();
            await svc.upsertSiteDetails([
                {
                    special_id: "S1",
                    county: "A",
                    state: "IA",
                    production_type: "Commercial Broiler Breeder",
                    confirmed_diagnosis_date: new Date("2025-01-01"),
                    status: "active",
                    birds_affected: 100,
                },
                {
                    special_id: "S2",
                    county: "B",
                    state: "MN",
                    production_type: "Commercial Table Eggs",
                    confirmed_diagnosis_date: new Date("2025-02-01"),
                    status: "released",
                    control_area_released_date: new Date("2025-03-01"),
                    birds_affected: 200,
                },
                {
                    special_id: "S3",
                    county: "C",
                    state: "IA",
                    production_type: "Backyard Flock",
                    confirmed_diagnosis_date: new Date("2025-03-01"),
                    status: "active",
                    birds_affected: 10,
                },
            ]);
        });

        it("returns distinct production types sorted alphabetically", async () => {
            const res = await request(app)
                .get("/data/sites/production-types")
                .expect(200);

            expect(res.body.data).toEqual([
                "Backyard Flock",
                "Commercial Broiler Breeder",
                "Commercial Table Eggs",
            ]);
        });
    });

    describe("GET /data/sites/summary", () => {
        beforeEach(async () => {
            const svc = new SiteDetailsService();
            await svc.upsertSiteDetails([
                {
                    special_id: "S1",
                    county: "A",
                    state: "IA",
                    production_type: "Commercial Broiler Breeder",
                    confirmed_diagnosis_date: new Date("2025-01-01"),
                    status: "active",
                    birds_affected: 100,
                },
                {
                    special_id: "S2",
                    county: "B",
                    state: "MN",
                    production_type: "Commercial Broiler Breeder",
                    confirmed_diagnosis_date: new Date("2025-02-01"),
                    status: "released",
                    control_area_released_date: new Date("2025-03-01"),
                    birds_affected: 200,
                },
                {
                    special_id: "S3",
                    county: "C",
                    state: "IA",
                    production_type: "Backyard Flock",
                    confirmed_diagnosis_date: new Date("2025-03-01"),
                    status: "na",
                    birds_affected: 10,
                },
            ]);
        });

        it("returns aggregated summaries grouped by production type", async () => {
            const res = await request(app)
                .get("/data/sites/summary")
                .expect(200);

            const broiler = res.body.data.find(
                (s: any) => s.production_type === "Commercial Broiler Breeder"
            );
            expect(broiler).toMatchObject({
                production_type: "Commercial Broiler Breeder",
                total_sites: 2,
                total_birds_affected: 300,
                by_status: { active: 1, released: 1, na: 0 },
            });
        });

        it("filters by production_type query param", async () => {
            const res = await request(app)
                .get("/data/sites/summary?production_type=Backyard%20Flock")
                .expect(200);

            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].production_type).toBe("Backyard Flock");
        });
    });

    describe("GET /data/sites/timeline", () => {
        beforeEach(async () => {
            const svc = new SiteDetailsService();
            await svc.upsertSiteDetails([
                {
                    special_id: "S1",
                    county: "A",
                    state: "IA",
                    production_type: "Commercial",
                    confirmed_diagnosis_date: new Date("2024-11-01"),
                    status: "active",
                    birds_affected: 100000,
                },
                {
                    special_id: "S2",
                    county: "B",
                    state: "MN",
                    production_type: "Backyard",
                    confirmed_diagnosis_date: new Date("2024-11-15"),
                    status: "active",
                    birds_affected: 240000,
                },
                {
                    special_id: "S3",
                    county: "C",
                    state: "SD",
                    production_type: "Commercial",
                    confirmed_diagnosis_date: new Date("2024-12-01"),
                    status: "released",
                    control_area_released_date: new Date("2025-01-15"),
                    birds_affected: 4800000,
                },
                {
                    special_id: "S4",
                    county: "D",
                    state: "IA",
                    production_type: "Commercial",
                    confirmed_diagnosis_date: new Date("2024-12-20"),
                    status: "active",
                    birds_affected: 2000000,
                },
                {
                    special_id: "S5",
                    county: "E",
                    state: "NE",
                    production_type: "Backyard",
                    confirmed_diagnosis_date: new Date("2025-01-10"),
                    status: "na",
                    birds_affected: 50000,
                },
            ]);
        });

        it("returns periods grouped by month (default)", async () => {
            const res = await request(app)
                .get("/data/sites/timeline")
                .expect(200);

            expect(res.body.data.granularity).toBe("month");
            expect(res.body.data.periods).toHaveLength(3);
        });

        it("supports year granularity", async () => {
            const res = await request(app)
                .get("/data/sites/timeline?granularity=year")
                .expect(200);

            expect(res.body.data.granularity).toBe("year");
            expect(res.body.data.periods).toHaveLength(2);
        });

        it("returns 400 for invalid granularity", async () => {
            await request(app)
                .get("/data/sites/timeline?granularity=invalid")
                .expect(400);
        });

        it("includes metadata", async () => {
            const res = await request(app)
                .get("/data/sites/timeline?granularity=month")
                .expect(200);

            expect(res.body).toHaveProperty("metadata");
        });
    });

    describe("GET /data/sites/:specialId", () => {
        beforeEach(async () => {
            const svc = new SiteDetailsService();
            await svc.upsertSiteDetails([
                {
                    special_id: "Site-001",
                    county: "County A",
                    state: "Iowa",
                    production_type: "Commercial Broiler Breeder",
                    confirmed_diagnosis_date: new Date("2025-01-15"),
                    status: "active",
                    birds_affected: 1000,
                },
            ]);
        });

        it("returns the site by special ID", async () => {
            const res = await request(app)
                .get("/data/sites/Site-001")
                .expect(200);

            expect(res.body.data.special_id).toBe("Site-001");
            expect(res.body.data.birds_affected).toBe(1000);
        });

        it("returns 404 for non-existent ID", async () => {
            await request(app)
                .get("/data/sites/NonExistent")
                .expect(404);
        });
    });

    describe("GET /data/historical-summary", () => {
        beforeEach(async () => {
            const svc = new HistoricalSummaryService();
            await svc.upsertHistoricalSummary({
                total_birds_affected_all_time: 10000000,
                total_sites_all_time: 500,
                total_active_sites: 100,
                total_released_sites: 350,
                total_na_sites: 50,
                total_birds_active: 2000000,
            });
        });

        it("returns the historical summary", async () => {
            const res = await request(app)
                .get("/data/historical-summary")
                .expect(200);

            expect(res.body.data.total_birds_affected_all_time).toBe(10000000);
            expect(res.body.data.total_sites_all_time).toBe(500);
            expect(res.body.data.total_active_sites).toBe(100);
        });

        it("includes metadata", async () => {
            const res = await request(app)
                .get("/data/historical-summary")
                .expect(200);

            expect(res.body).toHaveProperty("metadata");
        });
    });

    describe("GET /data/status-summary", () => {
        beforeEach(async () => {
            const svc = new StatusSummaryService();
            await svc.upsertStatusSummary({
                sites_confirmed_last_30_days: 15,
                sites_released_last_30_days: 8,
                birds_affected_last_30_days: 250000,
            });
        });

        it("returns the status summary", async () => {
            const res = await request(app)
                .get("/data/status-summary")
                .expect(200);

            expect(res.body.data.sites_confirmed_last_30_days).toBe(15);
            expect(res.body.data.sites_released_last_30_days).toBe(8);
            expect(res.body.data.birds_affected_last_30_days).toBe(250000);
        });

        it("includes metadata", async () => {
            const res = await request(app)
                .get("/data/status-summary")
                .expect(200);

            expect(res.body).toHaveProperty("metadata");
        });
    });

    describe("POST /data/data-update", () => {
        const validPayload = {
            flock_cases_by_state: [
                {
                    state_abbreviation: "IA",
                    state: "Iowa",
                    backyard_flocks: 3,
                    commercial_flocks: 8,
                    birds_affected: 1200,
                    total_flocks: 11,
                    latitude: 41.878,
                    longitude: -93.097,
                    last_reported_detection: "2025-01-30T00:00:00.000Z",
                },
            ],
            period_summaries: [
                {
                    period_name: "last_30_days",
                    total_birds_affected: 50000,
                    total_flocks_affected: 100,
                    total_backyard_flocks_affected: 50,
                    total_commercial_flocks_affected: 50,
                },
            ],
            site_details: [
                {
                    special_id: "Site-001",
                    county: "County A",
                    state: "Iowa",
                    production_type: "Commercial Broiler Breeder",
                    confirmed_diagnosis_date: "2025-01-15T00:00:00.000Z",
                    status: "active",
                    birds_affected: 1000,
                },
            ],
            historical_summary: {
                total_birds_affected_all_time: 1000000,
                total_sites_all_time: 100,
                total_active_sites: 30,
                total_released_sites: 60,
                total_na_sites: 10,
                total_birds_active: 50000,
            },
            status_summary: {
                sites_confirmed_last_30_days: 10,
                sites_released_last_30_days: 5,
                birds_affected_last_30_days: 100000,
            },
        };

        it("accepts valid data with correct Bearer token", async () => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { App } = require("../../../FlockWatch-Server/src/app");
            const server = new App();

            const authIDObj =
                await server["lastReportDateService"].getAuthID();
            const authId = authIDObj?.auth_id;

            await request(server.app)
                .post("/data/data-update")
                .set("Authorization", `Bearer ${authId}`)
                .send(validPayload)
                .expect(200);
        });

        it("returns 403 with invalid Bearer token", async () => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { App } = require("../../../FlockWatch-Server/src/app");
            const server = new App();

            await request(server.app)
                .post("/data/data-update")
                .set("Authorization", "Bearer invalid-token")
                .send(validPayload)
                .expect(403);
        });

        it("returns 403 with missing Authorization header", async () => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { App } = require("../../../FlockWatch-Server/src/app");
            const server = new App();

            await request(server.app)
                .post("/data/data-update")
                .send(validPayload)
                .expect(403);
        });

        it("returns 400 for invalid payload", async () => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { App } = require("../../../FlockWatch-Server/src/app");
            const server = new App();

            const authIDObj =
                await server["lastReportDateService"].getAuthID();
            const authId = authIDObj?.auth_id;

            const invalidPayload = { flock_cases_by_state: "not-an-array" };
            await request(server.app)
                .post("/data/data-update")
                .set("Authorization", `Bearer ${authId}`)
                .send(invalidPayload)
                .expect(400);
        });
    });
});
