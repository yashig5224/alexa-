# TrackMate AI — Hackathon Judging Demo Script

**Amazon Developer Hackathon 2026**  
*Primary Track: Alexa+ | Mini Challenges: AWS Builder, Open Source*

---

## 1. Quick Verification (30 Seconds)

Open your terminal in the repository root and run the automated MCP compliance audit:
```bash
node mcp-audit.mjs
```
**Expected Output**:
```
AUDIT COMPLETE: 37 passed | 0 failed
✅ MCP implementation is SPEC-COMPLIANT (2025-11-25, Streamable HTTP)
✅ Alexa+ readiness: VERIFIED
```
This demonstrates compliance with the hackathon's Streamable HTTP MCP requirement.

---

## 2. Interactive AI Agent Demo (Alexa+ Conversational Track)

Start the development stack:
```bash
npm run dev
```
Navigate to `http://localhost:5173` and click on **AI Agent** in the left sidebar navigation.

### Query 1: Work Prioritization
- **Prompt**: `"What should I work on today?"`
- **What happens**: The agent analyzes pending tasks, computes proximity to due dates and priority weights via MCP.
- **Visual Proof**: UI displays `⚡ [MCP Tool: get_daily_priorities]` followed by ranked tasks with urgency scores.

### Query 2: Overdue Task Detection
- **Prompt**: `"Show my overdue tasks."`
- **What happens**: The agent queries tasks whose due date has passed.
- **Visual Proof**: UI displays `⚡ [MCP Tool: get_overdue_tasks]` listing overdue items.

### Query 3: Project Health & Blocker Discovery
- **Prompt**: `"What's blocking my TrackMate project?"`
- **What happens**: The agent invokes `get_project_status` for the TrackMate project.
- **Visual Proof**: UI displays `⚡ [MCP Tool: get_project_status]` highlighting blocked tasks and completion metrics.

### Query 4: Autonomous Task Creation
- **Prompt**: `"Create a high priority task called Finish authentication due tomorrow"`
- **What happens**: The agent extracts intent, title, priority, computes tomorrow's date, and executes `create_task`.
- **Visual Proof**: UI displays `⚡ [MCP Tool: create_task]` confirming creation. Navigating to **Tasks** or **Projects** shows the newly created task immediately!

### Query 5: Executive AI Project Summary
- **Prompt**: `"Summarize TrackMate AI project."`
- **What happens**: The agent invokes `summarize_project` via MCP.
- **Visual Proof**: Generates a synthesized executive overview and recommended next steps.

---

## 3. GitHub Issues & Project Management Walkthrough

1. Click on **Projects** in the sidebar.
2. Click on the **TrackMate AI** project card.
3. Observe:
   - Real-time project completion progress bar (e.g. 14%).
   - One-click **AI Summary** button at the top right.
   - Tasks tab with priority stripes, status toggles, and delete controls.
   - **GitHub Issues** tab: Shows issues fetched via the GitHub API (or resilient fallback) with status, labels, and issue numbers.
   - Click **"+ Convert to Task"** on any GitHub issue: The issue is imported into TrackMate as a native project task with tags and references!

---

## 4. AWS Builder Challenge Verification

Inspect `packages/backend/src/ai-providers/bedrock.ts`:
- Uses `@aws-sdk/client-bedrock-runtime` and the modern Bedrock **Converse API** (`ConverseCommand`).
- Supports Anthropic Claude 3.5 Sonnet (`anthropic.claude-3-5-sonnet-20241022-v2:0`) or Amazon Nova Pro.
- Switch provider by setting `AI_PROVIDER=bedrock` in `.env`.

---

## 5. One-Command Docker Setup

```bash
docker compose up --build
```
Spins up `trackmate-mcp-server` (port 3002), `trackmate-backend` (port 3001), and `trackmate-frontend` (port 5173) with healthchecks and shared volume data.
