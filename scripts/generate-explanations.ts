import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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

interface EngineerExplanation {
  login: string;
  archetype: string;
  summary: string;
  reasons: string[];
  whyMatters: string;
}

const ARCHETYPES = [
  "Product Mover",
  "Infra Stabilizer",
  "Quality Multiplier",
  "Cross-Team Enabler",
  "Reliability Driver",
  "Full-Stack Generalist",
  "Data Platform Builder",
  "Developer Experience Improver",
];

function determineArchetype(eng: EngineerScore): string {
  const areas = eng.stats.areas;
  const hasInfra = areas.some(
    (a) =>
      a.includes("Infrastructure") ||
      a.includes("Rust") ||
      a.includes("Plugin Server") ||
      a.includes("ClickHouse")
  );
  const hasFrontend = areas.some((a) => a.includes("Frontend"));
  const hasBackend = areas.some(
    (a) => a.includes("Backend") || a.includes("HogQL") || a.includes("Warehouse")
  );
  const highBreadth = eng.breadth > 0.7;
  const highQuality = eng.quality > 0.7;
  const highCollaboration = eng.collaboration > 0.7;
  const highDelivery = eng.delivery > 0.7;
  const testHeavy = eng.stats.testTouchingPRCount / eng.stats.prCount > 0.5;

  if (highBreadth && hasFrontend && hasBackend) return "Full-Stack Generalist";
  if (highCollaboration && eng.stats.distinctReviewerCount > 8) return "Cross-Team Enabler";
  if (highQuality && testHeavy) return "Quality Multiplier";
  if (hasInfra && !hasFrontend) return "Infra Stabilizer";
  if (
    areas.some((a) => a.includes("Data Warehouse") || a.includes("Batch Exports") || a.includes("HogQL"))
  )
    return "Data Platform Builder";
  if (highDelivery && hasFrontend) return "Product Mover";
  if (highDelivery) return "Product Mover";
  if (areas.some((a) => a.includes("Reliability") || a.includes("Rust")))
    return "Reliability Driver";
  return "Product Mover";
}

function generateDeterministicExplanation(eng: EngineerScore, rank: number): EngineerExplanation {
  const archetype = determineArchetype(eng);
  const reasons: string[] = [];

  // Delivery reasons
  if (eng.delivery >= 0.7) {
    reasons.push(
      `Shipped ${eng.stats.prCount} merged PRs across ${eng.stats.activeWeeks} of ${eng.stats.totalWeeks} weeks, showing strong delivery consistency.`
    );
  } else if (eng.stats.prCount > 10) {
    reasons.push(
      `Delivered ${eng.stats.prCount} merged PRs with steady cadence across the 90-day window.`
    );
  }

  // Quality reasons
  if (eng.stats.testTouchingPRCount > 0) {
    const pct = Math.round((eng.stats.testTouchingPRCount / eng.stats.prCount) * 100);
    reasons.push(
      `${pct}% of PRs included test changes, indicating commitment to code quality and maintainability.`
    );
  }
  if (eng.stats.criticalPRCount > 0) {
    reasons.push(
      `${eng.stats.criticalPRCount} PRs touched critical/shared areas of the codebase (APIs, models, query engine).`
    );
  }

  // Collaboration reasons
  if (eng.stats.distinctReviewerCount >= 5) {
    reasons.push(
      `Collaborated with ${eng.stats.distinctReviewerCount} distinct reviewers, demonstrating broad cross-team engagement.`
    );
  }

  // Breadth reasons
  if (eng.stats.areas.length >= 4) {
    reasons.push(
      `Contributed across ${eng.stats.areas.length} distinct product areas: ${eng.stats.areas.slice(0, 5).join(", ")}.`
    );
  }

  // Cycle time
  if (eng.stats.avgCycleTimeDays !== null && eng.stats.avgCycleTimeDays < 2) {
    reasons.push(
      `Average cycle time of ${eng.stats.avgCycleTimeDays} days indicates fast iteration and responsiveness.`
    );
  }

  // Take top 3 reasons
  const topReasons = reasons.slice(0, 3);
  if (topReasons.length < 3) {
    topReasons.push(
      `Consistent contributor with well-scoped, maintainable changes across the analysis period.`
    );
  }

  // Summary
  const areaHighlights = eng.stats.areas.slice(0, 3).join(", ");
  const summary = `Ranked #${rank} with ${eng.stats.prCount} merged PRs across ${areaHighlights}. Strongest in ${getStrongestDimension(eng)}.`;

  // Why it matters
  const whyMatters = generateWhyMatters(eng, archetype);

  return {
    login: eng.login,
    archetype,
    summary,
    reasons: topReasons,
    whyMatters,
  };
}

function getStrongestDimension(eng: EngineerScore): string {
  const dims = [
    { name: "delivery", score: eng.delivery },
    { name: "quality", score: eng.quality },
    { name: "collaboration", score: eng.collaboration },
    { name: "breadth", score: eng.breadth },
  ];
  dims.sort((a, b) => b.score - a.score);
  return dims[0].name;
}

