export const dynamic = "force-dynamic";
import { MetadataRoute } from "next";
import type { BlogPost } from "@prisma/client";
import { getCanonicalSiteUrl } from "@/lib/site-url";
import { getPublishedPosts } from "@/lib/services/blog-service";
import { getCuratedRepos, getIndexableTopics } from "@/lib/repo-catalog";


export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = getCanonicalSiteUrl();
    let blogPosts: BlogPost[] = [];

    try {
        blogPosts = await getPublishedPosts();
    } catch (error) {
        console.error("Failed to fetch published posts for sitemap; continuing with default routes.", error);
    }

    const defaultRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: `${baseUrl}/blog`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        ...blogPosts.map((post) => ({
            url: `${baseUrl}/blog/${post.slug}`,
            lastModified: post.updatedAt,
            changeFrequency: "monthly" as const,
            priority: 0.7,
        })),
    ];

    let repoRoutes: MetadataRoute.Sitemap = [];
    let topicRoutes: MetadataRoute.Sitemap = [];

    try {
        const [curatedRepos, indexableTopics] = await Promise.all([
            getCuratedRepos(),
            getIndexableTopics(),
        ]);

        repoRoutes = curatedRepos.map((repo) => ({
            url: `${baseUrl}/repo/${repo.owner}/${repo.repo}`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
        }));

        topicRoutes = indexableTopics.map((topic) => ({
            url: `${baseUrl}/topics/${encodeURIComponent(topic)}`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.7,
        }));
    } catch (e) {
        console.error("Failed to generate sitemap routes from repo catalog", e);
    }

    return [...defaultRoutes, ...repoRoutes, ...topicRoutes];
}
