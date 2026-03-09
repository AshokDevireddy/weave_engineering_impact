"use client";

import { EngineerData } from "@/types";
import { ScoreBar } from "./ScoreBar";
import { Tooltip, FormulaLine } from "./Tooltip";

interface EngineerCardProps {
  engineer: EngineerData;
  isSelected: boolean;
  onClick: () => void;
}

const ARCHETYPE_ICONS: Record<string, string> = {
  "Product Mover": "🚀",
  "Infra Stabilizer": "🏗️",
  "Quality Multiplier": "✨",
  "Cross-Team Enabler": "🤝",
  "Reliability Driver": "🛡️",
  "Full-Stack Generalist": "🔄",
  "Data Platform Builder": "📊",
  "Developer Experience Improver": "⚡",
};

const RANK_COLORS = [
  "from-yellow-500/20 to-yellow-600/5",
  "from-gray-300/15 to-gray-400/5",
  "from-amber-600/15 to-amber-700/5",
  "from-slate-400/10 to-slate-500/5",
  "from-slate-400/10 to-slate-500/5",
];

function fmtPct(v: number) { return (v * 100).toFixed(0); }
function fmtDec(v: number) { return v.toFixed(2); }

function overallTooltip(e: EngineerData) {
  return (
    <div>
      <p className="font-medium mb-1" style={{ color: "var(--color-text)" }}>Impact Score</p>
      <p>Weighted composite of four dimensions:</p>
      <FormulaLine
        formula={`0.35 × ${fmtDec(e.delivery)} + 0.30 × ${fmtDec(e.quality)} + 0.20 × ${fmtDec(e.collaboration)} + 0.15 × ${fmtDec(e.breadth)}`}
        result={fmtPct(e.overall)}
      />
    </div>
  );
}

function deliveryTooltip(e: EngineerData) {
  const r = e.deliveryRaw;
  return (
    <div>
      <p className="font-medium mb-1" style={{ color: "var(--color-text)" }}>Delivery (35% of impact)</p>
      <p>Measures shipped work volume, consistency, and speed.</p>
      <FormulaLine
        formula={`0.35 × ${fmtDec(r.prVolume)} (PR volume ᵖ) + 0.35 × ${fmtDec(r.consistency)} (weekly consistency) + 0.30 × ${fmtDec(r.cycleTime)} (cycle time)`}
        result={fmtPct(e.delivery)}
      />
      <p className="mt-1 text-[10px]" style={{ color: "var(--color-text-dim)" }}>ᵖ = percentile rank among {e.stats.prCount >= 3 ? "eligible" : "all"} engineers</p>
    </div>
  );
}

function qualityTooltip(e: EngineerData) {
  const r = e.qualityRaw;
  return (
    <div>
      <p className="font-medium mb-1" style={{ color: "var(--color-text)" }}>Quality (30% of impact)</p>
      <p>Signals of thoughtful, maintainable work.</p>
      <FormulaLine
        formula={`0.40 × ${fmtDec(r.testCoverage)} (test coverage ᵖ) + 0.35 × ${fmtDec(r.prSizeManagement)} (PR size ᵖ) + 0.25 × ${fmtDec(r.criticalAreaWork)} (critical area ᵖ)`}
        result={fmtPct(e.quality)}
      />
      <p className="mt-1 text-[10px]" style={{ color: "var(--color-text-dim)" }}>ᵖ = percentile rank among eligible engineers</p>
    </div>
  );
}

function collaborationTooltip(e: EngineerData) {
  const r = e.collaborationRaw;
  return (
    <div>
      <p className="font-medium mb-1" style={{ color: "var(--color-text)" }}>Collaboration (20% of impact)</p>
      <p>Cross-team engagement and review breadth.</p>
      <FormulaLine
        formula={`0.50 × ${fmtDec(r.distinctReviewers)} (reviewer count ᵖ) + 0.50 × ${fmtDec(r.crossTeamParticipants)} (participant count ᵖ)`}
        result={fmtPct(e.collaboration)}
      />
      <p className="mt-1 text-[10px]" style={{ color: "var(--color-text-dim)" }}>ᵖ = percentile rank among eligible engineers</p>
    </div>
  );
}

function breadthTooltip(e: EngineerData) {
  const r = e.breadthRaw;
  return (
    <div>
      <p className="font-medium mb-1" style={{ color: "var(--color-text)" }}>Breadth (15% of impact)</p>
      <p>Reach across product areas and critical systems.</p>
      <FormulaLine
        formula={`0.60 × ${fmtDec(r.areaCount)} (area count ᵖ) + 0.40 × ${fmtDec(r.criticalBreadth)} (critical breadth ᵖ)`}
        result={fmtPct(e.breadth)}
      />
      <p className="mt-1 text-[10px]" style={{ color: "var(--color-text-dim)" }}>ᵖ = percentile rank among eligible engineers</p>
    </div>
  );
}

export function EngineerCard({ engineer, isSelected, onClick }: EngineerCardProps) {
  const icon = ARCHETYPE_ICONS[engineer.explanation.archetype] || "💻";

  return (
    <button
      onClick={onClick}
      className={`engineer-card w-full text-left rounded-xl border p-4 cursor-pointer ${isSelected ? "selected" : ""}`}
      style={{
        borderColor: isSelected ? "var(--color-accent)" : "var(--color-border)",
        background: isSelected ? "var(--color-accent-soft)" : "var(--color-surface)",
      }}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${RANK_COLORS[engineer.rank - 1]} flex items-center justify-center`}>
          <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{engineer.rank}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-sm truncate">{engineer.login}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: "var(--color-border)", color: "var(--color-text-muted)" }}>
              {icon} {engineer.explanation.archetype}
            </span>
          </div>

          <p className="text-xs leading-relaxed mt-1 line-clamp-2" style={{ color: "var(--color-text-muted)" }}>
            {engineer.explanation.summary}
          </p>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3">
            <ScoreBar label="Delivery" value={engineer.delivery} color="var(--color-delivery)" compact tooltip={deliveryTooltip(engineer)} />
            <ScoreBar label="Quality" value={engineer.quality} color="var(--color-quality)" compact tooltip={qualityTooltip(engineer)} />
            <ScoreBar label="Collaboration" value={engineer.collaboration} color="var(--color-collaboration)" compact tooltip={collaborationTooltip(engineer)} />
            <ScoreBar label="Breadth" value={engineer.breadth} color="var(--color-breadth)" compact tooltip={breadthTooltip(engineer)} />
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <Tooltip content={overallTooltip(engineer)} wide>
            <span className="text-lg font-bold font-mono" style={{ color: "var(--color-accent)" }}>
              {(engineer.overall * 100).toFixed(0)}
            </span>
          </Tooltip>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-dim)" }}>impact</div>
        </div>
      </div>
    </button>
  );
}