function generateWhyMatters(eng: EngineerScore, archetype: string): string {
  switch (archetype) {
    case "Product Mover":
      return `Drives visible product progress by consistently shipping user-facing changes that move the product forward.`;
    case "Infra Stabilizer":
      return `Keeps the platform reliable by working on foundational infrastructure that everything else depends on.`;
    case "Quality Multiplier":
      return `Raises the bar for the entire team by ensuring changes are well-tested and maintainable.`;
    case "Cross-Team Enabler":
      return `Creates leverage by working across team boundaries and enabling others through code review and collaboration.`;
    case "Reliability Driver":
      return `Protects uptime and performance by hardening critical system components and data paths.`;
    case "Full-Stack Generalist":
      return `Provides versatile impact by contributing across the full stack, reducing bottlenecks wherever they emerge.`;
    case "Data Platform Builder":
      return `Strengthens PostHog's data capabilities by building and improving the query engine and data infrastructure.`;
    case "Developer Experience Improver":
      return `Makes the team faster by improving tooling, developer workflows, and code maintainability.`;
    default:
      return `Makes significant engineering contributions that impact the product and team.`;
  }
}

async function generateWithLLM(
  engineers: EngineerScore[],
  deterministicExplanations: EngineerExplanation[]
): Promise<EngineerExplanation[]> {
  if (!OPENAI_API_KEY) {
    console.log("No OPENAI_API_KEY found, using deterministic explanations only.");
    return deterministicExplanations;
  }

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const enhanced: EngineerExplanation[] = [];

  for (let i = 0; i < engineers.length; i++) {
    const eng = engineers[i];
    const det = deterministicExplanations[i];

    try {
      const prompt = `You are helping build an engineering impact dashboard. Given the following data about a software engineer's contributions to the PostHog GitHub repository over 90 days, write:

1. A concise 1-2 sentence summary of their impact (factual, evidence-based)
2. Exactly 3 short bullet-point reasons they ranked #${i + 1} (each under 20 words)
3. A one-sentence "why this matters" explanation for an engineering leader

Engineer: ${eng.login}
Rank: #${i + 1}
Overall Score: ${eng.overall}
Archetype: ${det.archetype}

Stats:
- ${eng.stats.prCount} merged PRs
- Areas: ${eng.stats.areas.join(", ")}
- ${eng.stats.criticalPRCount} PRs in critical/shared code
- ${eng.stats.testTouchingPRCount} PRs with test changes
- ${eng.stats.distinctReviewerCount} distinct reviewers
- ${eng.stats.activeWeeks}/${eng.stats.totalWeeks} active weeks
- Avg cycle time: ${eng.stats.avgCycleTimeDays ?? "unknown"} days

Scores:
- Delivery: ${eng.delivery} (PR volume: ${eng.deliveryRaw.prVolume.toFixed(2)}, consistency: ${eng.deliveryRaw.consistency.toFixed(2)})
- Quality: ${eng.quality} (tests: ${eng.qualityRaw.testCoverage.toFixed(2)}, PR size: ${eng.qualityRaw.prSizeManagement.toFixed(2)})
- Collaboration: ${eng.collaboration} (reviewers: ${eng.collaborationRaw.distinctReviewers.toFixed(2)}, participants: ${eng.collaborationRaw.crossTeamParticipants.toFixed(2)})
- Breadth: ${eng.breadth} (areas: ${eng.breadthRaw.areaCount.toFixed(2)})

Top PRs:
${eng.topPRs.map((pr) => `- #${pr.number}: ${pr.title} (${pr.areas.join(", ")})`).join("\n")}

Respond in JSON format:
{
  "summary": "...",
  "reasons": ["...", "...", "..."],
  "whyMatters": "..."
}

Be specific to this engineer's data. Do not invent facts. Keep it concise and professional.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        enhanced.push({
          login: eng.login,
          archetype: det.archetype,
          summary: parsed.summary || det.summary,
          reasons: parsed.reasons || det.reasons,
          whyMatters: parsed.whyMatters || det.whyMatters,
        });
        console.log(`  ✓ LLM explanation for ${eng.login}`);
      } else {
        enhanced.push(det);
      }
    } catch (e) {
      console.warn(`  ✗ LLM failed for ${eng.login}, using deterministic:`, e);
      enhanced.push(det);
    }
  }

  return enhanced;
}

async function main() {
  const dataDir = path.join(process.cwd(), "data");
  const top5Path = path.join(dataDir, "top5.json");

  if (!fs.existsSync(top5Path)) {
    console.error("No top5.json found. Run compute-scores.ts first.");
    process.exit(1);
  }

  const top5: EngineerScore[] = JSON.parse(fs.readFileSync(top5Path, "utf-8"));
  console.log(`Generating explanations for ${top5.length} engineers...`);

  const deterministic = top5.map((eng, i) =>
    generateDeterministicExplanation(eng, i + 1)
  );

  const explanations = await generateWithLLM(top5, deterministic);

  // Merge explanations into final dashboard data
  const dashboardData = top5.map((eng, i) => ({
    ...eng,
    rank: i + 1,
    explanation: explanations[i],
  }));

  fs.writeFileSync(
    path.join(dataDir, "dashboard-data.json"),
    JSON.stringify(dashboardData, null, 2)
  );

  console.log("Dashboard data written to data/dashboard-data.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
