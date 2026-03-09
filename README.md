# Engineering Impact Dashboard — PostHog

A single-page interactive dashboard that identifies and explains the top 5 most impactful engineers in the [PostHog](https://github.com/PostHog/posthog) repository over the last 90 days.

Built for [Weave](https://weave.com) to demonstrate how an AI-native engineering analytics company would think about meaningful engineering impact — not vanity metrics.

## Live Dashboard

**[View Dashboard →](https://weave-engineering-impact.vercel.app)**

## Overview

The dashboard analyzes 90 days of merged pull request data from PostHog/posthog and ranks engineers across four dimensions:

| Dimension | Weight | Signals |
|-----------|--------|---------|
| **Delivery** | 35% | PR volume (percentile), consistency across weeks, cycle time |
| **Quality** | 30% | Test file coverage, PR size management, critical-area work |
| **Collaboration** | 20% | Distinct reviewers, cross-team participants |
| **Breadth** | 15% | Product areas touched, critical/shared code contributions |

## Scoring Formula

```
Overall = 0.35 × Delivery + 0.30 × Quality + 0.20 × Collaboration + 0.15 × Breadth
```

### Subscores

**Delivery** = 0.35 × PR volume percentile + 0.35 × weekly consistency + 0.30 × cycle time score

**Quality** = 0.40 × test coverage percentile + 0.35 × PR size management percentile + 0.25 × critical area percentile

**Collaboration** = 0.50 × distinct reviewer percentile + 0.50 × cross-team participant percentile

**Breadth** = 0.60 × area count percentile + 0.40 × critical breadth percentile

All subscores use **percentile ranking** within the eligible engineer pool (≥3 merged PRs), making scores relative rather than absolute.

### Quality Signals

- **PR size**: Rewards well-scoped PRs (10–400 lines). Penalizes trivially small (<10) and giant (>2000) diffs.
- **Test coverage**: Ratio of PRs that include test file changes.
- **Critical areas**: PRs touching shared/core paths (models, APIs, query engine, plugin server, etc.)

### Product Area Mapping

File paths are heuristically mapped to product areas:

- `frontend/` → Frontend
- `posthog/api/` → Backend API
- `posthog/hogql/` → HogQL / Query Engine
- `posthog/warehouse/` → Data Warehouse
- `plugin-server/` → Plugin Server
- `rust/` → Rust Services
- ... and 15+ other area classifications

## AI Layer

After rankings are computed deterministically, an LLM (GPT-4o-mini) generates:

- A 1–2 sentence summary per engineer
- 3 evidence-based reasons for their ranking
- A contribution archetype (e.g., "Product Mover", "Quality Multiplier")
- A "why this matters" explanation for engineering leaders

**AI does not influence rankings.** All AI-generated content is labeled as interpretive.

## Assumptions & Limitations

- Limited to visible GitHub activity in a single repository
- Does not capture code review depth, design work, mentoring, or incident response
- Cannot assess actual code quality — only proxy signals (tests, PR size, critical areas)
- File-path-to-area mapping is heuristic and may misclassify some contributions
- Bot filtering uses pattern matching and may miss some automation accounts
- Engineers with <3 merged PRs are excluded from ranking
- Impact is broader than any single-repository metric can capture

## Tech Stack

- **Next.js 16** + TypeScript
- **Tailwind CSS v4**
- **Recharts** for data visualization
- **GitHub GraphQL API** for data collection
- **OpenAI GPT-4o-mini** for explanation generation
- **Vercel** for deployment

## Running Locally

### Prerequisites

- Node.js 18+
- GitHub Personal Access Token (with `repo` read scope)
- OpenAI API key (optional, for enhanced explanations)

### Setup

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/weave_engineering_impact.git
cd weave_engineering_impact
npm install

# Configure environment
cp .env.example .env
# Edit .env with your GITHUB_TOKEN and optionally OPENAI_API_KEY
```

### Refreshing Data

The dashboard uses a **two-step architecture**: an offline data pipeline collects and scores data, then the frontend serves pre-computed static JSON. This means the dashboard loads in under a second — no API calls at runtime.

To refresh with the latest 90 days of data:

```bash
npm run refresh      # Full pipeline: collect → score → explain → copy (~2 min)
```

Then either rebuild locally or push to GitHub to trigger a Vercel redeploy:

```bash
npm run build        # Rebuild with updated data
# or: git add . && git commit -m "Refresh data" && git push
```

### Running Individual Steps

```bash
npm run collect      # Fetch 90 days of PR data from GitHub (~1-2 min)
npm run score        # Compute impact scores (<1s)
npm run explain      # Generate AI explanations (~15s)
npm run copy-data    # Copy computed data to src/data/

# Skip collection if you already have raw-prs.json:
npm run pipeline:no-collect
```

### Development

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run start        # Start production server
```

## Project Structure

```
├── scripts/
│   ├── refresh.sh             # One-command data refresh (npm run refresh)
│   ├── collect-data.ts        # GitHub API data collection (parallel date windows)
│   ├── compute-scores.ts      # Deterministic scoring engine
│   ├── generate-explanations.ts # AI explanation layer
│   └── copy-data-to-src.sh    # Copy data for Next.js build
├── src/
│   ├── app/
│   │   ├── page.tsx           # Main dashboard page
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Theme and styles
│   ├── components/
│   │   ├── EngineerCard.tsx   # Ranked engineer card
│   │   ├── DetailPanel.tsx    # Selected engineer detail view
│   │   ├── ImpactChart.tsx    # Interactive charts
│   │   ├── MethodologyModal.tsx # Scoring methodology
│   │   └── ScoreBar.tsx       # Animated score bar
│   ├── data/                  # Static JSON (committed, no API calls at runtime)
│   └── types.ts               # TypeScript interfaces
├── data/                      # Raw + computed data (gitignored except outputs)
└── .env.example
```
