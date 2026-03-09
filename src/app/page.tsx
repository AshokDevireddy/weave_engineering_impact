"use client";

import { useState } from "react";
import { EngineerData, DashboardSummary } from "@/types";
import { EngineerCard } from "@/components/EngineerCard";
import { DetailPanel } from "@/components/DetailPanel";
import { ImpactChart } from "@/components/ImpactChart";
import { MethodologyModal } from "@/components/MethodologyModal";
import dashboardDataRaw from "@/data/dashboard-data.json";
import summaryDataRaw from "@/data/summary.json";

const dashboardData = dashboardDataRaw as EngineerData[];
const summaryData = summaryDataRaw as DashboardSummary;

export default function Dashboard() {
  const [selectedLogin, setSelectedLogin] = useState<string>(
    dashboardData[0]?.login ?? ""
  );
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const selectedEngineer = dashboardData.find(
    (e) => e.login === selectedLogin
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header
        className="flex-shrink-0 border-b px-6 py-3"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-base font-bold tracking-tight">
                Engineering Impact Dashboard
              </h1>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--color-text-muted)" }}
              >
                <a
                  href={`https://github.com/${summaryData.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  style={{ color: "var(--color-accent)" }}
                >
                  {summaryData.repo}
                </a>
                {" · "}
                {summaryData.periodStart} → {summaryData.periodEnd}
                {" · "}
                {summaryData.totalPRs} merged PRs from{" "}
                {summaryData.eligibleEngineers} engineers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p
              className="text-[11px] max-w-xs text-right leading-relaxed hidden sm:block"
              style={{ color: "var(--color-text-dim)" }}
            >
              Impact = shipped work × code quality × collaboration × breadth.
              Deterministic, transparent, evidence-based.
            </p>
            <button
              onClick={() => setMethodologyOpen(true)}
              className="text-[11px] px-3 py-1.5 rounded-lg border hover:opacity-80 transition-opacity flex-shrink-0"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text-muted)",
              }}
            >
              Methodology
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Engineer cards */}
        <div
          className="w-[420px] flex-shrink-0 border-r overflow-y-auto p-4 space-y-2"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-2 px-1"
            style={{ color: "var(--color-text-dim)" }}
          >
            Top 5 Engineers
          </h2>
          {dashboardData.map((eng) => (
            <EngineerCard
              key={eng.login}
              engineer={eng}
              isSelected={eng.login === selectedLogin}
              onClick={() => setSelectedLogin(eng.login)}
            />
          ))}
        </div>

        {/* Right: Detail + Chart */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Detail panel */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedEngineer ? (
              <DetailPanel engineer={selectedEngineer} />
            ) : (
              <div
                className="flex items-center justify-center h-full text-sm"
                style={{ color: "var(--color-text-dim)" }}
              >
                Select an engineer to view details
              </div>
            )}
          </div>

          {/* Bottom chart */}
          <div className="flex-shrink-0 p-4 pt-0">
            <ImpactChart
              engineers={dashboardData}
              selectedLogin={selectedLogin}
              onSelect={setSelectedLogin}
            />
          </div>
        </div>
      </div>

      {/* Methodology modal */}
      <MethodologyModal
        isOpen={methodologyOpen}
        onClose={() => setMethodologyOpen(false)}
        summary={summaryData}
      />
    </div>
  );
}
