# QMesh MCP Server

[![npm version](https://img.shields.io/npm/v/%40q-mesh%2Fmcp.svg)](https://www.npmjs.com/package/@q-mesh/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-brightgreen)](#install)
[![MCP](https://img.shields.io/badge/Model_Context_Protocol-stdio-000000)](https://modelcontextprotocol.io)

Query the [QMesh](https://q-mesh.com) crowdtesting platform from Claude Code, Cursor, Claude Desktop, Codex, and any other [Model Context Protocol](https://modelcontextprotocol.io) client.

QMesh combines **AI-detected signals** with **human QA judgment** to produce release-confidence decisions. This MCP server lets your AI assistant surface QMesh data on demand, and (with auth) submit AI-detected quality issues into QMesh's Signal Engine for human verification.

---

## Demo

![QMesh MCP in Claude Desktop — search_bug_patterns returning real patterns](https://github.com/user-attachments/assets/858985aa-2d0a-4cc2-a24b-2eb6219aef73)

*Claude Desktop using `search_bug_patterns` to answer a QA question with real de-identified patterns from QMesh.*

---

## Tools

### Read-only (no auth)

| Tool | Description |
|------|-------------|
| `verify_install` 🆕 | Smoke test that MCP is connected. Call this **first after install** to confirm everything works — returns status, tool count, suggested next prompts |
| `get_platform_stats` | Platform-wide metrics — testers, QA-certified testers, businesses, bugs, tasks |
| `get_leaderboard` | Day / week / month / year tester rankings with QIS, critical/high bug counts, effective rate |
| `list_pricing_plans` | Public testing plans with budget, features, refund policy |
| `search_bug_patterns` | De-identified Bug Pattern knowledge base — scenario templates, detection techniques, checklists. Filter by category, severity, domain, or free-text |

### Action tools (require API Key)

| Tool | Description |
|------|-------------|
| `submit_ai_signal` | Submit an AI-detected quality signal on a task you own. QMesh dedupes, scores (confidence × severity × pattern match), and routes high-value signals to human QA |
| `create_test_task` 🆕 | Launch a new crowdtesting task on QMesh. **No payment required for now** (budget=0, behaves like any other free QMesh task): real testers may pick it up and report bugs. Rate limited to 5 tasks per API key per 24 hours |
| `get_task_status` 🆕 | Track a task's progress: state, bug counts grouped by severity and status |
| `list_bugs` 🆕 | Pull bugs reported on a task; filter by severity / status; up to 100 per call |
| `export_report` 🆕 | Generate a Markdown release-readiness report (severity / status tables, top-10 bugs). Useful for AI deploy decisions, Slack/Notion posting, or PR comments |

🆕 = added in v0.5.0. The 4 action tools enable AI agents to **autonomously launch and track crowdtesting** without human intervention — closing the loop from "AI finds bug" to "humans verify it" without leaving the IDE.

---

## Install

```bash
npx -y @q-mesh/mcp
```

Or install globally:

```bash
npm install -g @q-mesh/mcp
```

## Claude Desktop

Add to your Claude Desktop config:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%AppData%\Claude\claude_desktop_config.json`

**Minimal (read-only tools):**

```json
{
  "mcpServers": {
    "qmesh": {
      "command": "npx",
      "args": ["-y", "@q-mesh/mcp"]
    }
  }
}
```

**With `submit_ai_signal` enabled:**

```json
{
  "mcpServers": {
    "qmesh": {
      "command": "npx",
      "args": ["-y", "@q-mesh/mcp"],
      "env": {
        "QMESH_API_KEY": "qk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

On Windows wrap `npx` with `cmd /c`:

```json
{
  "mcpServers": {
    "qmesh": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@q-mesh/mcp"]
    }
  }
}
```

Restart Claude Desktop. Hammer icon should show **10 QMesh tools** (5 read-only + 5 action tools, the latter need `QMESH_API_KEY`).

**Tip:** ask Claude `"use qmesh verify_install"` first — instant smoke test, no auth needed.

### Getting `QMESH_API_KEY`

Required for the 5 action tools (`submit_ai_signal`, `create_test_task`, `get_task_status`, `list_bugs`, `export_report`). The 4 read-only tools work without it.

1. Log in to [q-mesh.com](https://q-mesh.com) (the account must own the target task, or be an admin).
2. Go to **Settings → API Keys** and click **Create API Key**.
3. Give it a name (e.g. "Claude Desktop") and copy the generated key starting with `qk_`.
   > ⚠️ The full key is shown **only once** — save it before closing the dialog.
4. Paste into your config `env.QMESH_API_KEY`.

API keys are long-lived (default 90 days) and can be revoked from the same page any time.

#### Legacy: `QMESH_USER_TOKEN` (deprecated)

If you cannot create an API Key yet, a Supabase JWT still works as a fallback — pull `access_token` from DevTools → Local Storage → `sb-cvizjnidcgonqsrwxubz-auth-token`. Note: JWTs expire in ~1 hour, so this is not recommended for persistent use.

---

## Claude Code / Cursor / Codex / Other MCP clients

Use the same stdio transport config. Refer to your client's MCP setup docs.

---

## Example prompts

Once installed, try these with Claude:

**Read-only (no auth):**
- "Show me the QMesh leaderboard this week"
- "What testing plans does QMesh offer and what's included?"
- "How many testers are on QMesh right now?"
- "Search QMesh bug patterns about XSS"
- "What common form-ux bugs does QMesh have documented?"
- "List all critical security bug patterns from QMesh"

**With auth (for task owners):**
- "I'm testing my QMesh task `<task-id>` and the login page accepts non-existent accounts. Submit this as an AI signal with severity high."
- "Run accessibility checks on my product and submit any WCAG violations you find as signals to task `<task-id>`."

**Action tools (v0.5+):**
- "Launch a QMesh test for my e-commerce checkout flow — title 'Cart 結帳流程驗收', description 'Verify the full cart-to-payment flow works on mobile Safari and Chrome', priority high, max 7 days."
- "Show me the status of QMesh task `<task-id>` — how many bugs found, what severity?"
- "List all critical and high-severity bugs on task `<task-id>` that are still pending."
- "Generate a release-readiness Markdown report for task `<task-id>` so I can decide whether to deploy."

---

## How the Signal Engine works

```
  Your AI agent              QMesh                    Human QA
 (Claude / Cursor)       Signal Engine                on QMesh
     │                      │                           │
     │──submit_ai_signal──▶ │                           │
     │                      │─ dedupe ────────────▶     │
     │                      │  (same title + task?)     │
     │                      │                           │
     │                      │─ score ─────────────▶     │
     │                      │  (conf × severity ×       │
     │                      │   pattern bonus)          │
     │                      │                           │
     │                      │─ route ──────────────────▶│
     │                      │  (score ≥ 0.5)            │
     │                      │                           │ ← promotes valid
     │                      │                           │   or dismisses
     │                      │                           │
     │                      │◀─ visible to task owner ──│
```

Your AI scales breadth. Human QA provides judgment. QMesh merges both into a release-confidence decision.

---

## Development

```bash
git clone https://github.com/onedaysoftware-support/qmesh-mcp
cd qmesh-mcp
npm install
npm run build
node dist/index.js       # stdio — connects to any MCP client
```

### Smoke test

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"0.0.1"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | node dist/index.js
```

Should list all **10 tools**.

---

## Roadmap

Current release (`0.5.x`): **10 tools — 5 read-only + 5 action tools (API Key gated)**.

Done since `0.3`:
- ✅ API Key mechanism (long-lived, revocable, replaces JWT)
- ✅ `create_test_task` (no payment required for now)
- ✅ `get_task_status` / `list_bugs` / `export_report`

Planned:
- **`get_release_readiness`** — compose QCI score from signals + bugs + coverage (the flagship future tool)
- **`subscribe_to_task`** — server-sent events / webhook for new bugs as they arrive
- **Custom Pattern Library** — per-org pattern injection (your house style, your false-positive list)

Follow [github.com/onedaysoftware-support/qmesh-mcp](https://github.com/onedaysoftware-support/qmesh-mcp) for updates.

---

## Troubleshooting

**"Failed to spawn process: No such file or directory"** — your MCP client can't find `npx` in its PATH. Try absolute path: `/opt/homebrew/bin/npx` (macOS with Homebrew) or `/Users/you/.nvm/versions/node/vXX.X.X/bin/npx` (nvm).

**"permission denied" on `submit_ai_signal`** — either JWT expired, or you're not the task owner (submission requires `tasks.business_id = auth.uid()` or admin role).

**`submit_ai_signal` returns "invalid or expired api key"** — your `QMESH_API_KEY` is either mistyped, revoked, or past its 90-day expiry. Create a new one at q-mesh.com Settings → API Keys.

**`submit_ai_signal` returns "permission denied"** — the task you're targeting doesn't belong to the API key's owner (or the owner is not admin).

**`create_test_task` returns "rate limit exceeded"** — you've created 5 tasks within the last 24 hours per API key. Wait, or use a different API key.

**`create_test_task` says "title must be at least 5 characters" / "description must be at least 20 characters"** — these floors exist so real testers know what to actually test. Make titles concrete and descriptions actionable.

**`get_task_status` / `list_bugs` / `export_report` returns "task does not belong to api key owner"** — the API key's owner is not the task's `business_id` (and not admin). Use a key owned by the task creator.

---

## Changelog

### 0.5.1 (2026-05-10)

- ✨ Added `verify_install` — instant smoke test for first-time installers (no auth)
- 🩹 Reduces install → first-success friction from minutes to seconds

### 0.5.0 (2026-05-10)

- ✨ Added 4 B-side action tools: `create_test_task`, `get_task_status`, `list_bugs`, `export_report`
- ✨ AI agents can now autonomously launch and track crowdtesting tasks from inside Claude Code / Cursor / Codex
- 🆓 `create_test_task` requires no payment for now (budget=0)
- 🛡️ Rate limited to 5 tasks per API key per 24 hours

### 0.4.0

- ✨ API Key auth mechanism (long-lived, revocable) replaces 1-hour JWT for write tools

### 0.3.x

- 5 tools: 4 read-only + `submit_ai_signal`

---

## License

[MIT](./LICENSE) © Oneday Software
