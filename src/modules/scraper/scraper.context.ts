import { Browser, Page, chromium, selectors } from "playwright";
class ScraperContext {
    
    private browser!: Browser;
    private page!: Page;
    private headless!: boolean;
    private testIdAttribute!: string;
    private urlToScrape!: string;
    private closed = false;

    /**
     * Create the scraping context
     * @param headless: Sets whether or not we running heedlessly or not.
     * @param testIdAttribute: We can use the testId to target buttons that Tableau attempts to block from scrapers clicking on them 
     * @param scrapeURL: This is the URL that goes directly to the Tableau Data Widget.
     */
    constructor(headless: boolean, testIdAttribute: string, urlToScrape: string){
        this.headless = headless;
        this.testIdAttribute = testIdAttribute;
        this.urlToScrape = urlToScrape;
    }
    
    /**
     * This sets up the browser and page instances needed for scraping
     * @param config This is the configuration from above, adjust the params depending on how the browser needs to be setup
     * @returns Returns a browser and page instance
     */
    public async setupBrowser(): Promise<void> {
        selectors.setTestIdAttribute(this.testIdAttribute);
        const browser = await chromium.launch({ headless: this.headless });
        const context = await browser.newContext();
        const page = await context.newPage();
        this.browser = browser;
        this.page = page;
    }

    public async close(){
        if(this.closed) return;
        this.closed = true;
        await this.browser.close().catch(() => {});
    }

    /**
     * Get the created Puppeteer Browser Instance
     * @returns Puppeteer Browser Instance
     */
    public getBrowser(){
        return this.browser;
    }
    /**
     * Get the created Puppeteer Page Instance
     * @returns Puppeteer Page Instance
     */
    public getPage(){
        return this.page;
    }
    /**
     * Get the URL that we are going to scrape
     * @returns the URL to scrape
     */
    public getURLToScrape(){
        return this.urlToScrape;
    }
}

export {ScraperContext}