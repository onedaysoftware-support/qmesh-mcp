const SUPABASE_URL = "https://cvizjnidcgonqsrwxubz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Dkp1VuzTKHAdV3UOaW2Zuw_VDd_yO4p";

// Optional user JWT for authenticated calls (e.g. submit_ai_signal).
// Users can set QMESH_USER_TOKEN via Claude Desktop env to authenticate as themselves.
const USER_TOKEN = process.env.QMESH_USER_TOKEN || "";

function buildHeaders(requireAuth = false): HeadersInit {
  const headers: Record<string, string> = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    "Content-Type": "application/json",
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
  options: { auth?: boolean } = {}
): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: buildHeaders(options.auth),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`RPC ${name} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

async function queryTable<T>(path: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: buildHeaders(false),
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
  return callRpc<PlatformStats>("get_platform_stats");
}

export type LeaderboardPeriod = "day" | "week" | "month" | "year";

export async function getLeaderboard(
  period: LeaderboardPeriod = "month"
): Promise<unknown[]> {
  return callRpc<unknown[]>("get_leaderboard", { p_period: period });
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
      "&is_visible=eq.true&is_online=eq.true&is_deleted=eq.false&order=sort_order"
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
    { auth: true }
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

  return queryTable<BugPattern[]>(`bug_patterns?${params.join("&")}`);
}
