"use client";

import { DashboardSummary } from "@/types";

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: DashboardSummary;
}

export function MethodologyModal({
  isOpen,
  onClose,
  summary,
}: MethodologyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative max-w-lg w-full max-h-[80vh] overflow-y-auto rounded-xl border p-6"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-sm hover:opacity-70"
          style={{ color: "var(--color-text-dim)" }}
        >
          ✕
        </button>

        <h2 className="text-base font-bold mb-4">Methodology</h2>

        <Section title="How impact is computed">
          <p>
            Engineering impact is computed deterministically from GitHub repository data.
            Each engineer is scored across four dimensions, then ranked by a weighted
            composite score:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>
              <strong>Delivery (35%)</strong> — PR volume (percentile), consistency
              across weeks, and cycle time
            </li>
            <li>
              <strong>Quality (30%)</strong> — test coverage of PRs, PR size
              management (penalizing extremes), and critical-area work
            </li>
            <li>
              <strong>Collaboration (20%)</strong> — distinct reviewers and cross-team
              participants involved in the engineer&apos;s work
            </li>
            <li>
              <strong>Breadth (15%)</strong> — number of distinct product areas touched
              and work in critical/shared code
            </li>
          </ul>
        </Section>

        <Section title="Data included">
          <ul className="space-y-1">
            <li>
              Repository: <code>{summary.repo}</code>
            </li>
            <li>
              Period: {summary.periodStart} to {summary.periodEnd} (90 days)
            </li>
            <li>{summary.totalPRs} merged PRs analyzed</li>
            <li>
              {summary.totalEngineers} unique engineers found,{" "}
              {summary.eligibleEngineers} eligible (≥3 PRs)
            </li>
          </ul>
        </Section>

        <Section title="Bot filtering">
          <p>
            Accounts matching known bot patterns (dependabot, renovate, GitHub
            Actions, [bot] suffix, etc.) are excluded from analysis.
          </p>
        </Section>

        <Section title="Scoring details">
          <p>
            All subscores use percentile ranking within the eligible engineer pool.
            This means scores are relative — a high score indicates the engineer
            performed better than most peers on that dimension during this period.
          </p>
          <p className="mt-1">
            PR size scoring penalizes both trivially small (&lt;10 lines) and
            extremely large (&gt;2000 lines) changes, rewarding well-scoped work
            in the 10–400 line range.
          </p>
        </Section>

        <Section title="AI-generated content">
          <p>
            Explanations, archetypes, and &quot;why this matters&quot; summaries are generated
            by an LLM after rankings are computed. They summarize evidence but do not
            influence the ranking. All AI-assisted content is labeled.
          </p>
        </Section>

        <Section title="Limitations">
          <ul className="list-disc list-inside space-y-1">
            <li>Limited to visible GitHub activity in a single repository</li>
            <li>Does not capture code review depth, design work, or mentoring</li>
            <li>Cannot assess actual code quality — only proxy signals</li>
            <li>Does not account for on-call, incident response, or planning work</li>
            <li>
              File-path-to-area mapping is heuristic and may misclassify some
              contributions
            </li>
            <li>
              Impact is broader than any single-repository metric can capture
            </li>
          </ul>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <h3
        className="text-xs font-semibold uppercase tracking-wider mb-1.5"
        style={{ color: "var(--color-text-dim)" }}
      >
        {title}
      </h3>
      <div
        className="text-xs leading-relaxed"
        style={{ color: "var(--color-text-muted)" }}
      >
        {children}
      </div>
    </div>
  );
}
