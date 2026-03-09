import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error("GITHUB_TOKEN env var required");
  process.exit(1);
}

const OWNER = "PostHog";
const REPO = "posthog";
const DAYS = 90;
const GRAPHQL_URL = "https://api.github.com/graphql";
const MAX_RETRIES = 4;

const now = new Date();
const sinceDate = new Date();
sinceDate.setDate(now.getDate() - DAYS);

// ── Types ────────────────────────────────────────────────────────────────────

interface BasicPR {
  id: string;
  number: number;
  title: string;
  author: { login: string; __typename: string } | null;
  createdAt: string;
  mergedAt: string | null;
  merged: boolean;
  additions: number;
  deletions: number;
  changedFiles: number;
  url: string;
  labels: { nodes: { name: string }[] };
  reviews: { totalCount: number; nodes: { author: { login: string } | null }[] };
  comments: { totalCount: number };
}

interface EnrichedPR extends BasicPR {
  participants: { nodes: { login: string }[] };
  files: { nodes: { path: string }[] } | null;
}

// ── Phase 1: Lightweight search (no files, no participants) ──────────────────
// This is fast because the payload per PR is small

const LIGHT_SEARCH_QUERY = `
query($q: String!, $cursor: String) {
  search(query: $q, type: ISSUE, first: 50, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    issueCount
    nodes {
      ... on PullRequest {
        id
        number
        title
        author { login __typename }
        createdAt
        mergedAt
        merged
        additions
        deletions
        changedFiles
        url
        labels(first: 10) { nodes { name } }
        reviews(first: 15) {
          totalCount
          nodes { author { login } }
        }
        comments { totalCount }
      }
    }
  }
}
`;

// ── Phase 2: Batch-fetch files for specific PRs using node IDs ───────────────

function buildFilesQuery(prIds: string[]): string {
  const fragments = prIds
    .map(
      (id, i) =>
        `pr${i}: node(id: "${id}") {
      ... on PullRequest {
        id
        participants(first: 15) { nodes { login } }
        files(first: 50) { nodes { path } }
      }
    }`
    )
    .join("\n");
  return `query { ${fragments} }`;
}

// ── GraphQL with retry ───────────────────────────────────────────────────────

async function gql(query: string, variables?: Record<string, unknown>, attempt = 1): Promise<any> {
  try {
    const body: any = { query };
    if (variables) body.variables = variables;

    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 403) {
      console.log(`  Rate limited, waiting 15s...`);
      await new Promise((r) => setTimeout(r, 15000));
      throw new Error("Rate limited");
    }
    if (res.status >= 500) throw new Error(`GitHub ${res.status}`);
    if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);

    const json = await res.json();
    if (json.errors?.length && !json.data) {
      throw new Error(json.errors[0].message);
    }
    return json.data;
  } catch (err: any) {
    if (attempt >= MAX_RETRIES) throw err;
    const backoff = 3000 * Math.pow(2, attempt - 1);
    console.log(`  Retry ${attempt}/${MAX_RETRIES} in ${backoff / 1000}s — ${err.message}`);
    await new Promise((r) => setTimeout(r, backoff));
    return gql(query, variables, attempt + 1);
  }
}

// ── Bot filter ───────────────────────────────────────────────────────────────

const BOT_PATTERNS = [
  /\[bot\]$/i, /bot$/i, /^dependabot/i, /^renovate/i,
  /^github-actions/i, /^posthog-bot/i, /^codecov/i, /^stale/i,
];
function isBot(login: string): boolean {
  return BOT_PATTERNS.some((p) => p.test(login));
}
function isHuman(pr: BasicPR): boolean {
  return !!pr.author && !isBot(pr.author.login) && pr.author.__typename !== "Bot";
}

// ── Date windows ─────────────────────────────────────────────────────────────

function fmt(d: Date): string { return d.toISOString().split("T")[0]; }

function buildWindows(count: number): { start: string; end: string }[] {
  const ms = now.getTime() - sinceDate.getTime();
  const step = ms / count;
  const wins: { start: string; end: string }[] = [];
  for (let i = 0; i < count; i++) {
    const s = new Date(sinceDate.getTime() + i * step);
    const e = new Date(sinceDate.getTime() + (i + 1) * step);
    wins.push({ start: fmt(s), end: fmt(e > now ? now : e) });
  }
  return wins;
}

// ── Parallel with concurrency limit ──────────────────────────────────────────

async function pMap<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
  return results;
}

// ── Phase 1: Fetch all PRs (lightweight) ─────────────────────────────────────

