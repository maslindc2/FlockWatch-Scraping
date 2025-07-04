import { LastReportDateService } from "../../../src/services/model-services/last-report-date-service";
import { LastReportDateModel } from "../../../src/models/last-report-date-model";

describe("LastReportDateService Unit Tests", () => {
    let lastReportDateService: LastReportDateService;

    beforeEach(() => {
        lastReportDateService = new LastReportDateService();
    });

    it("should call findOne with authID and the property {$exists: true} when getAuthID is called", async () => {
        const leanMock = jest.fn().mockResolvedValue({});
        const selectMock = jest.fn(() => ({lean: leanMock}));
        
        // Create our spy on the mongoose findOne function
        const findSpy = jest
            .spyOn(LastReportDateModel.getModel, "findOne")
            .mockReturnValue({
                select: selectMock,
            } as any);

        // Call get authID function
        await lastReportDateService.getAuthID();
        // We should be calling with a filter where authID exists
        expect(findSpy).toHaveBeenCalledWith({ authID: { $exists: true } });
        // Expect the .lean() to be called as we don't need the full mongoose object
        expect(leanMock).toHaveBeenCalled();
        // Restore implementation
        findSpy.mockRestore();
        leanMock.mockRestore();
        selectMock.mockRestore();
    });
    it("should call select while hiding the _id, __v, lastScrapedDate elements when getAuthID is called", async () => {
        const leanMock = jest.fn().mockResolvedValue({});
        const selectMock = jest.fn(() => ({lean: leanMock}));
        // Create our spy on the mongoose findOne function
        const selectSpy = jest
            .spyOn(LastReportDateModel.getModel, "findOne")
            .mockReturnValue({
                select: selectMock,
            } as any);
        // Call get authID function
        await lastReportDateService.getAuthID();
        // Expect that select was called while hiding id and version
        expect(selectSpy.mock.results[0].value.select).toHaveBeenCalledWith(
            "-_id -__v -lastScrapedDate"
        );
        expect(leanMock).toHaveBeenCalled();
        // Restore implementation
        selectSpy.mockRestore();
        leanMock.mockRestore();
        selectMock.mockRestore();
    });
    it("should call findOne with lastScrapedDate and the property {$exists: true} when getLastScrapedDate is called", async () => {
        const leanMock = jest.fn().mockResolvedValue({});
        const selectMock = jest.fn(() => ({lean: leanMock}));
        // Create our spy on the mongoose findOne function
        const findSpy = jest
            .spyOn(LastReportDateModel.getModel, "findOne")
            .mockReturnValue({
                select: selectMock,
            } as any);
        // Call get getLastScrapedDate
        await lastReportDateService.getLastScrapedDate();
        // Expect that find was called with the correct property
        expect(findSpy).toHaveBeenCalledWith({
            lastScrapedDate: { $exists: true },
        });
        expect(leanMock).toHaveBeenCalled();
        // Restore implementation
        findSpy.mockRestore();
        leanMock.mockRestore();
        selectMock.mockRestore();

    });
    it("should call select while hiding the _id, __v, authID elements when getLastScrapedDate is called", async () => {
        const leanMock = jest.fn().mockResolvedValue({});
        const selectMock = jest.fn(() => ({lean: leanMock}));
        // Create our spy on the mongoose findOne function
        const selectSpy = jest
            .spyOn(LastReportDateModel.getModel, "findOne")
            .mockReturnValue({
                select: selectMock,
            } as any);
        // Call get getLastScrapedDate function
        await lastReportDateService.getLastScrapedDate();
        // Expect that select was called while hiding id and version
        expect(selectSpy.mock.results[0].value.select).toHaveBeenCalledWith(
            "-_id -__v -authID"
        );
        expect(leanMock).toHaveBeenCalled();
        // Restore implementation
        selectSpy.mockRestore();
        leanMock.mockRestore();
        selectMock.mockRestore();
    });
});
