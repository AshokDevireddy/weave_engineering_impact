"use client";

import { EngineerData } from "@/types";
import { ScoreBar } from "./ScoreBar";
import { Tooltip, FormulaLine, DefTip } from "./Tooltip";

interface DetailPanelProps {
  engineer: EngineerData;
}

function fmtPct(v: number) { return (v * 100).toFixed(0); }
function fmtDec(v: number) { return v.toFixed(2); }

export function DetailPanel({ engineer }: DetailPanelProps) {
  const e = engineer;
  const exp = e.explanation;
  const dr = e.deliveryRaw;
  const qr = e.qualityRaw;
  const cr = e.collaborationRaw;
  const br = e.breadthRaw;

  return (
    <div
      className="rounded-xl border p-5 h-full overflow-y-auto"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{e.login}</h2>
            <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
              #{e.rank}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{exp.archetype}</p>
        </div>
        <a
          href={`https://github.com/${e.login}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-lg border hover:opacity-80 transition-opacity"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
        >
          GitHub ↗
        </a>
      </div>

      {/* Why they rank highly */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-dim)" }}>
          Why they ranked #{e.rank}
        </h3>
        <ul className="space-y-1.5">
          {exp.reasons.map((reason, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed">
              <span className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-delivery)" }}>●</span>
              <span style={{ color: "var(--color-text-muted)" }}>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Why this matters */}
      <div className="rounded-lg p-3 mb-4" style={{ background: "var(--color-accent-soft)" }}>
        <p className="text-xs leading-relaxed">
          <span className="font-medium" style={{ color: "var(--color-accent)" }}>Why this matters: </span>
          <span style={{ color: "var(--color-text-muted)" }}>{exp.whyMatters}</span>
        </p>
        <p className="text-[10px] mt-1 italic" style={{ color: "var(--color-text-dim)" }}>
          AI-generated interpretation based on repository evidence
        </p>
      </div>

      {/* Score breakdown with formula tooltips */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-dim)" }}>
          Score breakdown
        </h3>
        <div className="space-y-2">
          <ScoreBar
            label="Delivery (35%)"
            value={e.delivery}
            color="var(--color-delivery)"
            tooltip={
              <div>
                <p className="font-medium mb-1" style={{ color: "var(--color-text)" }}>Delivery</p>
                <p>Volume of shipped, merged work plus consistency and speed.</p>
                <FormulaLine label="PR volume" formula={`percentile rank = ${fmtDec(dr.prVolume)}`} />
                <FormulaLine label="Consistency" formula={`${e.stats.activeWeeks}/${e.stats.totalWeeks} active weeks = ${fmtDec(dr.consistency)}`} />
                <FormulaLine label="Cycle time" formula={`score based on ${e.stats.avgCycleTimeDays ?? "?"}d avg = ${fmtDec(dr.cycleTime)}`} />
                <FormulaLine
                  label="Total"
                  formula={`0.35×${fmtDec(dr.prVolume)} + 0.35×${fmtDec(dr.consistency)} + 0.30×${fmtDec(dr.cycleTime)}`}
                  result={fmtPct(e.delivery)}
                />
              </div>
            }
          />
          <ScoreBar
            label="Quality (30%)"
            value={e.quality}
            color="var(--color-quality)"
            tooltip={
              <div>
                <p className="font-medium mb-1" style={{ color: "var(--color-text)" }}>Quality</p>
                <p>Signals of thoughtful, well-tested, well-scoped work.</p>
                <FormulaLine label="Test coverage" formula={`${e.stats.testTouchingPRCount}/${e.stats.prCount} PRs with tests → percentile ${fmtDec(qr.testCoverage)}`} />
                <FormulaLine label="PR size" formula={`avg size score → percentile ${fmtDec(qr.prSizeManagement)}`} />
                <FormulaLine label="Critical area" formula={`${e.stats.criticalPRCount}/${e.stats.prCount} PRs in core code → percentile ${fmtDec(qr.criticalAreaWork)}`} />
                <FormulaLine
                  label="Total"
                  formula={`0.40×${fmtDec(qr.testCoverage)} + 0.35×${fmtDec(qr.prSizeManagement)} + 0.25×${fmtDec(qr.criticalAreaWork)}`}
                  result={fmtPct(e.quality)}
                />
              </div>
            }
          />
          <ScoreBar
            label="Collaboration (20%)"
            value={e.collaboration}
            color="var(--color-collaboration)"
            tooltip={
              <div>
                <p className="font-medium mb-1" style={{ color: "var(--color-text)" }}>Collaboration</p>
                <p>Breadth of review engagement and cross-team interaction.</p>
                <FormulaLine label="Reviewers" formula={`${e.stats.distinctReviewerCount} unique reviewers → percentile ${fmtDec(cr.distinctReviewers)}`} />
                <FormulaLine label="Participants" formula={`${e.stats.distinctParticipantCount} unique participants → percentile ${fmtDec(cr.crossTeamParticipants)}`} />
                <FormulaLine
                  label="Total"
                  formula={`0.50×${fmtDec(cr.distinctReviewers)} + 0.50×${fmtDec(cr.crossTeamParticipants)}`}
                  result={fmtPct(e.collaboration)}
                />
              </div>
            }
          />
          <ScoreBar
            label="Breadth (15%)"
            value={e.breadth}
            color="var(--color-breadth)"
            tooltip={
              <div>
                <p className="font-medium mb-1" style={{ color: "var(--color-text)" }}>Breadth</p>
                <p>Diversity of product areas and work in critical systems.</p>
                <FormulaLine label="Area count" formula={`${e.stats.areas.length} areas → percentile ${fmtDec(br.areaCount)}`} />
                <FormulaLine label="Critical breadth" formula={`ratio of critical PRs → percentile ${fmtDec(br.criticalBreadth)}`} />
                <FormulaLine
                  label="Total"
                  formula={`0.60×${fmtDec(br.areaCount)} + 0.40×${fmtDec(br.criticalBreadth)}`}
                  result={fmtPct(e.breadth)}
                />
              </div>
            }
          />
        </div>

        {/* Overall formula */}
        <div className="mt-2 rounded-lg p-2" style={{ background: "var(--color-background)" }}>
          <Tooltip
            wide
            content={
              <div>
                <p className="font-medium mb-1" style={{ color: "var(--color-text)" }}>Overall Impact Score</p>
                <p>Weighted sum of all four dimensions:</p>
                <FormulaLine
                  formula={`0.35×${fmtDec(e.delivery)} + 0.30×${fmtDec(e.quality)} + 0.20×${fmtDec(e.collaboration)} + 0.15×${fmtDec(e.breadth)}`}
                  result={(e.overall * 100).toFixed(1)}
                />
              </div>
            }
          >
            <span className="text-xs font-mono" style={{ color: "var(--color-text-dim)" }}>
              Overall: 0.35×D + 0.30×Q + 0.20×C + 0.15×B ={" "}
              <span style={{ color: "var(--color-accent)" }}>{(e.overall * 100).toFixed(1)}</span>
            </span>
          </Tooltip>
        </div>
      </div>

      {/* Key metrics with definition tooltips */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-dim)" }}>
          Key metrics
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <MetricTile
            label="Merged PRs"
            value={e.stats.prCount}
            tip={<DefTip term="Merged PRs" definition="Total number of pull requests authored by this engineer that were merged into the main branch during the 90-day window." />}
          />
          <MetricTile
            label="Active weeks"
            value={`${e.stats.activeWeeks}/${e.stats.totalWeeks}`}
            tip={<DefTip term="Active Weeks" definition={`Number of distinct ISO calendar weeks in which this engineer had at least one PR merged. ${e.stats.totalWeeks} total weeks in the 90-day analysis window.`} />}
          />
          <MetricTile
            label="Cycle time"
            value={e.stats.avgCycleTimeDays !== null ? `${e.stats.avgCycleTimeDays}d` : "—"}
            tip={<DefTip term="Cycle Time" definition="Average number of days between a PR being opened and merged. Lower is better. Computed as: (mergedAt - createdAt) averaged across all merged PRs. Score: max(0, 1 - avgDays/14), so PRs merged in under 1 day score ~1.0, and 14+ days scores 0." />}
          />
          <MetricTile
            label="Reviewers"
            value={e.stats.distinctReviewerCount}
            tip={<DefTip term="Distinct Reviewers" definition="Number of unique GitHub users who reviewed at least one of this engineer's PRs. Higher values suggest broader collaboration and cross-team engagement." />}
          />
          <MetricTile
            label="Critical PRs"
            value={e.stats.criticalPRCount}
            tip={<DefTip term="Critical PRs" definition="PRs that touch shared or foundational code paths: models, APIs, HogQL query engine, data warehouse, batch exports, CDP, plugin server core, Rust capture service, celery tasks, frontend libs, or query definitions. These carry higher risk and higher impact." />}
          />
          <MetricTile
            label="Test PRs"
            value={e.stats.testTouchingPRCount}
            tip={<DefTip term="Test PRs" definition="PRs that include changes to test files (files matching patterns like *test*, __tests__, .test., _test., test_). Indicates the engineer is adding or updating tests alongside feature work." />}
          />
        </div>
      </div>

      {/* Areas touched */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-dim)" }}>
          <Tooltip content={<DefTip term="Product Areas" definition="File paths are heuristically mapped to product areas (e.g. frontend/, posthog/api/ → Backend API, posthog/hogql/ → HogQL). The mapping is approximate but consistent across all engineers." />}>
            <span>Product areas ({e.stats.areas.length})</span>
          </Tooltip>
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {e.stats.areas.map((area) => (
            <span key={area} className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: "var(--color-border)", color: "var(--color-text-muted)" }}>
              {area}
            </span>
          ))}
        </div>
      </div>

      {/* Top PRs */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-dim)" }}>
          Representative PRs
        </h3>
        <div className="space-y-2">
          {e.topPRs.map((pr) => (
            <a
              key={pr.number}
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg p-2.5 border hover:border-[var(--color-border-active)] transition-colors"
              style={{ borderColor: "var(--color-border)", background: "var(--color-background)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{pr.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono" style={{ color: "var(--color-text-dim)" }}>#{pr.number}</span>
                    <span className="text-[10px]" style={{ color: "var(--color-positive)" }}>+{pr.additions}</span>
                    <span className="text-[10px]" style={{ color: "var(--color-negative)" }}>-{pr.deletions}</span>
                  </div>
                </div>
                <span className="text-[10px] flex-shrink-0" style={{ color: "var(--color-text-dim)" }}>↗</span>
              </div>
              {pr.areas.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {pr.areas.slice(0, 3).map((a) => (
                    <span key={a} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--color-border)", color: "var(--color-text-dim)" }}>
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value, tip }: { label: string; value: string | number; tip?: React.ReactNode }) {
  return (
    <div className="rounded-lg p-2 text-center" style={{ background: "var(--color-background)" }}>
      <div className="text-sm font-bold font-mono">{value}</div>
      <div className="text-[10px]" style={{ color: "var(--color-text-dim)" }}>
        {tip ? (
          <Tooltip content={tip} wide>
            <span>{label}</span>
          </Tooltip>
        ) : (
          label
        )}
      </div>
    </div>
  );
}
