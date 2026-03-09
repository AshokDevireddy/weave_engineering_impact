"use client";

import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  wide?: boolean;
}

export function Tooltip({ content, children, wide }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; position: "above" | "below" } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipWidth = wide ? 288 : 224;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const gap = 8;

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    // Clamp to viewport horizontally
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));

    // Prefer above, fall back to below
    const spaceAbove = rect.top;
    const position = spaceAbove > 200 ? "above" : "below";
    const top = position === "above" ? rect.top - gap : rect.bottom + gap;

    setCoords({ top, left, position });
  }, [tooltipWidth]);

  useEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="cursor-help border-b border-dotted border-current/30">
        {children}
      </span>
      {open && coords && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed pointer-events-none"
            style={{
              zIndex: 99999,
              top: coords.position === "above" ? undefined : coords.top,
              bottom: coords.position === "above" ? window.innerHeight - coords.top : undefined,
              left: coords.left,
              width: tooltipWidth,
            }}
          >
            <div
              className="rounded-lg p-2.5 text-[11px] leading-relaxed border shadow-2xl"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border-active)",
                color: "var(--color-text-muted)",
              }}
            >
              {content}
            </div>
          </div>,
          document.body
        )
      }
    </span>
  );
}

export function FormulaLine({
  label,
  formula,
  result,
}: {
  label?: string;
  formula: string;
  result?: string;
}) {
  return (
    <div className="font-mono text-[10px] leading-snug mt-1" style={{ color: "var(--color-text-dim)" }}>
      {label && (
        <span style={{ color: "var(--color-text-muted)" }}>{label}: </span>
      )}
      <span>{formula}</span>
      {result && (
        <span style={{ color: "var(--color-accent)" }}> = {result}</span>
      )}
    </div>
  );
}

export function DefTip({ term, definition }: { term: string; definition: string }) {
  return (
    <div>
      <span className="font-medium" style={{ color: "var(--color-text)" }}>
        {term}
      </span>
      <p className="mt-0.5">{definition}</p>
    </div>
  );
}
