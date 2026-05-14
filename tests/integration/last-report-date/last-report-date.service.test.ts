import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { LastReportDateService } from "../../../src/modules/last-report-date/last-report-date.service";
import { LastReportDateModel } from "../../../src/modules/last-report-date/last-report-date.model";

describe("LastReportDateService", () => {
    let mongoServer: MongoMemoryServer;
    let service: LastReportDateService;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(() => {
        service = new LastReportDateService();
    });

    afterEach(async () => {
        await LastReportDateModel.getModel.deleteMany({});
    });

    // -------------------------------------------------------------------------
    // initializeLastReportDate
    // -------------------------------------------------------------------------
    describe("initializeLastReportDate", () => {
        it("creates a new document when the collection is empty", async () => {
            await service.initializeLastReportDate();

            const count = await LastReportDateModel.getModel.countDocuments();
            expect(count).toBe(1);
        });

        it("returns the created document", async () => {
            const result = await service.initializeLastReportDate();

            expect(result).toBeDefined();
        });

        it("sets last_scraped_date on the new document", async () => {
            const result = await service.initializeLastReportDate();

            expect(result).toHaveProperty("last_scraped_date");
        });

        it("sets auth_id on the new document", async () => {
            const result = await service.initializeLastReportDate();

            expect(result).toHaveProperty("auth_id");
        });

        it("does not create a second document when one already exists", async () => {
            await service.initializeLastReportDate();
            await service.initializeLastReportDate();

            const count = await LastReportDateModel.getModel.countDocuments();
            expect(count).toBe(1);
        });

        it("returns the existing document when one already exists", async () => {
            const first = await service.initializeLastReportDate();
            const second = await service.initializeLastReportDate();

            // Both calls should return a document with the same auth_id
            const firstAuthId = (first as any).auth_id;
            const secondAuthId = (second as any).auth_id;

            expect(firstAuthId).toBe(secondAuthId);
        });
    });

    // -------------------------------------------------------------------------
    // getLastScrapedDate
    // -------------------------------------------------------------------------
    describe("getLastScrapedDate", () => {
        it("returns the last_scraped_date field", async () => {
            await LastReportDateModel.getModel.create({
                last_scraped_date: new Date("2025-01-30T00:00:00.000Z"),
                auth_id: "test-id",
            });

            const result = await service.getLastScrapedDate();

            expect(result).not.toBeNull();
            expect(result).toHaveProperty("last_scraped_date");
        });

        it("does not return the _id field", async () => {
            await LastReportDateModel.getModel.create({
                last_scraped_date: new Date(),
                auth_id: "test-id",
            });

            const result = await service.getLastScrapedDate();

            expect(result).not.toHaveProperty("_id");
        });

        it("does not return the auth_id field", async () => {
            await LastReportDateModel.getModel.create({
                last_scraped_date: new Date(),
                auth_id: "test-id",
            });

            const result = await service.getLastScrapedDate();

            expect(result).not.toHaveProperty("auth_id");
        });

        it("returns null when no document exists", async () => {
            const result = await service.getLastScrapedDate();

            expect(result).toBeNull();
        });
    });

    // -------------------------------------------------------------------------
    // getAuthID
    // -------------------------------------------------------------------------
    describe("getAuthID", () => {
        it("returns the auth_id field", async () => {
            await LastReportDateModel.getModel.create({
                last_scraped_date: new Date(),
                auth_id: "expected-auth-id",
            });

            const result = await service.getAuthID();

            expect(result).not.toBeNull();
            expect(result?.auth_id).toBe("expected-auth-id");
        });

        it("does not return the _id field", async () => {
            await LastReportDateModel.getModel.create({
                last_scraped_date: new Date(),
                auth_id: "test-id",
            });

            const result = await service.getAuthID();

            expect(result).not.toHaveProperty("_id");
        });

        it("does not return the last_scraped_date field", async () => {
            await LastReportDateModel.getModel.create({
                last_scraped_date: new Date(),
                auth_id: "test-id",
            });

            const result = await service.getAuthID();

            expect(result).not.toHaveProperty("last_scraped_date");
        });

        it("returns null when no document exists", async () => {
            const result = await service.getAuthID();

            expect(result).toBeNull();
        });
    });

    // -------------------------------------------------------------------------
    // updateLastReportDate - successful update
    // -------------------------------------------------------------------------
    describe("updateLastReportDate - isSuccessfulUpdate: true", () => {
        beforeEach(async () => {
            await LastReportDateModel.getModel.create({
                last_scraped_date: new Date("2025-01-01T00:00:00.000Z"),
                auth_id: "original-auth-id",
            });
        });

        it("updates last_scraped_date to a new date", async () => {
            const before = new Date("2025-01-01T00:00:00.000Z");

            await service.updateLastReportDate(true);

            const updated = await LastReportDateModel.getModel.findOne().lean();
            const updatedDate =
                updated?.last_scraped_date as unknown as globalThis.Date;
            expect(updatedDate.getTime()).toBeGreaterThan(before.getTime());
        });

        it("rotates the auth_id to a new value", async () => {
            await service.updateLastReportDate(true);

            const updated = await LastReportDateModel.getModel.findOne().lean();
            expect(updated?.auth_id).not.toBe("original-auth-id");
        });

        it("sets auth_id to a valid UUID v4 format", async () => {
            await service.updateLastReportDate(true);

            const updated = await LastReportDateModel.getModel.findOne().lean();
            expect(updated?.auth_id).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            );
        });

        it("does not create additional documents", async () => {
            await service.updateLastReportDate(true);

            const count = await LastReportDateModel.getModel.countDocuments();
            expect(count).toBe(1);
        });
    });

    // -------------------------------------------------------------------------
    // updateLastReportDate - failed update (auth_id rotation only)
    // -------------------------------------------------------------------------
    describe("updateLastReportDate - isSuccessfulUpdate: false", () => {
        const originalDate = new Date("2025-01-01T00:00:00.000Z");

        beforeEach(async () => {
            await LastReportDateModel.getModel.create({
                last_scraped_date: originalDate,
                auth_id: "original-auth-id",
            });
        });

        it("rotates the auth_id to a new value", async () => {
            await service.updateLastReportDate(false);

            const updated = await LastReportDateModel.getModel.findOne().lean();
            expect(updated?.auth_id).not.toBe("original-auth-id");
        });

        it("sets auth_id to a valid UUID v4 format", async () => {
            await service.updateLastReportDate(false);

            const updated = await LastReportDateModel.getModel.findOne().lean();
            expect(updated?.auth_id).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            );
        });

        it("does not update last_scraped_date", async () => {
            await service.updateLastReportDate(false);

            const updated = await LastReportDateModel.getModel.findOne().lean();
            const updatedDate =
                updated?.last_scraped_date as unknown as globalThis.Date;
            expect(updatedDate.toISOString()).toBe(originalDate.toISOString());
        });

        it("does not create additional documents", async () => {
            await service.updateLastReportDate(false);

            const count = await LastReportDateModel.getModel.countDocuments();
            expect(count).toBe(1);
        });
    });

    // -------------------------------------------------------------------------
    // updateLastReportDate - consecutive rotations produce different auth_ids
    // -------------------------------------------------------------------------
    describe("updateLastReportDate - consecutive calls", () => {
        it("generates a different auth_id on each call", async () => {
            await LastReportDateModel.getModel.create({
                last_scraped_date: new Date(),
                auth_id: "original-auth-id",
            });

            await service.updateLastReportDate(true);
            const afterFirst = await LastReportDateModel.getModel
                .findOne()
                .lean();
            const firstAuthId = afterFirst?.auth_id;

            await service.updateLastReportDate(true);
            const afterSecond = await LastReportDateModel.getModel
                .findOne()
                .lean();
            const secondAuthId = afterSecond?.auth_id;

            expect(firstAuthId).not.toBe(secondAuthId);
        });
    });

    // -------------------------------------------------------------------------
    // updateLastReportDate - error handling
    // -------------------------------------------------------------------------
    describe("updateLastReportDate - error handling", () => {
        it("throws when the database operation fails", async () => {
            await mongoose.disconnect();

            await expect(service.updateLastReportDate(true)).rejects.toThrow(
                "Failed to update the last report date model!"
            );

            // Reconnect for subsequent tests
            await mongoose.connect((mongoServer as MongoMemoryServer).getUri());
        });
    });
});
