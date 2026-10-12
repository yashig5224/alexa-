# 🚀 TrackMate AI

> **Agentic Productivity & Project Management Platform**  
> *Built for the Amazon Developer Hackathon 2026*  
> **Primary Track: Alexa+** | **Mini Challenges: AWS Builder · Open Source**

---

[![MCP Spec](https://img.shields.io/badge/MCP_Spec-2025--11--25-blue.svg)](https://modelcontextprotocol.io)
[![Transport](https://img.shields.io/badge/Transport-Streamable_HTTP-success.svg)](https://modelcontextprotocol.io)
[![AWS Bedrock](https://img.shields.io/badge/AWS_Bedrock-Claude_3.5_Sonnet-orange.svg)](https://aws.amazon.com/bedrock/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Audit](https://img.shields.io/badge/MCP_Audit-37%2F37_PASS-brightgreen.svg)](mcp-audit.mjs)

---

## 💡 Overview

**TrackMate AI** is an intelligent, agentic productivity platform that pairs developers and students with an autonomous assistant capable of orchestrating real software projects.

Unlike passive chat interfaces, TrackMate AI features a **self-hosted Model Context Protocol (MCP) server** implementing the **2025-11-25 specification** over **Streamable HTTP**. The assistant reasons about tasks, deadlines, and blockers, and autonomously executes tools—creating tasks, computing daily priorities, investigating blocked projects, and syncing GitHub issues.

---

## 🏆 Hackathon Tracks Alignment

### 1. Primary Track: Alexa+
- **Self-Hosted MCP Server**: Implements the official **MCP specification 2025-11-25** using **Streamable HTTP** (`POST /mcp`).
- **Autonomous Tool Execution**: Exposes **12 production-grade MCP tools** (tasks, projects, deadlines, priorities, GitHub issues, and AI summaries).
- **Session Management**: Full `Mcp-Session-Id` header tracking and chunked streaming / Server-Sent Events (SSE) support for real-time tool results.
- **Audited Compliance**: Zero-defect automated test suite (`node mcp-audit.mjs`) verifying all 37 protocol checks.

### 2. Mini Challenge: AWS Builder
- **Amazon Bedrock Converse API**: Native integration with `@aws-sdk/client-bedrock-runtime` using `ConverseCommand` and Anthropic Claude 3.5 Sonnet (`anthropic.claude-3-5-sonnet-20241022-v2:0`) or Amazon Nova Pro.
- **Autonomous Function Calling Loop**: Bedrock inspects tool definitions, determines intent, issues structured tool calls, and synthesizes results.
- **Resilient Fallback**: Built-in Mock AI Provider enabling local development and evaluation without AWS credentials.

### 3. Optional Mini Challenge: Open Source
- **MIT Licensed**: Fully open-source and permissive.
- **Reproducible Containerization**: Multi-service `docker-compose.yml` with healthchecks.
- **Comprehensive Documentation**: Complete architecture, MCP tool reference, REST API specs, and judging demo scripts.

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                          │
│           React 18 + Vite + SPA Router + TanStack Query     │
│       Dashboard │ Projects │ Tasks │ Team │ AI Assistant    │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST API (/api/*)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND GATEWAY (Node/TS)               │
│                            Port 3001                        │
│   • REST Routes (/projects, /tasks, /users)                 │
│   • Rate Limiting (express-rate-limit) & CORS               │
│   • AI Agent Service (Bedrock Converse / Mock Provider)     │
│   • Streamable HTTP MCP Client                              │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               │ SQL Queries                   │ JSON-RPC 2.0 (Streamable HTTP)
               ▼                               ▼
┌─────────────────────────────┐  ┌────────────────────────────┐
│      PERSISTENCE LAYER      │  │      MCP SERVER (Node/TS)  │
│  SQLite (dev) / PostgreSQL  │  │           Port 3002        │
│  Drizzle ORM Type-Safe      │  │  • Spec: 2025-11-25        │
│  Relational Schema          │  │  • Transport: POST /mcp    │
│  Foreign Keys + Triggers    │  │  • 12 Executable Tools     │
└──────────────▲──────────────┘  │  • Session: Mcp-Session-Id │
               │                 └─────────────┬──────────────┘
               │                               │
               └───────────────┬───────────────┘
                               │ Reads/Writes Database
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      AI / REASONING LAYER                   │
│   • Amazon Bedrock (anthropic.claude-3-5-sonnet-20241022)   │
│   • Converse API with Autonomous Tool Calling               │
│   • Transparent Execution: Real-Time MCP Tool Badges        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ The 12 MCP Tools

| # | Tool Name | Description |
|---|---|---|
| 1 | `get_tasks` | Query tasks with filtering by project, status, and priority |
| 2 | `get_task` | Fetch full details for a single task |
| 3 | `create_task` | Create a new task with priority, due date, tags, and project link |
| 4 | `update_task` | Update task status, priority, due date, assignee, or tags |
| 5 | `delete_task` | Permanently remove a task |
| 6 | `get_projects` | List all projects with metadata and repo links |
| 7 | `get_project_status` | Compute completion percentage, task breakdown, and blockers |
| 8 | `get_deadlines` | List tasks due within an upcoming window (default 7 days) |
| 9 | `get_daily_priorities` | Calculate weighted urgency scores for today's tasks |
| 10 | `get_overdue_tasks` | Identify overdue tasks requiring immediate attention |
| 11 | `get_github_issues` | Fetch open/closed issues from a linked GitHub repo |
| 12 | `summarize_project` | Synthesize an AI-powered executive project status summary |

---

## ⚡ Quickstart

### Option A: One-Command Docker Compose (Recommended)

```bash
docker compose up --build
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **MCP Server**: http://localhost:3002

---

### Option B: Local Development

#### Prerequisites
- Node.js 20+
- npm 10+

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Configure Environment
```bash
cp .env.example .env
```
*(Default settings run with SQLite and the built-in offline mock provider. To use AWS Bedrock, add your AWS credentials and set `AI_PROVIDER=bedrock`)*.

#### 3. Build & Run Services
```bash
# In Terminal 1: Start MCP Server
npm run dev --workspace=@trackmate/mcp-server

# In Terminal 2: Start Backend API
npm run dev --workspace=@trackmate/backend

# In Terminal 3: Start Frontend SPA
npm run dev --workspace=@trackmate/frontend
```

---

## 🧪 Automated MCP Protocol Audit

Run the standalone audit test script to verify Streamable HTTP compliance against the **2025-11-25** specification:

```bash
node mcp-audit.mjs
```

**Verification Results**:
```
[CHECK 0] Health endpoint
  ✅ PASS  status ok
  ✅ PASS  transport = streamable-http
  ✅ PASS  mcpSpec = 2025-11-25

[CHECK 1] initialize — JSON-RPC handshake + session ID
  ✅ PASS  HTTP 200
  ✅ PASS  protocolVersion = 2025-11-25
  ✅ PASS  Mcp-Session-Id issued

[CHECK 2] ping
  ✅ PASS  ping returns {}

[CHECK 3] tools/list — tool discovery
  ✅ PASS  12 tools registered

[CHECK 4] tools/call get_tasks (plain JSON response)
  ✅ PASS  HTTP 200 plain JSON result

[CHECK 5] tools/call get_tasks (Streamable HTTP SSE)
  ✅ PASS  Content-Type = text/event-stream

[CHECK 6] tools/call create_task
  ✅ PASS  Task created successfully

[CHECK 7] tools/call update_task
  ✅ PASS  Task updated successfully

[CHECK 8] Invalid JSON-RPC → INVALID_REQUEST error
  ✅ PASS  error code -32600

============================================================
AUDIT COMPLETE:  37 passed  |  0 failed
✅  MCP implementation is SPEC-COMPLIANT (2025-11-25, Streamable HTTP)
✅  Alexa+ readiness: VERIFIED
============================================================
```

---

## 💬 Conversational Queries (Alexa+ Demo)

In the web interface, open **AI Agent** and try:

1. **"What should I work on today?"**  
   → Invokes `get_daily_priorities` and computes urgency scores.
2. **"Show my overdue tasks."**  
   → Invokes `get_overdue_tasks` and surfaces lapsed deadlines.
3. **"What's blocking my TrackMate project?"**  
   → Invokes `get_project_status` and isolates blocker tasks.
4. **"Create a high priority task called Finish authentication due tomorrow"**  
   → Invokes `create_task`, computes date, and adds task to database.
5. **"Summarize TrackMate AI project."**  
   → Invokes `summarize_project` and provides actionable recommendations.

---

## 📂 Project Structure

```
trackmate-ai/
│
├── packages/
│   ├── shared/             # Shared TypeScript types & MCP interfaces
│   ├── database/           # Drizzle schema, SQLite database & seeds
│   ├── mcp-server/         # Streamable HTTP MCP server (Port 3002)
│   │   └── src/tools/      # 12 executable MCP tools
│   └── backend/            # Express REST gateway & Bedrock agent (Port 3001)
│
├── frontend/               # React 18, Vite & CSS design system (Port 5173)
│   ├── src/pages/          # Dashboard, Projects, Tasks, Team, AI Chat
│   └── src/components/     # Sidebar, TaskCard, widgets
│
├── docs/                   # Architecture, MCP reference, API docs, Demo script
├── docker-compose.yml      # Multi-container orchestration
├── mcp-audit.mjs           # Automated 37-check MCP protocol test suite
├── package.json            # Root monorepo workspace
└── LICENSE                 # MIT License
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
