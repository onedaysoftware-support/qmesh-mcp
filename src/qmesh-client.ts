const SUPABASE_URL = "https://cvizjnidcgonqsrwxubz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Dkp1VuzTKHAdV3UOaW2Zuw_VDd_yO4p";

// Auth for write operations (submit_ai_signal):
//   Preferred: QMESH_API_KEY — long-lived key created in q-mesh.com settings.
//     Uses submit_ai_signal_v2 RPC; no JWT needed.
//   Legacy:   QMESH_USER_TOKEN — Supabase session JWT (1 hr expiry, pulled from DevTools).
//     Kept for backward compat; will be deprecated.
const API_KEY = process.env.QMESH_API_KEY || "";
const USER_TOKEN = process.env.QMESH_USER_TOKEN || "";

// 以 pkg 版本作為 x-client 版本標記（寫死避免執行時 fs 讀取）
const MCP_VERSION = "0.4.0";

function buildHeaders(requireAuth = false, toolName?: string): HeadersInit {
  const headers: Record<string, string> = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    "Content-Type": "application/json",
    // 用於 Supabase log 辨識流量來源（與網站流量區分）
    "x-client": `qmesh-mcp/${MCP_VERSION}`,
    "x-client-tool": toolName || "unknown",
    "User-Agent": `qmesh-mcp/${MCP_VERSION}`,
  };
  // For authenticated RPC (write operations), use user JWT when available.
  // Falls back to publishable key — the RPC will reject if it requires auth.uid().
  if (requireAuth && USER_TOKEN) {
    headers.Authorization = `Bearer ${USER_TOKEN}`;
  } else {
    headers.Authorization = `Bearer ${SUPABASE_PUBLISHABLE_KEY}`;
  }
  return headers;
}

async function callRpc<T>(
  name: string,
  params: Record<string, unknown> = {},
  options: { auth?: boolean; toolName?: string } = {}
): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: buildHeaders(options.auth, options.toolName || name),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`RPC ${name} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

async function queryTable<T>(path: string, toolName?: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: buildHeaders(false, toolName),
  });
  if (!res.ok) {
    throw new Error(`Query ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export interface PlatformStats {
  testers?: number;
  qa_verified?: number;
  businesses?: number;
  bugs?: number;
  tasks?: number;
  [key: string]: unknown;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  return callRpc<PlatformStats>("get_platform_stats", {}, { toolName: "get_platform_stats" });
}

export type LeaderboardPeriod = "day" | "week" | "month" | "year";

export async function getLeaderboard(
  period: LeaderboardPeriod = "month"
): Promise<unknown[]> {
  return callRpc<unknown[]>("get_leaderboard", { p_period: period }, { toolName: "get_leaderboard" });
}

export interface PricingPlan {
  name: string;
  budget: number;
  original_price?: number | null;
  features?: string[] | null;
  refund_text?: string | null;
  emoji?: string | null;
  sort_order?: number | null;
  badge_text?: string | null;
}

export async function listPricingPlans(): Promise<PricingPlan[]> {
  return queryTable<PricingPlan[]>(
    "test_plans?select=name,budget,original_price,features,refund_text,emoji,sort_order,badge_text" +
      "&is_visible=eq.true&is_online=eq.true&is_deleted=eq.false&order=sort_order",
    "list_pricing_plans"
  );
}

export interface BugPattern {
  pattern_code: string;
  title: string;
  summary: string;
  domain: string;
  category: string;
  severity_typical: "critical" | "high" | "medium" | "low";
  platforms_affected?: string[] | null;
  observed_behavior?: string | null;
  expected_behavior?: string | null;
  user_impact?: string | null;
  detection_technique?: string | null;
  detection_checklist?: string[] | null;
  root_cause_category?: string | null;
  tags?: string[] | null;
  source_bug_count?: number | null;
}

export interface SearchBugPatternsArgs {
  category?: string;
  severity?: "critical" | "high" | "medium" | "low";
  domain?: string;
  query?: string;
  limit?: number;
}

const SEARCHABLE_FIELDS =
  "pattern_code,title,summary,domain,category,severity_typical," +
  "platforms_affected,observed_behavior,expected_behavior,user_impact," +
  "detection_technique,detection_checklist,root_cause_category," +
  "tags,source_bug_count";

export interface SubmitAiSignalArgs {
  task_id: string;
  title: string;
  description?: string;
  reproduction_steps?: string;
  severity: "critical" | "high" | "medium" | "low";
  category_guess?: string;
  pattern_code?: string;
  submitted_by?: string;
  confidence?: number;
}

export async function submitAiSignal(args: SubmitAiSignalArgs): Promise<string> {
  // Preferred: API Key → submit_ai_signal_v2 (no JWT needed)
  if (API_KEY) {
    const id = await callRpc<string>(
      "submit_ai_signal_v2",
      {
        p_api_key:      API_KEY,
        p_task_id:      args.task_id,
        p_title:        args.title,
        p_description:  args.description ?? null,
        p_reproduction: args.reproduction_steps ?? null,
        p_severity:     args.severity,
        p_category:     args.category_guess ?? null,
        p_pattern_code: args.pattern_code ?? null,
        p_confidence:   args.confidence ?? 0.7,
      },
      { auth: false, toolName: "submit_ai_signal" }
    );
    return id;
  }

  // Legacy: JWT token → original submit_ai_signal (deprecated; kept for backward compat)
  if (!USER_TOKEN) {
    throw new Error(
      "submit_ai_signal requires QMESH_API_KEY (preferred) or QMESH_USER_TOKEN (legacy). " +
      "Create an API key at https://q-mesh.com/business/settings.html"
    );
  }
  const id = await callRpc<string>(
    "submit_ai_signal",
    {
      p_task_id:       args.task_id,
      p_title:         args.title,
      p_description:   args.description ?? null,
      p_reproduction:  args.reproduction_steps ?? null,
      p_severity:      args.severity,
      p_category:      args.category_guess ?? null,
      p_pattern_code:  args.pattern_code ?? null,
      p_submitted_by:  args.submitted_by ?? "mcp-client",
      p_confidence:    args.confidence ?? 0.7,
    },
    { auth: true, toolName: "submit_ai_signal" }
  );
  return id;
}

export async function searchBugPatterns(
  args: SearchBugPatternsArgs = {}
): Promise<BugPattern[]> {
  const params: string[] = [];
  params.push(`select=${SEARCHABLE_FIELDS}`);

  if (args.category) params.push(`category=eq.${encodeURIComponent(args.category)}`);
  if (args.severity) params.push(`severity_typical=eq.${encodeURIComponent(args.severity)}`);
  if (args.domain)   params.push(`domain=eq.${encodeURIComponent(args.domain)}`);

  // Text search across title + summary via PostgREST `or` filter
  if (args.query) {
    const q = encodeURIComponent(args.query);
    params.push(`or=(title.ilike.*${q}*,summary.ilike.*${q}*)`);
  }

  const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
  params.push(`limit=${limit}`);
  params.push("order=severity_typical.asc,source_bug_count.desc");

  return queryTable<BugPattern[]>(`bug_patterns?${params.join("&")}`, "search_bug_patterns");
}
