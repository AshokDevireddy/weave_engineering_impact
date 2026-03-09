"use client";

import { ReactNode } from "react";
import { Tooltip } from "./Tooltip";

interface ScoreBarProps {
  label: string;
  value: number;
  color: string;
  maxValue?: number;
  showLabel?: boolean;
  compact?: boolean;
  tooltip?: ReactNode;
}

export function ScoreBar({
  label,
  value,
  color,
  maxValue = 1,
  showLabel = true,
  compact = false,
  tooltip,
}: ScoreBarProps) {
  const pct = Math.min((value / maxValue) * 100, 100);
  const displayVal = (value * 100).toFixed(0);

  const labelEl = (
    <span className={`${compact ? "text-[11px]" : "text-xs"} font-medium`} style={{ color: "var(--color-text-muted)" }}>
      {label}
    </span>
  );

  const valueEl = (
    <span className={`${compact ? "text-[11px]" : "text-xs"} font-mono`} style={{ color: "var(--color-text-dim)" }}>
      {displayVal}
    </span>
  );

  return (
    <div className={compact ? "flex flex-col gap-0.5" : "space-y-1"}>
      {showLabel && (
        <div className="flex justify-between items-center">
          {tooltip ? <Tooltip content={tooltip}>{labelEl}</Tooltip> : labelEl}
          {tooltip ? <Tooltip content={tooltip}>{valueEl}</Tooltip> : valueEl}
        </div>
      )}
      <div
        className={`w-full ${compact ? "h-1.5" : "h-2"} rounded-full overflow-hidden`}
        style={{ background: "var(--color-border)" }}
      >
        <div
          className="h-full rounded-full score-bar-fill"
          style={{
            width: `${pct}%`,
            background: color,
            opacity: 0.85,
          }}
        />
      </div>
    </div>
  );
}
