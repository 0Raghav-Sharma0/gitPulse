import { MetadataRoute } from "next";
import { getCanonicalSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = getCanonicalSiteUrl();

    return {
        rules: {
            userAgent: "*",
            allow: "/",
        },
        sitemap: `${baseUrl}/sitemap.xml`,
        host: baseUrl,
    };
}
