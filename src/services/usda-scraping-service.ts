import { Browser, Page, chromium, selectors } from "playwright";
import axios from "axios";
import { logger } from "../utils/winston-logger";

interface USDAScrapingConfig {
    headless: boolean;
    testIdAttribute: string;
    scrapeURL: string;
}

class USDAScrapingService {
    private browser!: Browser;
    private page!: Page;

    /**
     * This is the browser and page configuration. We can modify these values here directly.
     * headless: Sets whether or not we running heedlessly or not.
     * testIdAttribute: We can use the testId to target buttons that Tableau attempts to block from scrapers clicking on them
     * scrapeURL: This is the URL that goes directly to the Tableau Data Widget.
     */
    private readonly config: USDAScrapingConfig = {
        headless: true,
        testIdAttribute: "data-tb-test-id",
        scrapeURL: process.env.SCRAPE_URL!,
    };
    /**
     * This sets up the browser and page instances needed for scraping
     * @param config This is the configuration from above, adjust the params depending on how the browser needs to be setup
     * @returns Returns a browser and page instance
     */
    private async setupBrowser(
        config: USDAScrapingConfig
    ): Promise<{ browser: Browser; page: Page }> {
        selectors.setTestIdAttribute(config.testIdAttribute);
        const browser = await chromium.launch({ headless: config.headless });
        const context = await browser.newContext();
        const page = await context.newPage();
        return {
            page,
            browser,
        };
    }
    // Select the flock data we want, for this it's all flocks we want the data for
    private async selectFlockType(): Promise<void> {
        // Using the label to target the drop down menu
        await this.page.getByLabel("Choose variable Commercial Flocks").click();
        // Selecting the All Flocks menu item
        await this.page.getByRole("menuitem", { name: "All Flocks" }).click();
    }
    // Select the time period to use, we set it Total Outbreak to get all data
    private async selectTimePeriod(): Promise<void> {
        // Using the label to target the drop down menu for the time period
        await this.page.getByLabel("Choose time period Last 30 Days").click();
        // Selecting the Total Outbreak menu item
        await this.page
            .getByRole("menuitem", { name: "Total Outbreak" })
            .click();
    }
    // Select the sheet we want from the dashboard. Map Comparisons contains all data.
    private async selectDownloadOptions(): Promise<void> {
        // Select the download data button that's in the top left of the window
        await this.page
            .locator('[role="button"]:has-text("Download Data")')
            .click();
        // Select the map comparisons option which contains all of the data
        await this.page.getByTitle("Map Comparisons").click();
        // Using the test id find the label for the csv button as we can't click the radio button due to supressClickBusting
        await this.page
            .getByTestId("crosstab-options-dialog-radio-csv-Label")
            .click();
    }

    // Get the download link needed for the data
    private async initiateDownload(): Promise<string> {
        // Start logging responses and only store the response that has the /tempfile/ route.
        // It's safe to use this as the only response from /tempfile/ at this step is the CSV file itself
        const responsePromise = this.page.waitForResponse((response) =>
            response.url().includes("tempfile")
        );

        // Start the download by clicking the download button
        await this.page
            .getByTestId("export-crosstab-export-Button")
            .filter({ hasText: "Download" })
            .click();
        // Get the download URL
        const downloadLink = (await responsePromise).url();
        // Return the download URL
        return downloadLink;
    }

    private async closeBrowser(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
        }
    }
    /**
     * Use this function to start the USDA scrape job, this class will get the download URL and then use Axios to store the CSV to a SharedArrayBuffer
     * @returns Promise containing a SharedArrayBuffer which holds the CSV file
     */
    public async getFlockCasesFromUSDA(): Promise<SharedArrayBuffer> {
        try {
            // Setup the browser and page instances
            const { browser: browserInstance, page } = await this.setupBrowser(
                this.config
            );
            this.browser = browserInstance;
            this.page = page;
            // Go to the URL we want to scrape
            await this.page.goto(this.config.scrapeURL);
            // Select the flock type we want for our data
            await this.selectFlockType();
            // Select the time period we want
            await this.selectTimePeriod();

            // Select the download options we want
            await this.selectDownloadOptions();
            // Get the download URL
            const downloadURL = await this.initiateDownload();

            logger.info("Started logging Network responses");
            // Use axios to store the CSV data into a variable we can then pass to a CSV Parser later on
            const response = await axios.get<SharedArrayBuffer>(downloadURL, {
                responseType: "arraybuffer",
            });
            const csvData = response.data;

            logger.info(
                `Successfully downloaded CSV with Axios (${csvData.byteLength} bytes)`
            );

            // Return the data
            return csvData;
        } catch (error) {
            logger.error(
                `Failed to scrape USDA data: ${error instanceof Error ? error.message : "Unknown error"}`
            );
            throw new Error(
                `Failed to scrape USDA data: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        } finally {
            if (this.browser) {
                logger.info("Closing browser instance");
                await this.closeBrowser();
            }
        }
    }
}
export { USDAScrapingService };
