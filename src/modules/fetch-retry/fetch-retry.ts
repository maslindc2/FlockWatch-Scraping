import { logger } from "../../utils/winston-logger";

class FetchRetry {
    /**
     *
     * @param URL
     * @param options
     * @param timeoutMs
     * @returns
     */
    private async fetchWithTimeout(
        URL: string,
        options: RequestInit,
        timeoutMs: number
    ): Promise<Response> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(URL, {
                ...options,
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeout);
        }
    }
    /**
     * Fetches with retry logic using exponential backoff and jitter on network errors.
     * @param URL - The URL to fetch.
     * @param retries - Number of remaining retry attempts.
     * @param timeoutMs - Timeout in milliseconds per attempt.
     * @param baseDelay - Base delay in ms for exponential backoff.
     * @param fetchOptions - The RequestInit options for the fetch call.
     * @returns A promise resolving to the Response.
     */
    private async fetchWithRetry(
        URL: string,
        retries: number,
        timeoutMs: number,
        baseDelay: number,
        fetchOptions: RequestInit
    ): Promise<Response> {
        const wait = (ms: number) =>
            new Promise((resolve) => setTimeout(resolve, ms));
        try {
            return await this.fetchWithTimeout(URL, fetchOptions, timeoutMs);
        } catch (error) {
            if (retries <= 0) throw error;

            logger.error(
                `Network error contacting Server, retries left ${retries}: ${(error as Error).message}`
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
    protected buildHeaders(): Headers {
        const headers = new Headers();
        headers.set("Content-Type", "application/json");
        headers.set("Accept", "application/json");
        return headers;
    }

    /**
     *
     * @param URL
     * @param data
     * @param retries
     * @param timeoutMs
     * @param baseDelay
     * @returns
     */
    public async postRetry(
        URL: string,
        data: unknown,
        retries: number,
        timeoutMs: number,
        baseDelay: number
    ): Promise<Response | undefined> {
        try {
            const config = {
                method: "POST",
                headers: this.buildHeaders(),
                body: JSON.stringify(data),
            };

            return await this.fetchWithRetry(
                URL,
                retries,
                timeoutMs,
                baseDelay,
                config
            );
        } catch (error) {
            logger.error(`Failed to make a post request, resulted in ${error}`);
            console.error(
                `Failed to make a post request, resulted in ${error}`
            );
        }
    }
    /**
     *
     * @param URL
     * @param retries
     * @param timeoutMs
     * @param baseDelay
     * @returns
     */
    public async getRetry(
        URL: string,
        retries: number,
        timeoutMs: number,
        baseDelay: number
    ): Promise<Response | undefined> {
        try {
            const config = {
                method: "GET",
                headers: this.buildHeaders(),
            };

            return await this.fetchWithRetry(
                URL,
                retries,
                timeoutMs,
                baseDelay,
                config
            );
        } catch (error) {
            logger.error(`Failed to make a post request, resulted in ${error}`);
            console.error(
                `Failed to make a post request, resulted in ${error}`
            );
        }
    }
}

export { FetchRetry };
