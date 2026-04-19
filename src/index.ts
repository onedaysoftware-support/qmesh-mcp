#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  getLeaderboard,
  getPlatformStats,
  listPricingPlans,
  type LeaderboardPeriod,
} from "./qmesh-client.js";

const server = new Server(
  { name: "qmesh-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

const TOOLS = [
  {
    name: "get_platform_stats",
    description:
      "Fetch QMesh crowdtesting platform statistics: total testers, QA-verified testers, businesses, bugs reported, and tasks posted. Use when the user asks about QMesh adoption, scale, or current activity.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_leaderboard",
    description:
      "Fetch the QMesh tester leaderboard for a given period. Returns ranked testers with QIS (Quality Impact Score), critical- and high-severity bug counts, effective rate, adoption rate, and trust level. Use when the user asks about top testers or the QMesh ranking system.",
    inputSchema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["day", "week", "month", "year"],
          description: "Time window for the leaderboard (default: month)",
        },
      },
    },
  },
  {
    name: "list_pricing_plans",
    description:
      "List QMesh's publicly available testing plans with price, budget, features, badge, and refund policy. Use when the user asks about QMesh pricing, plan tiers, or what they get at each tier.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    let data: unknown;
    switch (name) {
      case "get_platform_stats":
        data = await getPlatformStats();
        break;
      case "get_leaderboard": {
        const period = ((args as { period?: string })?.period ??
          "month") as LeaderboardPeriod;
        data = await getLeaderboard(period);
        break;
      }
      case "list_pricing_plans":
        data = await listPricingPlans();
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    return {
      content: [
        { type: "text", text: JSON.stringify(data, null, 2) },
      ],
    };
  } catch (err) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error invoking ${name}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
