<div align="center">

# ⚡ GitPulse

### Dive into Open Source. Master Any Repo. Instantly.

An **AI-powered platform for understanding GitHub repositories and developer profiles**.

Chat with any repo, generate architecture diagrams, and run security scans — **without cloning the repository**.

<br>

<img src="https://img.shields.io/badge/Framework-Next.js-black?style=for-the-badge&logo=next.js"/>
<img src="https://img.shields.io/badge/Language-TypeScript-blue?style=for-the-badge&logo=typescript"/>
<img src="https://img.shields.io/badge/AI-Gemini-orange?style=for-the-badge"/>
<img src="https://img.shields.io/badge/Database-Prisma-green?style=for-the-badge&logo=prisma"/>
<img src="https://img.shields.io/badge/Deployment-Vercel-black?style=for-the-badge&logo=vercel"/>

<br><br>

**Understand any GitHub repository in seconds.**

</div>

---

# 🚀 What is GitPulse?

GitPulse converts any GitHub repository into an **interactive AI-powered knowledge system**.

Instead of manually exploring hundreds of files, developers can:

* Ask questions about the codebase
* Generate architecture diagrams
* Identify security vulnerabilities
* Understand dependencies and structure

All directly **inside the browser**.

---

# ✨ Core Features

<div align="center">

| 🔍 Repo Intelligence             | 💬 Chat With Code         | 📊 Architecture Insights       |
| -------------------------------- | ------------------------- | ------------------------------ |
| Understand entire repo instantly | Ask questions about code  | Generate architecture diagrams |
| Full-file context analysis       | Locate logic across files | Visualize dependencies         |
| Detect patterns & structure      | Explain complex systems   | Flowcharts from real code      |

</div>

<br>

<div align="center">

| 🛡 Security Scanning      | 👨‍💻 Developer Insights   | ⚡ Instant Repo Analysis |
| ------------------------- | -------------------------- | ----------------------- |
| Detect vulnerabilities    | Analyze developer profiles | No cloning required     |
| Find hardcoded secrets    | View contribution patterns | Works via GitHub APIs   |
| Dependency risk detection | Explore top repositories   | Instant analysis        |

</div>

---

# 📸 Application Gallery

<div align="center">

A quick visual walkthrough of **GitPulse** and its capabilities.

</div>

<br>

<div align="center">

<table>

<tr>

<td align="center">
<img src="https://github.com/0Raghav-Sharma0/gitPulse/blob/main/Screenshot%202026-03-17%20021821.png" width="420" style="border-radius:12px;border:1px solid #ddd"/>
<br><b>Landing Experience</b>
</td>

<td align="center">
<img src="https://github.com/0Raghav-Sharma0/gitPulse/blob/main/Screenshot%202026-03-17%20021913.png" width="420" style="border-radius:12px;border:1px solid #ddd"/>
<br><b>Repository Chat</b>
</td>

</tr>

<tr>

<td align="center">
<img src="https://github.com/0Raghav-Sharma0/gitPulse/blob/main/Screenshot%202026-03-17%20021938.png" width="420" style="border-radius:12px;border:1px solid #ddd"/>
<br><b>Architecture Insights</b>
</td>

<td align="center">
<img src="https://github.com/0Raghav-Sharma0/gitPulse/blob/main/WhatsApp%20Image%202026-03-17%20at%2000.27.00.jpeg" width="420" style="border-radius:12px;border:1px solid #ddd"/>
<br><b>Security Scanning</b>
</td>

</tr>

<tr>

<td align="center">
<img src="https://github.com/0Raghav-Sharma0/gitPulse/blob/main/WhatsApp%20Image%202026-03-17%20at%2000.27.01%20(1).jpeg" width="420" style="border-radius:12px;border:1px solid #ddd"/>
<br><b>Developer Insights</b>
</td>

<td align="center">
<img src="https://github.com/0Raghav-Sharma0/gitPulse/blob/main/WhatsApp%20Image%202026-03-17%20at%2000.27.01%20(2).jpeg" width="420" style="border-radius:12px;border:1px solid #ddd"/>
<br><b>Dependency Visualization</b>
</td>

</tr>

<tr>

<td align="center">
<img src="https://github.com/0Raghav-Sharma0/gitPulse/blob/main/WhatsApp%20Image%202026-03-17%20at%2000.27.01%20(3).jpeg" width="420" style="border-radius:12px;border:1px solid #ddd"/>
<br><b>AI Repository Understanding</b>
</td>

<td align="center">
<img src="https://github.com/0Raghav-Sharma0/gitPulse/blob/main/WhatsApp%20Image%202026-03-17%20at%2000.27.01.jpeg" width="420" style="border-radius:12px;border:1px solid #ddd"/>
<br><b>Interactive Repo Insights</b>
</td>

</tr>

</table>

</div>

---

# 🧠 Repository Analysis Pipeline

```mermaid
flowchart LR

A[User Inputs GitHub Repo]
B[GitHub API Fetch]
C[Repository File Indexing]
D[Full File Context Parser]
E[AI Processing Layer]
F[Insight Generation]

A --> B
B --> C
C --> D
D --> E
E --> F

F --> G[Repo Chat]
F --> H[Architecture Diagrams]
F --> I[Security Scan]
F --> J[Dependency Insights]
```

### Explanation

GitPulse analyzes repositories using **full-file context instead of fragmented code chunks**.

1. User submits a repository
2. GitHub API retrieves repository structure
3. Files are indexed and parsed
4. AI models analyze architecture and patterns
5. Insights are generated for chat, diagrams, and security reports

---

# 🏗 System Architecture

```mermaid
flowchart LR

User --> Frontend
Frontend --> API

API --> RepoScanner
API --> AIEngine
API --> SecurityScanner

RepoScanner --> GitHubAPI
AIEngine --> Gemini
SecurityScanner --> StaticAnalyzer

API --> Database
Database --> KVCache
```

### Explanation

**Frontend**

Next.js interface for interacting with repositories.

**API Layer**

Handles repository fetching, AI orchestration, and caching.

**Repo Scanner**

Retrieves files using GitHub APIs.

**AI Engine**

Uses Gemini to reason about repository structure.

**Security Scanner**

Performs static code analysis.

---

# ⚙️ Getting Started

### Prerequisites

* Node.js 18+
* GitHub Token
* Gemini API Key

---

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/gitPulse.git
cd gitPulse
npm install
```

---

### Environment Setup

Create `.env.local`

```
GITHUB_TOKEN=
GEMINI_API_KEY=
DATABASE_URL=
```

---

### Start Development Server

```
npm run dev
```

Open

```
http://localhost:3000
```

---

# 🔮 Roadmap

* repository dependency graphs
* pull request intelligence
* multi-repo analysis
* deeper vulnerability scanning

---

<div align="center">

# 👨‍💻 Author

**Raghav Sharma**

⭐ If you like this project, consider giving it a star!

</div>
