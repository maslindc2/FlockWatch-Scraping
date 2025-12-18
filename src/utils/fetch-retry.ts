import { logger } from "./winston-logger";
import { FlockData } from "../controllers/scraper.controller";

class FetchRetry {
    private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number):Promise<Response> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort, timeoutMs);
        try{
            return await fetch(url, {
                ...options,
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeout);
        }
    }

    private async fetchWithRetry(url: string, retries: number, timeoutMs: number, baseDelay: number, authID: string, flockData: FlockData): Promise<Response> {
        const wait = (ms: number) =>
                new Promise((resolve) => setTimeout(resolve, ms));
        try {
            return await this.fetchWithTimeout(
                url,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${authID}`,
                    },
                    body: JSON.stringify(flockData)
                },
                timeoutMs
            );
        } catch (error: any) {
            if(retries <= 0) throw error;

            logger.http(
                `Network error contacting scraper, retries left ${retries}: ${error.message}`
            );

            const attemptNumber = retries;
            const rawDelay = baseDelay * Math.pow(2, attemptNumber);
            const jitter = Math.floor(Math.random() * baseDelay);
            
            await wait(rawDelay + jitter);

            return this.fetchWithRetry(
                url,
                retries - 1,
                timeoutMs,
                baseDelay,
                authID,
                flockData
            );
        }
    }
    public async postRetry(URL: string, authID: string, flockData: FlockData):Promise<Response | undefined> {
        try {
            return await this.fetchWithRetry(
                URL,
                3,
                120000,
                500,
                authID,
                flockData
            );
        } catch (error) {
            logger.error(`Failed to make a post request, resulted in ${error}`);
            console.error(`Failed to make a post request, resulted in ${error}`);
        }
    }
}

export {FetchRetry};