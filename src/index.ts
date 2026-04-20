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
  submitAiSignal,
  type LeaderboardPeriod,
  type SearchBugPatternsArgs,
  type SubmitAiSignalArgs,
} from "./qmesh-client.js";

const server = new Server(
  { name: "qmesh-mcp", version: "0.3.0" },
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
    name: "submit_ai_signal",
    description:
      "Submit an AI-detected quality signal to QMesh's Signal Engine for a specific task. Use this when you (the AI) are testing a product at the user's request and have found a bug, regression, security issue, UX problem, or spec violation. QMesh's Signal Engine will deduplicate, score by severity × confidence, and route high-value findings to human QA reviewers. Requires authentication: set environment variable QMESH_USER_TOKEN to a Supabase JWT for a user who owns the target task (or an admin). Without the token, the call will fail with permission denied. The user can retrieve their JWT by logging into q-mesh.com and copying the token from the browser's dev tools.",
    inputSchema: {
      type: "object",
      required: ["task_id", "title", "severity"],
      properties: {
        task_id: {
          type: "string",
          description: "The QMesh task ID this signal belongs to. Use get_platform_stats / list_pricing_plans only indirectly — ask the user for their task_id explicitly or have them copy it from their task detail page.",
        },
        title: {
          type: "string",
          description: "Short, specific title of the issue (e.g. 'Search bar accepts non-existent stock codes without validation'). 50–140 characters ideal.",
        },
        description: {
          type: "string",
          description: "Longer explanation of what was observed and why it matters.",
        },
        reproduction_steps: {
          type: "string",
          description: "Numbered steps to reproduce the issue.",
        },
        severity: {
          type: "string",
          enum: ["critical", "high", "medium", "low"],
          description: "Your honest estimate of severity. critical = security breach / data loss / cannot complete core flow; high = key feature broken; medium = noticeable defect with workaround; low = minor UX / cosmetic.",
        },
        category_guess: {
          type: "string",
          description: "Optional category hint, e.g. form-ux, security, error-ux, routing, visual-regression, data-integrity, performance, crash, i18n.",
        },
        pattern_code: {
          type: "string",
          description: "Optional pattern code from QMesh's Bug Pattern library if you recognize this as a known pattern (e.g. 'PAT-0004'). Adds +0.3 score bonus. Use search_bug_patterns to find matching patterns first.",
        },
        submitted_by: {
          type: "string",
          description: "Identifier of the AI/tool submitting, e.g. 'claude-opus-4-7' or 'playwright-axe'. Defaults to 'mcp-client'.",
        },
        confidence: {
          type: "number",
          description: "Your confidence this is a real issue (0–1). Defaults to 0.7.",
        },
      },
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
      case "submit_ai_signal": {
        const signalId = await submitAiSignal(args as unknown as SubmitAiSignalArgs);
        data = { signal_id: signalId, status: "submitted", message: "Signal submitted to QMesh. It will be deduped, scored, and routed for human judgment if high-value." };
        break;
      }
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
