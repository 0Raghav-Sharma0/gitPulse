import { getCanonicalSiteUrl } from "@/lib/site-url";

export default function JsonLd() {
    const baseUrl = getCanonicalSiteUrl();

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "WebSite",
                    name: "GitPulse",
                    alternateName: ["GitPulse AI", "gitpulse"],
                    url: baseUrl,
                }),
            }}
        />
    );
}