async function fetchWindowLight(win: { start: string; end: string }): Promise<BasicPR[]> {
  const q = `repo:${OWNER}/${REPO} is:pr is:merged merged:${win.start}..${win.end}`;
  const prs: BasicPR[] = [];
  let cursor: string | null = null;

  while (true) {
    const data = await gql(LIGHT_SEARCH_QUERY, { q, cursor });
    const nodes: BasicPR[] = (data.search.nodes || []).filter((n: any) => n?.number);

    for (const pr of nodes) {
      if (isHuman(pr)) prs.push(pr);
    }

    if (!data.search.pageInfo.hasNextPage) break;
    cursor = data.search.pageInfo.endCursor;
    await new Promise((r) => setTimeout(r, 300));
  }
  return prs;
}

// ── Phase 2: Fetch files in batches ──────────────────────────────────────────

async function fetchFilesBatch(prIds: string[]): Promise<Map<string, { participants: any; files: any }>> {
  const results = new Map<string, { participants: any; files: any }>();
  const BATCH = 8; // 8 PRs per query to stay within complexity limits

  const batches: string[][] = [];
  for (let i = 0; i < prIds.length; i += BATCH) {
    batches.push(prIds.slice(i, i + BATCH));
  }

  console.log(`  Fetching files for ${prIds.length} PRs in ${batches.length} batches...`);

  const tasks = batches.map((batch, bIdx) => async () => {
    const query = buildFilesQuery(batch);
    const data = await gql(query);
    for (let j = 0; j < batch.length; j++) {
      const key = `pr${j}`;
      if (data[key]) {
        results.set(data[key].id, {
          participants: data[key].participants,
          files: data[key].files,
        });
      }
    }
    if (bIdx % 5 === 0 && bIdx > 0) {
      console.log(`  ... ${bIdx}/${batches.length} batches done`);
    }
  });

  await pMap(tasks, 3);
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now();

  // Phase 1: lightweight parallel fetch
  const windows = buildWindows(9);
  console.log(`Phase 1: Fetching PRs across ${windows.length} date windows...`);
  windows.forEach((w) => console.log(`  ${w.start} → ${w.end}`));

  const tasks = windows.map((w) => () => fetchWindowLight(w));
  const windowResults = await pMap(tasks, 3); // concurrency 3 to be safe
  let allPRs = windowResults.flat();

  // Dedup by PR number
  const seen = new Set<number>();
  allPRs = allPRs.filter((pr) => {
    if (seen.has(pr.number)) return false;
    seen.add(pr.number);
    return true;
  });

  console.log(`Phase 1 done: ${allPRs.length} unique merged PRs in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // Identify top ~20 contributors by basic metrics for file enrichment
  const prsByAuthor = new Map<string, BasicPR[]>();
  for (const pr of allPRs) {
    const login = pr.author!.login;
    if (!prsByAuthor.has(login)) prsByAuthor.set(login, []);
    prsByAuthor.get(login)!.push(pr);
  }

  const authorRanking = [...prsByAuthor.entries()]
    .map(([login, prs]) => ({
      login,
      prCount: prs.length,
      totalChanges: prs.reduce((s, p) => s + p.additions + p.deletions, 0),
      reviewsReceived: prs.reduce((s, p) => s + p.reviews.totalCount, 0),
    }))
    .sort((a, b) => b.prCount - a.prCount);

  // Take top 20 contributors for enrichment (covers more than enough for top 5)
  const topAuthors = new Set(authorRanking.slice(0, 20).map((a) => a.login));
  const prsToEnrich = allPRs.filter((pr) => topAuthors.has(pr.author!.login));
  const prIdsToEnrich = prsToEnrich.map((pr) => pr.id).filter(Boolean);

  console.log(`\nPhase 2: Enriching ${prIdsToEnrich.length} PRs from top ${topAuthors.size} contributors...`);

  const filesMap = await fetchFilesBatch(prIdsToEnrich);

  // Merge into enriched PRs
  const enrichedPRs: EnrichedPR[] = allPRs.map((pr) => {
    const extra = filesMap.get(pr.id);
    return {
      ...pr,
      participants: extra?.participants ?? { nodes: [] },
      files: extra?.files ?? null,
    };
  });

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nDone! ${enrichedPRs.length} PRs collected and enriched in ${elapsed}s`);

  const outDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "raw-prs.json"), JSON.stringify(enrichedPRs, null, 2));
  console.log(`Written to data/raw-prs.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
