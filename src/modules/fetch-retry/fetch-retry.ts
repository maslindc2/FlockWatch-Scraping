import { logger } from "../../utils/winston-logger";
import { FlockData } from "../../controllers/scraper.controller";

class FetchRetry {
    private async fetchWithTimeout(URL: string, options: RequestInit, timeoutMs: number):Promise<Response> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort, timeoutMs);
        try{
            return await fetch(URL, {
                ...options,
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeout);
        }
    }
    /**
     * Responsible for Retrying our fetch operation if we encounter any network issues with our initial fetch operation
     * @param url This the URL we are making the fetch operation
     * @param retries Number of times we want to retry our fetch operation
     * @param timeoutMs How long to wait for our request to time out
     * @param baseDelay How long we should wait before retrying our fetch operation
     * @param authID Auth ID we are sending in our fetch operation
     * @param flockData Data we are sending in our fetch operation
     * @returns Response Promise
     */
    private async fetchWithRetry(URL: string, retries: number, timeoutMs: number, baseDelay: number, fetchOptions: RequestInit): Promise<Response> {
        const wait = (ms: number) =>
                new Promise((resolve) => setTimeout(resolve, ms));
        try {
            return await this.fetchWithTimeout(
                URL,
                fetchOptions,
                timeoutMs
            );
        } catch (error: any) {
            if(retries <= 0) throw error;

            logger.error(
                `Network error contacting Server, retries left ${retries}: ${error.message}`
            );

            const attemptNumber = retries;
            const rawDelay = baseDelay * Math.pow(2, attemptNumber);
            const jitter = Math.floor(Math.random() * baseDelay);
            
            await wait(rawDelay + jitter);

            return this.fetchWithRetry(
                URL,
                retries - 1,
                timeoutMs,
                baseDelay,
                fetchOptions
            );
        }
    }
    protected buildHeaders(): Record<string, string> {
        return {
            "Content-Type": "application/json"
        };
    }

    public async postRetry(URL: string, data: any, retries:number, timeoutMs: number, baseDelay: number):Promise<Response | undefined> {
        try {
            const config = {
                method: "POST",
                headers: this.buildHeaders(),
                body: JSON.stringify(data)
            }

            return await this.fetchWithRetry(
                URL,
                retries,
                timeoutMs,
                baseDelay,
                config
            );
        } catch (error) {
            logger.error(`Failed to make a post request, resulted in ${error}`);
            console.error(`Failed to make a post request, resulted in ${error}`);
        }
    }
}

export {FetchRetry};