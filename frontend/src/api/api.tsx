import axios from "axios";

/** ============ Types ============ */
export interface PrecomputedRankingResult {
  rank: number;
  id: string;            // domain
  score: number;
  isValidDomain: boolean;
}

export interface PrecomputedRankingResponse {
  status: string;        // "success"
  query: string;         // word
  results: PrecomputedRankingResult[];
}

export interface CoordinateResult {
  id: string;            // domain
  scores: number[];      // per-axis scores
  rank: number;
  isValidDomain: boolean;
}

export interface CoordinateResponse {
  status: string;        // "success"
  queries: string[];     // axis words
  axis_count: number;    // 2 or 3
  results_count: number;
  results: CoordinateResult[];
}

export interface EdgeData {
  id: number;
  origin: string;
  target: string;
  num_users: number;
}
export interface EdgesResponse {
  results_count: number;
  results: EdgeData[];
}

export interface TargetEdgeUser { user: number }
export interface TargetEdgeResponse {
  results_count: number;
  results: TargetEdgeUser[];
}

export interface NodeStatisticsResponse {
  status: string;                 // "success"
  node: string;                   // full_domain
  mode: "origin" | "target";
  visit_count: number;
  total_time_spent: number;       // seconds
  avg_time_per_visit: number;     // seconds
}

/** ============ Static file shapes ============ */
/** /jsons/edges_u0_7.json */
interface StaticEdgesFile { results_count: number; results: EdgeData[]; }

/** /jsons/edge_users_u0_7.json — map "origin|target" -> userId[] */
type StaticEdgeUsersFile = Record<string, number[]>;

/** /jsons/user_edges_u0_7/<userId>.json */
interface StaticUserEdgesFile { results_count: number; results: EdgeData[]; }

/** /jsons/node_stats_u0_7.json */
interface StaticNodeStatsBlock { visit_count: number; total_time_spent: number; avg_time_per_visit: number; }
interface StaticNodeStatsFile {
  by_origin: Record<string, StaticNodeStatsBlock>;
  by_target: Record<string, StaticNodeStatsBlock>;
}

/** ============ Helpers ============ */
const RANKINGS_CSV_URL = "/jsons/precomputed_rankings.csv";
const EDGES_URL        = "/jsons/edges/edges_u0_7.json";
const EDGE_USERS       = "/jsons/edges/edge_users_u0_7.json";
const USER_EDGES_DIR   = "/jsons/edges/user_edges_u0_7";
const NODE_STATS       = "/jsons/edges/node_stats_u0_7.json";

function normalizeDomain(s: string) {
  if (s.startsWith("http://")) s = s.slice(7);
  else if (s.startsWith("https://")) s = s.slice(8);
  if (s.startsWith("www.")) s = s.slice(4);
  return s.toLowerCase();
}

/**
 * Cache: query -> list of PrecomputedRankingResult
 */
let rankingsCachePromise:
  | Promise<Map<string, PrecomputedRankingResult[]>>
  | null = null;

async function loadRankingsCsv(): Promise<Map<string, PrecomputedRankingResult[]>> {
  if (rankingsCachePromise) return rankingsCachePromise;

  rankingsCachePromise = (async () => {
    // Fetch the CSV as plain text
    const response = await axios.get(RANKINGS_CSV_URL, { validateStatus: s => s === 200 });
    const text = response.data as string;

    // Parse CSV

    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      throw new Error("precomputed_rankings.csv appears to be empty.");
    }

    // First line is header
    const header = lines[0].split(",");
    console.log(lines[0]);
    const idxQuery        = header.indexOf("query");
    const idxRank         = header.indexOf("rank");
    const idxWebsite      = header.indexOf("website_id");
    const idxScore        = header.indexOf("score");
    const idxIsValid      = header.indexOf("isValidDomain");

    if (
      idxQuery === -1 ||
      idxRank === -1 ||
      idxWebsite === -1 ||
      idxScore === -1 ||
      idxIsValid === -1
    ) {
      throw new Error(
        "precomputed_rankings.csv missing one of required columns: query, rank, website_id, score, isValidDomain"
      );
    }

    const map = new Map<string, PrecomputedRankingResult[]>();

    // Naive CSV parsing: safe if domains don't contain commas (true for your dataset)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(",");
      if (cols.length < header.length) continue;

      const query        = cols[idxQuery];
      const rankStr      = cols[idxRank];
      const website      = cols[idxWebsite];
      const scoreStr     = cols[idxScore];
      const isValidStr   = cols[idxIsValid];

      const rank = Number(rankStr);
      const score = Number(scoreStr);
      const isValid =
        isValidStr === "True" ||
        isValidStr === "true" ||
        isValidStr === "1";

      const id = normalizeDomain(website);

      const row: PrecomputedRankingResult = {
        rank: Number.isFinite(rank) ? rank : 9999,
        id,
        score: Number.isFinite(score) ? score : 0,
        isValidDomain: isValid,
      };

      const key = query.toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }

    // Sort each query’s list by rank ascending, just in case
    for (const [, list] of map) {
      list.sort((a, b) => a.rank - b.rank);
    }

    return map;
  })();

  return rankingsCachePromise;
}

