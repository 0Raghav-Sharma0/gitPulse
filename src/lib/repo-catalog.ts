import fs from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";

const REPO_LIMIT = 250;
const TOPIC_INDEX_LIMIT = 1000;
const TOPIC_MIN_REPO_COUNT = 5;
const TOPIC_REPO_LIST_LIMIT = 50;

export interface CatalogRepoEntry {
  owner: string;
  repo: string;
  stars: number;
  description: string | null;
  topics: string[];
  language: string | null;
}

interface CatalogData {
  curatedRepos: CatalogRepoEntry[];
  curatedRepoKeys: string[];
  indexableTopics: string[];
}

function isCatalogRepoEntry(value: unknown): value is CatalogRepoEntry {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CatalogRepoEntry>;

  return (
    typeof item.owner === "string" &&
    typeof item.repo === "string" &&
    typeof item.stars === "number" &&
    Array.isArray(item.topics)
  );
}

function normalizeRepo(entry: CatalogRepoEntry): CatalogRepoEntry {
  return {
    owner: entry.owner.trim(),
    repo: entry.repo.trim(),
    stars: entry.stars,
    description: entry.description,
    topics: entry.topics
      .filter((topic): topic is string => typeof topic === "string" && topic.trim().length > 0)
      .map((topic) => topic.toLowerCase()),
    language: entry.language,
  };
}

function toRepoKey(owner: string, repo: string): string {
  return `${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

function buildCatalogData(repos: CatalogRepoEntry[]): CatalogData {
  const deduped: CatalogRepoEntry[] = [];
  const seenRepoKeys = new Set<string>();

  for (const repo of repos) {
    const normalized = normalizeRepo(repo);
    if (!normalized.owner || !normalized.repo) continue;

    const key = toRepoKey(normalized.owner, normalized.repo);
    if (seenRepoKeys.has(key)) continue;

    seenRepoKeys.add(key);
    deduped.push(normalized);
  }

  const curatedRepos = deduped.slice(0, REPO_LIMIT);
  const curatedRepoKeys = curatedRepos.map((repo) => toRepoKey(repo.owner, repo.repo));

  const topicBuckets: Record<string, CatalogRepoEntry[]> = {};

  for (const repo of curatedRepos) {
    const uniqueTopics = new Set(repo.topics);
    for (const topic of uniqueTopics) {
      if (!topicBuckets[topic]) {
        topicBuckets[topic] = [];
      }
      topicBuckets[topic].push(repo);
    }
  }

  const topicCounts = Object.entries(topicBuckets)
    .map(([topic, reposForTopic]) => ({ topic, count: reposForTopic.length }))
    .filter((entry) => entry.count >= TOPIC_MIN_REPO_COUNT)
    .sort((a, b) => (b.count === a.count ? a.topic.localeCompare(b.topic) : b.count - a.count));

  const indexableTopics = topicCounts.slice(0, TOPIC_INDEX_LIMIT).map((entry) => entry.topic);

  return {
    curatedRepos,
    curatedRepoKeys,
    indexableTopics,
  };
}

const getCatalogData = unstable_cache(
  async (): Promise<CatalogData> => {
    try {
      const dataPath = path.join(process.cwd(), "public", "data", "top-repos.json");
      if (!fs.existsSync(dataPath)) {
        return buildCatalogData([]);
      }

      const fileContent = await fs.promises.readFile(dataPath, "utf8");
      const parsed = JSON.parse(fileContent) as unknown;
      const repos = Array.isArray(parsed) ? parsed.filter(isCatalogRepoEntry) : [];

      return buildCatalogData(repos);
    } catch (error) {
      console.error("Failed to load repo catalog data:", error);
      return buildCatalogData([]);
    }
  },
  ["repo-catalog-data-v1"],
  {
    revalidate: 604800,
    tags: ["repo-catalog"],
  }
);

export async function getCuratedRepos(): Promise<CatalogRepoEntry[]> {
  const data = await getCatalogData();
  return data.curatedRepos;
}

export async function isCuratedRepo(owner: string, repo: string): Promise<boolean> {
  const data = await getCatalogData();
  const key = toRepoKey(owner, repo);
  return data.curatedRepoKeys.includes(key);
}

export async function getReposForTopic(topic: string): Promise<CatalogRepoEntry[]> {
  const data = await getCatalogData();
  const normalizedTopic = topic.toLowerCase();
  const repos = data.curatedRepos.filter((repo) => repo.topics.includes(normalizedTopic));
  repos.sort((a, b) => b.stars - a.stars);
  return repos.slice(0, TOPIC_REPO_LIST_LIMIT);
}

export async function getIndexableTopics(): Promise<string[]> {
  const data = await getCatalogData();
  return data.indexableTopics;
}

export async function isIndexableTopic(topic: string): Promise<boolean> {
  const data = await getCatalogData();
  return data.indexableTopics.includes(topic.toLowerCase());
}
