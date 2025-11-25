import { LastReportDateModel } from "../../src/modules/last-report-date/last-report-date.model";
import { FlockCasesByState } from "../../src/modules/data-processing/flock-cases-by-state.interface";
import { App } from "../../src/app";
import dotenv from "dotenv";
import * as Mongoose from "mongoose";
import request from "supertest";
import { stateList } from "../utils/state-list";
import { Last30Days } from "../../src/modules/data-processing/last-30-days.interface";

dotenv.config();

describe("System Testing FW Scraper", () => {
    let authID: string;
    let scraperResponse: any;
    jest.setTimeout(5 * 60 * 1000);
    describe("Should collect all infection data from USDA and return expected structure", () => {
        //Create last report date model and generate an auth ID to use
        beforeAll(async () => {
            try {
                // Connect using the MongoDB URI
                await Mongoose.connect(process.env.MONGODB_URI!);
                console.log("MongoDB connected successfully.");

                const existingRecord = await LastReportDateModel.getModel
                    .findOne()
                    .lean();
                if (existingRecord) {
                    // Clear out the last report date model if it exists already
                    await LastReportDateModel.getModel.db.dropDatabase();
                }
                const modelObj = {
                    last_scraped_date: new Date(0),
                    auth_id: crypto.randomUUID(),
                };
                authID = modelObj.auth_id;

                await LastReportDateModel.getModel.create(modelObj);
            } catch (error) {
                console.error("Error connecting to MongoDB:", error);
                throw new Error("MongoDB connection failed");
            }

            try {
                const res = await request(new App().app)
                    .post("/scraper/process-data")
                    .set("Authorization", `Bearer ${authID}`)
                    .expect(200);
                scraperResponse = res.body;
            } catch (error) {
                console.error(
                    "Error occurred while running scraper on USDA",
                    error
                );
                throw new Error("Failed to scrape data from USDA");
            }
        });

        it("Response should have the expected keys", async () => {
            expect(scraperResponse).toHaveProperty("flock_cases_by_state");
            expect(scraperResponse).toHaveProperty("period_summaries");
        });

        it("Period summaries should exist and only contain 1 object in the response array when scrapers are successful", async () => {
            expect(scraperResponse).toHaveProperty("period_summaries");
            expect(scraperResponse.period_summaries).toHaveLength(1);
        });
        it("Period summaries last_30_days should have the expected results when scrapers are successful", async () => {
            expect(scraperResponse.period_summaries[0]).toHaveProperty(
                "period_name"
            );
            expect(scraperResponse.period_summaries[0].period_name).toEqual(
                "last_30_days"
            );
            expect(
                scraperResponse.period_summaries[0].total_birds_affected
            ).toBeGreaterThan(0);
            expect(
                scraperResponse.period_summaries[0].total_flocks_affected
            ).toBeGreaterThan(0);
            expect(
                scraperResponse.period_summaries[0]
                    .total_backyard_flocks_affected
            ).toBeGreaterThan(0);
        });
        it("Flock Cases by State should have all expected US States when scrapers are successful", async () => {
            const invalidStates = scraperResponse.flock_cases_by_state.filter(
                (resState: FlockCasesByState) => {
                    !stateList.some((state) => {
                        resState.state === state.name &&
                            resState.state_abbreviation ===
                                state.state_abbreviation;
                    });
                }
            );
            expect(invalidStates).toEqual([]);
        });
        it("Flock Cases by State should have all expected fields and they should have the appropriate value when scrapers are successful", async () => {
            const invalidStates = scraperResponse.flock_cases_by_state.filter(
                (s: FlockCasesByState) =>
                    !s.state ||
                    !s.state_abbreviation ||
                    s.backyard_flocks < 0 ||
                    s.commercial_flocks < 0 ||
                    s.birds_affected < 0 ||
                    !s.latitude ||
                    !s.longitude ||
                    !s.last_reported_detection
            );
            expect(invalidStates).toEqual([]);
        });
        it("Flock Cases by state should all be the expected type when scrapers are successful", async () => {
            const invalidTypeStates =
                scraperResponse.flock_cases_by_state.filter(
                    (s: FlockCasesByState) =>
                        !(typeof s.state === "string") ||
                        !(typeof s.state_abbreviation === "string") ||
                        !(typeof s.backyard_flocks === "number") ||
                        !(typeof s.commercial_flocks === "number") ||
                        !(typeof s.birds_affected === "number") ||
                        !(typeof s.latitude === "number") ||
                        !(typeof s.longitude === "number") ||
                        !(typeof s.last_reported_detection === "string")
                );
            expect(invalidTypeStates).toEqual([]);
        });
        it("Period Summaries last_30_days should all be the expected type when scrapers are successful", async () => {
            const invalidTypeLast30Days =
                scraperResponse.period_summaries.filter(
                    (s: Last30Days) =>
                        !(typeof s.period_name === "string") ||
                        !(typeof s.total_birds_affected === "number") ||
                        !(typeof s.total_flocks_affected === "number") ||
                        !(
                            typeof s.total_backyard_flocks_affected === "number"
                        ) ||
                        !(
                            typeof s.total_commercial_flocks_affected ===
                            "number"
                        )
                );
            expect(invalidTypeLast30Days).toEqual([]);
        });
    });
    afterAll(async () => {
        // Drop the database we made for flock cases so we can start new for the next test
        await LastReportDateModel.getModel.db.dropDatabase();
        // Disconnect from mongoose
        await Mongoose.disconnect();
    });
});
