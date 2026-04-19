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
