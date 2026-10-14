# QLYQ — Hackathon Submission Checklist & Track Verification Matrix

**Product:** QLYQ — MCP-Powered AI Project and Developer Assistant  
**Tagline:** *Think less. Ship more.*  
**Primary Track:** Alexa+  
**Mini Challenges:** AWS Builder · Open Source  
**Repository:** [github.com/yashig5224/alexa-](https://github.com/yashig5224/alexa-)  
**License:** MIT License  

---

## 1. Project Information & Core Messaging

- **Project Title:** QLYQ — MCP-Powered AI Project and Developer Assistant
- **Tagline:** Think less. Ship more.
- **Problem Statement:** Modern software engineering teams and solo developers spend up to 30% of their workday in fragmented task context switching: updating project trackers, checking missed sprint deadlines, reviewing stale GitHub pull requests, and deciding what to tackle next. Existing chat tools provide passive text suggestions without direct action.
- **Solution Overview:** QLYQ is an autonomous developer assistant powered by the Model Context Protocol (MCP). Built on a modular architecture with a React 18 SPA, an Express AI orchestration backend, and a self-hosted Streamable HTTP MCP server, QLYQ directly bridges LLMs (Amazon Bedrock / Claude 3.5 Sonnet) with local project databases and GitHub repositories. Instead of just answering questions, QLYQ discovers and executes 15 specialized tools to compute weighted urgency scores, isolate blockers, sync issues, and create tasks directly in the database.
- **Key Differentiators:**
  1. **Strict MCP Compliance:** Implements the official 2025-11-25 MCP specification over Streamable HTTP (`POST /mcp`) with `Mcp-Session-Id` session management and SSE streaming.
  2. **Predictable Dual-Provider Architecture:** Seamlessly switches between enterprise Amazon Bedrock Converse API and an offline zero-credential Mock Provider for predictable, cost-free evaluation.
  3. **High-Performance Lightweight UI:** Optimized React 18 SPA featuring an interactive Three.js AI status orb and code-split bundles (initial JS reduced from 938 kB down to 51.4 kB).

---

## 2. Hackathon Track Requirements Matrix

### Track 1: Alexa+ (Primary Track)

| Official Hackathon Requirement | Repository Evidence / Implementation | Verification Status | Remaining Action |
| :--- | :--- | :--- | :--- |
| **Model Context Protocol (MCP) Integration** | Self-hosted MCP server running on Port 3002 implementing 2025-11-25 spec with Streamable HTTP (`POST /mcp`). | ✅ **VERIFIED (Live)** | None. Validated with 37-point automated protocol audit (`mcp-audit.mjs`). |
| **Autonomous Tool Discovery & Execution** | Express gateway queries `POST /mcp` (`tools/list`), binds schemas to the LLM agent, and dispatches `tools/call`. | ✅ **VERIFIED (Live)** | None. Tested with queries like *"What should I work on today?"* and *"Create a high priority task..."*. |
| **Multi-Domain Tool Coverage** | 15 specialized tools across Tasks (5), Projects (3), Urgency/Priorities (2), and GitHub (5). | ✅ **VERIFIED (Live)** | None. Documented in `README.md` and verified in unit/integration test suites. |
| **Real-Time Client Updates** | Backend SSE / Streamable HTTP support with `Accept: text/event-stream` for live token & tool streaming. | ✅ **VERIFIED (Live)** | None. Check 5 of `mcp-audit.mjs` validates SSE payload delivery. |
| **Formal Alexa+ Certification / Cloud Skills Kit** | External Alexa+ cloud console submission portal requirements. | ⚠️ **UNVERIFIED (External)** | Project meets all local MCP architectural requirements; external Alexa+ skill certification portal submission requires hackathon organizer portal access. |

### Track 2: AWS Builder (Mini Challenge)

| Official Requirement | Repository Evidence / Implementation | Verification Status | Remaining Action |
| :--- | :--- | :--- | :--- |
| **Amazon Bedrock Foundation Models** | `@aws-sdk/client-bedrock-runtime` Converse API integration supporting Anthropic Claude 3.5 Sonnet (`anthropic.claude-3-5-sonnet-20241022-v2:0`) and Amazon Nova Pro (`amazon.nova-pro-v1:0`). | ✅ **VERIFIED (Code & Architecture)** | None. Adapter implemented in `packages/backend/src/services/ai/bedrock-provider.ts`. |
| **Converse API Function Calling** | Autonomous tool specification mapping Bedrock tool configuration to MCP tool definitions. | ✅ **VERIFIED (Code & Tests)** | None. Full unit tests in `packages/backend/tests/agent.test.ts` (18 passing tests). |
| **Reproducible Local Evaluation** | Built-in offline Mock AI Provider (`AI_PROVIDER=mock`) reproducing Bedrock tool selection logic without requiring live paid AWS credentials. | ✅ **VERIFIED (Live)** | Evaluators can inspect and verify complete end-to-end tool calling workflows without AWS bill charges. |
| **Live AWS Cloud Execution** | Production run using active AWS credentials and paid Bedrock endpoint. | ⚠️ **NOT RUN LIVE IN AUDIT** | Live AWS credentials were not injected in local test environment to protect evaluator billing and secrets. |

### Track 3: Open Source (Mini Challenge)

| Official Requirement | Repository Evidence / Implementation | Verification Status | Remaining Action |
| :--- | :--- | :--- | :--- |
| **Permissive Open-Source License** | Repository includes valid MIT License file (`LICENSE`) with 2026 copyright attribution. | ✅ **VERIFIED** | None. |
| **Reproducibility & Packaging** | Monorepo structured with npm workspaces, Turbo, `.env.example`, multi-stage Dockerfiles, and `docker-compose.yml`. | ✅ **VERIFIED** | Local npm build and test suites pass 100%. (Docker container runtime relies on evaluator machine having Docker installed). |
| **Clean Secrets & Sensitive Data Exclusions** | Strict `.gitignore` excluding `.env`, SQLite DB files, build artifacts (`dist/`), and logs. Zero committed AWS keys (`AKIA`) or GitHub tokens (`ghp_`). | ✅ **VERIFIED** | None. Comprehensive grep scans confirmed zero leaked credentials. |
| **Community & Contribution Standards** | Includes comprehensive `CONTRIBUTING.md`, architectural documentation (`docs/`), and reproducible issue reproduction steps. | ✅ **VERIFIED** | None. |

---

## 3. Submission Artifacts & Links Checklist

- [x] **Project Repository:** Public Git repository with clean git log and no secrets.
- [x] **Comprehensive Documentation:** Up-to-date `README.md` with system architecture, tool table, setup instructions, and troubleshooting.
- [x] **Demonstration Guide:** Step-by-step 2m 35s recording script and storyboard in `HACKATHON_DEMO_GUIDE.md`.
- [x] **Protocol Compliance Suite:** Standalone test script `mcp-audit.mjs` verifying all 37 specification checks.
- [x] **Unit & Integration Tests:** 56 passing tests across monorepo packages.
- [x] **Contribution Guidelines:** `CONTRIBUTING.md` created with clear MCP extension rules.
- [ ] **Demo Video Recording:** Awaiting final screen capture by team using `HACKATHON_DEMO_GUIDE.md` (Link placeholder: `[Demo Video URL]`).
- [ ] **Submission Portal Form:** Awaiting official hackathon portal form submission confirmation.

---

## 4. Known Technical Limitations & Evaluator Notes

1. **AI Provider Selection:**
   - Setting `AI_PROVIDER=mock` executes real MCP tools via simulated reasoning, ensuring complete determinism and zero API cost.
   - Setting `AI_PROVIDER=bedrock` requires valid `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` with Bedrock model access enabled.
2. **GitHub Sync Mode:**
   - Without `GITHUB_TOKEN`, GitHub views run against a high-fidelity local seed dataset (`acme-corp/phoenix`).
   - Adding a personal access token enables live synchronization with the GitHub REST API.
3. **Container Deployment:**
   - Dockerfiles and compose are provided. In local environments lacking Docker, the recommended startup is standard npm workspaces (`npm run dev`).
