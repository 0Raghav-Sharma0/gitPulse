import fs from "node:fs";
import path from "node:path";

const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken) {
  console.error("❌ GITHUB_TOKEN environment variable is required.");
  process.exit(1);
}

const TARGET_REPOS = 250;
const PER_PAGE = 100;

function daysAgoIso(days) {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

const TREND_WINDOWS = [
  {
    label: "7d-hot",
    query: `is:public archived:false pushed:>=${daysAgoIso(7)} stars:>=200`,
    sort: "updated",
    pages: 3,
  },
  {
    label: "14d-rising",
    query: `is:public archived:false pushed:>=${daysAgoIso(14)} stars:>=100`,
    sort: "updated",
    pages: 3,
  },
  {
    label: "30d-active",
    query: `is:public archived:false pushed:>=${daysAgoIso(30)} stars:>=50`,
    sort: "updated",
    pages: 4,
  },
  {
    label: "fallback-popular",
    query: "is:public archived:false stars:>=1000",
    sort: "stars",
    pages: 3,
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getErrorMessage(error) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return String(error);
}

function parseRateLimitReset(response) {
  const resetHeader = response.headers.get("x-ratelimit-reset");
  if (!resetHeader) return null;
  const resetEpochSeconds = Number(resetHeader);
  if (!Number.isFinite(resetEpochSeconds)) return null;
  const waitMs = Math.max(0, resetEpochSeconds * 1000 - Date.now());
  return waitMs;
}

async function fetchPage(windowConfig, page) {
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", windowConfig.query);
  url.searchParams.set("sort", windowConfig.sort);
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("page", String(page));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "RepoMind-Weekly-Repo-Catalog",
    },
  });

  if (response.status === 403) {
    const waitMs = parseRateLimitReset(response) ?? 60_000;
    const waitSeconds = Math.ceil(waitMs / 1000);
    console.warn(`⏳ Rate limited. Waiting ${waitSeconds}s before retrying...`);
    await sleep(waitMs + 1_000);
    return fetchPage(windowConfig, page);
  }

  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status}: ${response.statusText}`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.items) ? payload.items : [];
}

function normalizeRepo(repo) {
  return {
    owner: repo?.owner?.login ?? "",
    repo: repo?.name ?? "",
    stars: Number(repo?.stargazers_count ?? 0),
    description: typeof repo?.description === "string" ? repo.description : null,
    topics: Array.isArray(repo?.topics)
      ? repo.topics.filter((topic) => typeof topic === "string" && topic.trim().length > 0)
      : [],
    language: typeof repo?.language === "string" ? repo.language : null,
  };
}

function isValidRepo(repo) {
  return (
    typeof repo.owner === "string" &&
    repo.owner.trim().length > 0 &&
    typeof repo.repo === "string" &&
    repo.repo.trim().length > 0
  );
}

async function fetchTrendingRepos() {
  const collected = [];
  const seen = new Set();

  console.log("🚀 Building weekly trending repository catalog...");

  for (const windowConfig of TREND_WINDOWS) {
    console.log(`\n🔍 Window: ${windowConfig.label}`);

    for (let page = 1; page <= windowConfig.pages; page += 1) {
      if (collected.length >= TARGET_REPOS) {
        break;
      }

      try {
        const items = await fetchPage(windowConfig, page);
        if (items.length === 0) {
          console.log(`   • page ${page}: no results, moving on`);
          break;
        }

        let addedThisPage = 0;

        for (const item of items) {
          const normalized = normalizeRepo(item);
          if (!isValidRepo(normalized)) continue;

          const key = `${normalized.owner.toLowerCase()}/${normalized.repo.toLowerCase()}`;
          if (seen.has(key)) continue;

          seen.add(key);
          collected.push(normalized);
          addedThisPage += 1;

          if (collected.length >= TARGET_REPOS) {
            break;
          }
        }

        console.log(`   • page ${page}: +${addedThisPage}, total=${collected.length}`);
        await sleep(1_000);
      } catch (error) {
        console.error(`   ❌ failed on page ${page}: ${getErrorMessage(error)}`);
        break;
      }
    }

    if (collected.length >= TARGET_REPOS) {
      break;
    }
  }

  const finalSet = collected.slice(0, TARGET_REPOS);

  if (finalSet.length === 0) {
    throw new Error("No repositories collected from GitHub search windows.");
  }

  const dataDir = path.resolve(process.cwd(), "public/data");
  fs.mkdirSync(dataDir, { recursive: true });

  const outputPath = path.resolve(dataDir, "top-repos.json");
  fs.writeFileSync(outputPath, `${JSON.stringify(finalSet, null, 2)}\n`);

  console.log(`\n✅ Wrote ${finalSet.length} repositories to ${outputPath}`);
}

fetchTrendingRepos().catch((error) => {
  console.error("❌ Failed to refresh trending repository catalog:", getErrorMessage(error));
  process.exit(1);
});
