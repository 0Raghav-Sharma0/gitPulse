import type { SecurityFinding } from "@/lib/security-scanner";
import { SECURITY_VERIFICATION_FLAGS } from "@/lib/security-verification-config";

interface AdvisoryResolution {
    hasLiveMatch: boolean;
    source: "live-osv" | "fallback-static" | "none";
    exploitabilityTag: "high" | "medium" | "low" | "unknown";
    detail: string;
}

type Cached = {
    expiresAt: number;
    value: AdvisoryResolution;
};

const ADVISORY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const advisoryCache = new Map<string, Cached>();

function inferExploitabilityTag(finding: SecurityFinding): AdvisoryResolution["exploitabilityTag"] {
    if (finding.severity === "critical" || finding.severity === "high") return "high";
    if (finding.severity === "medium") return "medium";
    if (finding.severity === "low") return "low";
    return "unknown";
}

function parseDependencyFromFinding(finding: SecurityFinding): { name: string; version: string } | null {
    const match = finding.title.match(/Vulnerable dependency version:\s*([^@\s]+)@([^\s]+)/i);
    if (!match) return null;
    return { name: match[1], version: match[2] };
}

function getCache(key: string): AdvisoryResolution | null {
    const cached = advisoryCache.get(key);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
        advisoryCache.delete(key);
        return null;
    }
    return cached.value;
}

function setCache(key: string, value: AdvisoryResolution): void {
    advisoryCache.set(key, {
        value,
        expiresAt: Date.now() + ADVISORY_CACHE_TTL_MS,
    });
}

async function resolveFromOsv(name: string, version: string): Promise<AdvisoryResolution | null> {
    if (!SECURITY_VERIFICATION_FLAGS.dependencyLiveAdvisory) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1400);

    try {
        const response = await fetch("https://api.osv.dev/v1/query", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                package: {
                    name,
                    ecosystem: "npm",
                },
                version,
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            return null;
        }

        const payload = await response.json() as {
            vulns?: Array<{
                id?: string;
                aliases?: string[];
                database_specific?: { severity?: string | { score?: string } };
            }>;
        };

        const vulns = payload.vulns ?? [];
        if (vulns.length === 0) {
            return {
                hasLiveMatch: false,
                source: "live-osv",
                exploitabilityTag: "low",
                detail: `No live OSV advisory found for ${name}@${version}.`,
            };
        }

        const hasCriticalAlias = vulns.some((vuln) =>
            (vuln.aliases ?? []).some((alias) => /CVE-\d{4}-\d+/i.test(alias))
        );

        return {
            hasLiveMatch: true,
            source: "live-osv",
            exploitabilityTag: hasCriticalAlias ? "high" : "medium",
            detail: `OSV returned ${vulns.length} live advisory match(es) for ${name}@${version}.`,
        };
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

export async function resolveDependencyAdvisory(finding: SecurityFinding): Promise<AdvisoryResolution> {
    const dep = parseDependencyFromFinding(finding);
    if (!dep) {
        return {
            hasLiveMatch: false,
            source: "none",
            exploitabilityTag: inferExploitabilityTag(finding),
            detail: "Dependency metadata could not be parsed from finding title.",
        };
    }

    const cacheKey = `${dep.name}@${dep.version}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const live = await resolveFromOsv(dep.name, dep.version);
    if (live) {
        setCache(cacheKey, live);
        return live;
    }

    const fallback: AdvisoryResolution = {
        hasLiveMatch: false,
        source: "fallback-static",
        exploitabilityTag: inferExploitabilityTag(finding),
        detail: "Falling back to local advisory metadata because live lookup is unavailable.",
    };
    setCache(cacheKey, fallback);
    return fallback;
}
