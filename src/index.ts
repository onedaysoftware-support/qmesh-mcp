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
  searchBugPatterns,
  type LeaderboardPeriod,
  type SearchBugPatternsArgs,
} from "./qmesh-client.js";

const server = new Server(
  { name: "qmesh-mcp", version: "0.2.0" },
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
  {
    name: "search_bug_patterns",
    description:
      "Search QMesh's public Bug Pattern knowledge base — de-identified scenario templates, bug patterns, and testing methodologies extracted from real crowdtesting reports. Each pattern includes trigger conditions, observed vs expected behavior, user impact, detection technique, and a checklist. Use when the user asks about common bug types (XSS, authorization, form validation, layout breakage, SPA routing, timezone handling, etc.), wants QA test ideas, or is researching how real-world products fail. You can filter by category, severity, or domain, or do free-text search across title and summary.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description:
            "Filter by pattern category. Common values: security, auth, form-ux, error-ux, visual-regression, routing, data-integrity, upload-file, performance, crash, i18n, concurrency, admin-panel, payment, notification, accessibility, onboarding, search-filter, data-export, other.",
        },
        severity: {
          type: "string",
          enum: ["critical", "high", "medium", "low"],
          description: "Filter by typical severity of the pattern.",
        },
        domain: {
          type: "string",
          description:
            "Filter by product domain (e.g. web, mobile, game, firmware, ai-product, hardware-companion).",
        },
        query: {
          type: "string",
          description:
            "Free-text search applied to title and summary (case-insensitive substring match).",
        },
        limit: {
          type: "integer",
          description: "Max number of patterns to return (1-50, default 20).",
        },
      },
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
      case "search_bug_patterns":
        data = await searchBugPatterns((args ?? {}) as SearchBugPatternsArgs);
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
