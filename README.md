# QMesh MCP Server

[![npm version](https://img.shields.io/npm/v/%40q-mesh%2Fmcp.svg)](https://www.npmjs.com/package/@q-mesh/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-brightgreen)](#install)
[![MCP](https://img.shields.io/badge/Model_Context_Protocol-stdio-000000)](https://modelcontextprotocol.io)

Query the [QMesh](https://q-mesh.com) crowdtesting platform from Claude Desktop, Cursor, Continue, and any other [Model Context Protocol](https://modelcontextprotocol.io) client.

QMesh combines **AI-detected signals** with **human QA judgment** to produce release-confidence decisions. This MCP server lets your AI assistant surface QMesh data on demand, and (with auth) submit AI-detected quality issues into QMesh's Signal Engine for human verification.

---

## Demo

![QMesh MCP in Claude Desktop — search_bug_patterns returning real patterns](https://github.com/user-attachments/assets/858985aa-2d0a-4cc2-a24b-2eb6219aef73)

*Claude Desktop using `search_bug_patterns` to answer a QA question with real de-identified patterns from QMesh.*

---

## Tools

| Tool | Auth | Description |
|------|------|-------------|
| `get_platform_stats` | none | Platform-wide metrics — testers, QA-certified testers, businesses, bugs, tasks |
| `get_leaderboard` | none | Day / week / month / year tester rankings with QIS, critical/high bug counts, effective rate |
| `list_pricing_plans` | none | Public testing plans with budget, features, refund policy |
| `search_bug_patterns` | none | De-identified Bug Pattern knowledge base — scenario templates, detection techniques, checklists. Filter by category, severity, domain, or free-text |
| `submit_ai_signal` | **user JWT** | Submit an AI-detected quality signal on a task you own. QMesh dedupes, scores (confidence × severity × pattern match), and routes high-value signals to human QA |

All tools except `submit_ai_signal` work without authentication.

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
        "QMESH_USER_TOKEN": "<YOUR_SUPABASE_JWT_FROM_Q-MESH.COM>"
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

Restart Claude Desktop. Hammer icon should show **5 QMesh tools**.

### Getting `QMESH_USER_TOKEN`

Only needed for `submit_ai_signal`. All read-only tools work without it.

1. Log in to [q-mesh.com](https://q-mesh.com) (the account must own the target task, or be an admin)
2. Open DevTools → **Application** → **Local Storage** → `https://q-mesh.com`
3. Find key `sb-cvizjnidcgonqsrwxubz-auth-token`
4. Copy the `access_token` value
5. Paste into your config `env.QMESH_USER_TOKEN`

> ⚠️ JWTs expire (~1 hour). You'll need to refresh periodically. A long-lived API Key mechanism is on the roadmap.

---

## Cursor / Continue / Other MCP clients

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

Should list all 5 tools.

---

## Roadmap

Current release (`0.3.x`): **5 tools — 4 read-only + 1 write (auth-gated)**.

Planned:

- **API Key mechanism** — replace 1-hour JWT with long-lived revocable keys
- **`post_task`** — create a new testing task (requires funded business account)
- **`get_task_status`** — poll a task's progress and bug summary
- **`get_release_readiness`** — compose QCI score from signals + bugs + coverage (the flagship future tool)

Follow [github.com/onedaysoftware-support/qmesh-mcp](https://github.com/onedaysoftware-support/qmesh-mcp) for updates.

---

## Troubleshooting

**"Failed to spawn process: No such file or directory"** — your MCP client can't find `npx` in its PATH. Try absolute path: `/opt/homebrew/bin/npx` (macOS with Homebrew) or `/Users/you/.nvm/versions/node/vXX.X.X/bin/npx` (nvm).

**"permission denied" on `submit_ai_signal`** — either JWT expired, or you're not the task owner (submission requires `tasks.business_id = auth.uid()` or admin role).

**Tool calls return 401** — `QMESH_USER_TOKEN` is stale. Re-copy from q-mesh.com DevTools.

---

## License

[MIT](./LICENSE) © Oneday Software
