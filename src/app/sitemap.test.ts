import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPublishedPostsMock, getCanonicalSiteUrlMock, getCuratedReposMock, getIndexableTopicsMock } = vi.hoisted(() => ({
  getPublishedPostsMock: vi.fn(),
  getCanonicalSiteUrlMock: vi.fn(),
  getCuratedReposMock: vi.fn(),
  getIndexableTopicsMock: vi.fn(),
}));

vi.mock("@/lib/services/blog-service", () => ({
  getPublishedPosts: getPublishedPostsMock,
}));

vi.mock("@/lib/site-url", () => ({
  getCanonicalSiteUrl: getCanonicalSiteUrlMock,
}));

vi.mock("@/lib/repo-catalog", () => ({
  getCuratedRepos: getCuratedReposMock,
  getIndexableTopics: getIndexableTopicsMock,
}));

import sitemap from "@/app/sitemap";

describe("sitemap blog metadata", () => {
  beforeEach(() => {
    getPublishedPostsMock.mockReset();
    getCanonicalSiteUrlMock.mockReset();
    getCuratedReposMock.mockReset();
    getIndexableTopicsMock.mockReset();

    getCanonicalSiteUrlMock.mockReturnValue("https://repomind.in");
    getCuratedReposMock.mockResolvedValue([]);
    getIndexableTopicsMock.mockResolvedValue([]);
  });

  it("uses each blog post updatedAt as sitemap lastModified", async () => {
    const updatedAt = new Date("2026-03-14T12:00:00.000Z");
    getPublishedPostsMock.mockResolvedValue([
      {
        slug: "my-post",
        updatedAt,
      },
    ]);

    const routes = await sitemap();
    const blogRoute = routes.find((entry) => entry.url === "https://repomind.in/blog/my-post");

    expect(blogRoute?.lastModified).toEqual(updatedAt);
  });

  it("indexes only curated repos and indexable topics", async () => {
    getPublishedPostsMock.mockResolvedValue([]);
    getCuratedReposMock.mockResolvedValue([
      { owner: "facebook", repo: "react" },
      { owner: "vercel", repo: "next.js" },
    ]);
    getIndexableTopicsMock.mockResolvedValue(["typescript", "react"]);

    const routes = await sitemap();

    expect(routes.some((entry) => entry.url === "https://repomind.in/repo/facebook/react")).toBe(true);
    expect(routes.some((entry) => entry.url === "https://repomind.in/repo/vercel/next.js")).toBe(true);
    expect(routes.some((entry) => entry.url === "https://repomind.in/topics/typescript")).toBe(true);
    expect(routes.some((entry) => entry.url === "https://repomind.in/topics/react")).toBe(true);
  });
});
