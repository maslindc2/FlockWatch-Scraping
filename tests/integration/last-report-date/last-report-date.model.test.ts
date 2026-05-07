import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { LastReportDateModel } from "../../../src/modules/last-report-date/last-report-date.model";

describe("LastReportDateModel", () => {
    let mongoServer: MongoMemoryServer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    afterEach(async () => {
        // Clear the collection between tests so each test starts clean
        await LastReportDateModel.getModel.deleteMany({});
    });

    // -------------------------------------------------------------------------
    // Collection name
    // -------------------------------------------------------------------------
    describe("collection name", () => {
        it("uses the 'last-report-date' collection", () => {
            expect(
                LastReportDateModel.getModel.collection.collectionName
            ).toBe("last-report-date");
        });
    });

    // -------------------------------------------------------------------------
    // Document creation - valid data
    // -------------------------------------------------------------------------
    describe("document creation - valid data", () => {
        it("creates a document with a last_scraped_date and auth_id", async () => {
            const doc = await LastReportDateModel.getModel.create({
                last_scraped_date: new Date("2025-01-30T00:00:00.000Z"),
                auth_id: "test-auth-id",
            });

            expect(doc).toBeDefined();
            expect(doc.last_scraped_date).toBeInstanceOf(Date);
            expect(doc.auth_id).toBe("test-auth-id");
        });

        it("persists the document so it can be retrieved", async () => {
            await LastReportDateModel.getModel.create({
                last_scraped_date: new Date("2025-01-30T00:00:00.000Z"),
                auth_id: "persistent-auth-id",
            });

            const found = await LastReportDateModel.getModel.findOne({
                auth_id: "persistent-auth-id",
            });

            expect(found).not.toBeNull();
        });

        it("stores last_scraped_date as a Date type", async () => {
            const date = new Date("2025-03-15T12:00:00.000Z");
            await LastReportDateModel.getModel.create({
                last_scraped_date: date,
                auth_id: "date-type-test",
            });

            const found = await LastReportDateModel.getModel.findOne({
                auth_id: "date-type-test",
            });

            expect(found?.last_scraped_date).toBeInstanceOf(Date);
            expect(
                (found?.last_scraped_date as unknown as globalThis.Date).toISOString()
            ).toBe(date.toISOString());
        });

        it("stores auth_id as a string", async () => {
            await LastReportDateModel.getModel.create({
                last_scraped_date: new Date(),
                auth_id: "string-type-test",
            });

            const found = await LastReportDateModel.getModel.findOne({
                auth_id: "string-type-test",
            });

            expect(typeof found?.auth_id).toBe("string");
        });

        it("assigns a MongoDB _id to the created document", async () => {
            const doc = await LastReportDateModel.getModel.create({
                last_scraped_date: new Date(),
                auth_id: "id-test",
            });

            expect(doc._id).toBeDefined();
            expect(doc._id).toBeInstanceOf(mongoose.Types.ObjectId);
        });
    });

    // -------------------------------------------------------------------------
    // Document creation - partial data
    // -------------------------------------------------------------------------
    describe("document creation - partial data", () => {
        it("creates a document with only auth_id when last_scraped_date is omitted", async () => {
            const doc = await LastReportDateModel.getModel.create({
                auth_id: "only-auth-id",
            });

            expect(doc.auth_id).toBe("only-auth-id");
            expect(doc.last_scraped_date).toBeUndefined();
        });

        it("creates a document with only last_scraped_date when auth_id is omitted", async () => {
            const doc = await LastReportDateModel.getModel.create({
                last_scraped_date: new Date("2025-01-01T00:00:00.000Z"),
            });

            expect(doc.last_scraped_date).toBeInstanceOf(Date);
            expect(doc.auth_id).toBeUndefined();
        });
    });

    // -------------------------------------------------------------------------
    // Querying
    // -------------------------------------------------------------------------
    describe("querying", () => {
        it("findOne returns null when the collection is empty", async () => {
            const result = await LastReportDateModel.getModel.findOne();
            expect(result).toBeNull();
        });

        it("findOne with $exists filter finds a document that has that field", async () => {
            await LastReportDateModel.getModel.create({
                last_scraped_date: new Date(),
                auth_id: "exists-test",
            });

            const result = await LastReportDateModel.getModel.findOne({
                auth_id: { $exists: true },
            });

            expect(result).not.toBeNull();
            expect(result?.auth_id).toBe("exists-test");
        });

        it("updateOne modifies an existing document", async () => {
            await LastReportDateModel.getModel.create({
                last_scraped_date: new Date("2025-01-01"),
                auth_id: "original-id",
            });

            const newDate = new Date("2025-06-01T00:00:00.000Z");
            await LastReportDateModel.getModel.updateOne(
                {},
                { last_scraped_date: newDate, auth_id: "updated-id" }
            );

            const updated = await LastReportDateModel.getModel.findOne();
            expect(updated?.auth_id).toBe("updated-id");
            expect(
                (updated?.last_scraped_date as unknown as globalThis.Date).toISOString()
            ).toBe(newDate.toISOString());
        });
    });
});