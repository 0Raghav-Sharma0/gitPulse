import { afterEach, describe, expect, it } from "vitest";
import {
    getGitHubOAuthConfigError,
    getGitHubOAuthCredentials,
} from "../auth-env";

describe("auth-env", () => {
    afterEach(() => {
        delete process.env.AUTH_GITHUB_ID;
        delete process.env.AUTH_GITHUB_SECRET;
        delete process.env.GITHUB_ID;
        delete process.env.GITHUB_SECRET;
    });

    it("flags numeric-only client IDs", () => {
        process.env.AUTH_GITHUB_ID = "168120496";
        process.env.AUTH_GITHUB_SECRET = "secret";

        expect(getGitHubOAuthConfigError()).toMatch(/numeric App ID/i);
    });

    it("accepts standard GitHub OAuth client IDs", () => {
        process.env.AUTH_GITHUB_ID = "Ov23liExampleClientId";
        process.env.AUTH_GITHUB_SECRET = "secret";

        expect(getGitHubOAuthConfigError()).toBeNull();
        expect(getGitHubOAuthCredentials()).toEqual({
            clientId: "Ov23liExampleClientId",
            clientSecret: "secret",
        });
    });
});
