# CONTRIBUTING TO QLYQ

Thank you for your interest in contributing to **QLYQ — MCP-Powered AI Project and Developer Assistant**!

We welcome contributions of all kinds: bug reports, documentation improvements, new MCP tools, and enhancements to the UI or agent orchestration logic.

---

## Code of Conduct

Please be respectful, collaborative, and constructive when opening issues, submitting pull requests, or participating in discussions.

---

## Getting Started

### Prerequisites
- **Node.js**: `v20.0.0` or higher
- **npm**: `v10.0.0` or higher
- **MongoDB**: `v6.0+` running locally on port `27017` or via Docker / Atlas

### Monorepo Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/your-username/qlyq.git
   cd qlyq
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your local environment:
   ```bash
   cp .env.example .env
   ```
   *(By default, QLYQ runs with `AI_PROVIDER=mock`, which requires zero AWS credentials and enables complete offline development.)*

4. Build the packages:
   ```bash
   npm run build
   ```

5. Run test suites:
   ```bash
   npm test
   node mcp-audit.mjs
   ```

6. Start local development servers:
   ```bash
   npm run dev
   ```

---

## Development Guidelines

1. **Model Context Protocol (MCP) Standards**:
   - Any new tool added to `packages/mcp-server/src/tools/` must implement standard JSON Schema definitions for `inputSchema`.
   - Tool handlers must return structured content conforming to `{ content: [{ type: "text", text: "..." }] }`.
   - Ensure `node mcp-audit.mjs` continues to pass with 100% compliance.

2. **Security & Secrets**:
   - **Never commit credentials**, API tokens, AWS keys (`AKIA...`), or GitHub Personal Access Tokens (`ghp_...`).
   - Use `.env` for local secrets and keep them excluded via `.gitignore`.
   - Frontend environment variables (`VITE_*`) must never contain secret keys.

3. **Styling & Design System**:
   - QLYQ uses a curated dark charcoal, soft lavender, and neutral surface design token system.
   - Maintain modern, clean typography and accessible contrast ratios.

---

## Reporting Issues

If you find a bug or vulnerability:
- Open an issue on GitHub with:
  - Clear description of the unexpected behavior.
  - Steps to reproduce.
  - Expected vs. actual outcome.
  - Node.js, OS, and browser versions.
  - Relevant sanitized logs.

---

## License

By contributing to QLYQ, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
