import { ScraperContext } from "../../../src/modules/scraper/scraper.context";

// ---------------------------------------------------------------------------
// Mock Playwright so no real browser is launched
// ---------------------------------------------------------------------------

// Declare mock variables so jest.mock factory can reference them.
// The factory runs at module load time (hoisted), so we use `let` and
// assign actual mocks in beforeEach.
let mockNewPage: jest.Mock;
let mockNewContext: jest.Mock;
let mockBrowserClose: jest.Mock;
let mockChromiumLaunch: jest.Mock;
let mockSetTestIdAttribute: jest.Mock;
let mockBrowser: { newContext: jest.Mock; close: jest.Mock };

jest.mock("playwright", () => ({
    chromium: {
        launch: (...args: unknown[]) => mockChromiumLaunch(...args),
    },
    selectors: {
        setTestIdAttribute: (...args: unknown[]) =>
            mockSetTestIdAttribute(...args),
    },
    Browser: jest.fn(),
    Page: jest.fn(),
}));

describe("ScraperContext", () => {
    beforeEach(() => {
        mockNewPage = jest.fn().mockResolvedValue({ addInitScript: jest.fn() });
        mockNewContext = jest.fn().mockResolvedValue({ newPage: mockNewPage });
        mockBrowserClose = jest.fn().mockResolvedValue(undefined);
        mockBrowser = {
            newContext: mockNewContext,
            close: mockBrowserClose,
        };
        mockChromiumLaunch = jest.fn().mockResolvedValue(mockBrowser);
        mockSetTestIdAttribute = jest.fn();
    });

    // -------------------------------------------------------------------------
    // Constructor / getters
    // -------------------------------------------------------------------------
    describe("constructor and getters", () => {
        it("getURLToScrape returns the URL passed to the constructor", () => {
            const ctx = new ScraperContext(
                true,
                "data-tb-test-id",
                "https://example.com"
            );

            expect(ctx.getURLToScrape()).toBe("https://example.com");
        });

        it("getBrowser returns undefined before setupBrowser is called", () => {
            const ctx = new ScraperContext(
                true,
                "data-tb-test-id",
                "https://example.com"
            );

            // browser is declared with ! but never assigned until setupBrowser runs
            expect(ctx.getBrowser()).toBeUndefined();
        });

        it("getPage returns undefined before setupBrowser is called", () => {
            const ctx = new ScraperContext(
                true,
                "data-tb-test-id",
                "https://example.com"
            );

            expect(ctx.getPage()).toBeUndefined();
        });
    });

    // -------------------------------------------------------------------------
    // setupBrowser
    // -------------------------------------------------------------------------
    describe("setupBrowser", () => {
        it("calls selectors.setTestIdAttribute with the testIdAttribute", async () => {
            const ctx = new ScraperContext(
                true,
                "data-tb-test-id",
                "https://example.com"
            );

            await ctx.setupBrowser();

            expect(mockSetTestIdAttribute).toHaveBeenCalledWith(
                "data-tb-test-id"
            );
        });

        it("launches chromium with headless=true when specified", async () => {
            const ctx = new ScraperContext(
                true,
                "data-tb-test-id",
                "https://example.com"
            );

            await ctx.setupBrowser();

            expect(mockChromiumLaunch).toHaveBeenCalledWith({
                headless: true,
                args: [
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-infobars",
                    "--window-size=1920,1080",
                ],
            });
        });

        it("launches chromium with headless=false when specified", async () => {
            const ctx = new ScraperContext(
                false,
                "data-tb-test-id",
                "https://example.com"
            );

            await ctx.setupBrowser();

            expect(mockChromiumLaunch).toHaveBeenCalledWith({
                headless: false,
                args: [
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-infobars",
                    "--window-size=1920,1080",
                ],
            });
        });

        it("calls browser.newContext() to create a browser context", async () => {
            const ctx = new ScraperContext(
                true,
                "data-tb-test-id",
                "https://example.com"
            );

            await ctx.setupBrowser();

            expect(mockNewContext).toHaveBeenCalledTimes(1);
        });

        it("calls context.newPage() to create a page", async () => {
            const ctx = new ScraperContext(
                true,
                "data-tb-test-id",
                "https://example.com"
            );

            await ctx.setupBrowser();

            expect(mockNewPage).toHaveBeenCalledTimes(1);
        });

        it("getBrowser returns the browser instance after setupBrowser", async () => {
            const ctx = new ScraperContext(
                true,
                "data-tb-test-id",
                "https://example.com"
            );

            await ctx.setupBrowser();

            expect(ctx.getBrowser()).toBe(mockBrowser);
        });

        it("getPage returns the page instance after setupBrowser", async () => {
            const mockPage = { isClosed: jest.fn(), addInitScript: jest.fn() };
            mockNewPage.mockResolvedValueOnce(mockPage);
            const ctx = new ScraperContext(
                true,
                "data-tb-test-id",
                "https://example.com"
            );

            await ctx.setupBrowser();

            expect(ctx.getPage()).toBe(mockPage);
        });
    });

    // -------------------------------------------------------------------------
    // close
    // -------------------------------------------------------------------------
    describe("close", () => {
        it("calls browser.close() when the context is open", async () => {
            const ctx = new ScraperContext(
                true,
                "data-tb-test-id",
                "https://example.com"
            );
            await ctx.setupBrowser();

            await ctx.close();

            expect(mockBrowserClose).toHaveBeenCalledTimes(1);
        });

        it("is idempotent — calling close twice only closes the browser once", async () => {
            const ctx = new ScraperContext(
                true,
                "data-tb-test-id",
                "https://example.com"
            );
            await ctx.setupBrowser();

            await ctx.close();
            await ctx.close();

            expect(mockBrowserClose).toHaveBeenCalledTimes(1);
        });

        it("does not throw if browser.close() rejects", async () => {
            mockBrowserClose.mockRejectedValueOnce(new Error("already closed"));
            const ctx = new ScraperContext(
                true,
                "data-tb-test-id",
                "https://example.com"
            );
            await ctx.setupBrowser();

            await expect(ctx.close()).resolves.not.toThrow();
        });
    });
});
