# QMesh MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-brightgreen)](#install)
[![MCP](https://img.shields.io/badge/Model_Context_Protocol-read--only-000000)](https://modelcontextprotocol.io)

Query the [QMesh](https://q-mesh.com) crowdtesting platform from Claude Desktop, Cursor, Continue, and any other [Model Context Protocol](https://modelcontextprotocol.io) client.

QMesh connects businesses to real users and QA-verified testers for finding bugs before launch. This MCP server lets AI assistants surface QMesh data on demand — tester leaderboards, public pricing plans, platform scale.

All tools are **read-only** and hit QMesh's public API; no authentication required.

## Tools

| Tool | Description |
|------|-------------|
| `get_platform_stats` | Platform-wide metrics: testers, QA-certified testers, businesses, bugs, tasks |
| `get_leaderboard` | Day / week / month / year tester rankings with QIS and bug stats |
| `list_pricing_plans` | Publicly available testing plans with budget, features, refund policy |
| `search_bug_patterns` | De-identified Bug Pattern knowledge base (scenario templates, detection techniques, checklists). Filter by category, severity, domain, or free-text. |

## Install

Once published to npm:

```bash
npm install -g @q-mesh/mcp
```

Or run on-demand via `npx` (no install):

```bash
npx -y @q-mesh/mcp
```

## Claude Desktop

Add to your Claude Desktop config:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%AppData%\Claude\claude_desktop_config.json`

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

Restart Claude Desktop. You should see the hammer icon with the three QMesh tools.

## Cursor / Continue / Other MCP clients

Use the same stdio transport config. Refer to your client's MCP setup docs.

## Example prompts

- "Use QMesh to show me the top 10 testers this month"
- "What testing plans does QMesh offer and what's included?"
- "How many active testers are on QMesh right now?"
- "Who's on the QMesh weekly leaderboard?"
- "Search QMesh bug patterns about XSS"
- "What common form-ux bugs does QMesh have documented?"
- "List all critical security bug patterns from QMesh"

## Development

```bash
git clone https://github.com/onedaysoftware-support/qmesh-mcp
cd qmesh-mcp
npm install
npm run build
node dist/index.js       # stdio — connects to an MCP client
```

## Scope & roadmap

Current release (`0.1.x`): **read-only**. You can query; you cannot create tasks or submit bugs through the MCP server yet.

Planned for future releases (pending platform milestones):

- `post_task` — create a new testing task (requires funded business account + API key)
- `search_bug_patterns` — de-identified bug pattern knowledge base
- `get_task_status` — poll a task's progress and bug summary

Follow [github.com/onedaysoftware-support/qmesh-mcp](https://github.com/onedaysoftware-support/qmesh-mcp) for updates.

## License

[MIT](./LICENSE) © Oneday Software
