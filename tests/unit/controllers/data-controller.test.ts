import { DataController } from "../../../src/controllers/data.controller";
import { LastReportDateService } from "../../../src/modules/last-report-date/last-report-date.service";

// Mock the entire LastReportDateService module so no DB calls are made
jest.mock("../../../src/modules/last-report-date/last-report-date.service");

const MockedLastReportDateService = jest.mocked(LastReportDateService);

describe("DataController", () => {
    let dataController: DataController;
    let mockGetAuthID: jest.Mock;
    let mockGetLastScrapedDate: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Set up mock implementations on the prototype methods
        mockGetAuthID = jest.fn();
        mockGetLastScrapedDate = jest.fn();

        MockedLastReportDateService.prototype.getAuthID = mockGetAuthID;
        MockedLastReportDateService.prototype.getLastScrapedDate =
            mockGetLastScrapedDate;

        dataController = new DataController();
    });

    // -------------------------------------------------------------------------
    // getServerAuthID
    // -------------------------------------------------------------------------
    describe("getServerAuthID", () => {
        describe("when the service returns a valid auth ID", () => {
            it("returns the auth_id string", async () => {
                mockGetAuthID.mockResolvedValueOnce({ auth_id: "abc-123" });

                const result = await dataController.getServerAuthID();

                expect(result).toBe("abc-123");
            });

            it("calls getAuthID on the service exactly once", async () => {
                mockGetAuthID.mockResolvedValueOnce({ auth_id: "abc-123" });

                await dataController.getServerAuthID();

                expect(mockGetAuthID).toHaveBeenCalledTimes(1);
            });
        });

        describe("when the service returns null", () => {
            it("returns an empty string", async () => {
                mockGetAuthID.mockResolvedValueOnce(null);

                const result = await dataController.getServerAuthID();

                expect(result).toBe("");
            });
        });

        describe("when the service throws an error", () => {
            it("returns an empty string instead of propagating the error", async () => {
                mockGetAuthID.mockRejectedValueOnce(
                    new Error("DB connection failed")
                );

                const result = await dataController.getServerAuthID();

                expect(result).toBe("");
            });

            it("does not throw", async () => {
                mockGetAuthID.mockRejectedValueOnce(new Error("DB error"));

                await expect(
                    dataController.getServerAuthID()
                ).resolves.not.toThrow();
            });
        });
    });

    // -------------------------------------------------------------------------
    // getLastScrapedDate
    // -------------------------------------------------------------------------
    describe("getLastScrapedDate", () => {
        describe("when the service returns a valid date", () => {
            it("returns the date as a string", async () => {
                const fakeDate = new Date("2025-01-30T00:00:00.000Z");
                mockGetLastScrapedDate.mockResolvedValueOnce({
                    last_scraped_date: fakeDate,
                });

                const result = await dataController.getLastScrapedDate();

                expect(result).toBe(String(fakeDate));
            });

            it("calls getLastScrapedDate on the service exactly once", async () => {
                mockGetLastScrapedDate.mockResolvedValueOnce({
                    last_scraped_date: new Date(),
                });

                await dataController.getLastScrapedDate();

                expect(mockGetLastScrapedDate).toHaveBeenCalledTimes(1);
            });
        });

        describe("when the service returns null", () => {
            it("throws with the expected message", async () => {
                mockGetLastScrapedDate.mockResolvedValueOnce(null);

                await expect(
                    dataController.getLastScrapedDate()
                ).rejects.toThrow("Last Scraped Date not found!");
            });
        });

        describe("when the document exists but the date field is missing", () => {
            it("throws with the expected message", async () => {
                mockGetLastScrapedDate.mockResolvedValueOnce({
                    last_scraped_date: null,
                });

                await expect(
                    dataController.getLastScrapedDate()
                ).rejects.toThrow(
                    "Last Scraped Date document exists but no date field!"
                );
            });
        });

        describe("when the service throws an error", () => {
            it("re-throws the error to the caller", async () => {
                const serviceError = new Error("DB connection failed");
                mockGetLastScrapedDate.mockRejectedValueOnce(serviceError);

                await expect(
                    dataController.getLastScrapedDate()
                ).rejects.toThrow("DB connection failed");
            });

            it("does not swallow the error silently", async () => {
                mockGetLastScrapedDate.mockRejectedValueOnce(
                    new Error("Unexpected error")
                );

                await expect(
                    dataController.getLastScrapedDate()
                ).rejects.toThrow();
            });
        });
    });
});
