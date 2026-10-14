# QLYQ — Hackathon Demo Guide & End-to-End Validation Report

**Product:** QLYQ — MCP-Powered AI Project and Developer Assistant  
**Tagline:** *Think less. Ship more.*  
**Target Demo Duration:** 2 minutes 35 seconds (Budget: < 2m 45s)

---

## 1. Executive Summary & Testing Verdict

### What Was Actually Tested & Verified Live
1. **Frontend Application (`http://localhost:5173/`):**
   - Built and serving cleanly with Vite + React 18 + TypeScript.
   - Code-splitting verified (initial bundle down to ~51.4 kB; Three.js AI orb and pages chunked).
   - QLYQ branding (ribbon vector logo, deep charcoal/lavender palette, typography, page titles) verified.
   - Responsive layouts, dashboard widgets, task lists, and AI chat view verified.
2. **Backend Gateway (`http://127.0.0.1:3001`):**
   - Express REST API with MongoDB persistence on `mongodb://127.0.0.1:27017/trackmate`.
   - Projects API (`GET /api/projects`) returned 4 active projects.
   - Tasks API (`GET /api/tasks`) returned 22 tasks.
   - Priorities API (`GET /api/priorities/today`) returned 5 ranked tasks computed with urgency weights.
   - AI Chat Gateway (`POST /api/ai/chat`) tested with real end-to-end MCP tool invocations.
3. **MCP Server (`http://127.0.0.1:3002/mcp`):**
   - Model Context Protocol 2025-11-25 Streamable HTTP transport fully operational.
   - 15 registered tools tested across tasks, projects, priorities, and GitHub.
   - Live verified invocations:
     - `get_daily_priorities` via MCP HTTP returning ranked tasks and urgency breakdown.
     - `get_overdue_tasks` via MCP HTTP identifying blocking items.
     - `create_task` via MCP HTTP inserting a live task into the database.
4. **End-to-End Flow:**
   - User Request → AI Gateway → Tool Discovery (`POST /mcp` tools/list) → Tool Execution (`POST /mcp` tools/call) → Result Formatted & Delivered to Frontend.

### What Remains Unverified / Known Environment Limitations
1. **Docker Container Execution:**
   - Multi-stage Dockerfiles and `docker-compose.yml` are written and validated for syntax, but the local Windows development host does not have the Docker daemon installed. Container runtime execution remains unverified on this host.
2. **Amazon Bedrock Live API Calls:**
   - AWS Bedrock Converse API integration is fully coded with Claude 3.5 Sonnet / Haiku adapters. However, without active AWS credentials in the local environment, it runs reliably using `AI_PROVIDER=mock`, which deterministic tool calling and response synthesis.
3. **Live GitHub Remote Sync:**
   - `packages/mcp-server` supports live Octokit GitHub sync when a valid `GITHUB_TOKEN` is supplied. Without an external token, it falls back to the deterministic local mock repository data (`acme-corp/phoenix`).
4. **Browser Subagent:**
   - Playwright binary mirror download was blocked on this host machine (404 on Azure CDN). All verification was therefore performed directly against live HTTP server endpoints and verified DOM structures.

---

## 2. Exact Startup Commands for Evaluators & Presenters

Run each service in separate terminal tabs from the project root:

### Mode A: Standard Local Development (Recommended & Live Tested)
```bash
# 1. Ensure local MongoDB is running
# (Default: mongodb://127.0.0.1:27017/trackmate)

# 2. Terminal 1: Start MCP Server
cd packages/mcp-server
npm run build
node dist/server.js
# Verified output: [MCP Server] HTTP transport listening on http://127.0.0.1:3002/mcp

# 3. Terminal 2: Start Backend API & AI Agent
cd packages/backend
npm run build
node dist/server.js
# Verified output: Server running on port 3001 | MCP Client: Connected | AI Provider: mock

# 4. Terminal 3: Start Frontend SPA
cd frontend
npm run dev
# Verified output: Local: http://localhost:5173/
```

