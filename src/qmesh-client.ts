const SUPABASE_URL = "https://cvizjnidcgonqsrwxubz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Dkp1VuzTKHAdV3UOaW2Zuw_VDd_yO4p";

const HEADERS = {
  apikey: SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  "Content-Type": "application/json",
};

async function callRpc<T>(
  name: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`RPC ${name} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

async function queryTable<T>(path: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: HEADERS,
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
