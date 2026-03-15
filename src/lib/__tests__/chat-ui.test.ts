import { describe, expect, it } from "vitest";
import { shouldShowRepoSuggestions } from "@/lib/chat-ui";

describe("shouldShowRepoSuggestions", () => {
    it("shows suggestions in fresh chat with empty input", () => {
        expect(shouldShowRepoSuggestions({
            messagesCount: 1,
            input: "",
            loading: false,
            scanning: false,
        })).toBe(true);
    });

    it("hides suggestions when input has text", () => {
        expect(shouldShowRepoSuggestions({
            messagesCount: 1,
            input: "Show me the user flow chart",
            loading: false,
            scanning: false,
        })).toBe(false);
    });

    it("hides suggestions after first submitted message", () => {
        expect(shouldShowRepoSuggestions({
            messagesCount: 2,
            input: "",
            loading: false,
            scanning: false,
        })).toBe(false);
    });
});
