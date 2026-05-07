import { FetchRetry } from "../../../src/modules/fetch-retry/fetch-retry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a minimal successful fetch Response */
function buildOkResponse(body = "{}"): Response {
    return new Response(body, { status: 200 });
}

/** Builds a minimal failed fetch Response */
function buildErrorResponse(status = 500): Response {
    return new Response("{}", { status });
}

// FetchRetry has protected/private internals so we access postRetry and
// getRetry through a concrete instance. buildHeaders is protected so we
// test it indirectly by inspecting the headers passed to fetch.
describe("FetchRetry", () => {
    let fetchRetry: FetchRetry;
    let mockFetch: jest.Mock;

    beforeEach(() => {
        fetchRetry = new FetchRetry();
        mockFetch = jest.fn();
        // Replace the global fetch used inside fetchWithTimeout
        global.fetch = mockFetch;
        // Use fake timers so exponential backoff waits don't slow down tests
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    // -------------------------------------------------------------------------
    // buildHeaders (tested via the headers passed to fetch)
    // -------------------------------------------------------------------------
    describe("buildHeaders", () => {
        it("sets Content-Type to application/json", async () => {
            mockFetch.mockResolvedValueOnce(buildOkResponse());

            const promise = fetchRetry.postRetry(
                "https://example.com",
                {},
                0,
                5000,
                100
            );
            await jest.runAllTimersAsync();
            await promise;

            const calledHeaders: Headers = mockFetch.mock.calls[0][1].headers;
            expect(calledHeaders.get("Content-Type")).toBe("application/json");
        });

        it("sets Accept to application/json", async () => {
            mockFetch.mockResolvedValueOnce(buildOkResponse());

            const promise = fetchRetry.postRetry(
                "https://example.com",
                {},
                0,
                5000,
                100
            );
            await jest.runAllTimersAsync();
            await promise;

            const calledHeaders: Headers = mockFetch.mock.calls[0][1].headers;
            expect(calledHeaders.get("Accept")).toBe("application/json");
        });
    });

    // -------------------------------------------------------------------------
    // postRetry - success on first attempt
    // -------------------------------------------------------------------------
    describe("postRetry - successful request", () => {
        it("returns the Response when fetch succeeds", async () => {
            mockFetch.mockResolvedValueOnce(buildOkResponse());

            const promise = fetchRetry.postRetry(
                "https://example.com",
                { key: "value" },
                0,
                5000,
                100
            );
            await jest.runAllTimersAsync();
            const result = await promise;

            expect(result).toBeInstanceOf(Response);
            expect(result?.status).toBe(200);
        });

        it("calls fetch exactly once on success", async () => {
            mockFetch.mockResolvedValueOnce(buildOkResponse());

            const promise = fetchRetry.postRetry(
                "https://example.com",
                {},
                0,
                5000,
                100
            );
            await jest.runAllTimersAsync();
            await promise;

            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it("uses the POST method", async () => {
            mockFetch.mockResolvedValueOnce(buildOkResponse());

            const promise = fetchRetry.postRetry(
                "https://example.com",
                {},
                0,
                5000,
                100
            );
            await jest.runAllTimersAsync();
            await promise;

            expect(mockFetch.mock.calls[0][1].method).toBe("POST");
        });

        it("serialises the data as JSON in the request body", async () => {
            mockFetch.mockResolvedValueOnce(buildOkResponse());
            const data = { foo: "bar", count: 42 };

            const promise = fetchRetry.postRetry(
                "https://example.com",
                data,
                0,
                5000,
                100
            );
            await jest.runAllTimersAsync();
            await promise;

            expect(mockFetch.mock.calls[0][1].body).toBe(JSON.stringify(data));
        });

        it("calls fetch with the correct URL", async () => {
            mockFetch.mockResolvedValueOnce(buildOkResponse());
            const url = "https://example.com/api/endpoint";

            const promise = fetchRetry.postRetry(url, {}, 0, 5000, 100);
            await jest.runAllTimersAsync();
            await promise;

            expect(mockFetch.mock.calls[0][0]).toBe(url);
        });
    });

    // -------------------------------------------------------------------------
    // postRetry - retry behaviour on network failure
    // -------------------------------------------------------------------------
    describe("postRetry - retry on network failure", () => {
        it("retries the correct number of times before succeeding", async () => {
            // Fail twice then succeed
            mockFetch
                .mockRejectedValueOnce(new Error("Network error"))
                .mockRejectedValueOnce(new Error("Network error"))
                .mockResolvedValueOnce(buildOkResponse());

            const promise = fetchRetry.postRetry(
                "https://example.com",
                {},
                3,
                5000,
                10
            );
            await jest.runAllTimersAsync();
            const result = await promise;

            expect(mockFetch).toHaveBeenCalledTimes(3);
            expect(result?.status).toBe(200);
        });

        it("returns undefined after exhausting all retries", async () => {
            mockFetch.mockRejectedValue(new Error("Network error"));

            const promise = fetchRetry.postRetry(
                "https://example.com",
                {},
                2,
                5000,
                10
            );
            await jest.runAllTimersAsync();
            const result = await promise;

            // postRetry catches the final error and returns undefined
            expect(result).toBeUndefined();
        });

        it("calls fetch retries + 1 times when every attempt fails", async () => {
            mockFetch.mockRejectedValue(new Error("Network error"));
            const retries = 3;

            const promise = fetchRetry.postRetry(
                "https://example.com",
                {},
                retries,
                5000,
                10
            );
            await jest.runAllTimersAsync();
            await promise;

            expect(mockFetch).toHaveBeenCalledTimes(retries + 1);
        });
    });

    // -------------------------------------------------------------------------
    // postRetry - timeout behaviour
    // -------------------------------------------------------------------------
    describe("postRetry - timeout", () => {
        it("returns undefined when fetch times out on every attempt", async () => {
            // Simulate fetch never resolving so the AbortController fires
            mockFetch.mockImplementation(
                (_url: string, options: RequestInit) => {
                    return new Promise((_resolve, reject) => {
                        options.signal?.addEventListener("abort", () =>
                            reject(new DOMException("Aborted", "AbortError"))
                        );
                    });
                }
            );

            // timeoutMs of 100ms, 0 retries
            const promise = fetchRetry.postRetry(
                "https://example.com",
                {},
                0,
                100,
                10
            );
            await jest.runAllTimersAsync();
            const result = await promise;

            expect(result).toBeUndefined();
        });
    });

    // -------------------------------------------------------------------------
    // getRetry - success on first attempt
    // -------------------------------------------------------------------------
    describe("getRetry - successful request", () => {
        it("returns the Response when fetch succeeds", async () => {
            mockFetch.mockResolvedValueOnce(buildOkResponse());

            const promise = fetchRetry.getRetry(
                "https://example.com",
                0,
                5000,
                100
            );
            await jest.runAllTimersAsync();
            const result = await promise;

            expect(result).toBeInstanceOf(Response);
            expect(result?.status).toBe(200);
        });

        it("uses the GET method", async () => {
            mockFetch.mockResolvedValueOnce(buildOkResponse());

            const promise = fetchRetry.getRetry(
                "https://example.com",
                0,
                5000,
                100
            );
            await jest.runAllTimersAsync();
            await promise;

            expect(mockFetch.mock.calls[0][1].method).toBe("GET");
        });

        it("does not include a body in the GET request", async () => {
            mockFetch.mockResolvedValueOnce(buildOkResponse());

            const promise = fetchRetry.getRetry(
                "https://example.com",
                0,
                5000,
                100
            );
            await jest.runAllTimersAsync();
            await promise;

            expect(mockFetch.mock.calls[0][1].body).toBeUndefined();
        });
    });

    // -------------------------------------------------------------------------
    // getRetry - retry behaviour on network failure
    // -------------------------------------------------------------------------
    describe("getRetry - retry on network failure", () => {
        it("returns undefined after exhausting all retries", async () => {
            mockFetch.mockRejectedValue(new Error("Network error"));

            const promise = fetchRetry.getRetry(
                "https://example.com",
                2,
                5000,
                10
            );
            await jest.runAllTimersAsync();
            const result = await promise;

            expect(result).toBeUndefined();
        });

        it("calls fetch retries + 1 times when every attempt fails", async () => {
            mockFetch.mockRejectedValue(new Error("Network error"));
            const retries = 2;

            const promise = fetchRetry.getRetry(
                "https://example.com",
                retries,
                5000,
                10
            );
            await jest.runAllTimersAsync();
            await promise;

            expect(mockFetch).toHaveBeenCalledTimes(retries + 1);
        });
    });
});
