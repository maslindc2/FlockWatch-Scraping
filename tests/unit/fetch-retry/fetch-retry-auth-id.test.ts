import { FetchRetryAuthID } from "../../../src/modules/fetch-retry/fetch-retry-authID";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildOkResponse(): Response {
    return new Response("{}", { status: 200 });
}

// FetchRetryAuthID only overrides buildHeaders, so we test that override by
// inspecting the headers object that gets forwarded to the global fetch mock.
describe("FetchRetryAuthID", () => {
    let mockFetch: jest.Mock;

    beforeEach(() => {
        mockFetch = jest.fn();
        global.fetch = mockFetch;
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    // -------------------------------------------------------------------------
    // Authorization header injection
    // -------------------------------------------------------------------------
    describe("buildHeaders - Authorization header", () => {
        it("sets the Authorization header as a Bearer token", async () => {
            mockFetch.mockResolvedValueOnce(buildOkResponse());
            const authID = "test-auth-id-123";
            const fetchRetryAuthID = new FetchRetryAuthID(authID);

            const promise = fetchRetryAuthID.postRetry(
                "https://example.com",
                {},
                0,
                5000,
                100
            );
            await jest.runAllTimersAsync();
            await promise;

            const calledHeaders: Headers = mockFetch.mock.calls[0][1].headers;
            expect(calledHeaders.get("Authorization")).toBe(`Bearer ${authID}`);
        });

        it("reflects the exact authID passed to the constructor", async () => {
            mockFetch.mockResolvedValueOnce(buildOkResponse());
            const authID = "abc-def-456";
            const fetchRetryAuthID = new FetchRetryAuthID(authID);

            const promise = fetchRetryAuthID.postRetry(
                "https://example.com",
                {},
                0,
                5000,
                100
            );
            await jest.runAllTimersAsync();
            await promise;

            const calledHeaders: Headers = mockFetch.mock.calls[0][1].headers;
            expect(calledHeaders.get("Authorization")).toBe(
                "Bearer abc-def-456"
            );
        });

        it("two instances with different authIDs produce different Authorization headers", async () => {
            mockFetch
                .mockResolvedValueOnce(buildOkResponse())
                .mockResolvedValueOnce(buildOkResponse());

            const instanceA = new FetchRetryAuthID("id-aaa");
            const instanceB = new FetchRetryAuthID("id-bbb");

            const promiseA = instanceA.postRetry(
                "https://example.com",
                {},
                0,
                5000,
                100
            );
            await jest.runAllTimersAsync();
            await promiseA;

            const promiseB = instanceB.postRetry(
                "https://example.com",
                {},
                0,
                5000,
                100
            );
            await jest.runAllTimersAsync();
            await promiseB;

            const headersA: Headers = mockFetch.mock.calls[0][1].headers;
            const headersB: Headers = mockFetch.mock.calls[1][1].headers;

            expect(headersA.get("Authorization")).toBe("Bearer id-aaa");
            expect(headersB.get("Authorization")).toBe("Bearer id-bbb");
        });
    });

    // -------------------------------------------------------------------------
    // Base headers are still present (super.buildHeaders() is called)
    // -------------------------------------------------------------------------
    describe("buildHeaders - inherited base headers", () => {
        it("still sets Content-Type to application/json", async () => {
            mockFetch.mockResolvedValueOnce(buildOkResponse());
            const fetchRetryAuthID = new FetchRetryAuthID("some-id");

            const promise = fetchRetryAuthID.postRetry(
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

        it("still sets Accept to application/json", async () => {
            mockFetch.mockResolvedValueOnce(buildOkResponse());
            const fetchRetryAuthID = new FetchRetryAuthID("some-id");

            const promise = fetchRetryAuthID.postRetry(
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

        it("sends all three headers together in one request", async () => {
            mockFetch.mockResolvedValueOnce(buildOkResponse());
            const fetchRetryAuthID = new FetchRetryAuthID("my-token");

            const promise = fetchRetryAuthID.postRetry(
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
            expect(calledHeaders.get("Accept")).toBe("application/json");
            expect(calledHeaders.get("Authorization")).toBe("Bearer my-token");
        });
    });

    // -------------------------------------------------------------------------
    // Authorization header present on GET requests too
    // -------------------------------------------------------------------------
    describe("buildHeaders - Authorization on GET requests", () => {
        it("includes the Authorization header on getRetry calls", async () => {
            mockFetch.mockResolvedValueOnce(buildOkResponse());
            const authID = "get-request-token";
            const fetchRetryAuthID = new FetchRetryAuthID(authID);

            const promise = fetchRetryAuthID.getRetry(
                "https://example.com",
                0,
                5000,
                100
            );
            await jest.runAllTimersAsync();
            await promise;

            const calledHeaders: Headers = mockFetch.mock.calls[0][1].headers;
            expect(calledHeaders.get("Authorization")).toBe(`Bearer ${authID}`);
        });
    });
});
