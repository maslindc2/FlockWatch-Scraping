import { timeout } from "cron";
import { logger } from "./winston-logger";
import { FlockData } from "../controllers/scraper.controller";

class FetchRetry {
    private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
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

    private async fetchWithRetry(url: string, retries: number, timeoutMs: number, baseDelay: number, authID: string, flockData: FlockData) {
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
    public async postRetry(fwScrapingURL: string, authID: string, flockData: FlockData) {
        try {
            const res = await this.fetchWithRetry(
                fwScrapingURL,
                3,
                120000,
                500,
                authID,
                flockData
            );

            if (!res.ok) {
                logger.error(`Scraping service returned HTTP ${res.status}`);
                return null;
            }

            const jsonResponse = await res.json();

            if (!jsonResponse || Object.keys(jsonResponse).length === 0) {
                logger.error(
                    `Received empty or invalid JSON from scraping service`
                );
                return null;
            }

            return jsonResponse;
        } catch (error) {
            logger.error(`Failed to fetch from scraper: ${error}`);
            return null;
        }
    }
}