import { ReadCSV } from "../../../src/modules/data-processing/csv/read-csv";
import fs from "fs/promises";

// Mock the entire fs/promises module so no real filesystem calls are made
jest.mock("fs/promises");
const mockedFs = jest.mocked(fs);

describe("ReadCSV", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // -------------------------------------------------------------------------
    // readCSVFile - happy path
    // -------------------------------------------------------------------------
    describe("when the file exists and is readable", () => {
        it("returns the file contents as a string", async () => {
            const fakeCSV = "State\tBirds\nIowa\t1000";
            mockedFs.readFile.mockResolvedValueOnce(fakeCSV as any);

            const result = await ReadCSV.readCSVFile(
                "/fake/path/data.csv",
                "utf16le"
            );

            expect(result).toBe(fakeCSV);
        });

        it("calls fs.readFile with the correct path and encoding", async () => {
            mockedFs.readFile.mockResolvedValueOnce("some data" as any);

            await ReadCSV.readCSVFile("/fake/path/data.csv", "utf16le");

            expect(mockedFs.readFile).toHaveBeenCalledWith(
                "/fake/path/data.csv",
                {
                    encoding: "utf16le",
                }
            );
        });

        it("calls fs.readFile exactly once", async () => {
            mockedFs.readFile.mockResolvedValueOnce("some data" as any);

            await ReadCSV.readCSVFile("/fake/path/data.csv", "utf8");

            expect(mockedFs.readFile).toHaveBeenCalledTimes(1);
        });
    });

    // -------------------------------------------------------------------------
    // readCSVFile - file not found / read error
    // -------------------------------------------------------------------------
    describe("when the file does not exist or cannot be read", () => {
        it("returns an empty string instead of throwing", async () => {
            mockedFs.readFile.mockRejectedValueOnce(
                new Error("ENOENT: no such file or directory")
            );

            const result = await ReadCSV.readCSVFile(
                "/nonexistent/path.csv",
                "utf8"
            );

            expect(result).toBe("");
        });

        it("does not propagate the error to the caller", async () => {
            mockedFs.readFile.mockRejectedValueOnce(
                new Error("Permission denied")
            );

            await expect(
                ReadCSV.readCSVFile("/protected/path.csv", "utf8")
            ).resolves.not.toThrow();
        });
    });

    // -------------------------------------------------------------------------
    // readCSVFile - encoding is forwarded correctly
    // -------------------------------------------------------------------------
    describe("encoding handling", () => {
        it("forwards utf8 encoding to fs.readFile", async () => {
            mockedFs.readFile.mockResolvedValueOnce("data" as any);

            await ReadCSV.readCSVFile("/path/file.csv", "utf8");

            expect(mockedFs.readFile).toHaveBeenCalledWith(expect.any(String), {
                encoding: "utf8",
            });
        });

        it("forwards utf16le encoding to fs.readFile", async () => {
            mockedFs.readFile.mockResolvedValueOnce("data" as any);

            await ReadCSV.readCSVFile("/path/file.csv", "utf16le");

            expect(mockedFs.readFile).toHaveBeenCalledWith(expect.any(String), {
                encoding: "utf16le",
            });
        });
    });
});
