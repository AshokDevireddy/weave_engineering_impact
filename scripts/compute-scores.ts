import * as fs from "fs";
import * as path from "path";

const OWNER = "PostHog";
const REPO = "posthog";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawPR {
  number: number;
  title: string;
  body: string;
  author: { login: string };
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  merged: boolean;
  additions: number;
  deletions: number;
  changedFiles: number;
  url: string;
  labels: { nodes: { name: string }[] };
  reviews: { totalCount: number; nodes: { author: { login: string } | null }[] };
  comments: { totalCount: number };
  participants: { nodes: { login: string }[] };
  files: { nodes: { path: string }[] } | null;
}

// ─── Product area mapping from file paths ────────────────────────────────────

const AREA_RULES: [RegExp, string][] = [
  [/^frontend\//, "Frontend"],
  [/^ee\/frontend\//, "Frontend"],
  [/^posthog\/api\//, "Backend API"],
  [/^posthog\/models\//, "Backend Models"],
  [/^posthog\/celery\/|^posthog\/tasks\//, "Backend Tasks"],
  [/^posthog\/hogql\/|^posthog\/hogql_queries\//, "HogQL / Query Engine"],
  [/^posthog\/warehouse\//, "Data Warehouse"],
  [/^posthog\/temporal\//, "Temporal Workflows"],
  [/^posthog\/batch_exports\//, "Batch Exports"],
  [/^posthog\/cdp\//, "CDP / Destinations"],
  [/^ee\/clickhouse\//, "ClickHouse / Analytics"],
  [/^posthog\/clickhouse\//, "ClickHouse / Analytics"],
  [/^plugin-server\//, "Plugin Server"],
  [/^rust\//, "Rust Services"],
  [/^hogvm\//, "HogVM"],
  [/^hog\//, "Hog Language"],
  [/^posthog\/management\//, "Management Commands"],
  [/^posthog\/migrations\/|^ee\/migrations\//, "Migrations"],
  [/^docker\/|^bin\/|Dockerfile|\.github\//, "Infrastructure / CI"],
  [/^\.github\//, "Infrastructure / CI"],
  [/^posthog\/test|^ee\/.*test|__tests__|\.test\.|_test\.py|test_/, "Tests"],
  [/^cypress\/|^playwright\//, "E2E Tests"],
  [/^docs\/|\.md$/, "Documentation"],
  [/^mypy|^ruff|\.eslint|prettier|tsconfig/, "Tooling / Config"],
  [/^requirements|package\.json|yarn\.lock|pnpm/, "Dependencies"],
];

function classifyFile(filePath: string): string {
  for (const [pattern, area] of AREA_RULES) {
    if (pattern.test(filePath)) return area;
  }
  if (filePath.startsWith("posthog/")) return "Backend Core";
  if (filePath.startsWith("ee/")) return "Enterprise";
  return "Other";
}

function classifyPRAreas(files: { path: string }[]): string[] {
  const areas = new Set<string>();
  for (const f of files) {
    areas.add(classifyFile(f.path));
  }
  return [...areas];
}

// ─── Central/shared paths that indicate high-impact areas ────────────────────

const CRITICAL_PATTERNS = [
  /^posthog\/models\//,
  /^posthog\/api\//,
  /^posthog\/hogql\//,
  /^posthog\/hogql_queries\//,
  /^posthog\/warehouse\//,
  /^posthog\/batch_exports\//,
  /^posthog\/cdp\//,
  /^plugin-server\/src\//,
  /^rust\/capture/,
  /^posthog\/celery/,
  /^posthog\/tasks\//,
  /^frontend\/src\/lib\//,
  /^frontend\/src\/queries\//,
];

function touchesCriticalArea(files: { path: string }[]): boolean {
  return files.some((f) => CRITICAL_PATTERNS.some((p) => p.test(f.path)));
}

function countTestFiles(files: { path: string }[]): number {
  return files.filter(
    (f) =>
      /test/i.test(f.path) ||
      f.path.includes("__tests__") ||
      f.path.includes(".test.") ||
      f.path.includes("_test.") ||
      f.path.includes("test_")
  ).length;
}

// ─── PR-level quality signals ────────────────────────────────────────────────

interface PRMetrics {
  pr: RawPR;
  areas: string[];
  sizeScore: number; // penalizes tiny and giant PRs
  testScore: number;
  criticalArea: boolean;
  reviewerCount: number;
  distinctReviewers: string[];
  commentCount: number;
  participantCount: number;
  cycleTimeDays: number | null;
}

function computePRMetrics(pr: RawPR): PRMetrics {
  const files = pr.files?.nodes ?? [];
  const areas = classifyPRAreas(files);
  const totalChanges = pr.additions + pr.deletions;

  // Size score: reward medium PRs, penalize tiny (<10 lines) and giant (>2000 lines)
  let sizeScore: number;
  if (totalChanges < 10) sizeScore = 0.3;
  else if (totalChanges <= 100) sizeScore = 1.0;
  else if (totalChanges <= 400) sizeScore = 0.9;
  else if (totalChanges <= 1000) sizeScore = 0.7;
  else if (totalChanges <= 2000) sizeScore = 0.5;
  else sizeScore = 0.3;

  const testFileCount = countTestFiles(files);
  const testScore = Math.min(testFileCount / Math.max(pr.changedFiles, 1), 1.0);

  const criticalArea = touchesCriticalArea(files);

  const reviewers = pr.reviews.nodes
    .map((r) => r.author?.login)
    .filter((l): l is string => !!l && l !== pr.author.login);
  const distinctReviewers = [...new Set(reviewers)];

  let cycleTimeDays: number | null = null;
  if (pr.mergedAt) {
    const created = new Date(pr.createdAt).getTime();
    const merged = new Date(pr.mergedAt).getTime();
    cycleTimeDays = (merged - created) / (1000 * 60 * 60 * 24);
  }

  return {
    pr,
    areas,
    sizeScore,
    testScore,
    criticalArea,
    reviewerCount: distinctReviewers.length,
    distinctReviewers,
    commentCount: pr.comments.totalCount,
    participantCount: pr.participants.nodes.length,
    cycleTimeDays,
  };
}

// ─── Engineer-level aggregation ──────────────────────────────────────────────

interface EngineerStats {
  login: string;
  prCount: number;
  prs: PRMetrics[];
  totalAdditions: number;
  totalDeletions: number;
  allAreas: Set<string>;
  allReviewers: Set<string>;
  allParticipants: Set<string>;
  criticalPRCount: number;
  testTouchingPRCount: number;
  avgSizeScore: number;
  avgCycleTimeDays: number | null;
  weeklyActivity: Map<string, number>; // ISO week -> PR count for consistency
}

function aggregateByEngineer(prMetrics: PRMetrics[]): Map<string, EngineerStats> {
  const engineers = new Map<string, EngineerStats>();

  for (const pm of prMetrics) {
    const login = pm.pr.author.login;
    if (!engineers.has(login)) {
      engineers.set(login, {
        login,
        prCount: 0,
        prs: [],
        totalAdditions: 0,
        totalDeletions: 0,
        allAreas: new Set(),
        allReviewers: new Set(),
        allParticipants: new Set(),
        criticalPRCount: 0,
        testTouchingPRCount: 0,
        avgSizeScore: 0,
        avgCycleTimeDays: null,
        weeklyActivity: new Map(),
      });
    }
    const eng = engineers.get(login)!;
    eng.prCount++;
    eng.prs.push(pm);
    eng.totalAdditions += pm.pr.additions;
    eng.totalDeletions += pm.pr.deletions;
    pm.areas.forEach((a) => eng.allAreas.add(a));
    pm.distinctReviewers.forEach((r) => eng.allReviewers.add(r));
    pm.pr.participants.nodes.forEach((p) => {
      if (p.login !== login) eng.allParticipants.add(p.login);
    });
    if (pm.criticalArea) eng.criticalPRCount++;
    if (pm.testScore > 0) eng.testTouchingPRCount++;

    // Weekly activity for consistency scoring — use mergedAt (when work shipped)
    const mergeDate = pm.pr.mergedAt ? new Date(pm.pr.mergedAt) : new Date(pm.pr.createdAt);
    const week = getISOWeek(mergeDate);
    eng.weeklyActivity.set(week, (eng.weeklyActivity.get(week) || 0) + 1);
  }

  // Compute averages
  for (const eng of engineers.values()) {
    eng.avgSizeScore = eng.prs.reduce((s, p) => s + p.sizeScore, 0) / eng.prCount;
    const cycleTimes = eng.prs
      .map((p) => p.cycleTimeDays)
      .filter((c): c is number => c !== null);
    eng.avgCycleTimeDays =
      cycleTimes.length > 0
        ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
        : null;
  }

  return engineers;
}

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    );
  return `${d.getFullYear()}-W${weekNum.toString().padStart(2, "0")}`;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────
// Weights: Delivery 35%, Quality 30%, Collaboration 20%, Breadth 15%

interface EngineerScore {
  login: string;
  overall: number;
  delivery: number;
  quality: number;
  collaboration: number;
  breadth: number;
  deliveryRaw: Record<string, number>;
  qualityRaw: Record<string, number>;
  collaborationRaw: Record<string, number>;
  breadthRaw: Record<string, number>;
  stats: {
    prCount: number;
    totalAdditions: number;
    totalDeletions: number;
    areas: string[];
    criticalPRCount: number;
    testTouchingPRCount: number;
    avgCycleTimeDays: number | null;
    distinctReviewerCount: number;
    distinctParticipantCount: number;
    activeWeeks: number;
    totalWeeks: number;
  };
  topPRs: {
    number: number;
    title: string;
    url: string;
    additions: number;
    deletions: number;
    areas: string[];
    mergedAt: string | null;
  }[];
}

function percentileRank(values: number[], value: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = sorted.findIndex((v) => v >= value);
  if (idx === -1) return 1;
  return idx / sorted.length;
}

function computeScores(engineers: Map<string, EngineerStats>): EngineerScore[] {
  const allStats = [...engineers.values()];

  // Only score engineers with at least 3 PRs
  const eligible = allStats.filter((e) => e.prCount >= 3);
  if (eligible.length === 0) return [];

  // Compute raw metrics for percentile ranking
  const prCounts = eligible.map((e) => e.prCount);
  const avgSizeScores = eligible.map((e) => e.avgSizeScore);
  const testRatios = eligible.map((e) => e.testTouchingPRCount / e.prCount);
  const reviewerCounts = eligible.map((e) => e.allReviewers.size);
  const participantCounts = eligible.map((e) => e.allParticipants.size);
  const areaCounts = eligible.map((e) => e.allAreas.size);
  const criticalRatios = eligible.map((e) => e.criticalPRCount / e.prCount);

  // Count actual distinct ISO weeks in the 90-day window
  const windowStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const windowEnd = new Date();
  const allWeeksInWindow = new Set<string>();
  for (let d = new Date(windowStart); d <= windowEnd; d.setDate(d.getDate() + 1)) {
    allWeeksInWindow.add(getISOWeek(d));
  }
  const totalWeeks = allWeeksInWindow.size;

  const consistencyScores = eligible.map((e) => e.weeklyActivity.size / totalWeeks);

  const scores: EngineerScore[] = eligible.map((eng) => {
    // ─── Delivery (35%) ─────────────────────────────────────────────
    const prCountScore = percentileRank(prCounts, eng.prCount);
    const consistencyScore = Math.min(eng.weeklyActivity.size / totalWeeks, 1.0);
    const mergeRate = 1.0; // We only collected merged PRs
    const cycleTimeScore =
      eng.avgCycleTimeDays !== null
        ? Math.max(0, 1 - eng.avgCycleTimeDays / 14)
        : 0.5;

    const deliveryRaw = {
      prVolume: prCountScore,
      consistency: consistencyScore,
      mergeRate,
      cycleTime: cycleTimeScore,
    };
    const delivery = Math.min(prCountScore * 0.35 + consistencyScore * 0.35 + cycleTimeScore * 0.3, 1.0);

    // ─── Quality (30%) ──────────────────────────────────────────────
    const testRatio = eng.testTouchingPRCount / eng.prCount;
    const testScore = percentileRank(testRatios, testRatio);
    const sizeScore = percentileRank(avgSizeScores, eng.avgSizeScore);
    const criticalRatio = eng.criticalPRCount / eng.prCount;
    const criticalScore = percentileRank(criticalRatios, criticalRatio);

    const qualityRaw = {
      testCoverage: testScore,
      prSizeManagement: sizeScore,
      criticalAreaWork: criticalScore,
    };
    const quality = testScore * 0.4 + sizeScore * 0.35 + criticalScore * 0.25;

    // ─── Collaboration (20%) ────────────────────────────────────────
    const reviewerScore = percentileRank(reviewerCounts, eng.allReviewers.size);
    const participantScore = percentileRank(participantCounts, eng.allParticipants.size);

    const collaborationRaw = {
      distinctReviewers: reviewerScore,
      crossTeamParticipants: participantScore,
    };
    const collaboration = reviewerScore * 0.5 + participantScore * 0.5;

    // ─── Breadth (15%) ──────────────────────────────────────────────
    const areaScore = percentileRank(areaCounts, eng.allAreas.size);
    const criticalBreadthScore = criticalScore;

    const breadthRaw = {
      areaCount: areaScore,
      criticalBreadth: criticalBreadthScore,
    };
    const breadthVal = areaScore * 0.6 + criticalBreadthScore * 0.4;

    // ─── Overall ────────────────────────────────────────────────────
    const overall = delivery * 0.35 + quality * 0.3 + collaboration * 0.2 + breadthVal * 0.15;

    // Top PRs by impact (sort by: critical area + size score + test score)
    const prsByImpact = eng.prs
      .map((pm) => ({
        pm,
        impactScore:
          (pm.criticalArea ? 0.3 : 0) + pm.sizeScore * 0.4 + pm.testScore * 0.3,
      }))
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 5);

    return {
      login: eng.login,
      overall: Math.round(overall * 1000) / 1000,
      delivery: Math.round(delivery * 1000) / 1000,
      quality: Math.round(quality * 1000) / 1000,
      collaboration: Math.round(collaboration * 1000) / 1000,
      breadth: Math.round(breadthVal * 1000) / 1000,
      deliveryRaw,
      qualityRaw,
      collaborationRaw,
      breadthRaw,
      stats: {
        prCount: eng.prCount,
        totalAdditions: eng.totalAdditions,
        totalDeletions: eng.totalDeletions,
        areas: [...eng.allAreas],
        criticalPRCount: eng.criticalPRCount,
        testTouchingPRCount: eng.testTouchingPRCount,
        avgCycleTimeDays: eng.avgCycleTimeDays
          ? Math.round(eng.avgCycleTimeDays * 10) / 10
          : null,
        distinctReviewerCount: eng.allReviewers.size,
        distinctParticipantCount: eng.allParticipants.size,
        activeWeeks: eng.weeklyActivity.size,
        totalWeeks,
      },
      topPRs: prsByImpact.map(({ pm }) => ({
        number: pm.pr.number,
        title: pm.pr.title,
        url: pm.pr.url,
        additions: pm.pr.additions,
        deletions: pm.pr.deletions,
        areas: pm.areas,
        mergedAt: pm.pr.mergedAt,
      })),
    };
  });

  scores.sort((a, b) => b.overall - a.overall);
  return scores;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const dataPath = path.join(process.cwd(), "data", "raw-prs.json");
  if (!fs.existsSync(dataPath)) {
    console.error(`No raw data found at ${dataPath}. Run collect-data.ts first.`);
    process.exit(1);
  }

  const rawPRs: RawPR[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  console.log(`Processing ${rawPRs.length} PRs...`);

  const prMetrics = rawPRs.map(computePRMetrics);
  const engineers = aggregateByEngineer(prMetrics);
  console.log(`Found ${engineers.size} unique engineers`);

  const scores = computeScores(engineers);
  console.log(`Scored ${scores.length} eligible engineers (>=3 PRs)`);

  const top5 = scores.slice(0, 5);
  console.log("\nTop 5 Engineers:");
  top5.forEach((e, i) => {
    console.log(
      `  ${i + 1}. ${e.login} — overall: ${e.overall} | D:${e.delivery} Q:${e.quality} C:${e.collaboration} B:${e.breadth} | PRs:${e.stats.prCount} Areas:${e.stats.areas.length}`
    );
  });

  // Write full scores and top 5 detail
  const outDir = path.join(process.cwd(), "data");
  fs.writeFileSync(
    path.join(outDir, "all-scores.json"),
    JSON.stringify(scores, null, 2)
  );
  fs.writeFileSync(
    path.join(outDir, "top5.json"),
    JSON.stringify(top5, null, 2)
  );

  // Summary stats for dashboard metadata
  const summary = {
    totalPRs: rawPRs.length,
    totalEngineers: engineers.size,
    eligibleEngineers: scores.length,
    periodStart: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    periodEnd: new Date().toISOString().split("T")[0],
    repo: `${OWNER}/${REPO}`,
    scoringWeights: {
      delivery: 0.35,
      quality: 0.30,
      collaboration: 0.20,
      breadth: 0.15,
    },
  };
  fs.writeFileSync(
    path.join(outDir, "summary.json"),
    JSON.stringify(summary, null, 2)
  );

  console.log("\nScores written to data/all-scores.json, data/top5.json, data/summary.json");
}

main();