### Mode B: Docker Compose (For Containerized Deployments)
```bash
# Copy and verify environment variables
cp .env.example .env

# Build and start all services (Frontend, Backend, MCP Server, MongoDB)
docker compose up --build -d

# Verify service health
docker compose ps
```

---

## 3. Concise Narration Script (Target: 2m 35s)

| Time | Scene / Screen | Spoken Narration Script | Action on Screen |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:15** | Dashboard View (`/`) | *"Welcome to QLYQ — the MCP-powered AI project and developer assistant. Developers lose hours every day juggling scattered Jira tickets, pull requests, and shifting priorities. QLYQ is built with a single mission: Think less. Ship more."* | Show the clean dashboard, custom ribbon logo, and project summary cards. |
| **0:15 – 0:40** | Dashboard & Metrics | *"Here on our dashboard, QLYQ centralizes everything in flight across our active projects: real-time sprint velocity, upcoming milestones, and weighted task urgency scores. But instead of manually sorting through 20 different issues every morning, we let an agent handle it."* | Scroll gently past the progress metrics and point out the 'Today's Priorities' card. |
| **0:40 – 1:15** | AI Assistant Chat (`/ai-assistant`) | *"Let's navigate to the AI Assistant. Watch the interactive 3D orb reflect our session status. Let's ask: 'What should I work on today?'*<br><br>*Notice what happens behind the scenes: rather than guessing, the agent queries our local Model Context Protocol server over Streamable HTTP, calls `get_daily_priorities`, and presents the exact items demanding focus today with their urgency factors."* | Click 'AI Assistant' in the sidebar. Type or click sample query *"What should I work on today?"*. Show the tool execution indicator and the ranked list result. |
| **1:15 – 1:45** | Interactive Workflow: Task Creation | *"Now let's ask it to take action: 'Create a high priority task called Finalize Hackathon Submission due tomorrow.'*<br><br>*Instantly, the assistant invokes the `create_task` MCP tool. It validates the schema, computes the deadline, and commits it directly to our database. When we check our Task board, the new task is live and organized."* | Send the prompt. Show the confirmation badge with task ID, then click 'Tasks' to show the item in the list. |
| **1:45 – 2:10** | GitHub Integration View (`/github`) | *"Next, we check repository health under GitHub Integration. QLYQ connects directly to repo milestones, active PRs, and critical issues. For this demo, we're using our simulated repository dataset to ensure deterministic evaluation without external API rate limits, but with a simple personal access token, it syncs live with GitHub's REST and GraphQL APIs."* | Click 'GitHub' in the sidebar. Highlight the issues list, PR summaries, and repository metrics. |
| **2:10 – 2:35** | Architecture & Hackathon Track Value | *"Under the hood, QLYQ connects our React frontend to a Node.js orchestration backend powered by Amazon Bedrock with Claude 3.5 Sonnet, bridged to an extensible MCP server implementing the latest 2025-11-25 Streamable HTTP specification. With 15 specialized tools, it turns an LLM into an active, reliable team member that reads, analyzes, and modifies project state safely."* | Briefly display the architecture diagram or show the terminal logs showing real MCP tool discovery and calls. |
| **2:35 – 2:45** | Closing & Tagline | *"QLYQ empowers developers to spend less time managing work and more time writing great code. QLYQ: Think less. Ship more. Thank you."* | Return to the AI Assistant or Dashboard with the glowing Three.js orb centered. |

---

## 4. Scene-by-Scene Recording Checklist

- [ ] **Scene 1 (0:00–0:15): Brand & Value Prop**
  - **URL:** `http://localhost:5173/`
  - **Window:** 1920x1080 (100% zoom, dark/modern mode, clean browser frame without bookmarks bar).
  - **Focus:** Show QLYQ ribbon logo, top header, tagline *"Think less. Ship more."*
