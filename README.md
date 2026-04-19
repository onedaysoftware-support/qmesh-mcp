# QMesh MCP Server

Query the [QMesh](https://q-mesh.com) crowdtesting platform from Claude Desktop, Cursor, Continue, and any other [Model Context Protocol](https://modelcontextprotocol.io) client.

QMesh connects businesses to real users and QA-verified testers for finding bugs before launch. This MCP server lets AI assistants surface QMesh data on demand — tester leaderboards, public pricing plans, platform scale.

All tools are **read-only** and hit QMesh's public API; no authentication required.

## Tools

| Tool | Description |
|------|-------------|
| `get_platform_stats` | Platform-wide metrics: testers, QA-certified testers, businesses, bugs, tasks |
| `get_leaderboard` | Day / week / month / year tester rankings with QIS and bug stats |
| `list_pricing_plans` | Publicly available testing plans with budget, features, refund policy |

## Install

Once published to npm:

```bash
npm install -g @qmesh/mcp
```

Or run on-demand via `npx` (no install):

```bash
npx -y @qmesh/mcp
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
      "args": ["-y", "@qmesh/mcp"]
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

## Development

```bash
git clone https://github.com/howard19871030/qmesh-mcp
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

Follow [github.com/howard19871030/qmesh-mcp](https://github.com/howard19871030/qmesh-mcp) for updates.

## License

[MIT](./LICENSE) © Oneday Software
