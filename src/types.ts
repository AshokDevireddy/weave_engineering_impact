export interface EngineerExplanation {
  login: string;
  archetype: string;
  summary: string;
  reasons: string[];
  whyMatters: string;
}

export interface TopPR {
  number: number;
  title: string;
  url: string;
  additions: number;
  deletions: number;
  areas: string[];
  mergedAt: string | null;
}

export interface EngineerStats {
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
}

export interface EngineerData {
  rank: number;
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
  stats: EngineerStats;
  topPRs: TopPR[];
  explanation: EngineerExplanation;
}

export interface DashboardSummary {
  totalPRs: number;
  totalEngineers: number;
  eligibleEngineers: number;
  periodStart: string;
  periodEnd: string;
  repo: string;
  scoringWeights: {
    delivery: number;
    quality: number;
    collaboration: number;
    breadth: number;
  };
}
