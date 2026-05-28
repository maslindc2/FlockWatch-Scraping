import { Browser, Page, chromium, selectors } from "playwright";
class ScraperContext {
    private browser!: Browser;
    private page!: Page;
    private headless!: boolean;
    private testIdAttribute!: string;
    private urlToScrape!: string;
    private closed = false;

    /**
     * Create the scraping context.
     * @param headless - Whether to run the browser in headless mode.
     * @param testIdAttribute - Test ID attribute to target buttons Tableau buttons.
     * @param urlToScrape - URL that goes directly to the USDA Tableau Data Widget.
     */
    constructor(
        headless: boolean,
        testIdAttribute: string,
        urlToScrape: string
    ) {
        this.headless = headless;
        this.testIdAttribute = testIdAttribute;
        this.urlToScrape = urlToScrape;
    }

    /**
     * Sets up the Playwright browser and page instances needed for scraping.
     */
    public async setupBrowser(): Promise<void> {
        selectors.setTestIdAttribute(this.testIdAttribute);
        const browser = await chromium.launch({
            headless: this.headless,
            args: [
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-infobars",
                "--window-size=1920,1080",
            ],
        });
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent:
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            locale: "en-US",
            timezoneId: "America/New_York",
        });
        const page = await context.newPage();
        await page.addInitScript(() => {
            Object.defineProperty(navigator, "webdriver", {
                get: () => false,
            });
            Object.defineProperty(navigator, "plugins", {
                get: () => [1, 2, 3, 4, 5],
            });
            Object.defineProperty(navigator, "languages", {
                get: () => ["en-US", "en"],
            });
        });
        this.browser = browser;
        this.page = page;
    }

    public async close() {
        if (this.closed) return;
        this.closed = true;
        await this.browser.close().catch(() => {});
    }

    /**
     * Get the created Puppeteer Browser Instance
     * @returns Puppeteer Browser Instance
     */
    public getBrowser() {
        return this.browser;
    }
    /**
     * Get the created Puppeteer Page Instance
     * @returns Puppeteer Page Instance
     */
    public getPage() {
        return this.page;
    }
    /**
     * Get the URL that we are going to scrape
     * @returns the URL to scrape
     */
    public getURLToScrape() {
        return this.urlToScrape;
    }
}

export { ScraperContext };
