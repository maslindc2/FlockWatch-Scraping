import { FetchRetry } from "./fetch-retry";

class FetchRetryAuthID extends FetchRetry {
    constructor(private readonly authID: string) {
        super();
    }

    protected override buildHeaders(): Headers {
        const headers = super.buildHeaders();
        headers.set("Authorization", `Bearer ${this.authID}`);
        return headers;
    }
}

export { FetchRetryAuthID };