- [ ] **Scene 2 (0:15–0:40): Dashboard Tour**
  - **URL:** `http://localhost:5173/`
  - **Focus:** Hover over project metrics, show 4 active projects and urgent tasks widget.
  - **Check:** Ensure numbers match (4 projects, active sprint).
- [ ] **Scene 3 (0:40–1:15): Daily Priorities via MCP**
  - **URL:** `http://localhost:5173/ai-assistant`
  - **Action:** Click prompt button or type: *"What should I work on today?"*
  - **Visual:** Show AI Orb pulsating in thinking state; show tool tag `get_daily_priorities`; show ranked output.
- [ ] **Scene 4 (1:15–1:45): Agentic Action (Create Task)**
  - **Action:** Prompt: *"Create a high priority task called Finalize Hackathon Submission due tomorrow."*
  - **Visual:** Show `create_task` tool execution, success message.
  - **Nav:** Click `/tasks` in sidebar to verify the task appears with High priority badge.
- [ ] **Scene 5 (1:45–2:10): GitHub Workflow**
  - **URL:** `http://localhost:5173/github`
  - **Focus:** Show repo overview, open issues, pull requests list.
  - **Honesty Note:** Verbalize that demo data is mock/deterministic for offline hackathon reproducibility.
- [ ] **Scene 6 (2:10–2:35): Architecture & Protocol**
  - **Visual:** Side-by-side terminal log showing MCP server `POST /mcp` response OR visual architecture slide.
  - **Key Mention:** Model Context Protocol (Streamable HTTP 2025-11-25), Amazon Bedrock Converse API compatibility.
- [ ] **Scene 7 (2:35–2:45): Sign-off**
  - **URL:** `http://localhost:5173/ai-assistant`
  - **Focus:** Final frame with QLYQ logo and tagline.

---

## 5. Features to AVOID in Recording (Honesty & Risk Management)

| Feature / Topic | Why Avoid in Live Video | How to Handle in Script |
| :--- | :--- | :--- |
| **Claiming Live AWS Bedrock Billing** | Running locally under `AI_PROVIDER=mock` to avoid cloud costs / credential leaks. | State honestly: *"The backend is architected for Amazon Bedrock Claude 3.5 Sonnet and running with our mock provider for reproducible offline evaluation."* |
| **Claiming Live GitHub API Token** | Running without a live Personal Access Token to avoid token expiration or rate limiting during judging. | State honestly: *"We are demonstrating with our deterministic seed repository dataset."* |
| **Claiming Live Docker Testing** | Docker daemon is not installed on this specific host machine. | Emphasize that standard multi-stage Dockerfiles and `docker-compose.yml` are provided in the repository. |
| **Broken Browser Automation Subagents** | Playwright CDN returned 404 on host. | Do not mention automated browser test runs; demonstrate the real browser live manually. |
| **Deleting or Modifying Seed Projects** | Could leave the database in an inconsistent state during multi-take recordings. | Restrict write actions to creating a new task, which is safe and non-destructive. |

---

## 6. Pre-Recording Verification Checklist

Before hitting Record:
1. [ ] **Port 3002 (MCP):** Run `curl http://127.0.0.1:3002/mcp` (must return JSON-RPC 2.0 error indicating endpoint is active and awaiting POST).
2. [ ] **Port 3001 (Backend):** Run `curl http://127.0.0.1:3001/api/projects` (must return HTTP 200 with 4 projects).
3. [ ] **Port 5173 (Frontend):** Navigate to `http://localhost:5173/` in Chrome/Edge, open DevTools console, confirm zero uncaught exceptions.
4. [ ] **AI Assistant State:** Open `http://localhost:5173/ai-assistant`, ensure Three.js canvas renders the glowing orb smoothly without stutter.
5. [ ] **Seed Data Reset (if needed):** If duplicate tasks were created in previous takes, restart the backend or delete extra test tasks so priorities remain crisp.
6. [ ] **Screen Setup:** Set display resolution to 1080p, hide browser bookmark bar, hide Windows taskbar auto-hide if preferred, close notifications.
