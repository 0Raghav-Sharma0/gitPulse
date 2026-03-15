import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findManyMock,
  findUniqueMock,
  findFirstMock,
  createMock,
  updateMock,
  deleteMock,
  revalidatePathMock,
  revalidateTagMock,
} = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
  findFirstMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    blogPost: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      findFirst: findFirstMock,
      create: createMock,
      update: updateMock,
      delete: deleteMock,
    },
  },
}));

import {
  BLOG_HOMEPAGE_CACHE_TAG,
  deletePost,
  getHomepagePosts,
  getPublishedPostBySlug,
  savePost,
} from "@/lib/services/blog-service";

describe("blog service", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    findUniqueMock.mockReset();
    findFirstMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    revalidatePathMock.mockReset();
    revalidateTagMock.mockReset();
  });

  it("creates a new published post with first-publish timestamp and revalidates blog surfaces", async () => {
    createMock.mockResolvedValue({
      id: "post_1",
      slug: "hello-world",
      published: true,
    });

    await savePost({
      slug: "hello-world",
      title: "Hello",
      excerpt: "world",
      content: "post",
      published: true,
    });

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: "hello-world",
        published: true,
        publishedAt: expect.any(Date),
      }),
    });
    expect(revalidateTagMock).toHaveBeenCalledWith(BLOG_HOMEPAGE_CACHE_TAG, "max");
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
    expect(revalidatePathMock).toHaveBeenCalledWith("/blog");
    expect(revalidatePathMock).toHaveBeenCalledWith("/sitemap.xml");
    expect(revalidatePathMock).toHaveBeenCalledWith("/blog/hello-world");
  });

  it("updates existing post by id and does not create a duplicate record", async () => {
    const publishedAt = new Date("2026-03-14T10:00:00.000Z");
    findUniqueMock.mockResolvedValue({
      id: "post_1",
      slug: "hello-world",
      published: true,
      publishedAt,
    });
    updateMock.mockResolvedValue({
      id: "post_1",
      slug: "hello-world",
      published: true,
      publishedAt,
    });

    await savePost({
      id: "post_1",
      slug: "hello-world",
      title: "Updated title",
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "post_1" },
      data: expect.objectContaining({
        title: "Updated title",
      }),
    });
    expect(updateMock.mock.calls[0]?.[0]?.data?.publishedAt).toBeUndefined();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("sets publishedAt only on first publish transition", async () => {
    findUniqueMock.mockResolvedValue({
      id: "post_1",
      slug: "draft-post",
      published: false,
      publishedAt: null,
    });
    updateMock.mockResolvedValue({
      id: "post_1",
      slug: "draft-post",
      published: true,
      publishedAt: new Date("2026-03-14T11:00:00.000Z"),
    });

    await savePost({
      id: "post_1",
      slug: "draft-post",
      published: true,
    });

    expect(updateMock.mock.calls[0]?.[0]?.data?.publishedAt).toBeInstanceOf(Date);
  });

  it("rejects slug changes after first publish", async () => {
    findUniqueMock.mockResolvedValue({
      id: "post_1",
      slug: "stable-slug",
      published: false,
      publishedAt: new Date("2026-03-14T09:00:00.000Z"),
    });

    await expect(
      savePost({
        id: "post_1",
        slug: "new-slug",
      }),
    ).rejects.toThrow("Slug cannot be changed after a post is published.");

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("fetches published post by slug with published-only filter", async () => {
    findFirstMock.mockResolvedValue({ id: "post_1", slug: "visible", published: true });

    await getPublishedPostBySlug("visible");

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { slug: "visible", published: true },
    });
  });

  it("loads homepage posts from the dedicated cached query", async () => {
    findManyMock.mockResolvedValue([]);

    await getHomepagePosts();

    expect(findManyMock).toHaveBeenCalledWith({
      where: { published: true },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 3,
    });
  });

  it("revalidates homepage and blog routes on delete", async () => {
    findUniqueMock.mockResolvedValue({ slug: "hello-world" });
    deleteMock.mockResolvedValue({ id: "post_1", slug: "hello-world" });

    await deletePost("post_1");

    expect(revalidateTagMock).toHaveBeenCalledWith(BLOG_HOMEPAGE_CACHE_TAG, "max");
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
    expect(revalidatePathMock).toHaveBeenCalledWith("/blog/hello-world");
  });
});
