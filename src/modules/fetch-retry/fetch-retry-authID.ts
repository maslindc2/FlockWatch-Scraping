import { FetchRetry } from "./fetch-retry";

/**
 * Extension of FetchRetry that automatically attaches a Bearer auth token
 * to every request by overriding the header builder.
 */
class FetchRetryAuthID extends FetchRetry {
    /**
     * @param authID - The Bearer token to include in the Authorization header.
     */
    constructor(private readonly authID: string) {
        super();
    }

    /**
     * Builds headers including the Authorization Bearer token.
     * @returns Headers with Content-Type, Accept, and Authorization set.
     */
    protected override buildHeaders(): Headers {
        const headers = super.buildHeaders();
        headers.set("Authorization", `Bearer ${this.authID}`);
        return headers;
    }
}

export { FetchRetryAuthID };
