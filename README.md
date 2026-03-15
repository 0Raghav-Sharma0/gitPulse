# GitPulse

**Dive into Open Source. Master Any Repo. Instantly.**

GitPulse is an AI-powered platform for understanding GitHub repositories and developer profiles. Chat with codebases, get architecture insights, and run security scans—all in the browser.

## Features

- **Zero setup for public repos**: paste a repo or profile and start.
- **Context-aware analysis**: full-file context instead of fragmented chunks.
- **Architecture & diagrams**: flowcharts and dependency views.
- **Security scanning**: quick and deep scans with verification-focused reports.
- **Dashboard**: recent scans, starred repos, and settings.

## Tech Stack

- Next.js · React · Gemini · Prisma · Vercel KV · Vitest

## Getting Started

### Prerequisites

- Node.js 18+
- GitHub token
- Gemini API key

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/GitPulse.git
cd GitPulse
npm install
cp .env.example .env.local
# Edit .env.local with your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Commands

```bash
npm run dev            # dev server
npm run build          # production build
npm run lint           # lint
npm run test           # tests
```

## License

MIT. See [LICENSE](LICENSE).