export async function getPrecomputedRankings(
  axis1: string,
  axis2: string,
  axis3?: string
): Promise<CoordinateResponse> {
  const axes = [axis1, axis2, ...(axis3 ? [axis3] : [])];

  const rankingsMap = await loadRankingsCsv();

  const perAxisResponses: PrecomputedRankingResponse[] = axes.map((axis) => {
    const key = axis.toLowerCase();
    const results = rankingsMap.get(key) ?? [];

    return {
      status: "success",
      query: axis,
      results,
    };
  });

  // Merge per-axis scores into a coordinate list
  const merged: Record<
    string,
    { scores: number[]; rank?: number; isValidDomain?: boolean }
  > = {};

  for (let axisIndex = 0; axisIndex < perAxisResponses.length; axisIndex++) {
    const resp = perAxisResponses[axisIndex];
    for (const r of resp.results) {
      if (!merged[r.id]) merged[r.id] = { scores: [] };
      merged[r.id].scores[axisIndex] = r.score;

      // Use first seen rank/isValidDomain as a heuristic
      if (merged[r.id].rank === undefined) merged[r.id].rank = r.rank;
      if (merged[r.id].isValidDomain === undefined)
        merged[r.id].isValidDomain = r.isValidDomain;
    }
  }

  const results: CoordinateResult[] = Object.entries(merged).map(
    ([id, v]) => ({
      id,
      scores: v.scores.map((s) => (s ?? 0)),
      rank: v.rank ?? 9999,
      isValidDomain: v.isValidDomain ?? true,
    })
  );

  return {
    status: "success",
    queries: perAxisResponses.map((r) => r.query),
    axis_count: perAxisResponses.length,
    results_count: results.length,
    results,
  };
}

export async function getEdges(websites: string[]): Promise<EdgesResponse> {
  const { data } = await axios.get<StaticEdgesFile>(EDGES_URL, { validateStatus: s => s === 200 });
  if (!websites?.length) return data;

  console.log('All edges loaded:', data);

  const wset = new Set(websites.map(normalizeDomain));
  console.log('Filtering edges for websites:', wset);
  const results = data.results.filter(e => wset.has(normalizeDomain(e.origin)) && wset.has(normalizeDomain(e.target)));
  return { results_count: results.length, results };
}

export async function getTargetEdge(
  website1: string,
  website2: string,
): Promise<TargetEdgeResponse> {
  const { data } = await axios.get<StaticEdgeUsersFile>(EDGE_USERS, { validateStatus: s => s === 200 });

  const aRaw = website1.trim().toLowerCase();
  const bRaw = website2.trim().toLowerCase();
  const aNorm = normalizeDomain(aRaw);
  const bNorm = normalizeDomain(bRaw);

  const candidateKeys = [
    `${aRaw}|${bRaw}`,          // exact raw (subdomains preserved)
    `${aNorm}|${bNorm}`,        // normalized (eTLD+1, no www, etc.)
    `${bRaw}|${aRaw}`,          // reversed raw
    `${bNorm}|${aNorm}`,        // reversed normalized
  ];

  let users: number[] = [];
  for (const k of candidateKeys) {
    const hit = (data as Record<string, number[]>)[k];
    if (hit && hit.length) { users = hit; break; }
  }

  return { results_count: users.length, results: users.map(u => ({ user: u })) };
}


export async function getUserEdges(userId: number, websites: string[]): Promise<EdgesResponse> {
  const { data } = await axios.get<StaticUserEdgesFile>(`${USER_EDGES_DIR}/${userId}.json`, { validateStatus: s => s === 200 });
  if (!websites?.length) return data;

  const wset = new Set(websites.map(normalizeDomain));
  const results = data.results.filter(e => wset.has(normalizeDomain(e.origin)) && wset.has(normalizeDomain(e.target)));
  return { results_count: results.length, results };
}

export async function getNodeStatistics(node: string, mode: "origin" | "target" = "origin"): Promise<NodeStatisticsResponse> {
  const { data } = await axios.get<StaticNodeStatsFile>(NODE_STATS, { validateStatus: s => s === 200 });
  const table = mode === "origin" ? data.by_origin : data.by_target;
  const block = table[normalizeDomain(node)] || { visit_count: 0, total_time_spent: 0, avg_time_per_visit: 0 };
  return {
    status: "success",
    node: normalizeDomain(node),
    mode,
    visit_count: block.visit_count,
    total_time_spent: block.total_time_spent,
    avg_time_per_visit: block.avg_time_per_visit
  };
}
