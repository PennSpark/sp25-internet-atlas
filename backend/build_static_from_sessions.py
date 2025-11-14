#!/usr/bin/env python3
"""
Build static JSON files for the Internet Atlas frontend from a pre-collapsed sessions CSV.

Input CSV columns (header required):
  panelist_id,full_domain,start_time,end_time,total_active_seconds,row_count

Notes:
- start_time/end_time must be ISO-8601 (e.g., 2018-10-01T00:21:33Z)
- We auto-fix rows where end_time < start_time (use start + total_active_seconds if present)
- We normalize domains to lowercase, drop invalid/empty domains
- We generate:
    edges_<suffix>.json
    edge_users_<suffix>.json
    user_edges_<suffix>/<userId>.json
    node_stats_<suffix>.json
"""

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd


DOMAIN_RE = re.compile(r"^[a-z0-9-]+(\.[a-z0-9-]+)+$")

def normalize_domain(s: str | None) -> str | None:
    if s is None:
        return None
    s = str(s).strip().lower().strip(".")
    s = re.sub(r"\s+", "", s)
    s = re.sub(r"\.{2,}", ".", s)
    if not s or not DOMAIN_RE.match(s):
        return None
    return s

def iso_str(s: pd.Series) -> pd.Series:
    # s is datetime64[ns, UTC]
    return s.dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def load_sessions(csv_path: Path) -> pd.DataFrame:
    usecols = [
        "panelist_id",
        "full_domain",
        "start_time",
        "end_time",
        "total_active_seconds",
        "row_count",
    ]
    df = pd.read_csv(csv_path, usecols=usecols)

    # Coerce types
    df["panelist_id"] = pd.to_numeric(df["panelist_id"], errors="coerce").astype("Int64")
    df["total_active_seconds"] = pd.to_numeric(df["total_active_seconds"], errors="coerce")
    df["row_count"] = pd.to_numeric(df["row_count"], errors="coerce").fillna(0).astype(int)

    # Normalize domain and drop invalid
    df["full_domain"] = df["full_domain"].apply(normalize_domain)
    df = df.dropna(subset=["panelist_id", "full_domain"]).copy()

    # Parse times as UTC
    df["start_dt"] = pd.to_datetime(df["start_time"], errors="coerce", utc=True)
    df["end_dt"] = pd.to_datetime(df["end_time"], errors="coerce", utc=True)

    # Drop rows with missing start
    df = df.dropna(subset=["start_dt"]).copy()

    # Fix end_dt using total_active_seconds if needed
    # 1) If end_dt is NaT but total_active_seconds valid -> compute
    mask_missing_end = df["end_dt"].isna() & df["total_active_seconds"].notna()
    df.loc[mask_missing_end, "end_dt"] = df.loc[mask_missing_end, "start_dt"] + pd.to_timedelta(
        df.loc[mask_missing_end, "total_active_seconds"], unit="s"
    )

    # 2) If end_dt < start_dt and total_active_seconds valid -> recompute
    mask_bad_order = (df["end_dt"].notna()) & (df["end_dt"] < df["start_dt"]) & df["total_active_seconds"].notna()
    df.loc[mask_bad_order, "end_dt"] = df.loc[mask_bad_order, "start_dt"] + pd.to_timedelta(
        df.loc[mask_bad_order, "total_active_seconds"], unit="s"
    )

    # 3) If total_active_seconds is NaN but we have both times -> derive
    mask_missing_dur = df["total_active_seconds"].isna() & df["end_dt"].notna()
    df.loc[mask_missing_dur, "total_active_seconds"] = (
        (df.loc[mask_missing_dur, "end_dt"] - df.loc[mask_missing_dur, "start_dt"]).dt.total_seconds().clip(lower=0)
    )

    # Remove rows that still have invalid end_dt
    df = df.dropna(subset=["end_dt"]).copy()

    # Sort by user, then start time
    df = df.sort_values(["panelist_id", "start_dt"], kind="mergesort").reset_index(drop=True)

    # Keep canonical ISO strings for any downstream inspection (not required for outputs)
    df["start_time_iso"] = iso_str(df["start_dt"])
    df["end_time_iso"] = iso_str(df["end_dt"])

    return df

def build_user_edges(sessions: pd.DataFrame) -> Dict[int, List[Tuple[str, str]]]:
    user_edges: Dict[int, List[Tuple[str, str]]] = {}
    for uid, g in sessions.groupby("panelist_id", sort=True):
        domains = g["full_domain"].tolist()
        edges: List[Tuple[str, str]] = []
        prev: str | None = None
        for d in domains:
            if prev is not None and d != prev:
                edges.append((prev, d))
            prev = d
        user_edges[int(uid)] = edges
    return user_edges

def aggregate_edges(user_edges: Dict[int, List[Tuple[str, str]]]) -> Tuple[List[Dict], Dict[str, List[int]]]:
    edge_to_users: Dict[Tuple[str, str], set] = {}
    for uid, edges in user_edges.items():
        for (o, t) in edges:
            # domains already normalized; skip self-loops just to reduce noise
            if not o or not t or o == t:
                continue
            edge_to_users.setdefault((o, t), set()).add(uid)

    edges_list: List[Dict] = []
    edge_users_map: Dict[str, List[int]] = {}

    # Stable sort by num_users desc, then alpha
    sorted_items = sorted(edge_to_users.items(), key=lambda kv: (-len(kv[1]), kv[0][0], kv[0][1]))
    for i, ((o, t), users) in enumerate(sorted_items, start=1):
        edges_list.append({
            "id": i,
            "origin": o,
            "target": t,
            "num_users": len(users)
        })
        edge_users_map[f"{o}|{t}"] = sorted(int(u) for u in users)

    return edges_list, edge_users_map

def build_node_stats(sessions: pd.DataFrame) -> Dict:
    # Domain-level totals
    grp = sessions.groupby("full_domain", as_index=False).agg(
        visit_count=("full_domain", "size"),
        total_time_spent=("total_active_seconds", "sum"),
    )
    grp["avg_time_per_visit"] = grp["total_time_spent"] / grp["visit_count"]

    stats_map = {
        row["full_domain"]: {
            "visit_count": int(row["visit_count"]),
            "total_time_spent": float(row["total_time_spent"]),
            "avg_time_per_visit": float(row["avg_time_per_visit"]),
        }
        for _, row in grp.iterrows()
    }
    # Same map for by_origin/by_target (you can split later if you change logic)
    return {
        "by_origin": stats_map,
        "by_target": stats_map
    }

def main():
    ap = argparse.ArgumentParser(description="Generate static JSON artifacts from session-collapsed CSV.")
    ap.add_argument("--sessions_csv", required=True, help="Path to output_collapsed_iso_sorted.csv")
    ap.add_argument("--out_dir", default="public/jsons", help="Directory to write JSON files")
    ap.add_argument("--suffix", default="uALL", help="Filename suffix (e.g., u0_7)")
    args = ap.parse_args()

    sessions_csv = Path(args.sessions_csv)
    out_dir = Path(args.out_dir)
    suffix = args.suffix

    out_dir.mkdir(parents=True, exist_ok=True)
    user_edges_dir = out_dir / f"user_edges_{suffix}"
    user_edges_dir.mkdir(parents=True, exist_ok=True)

    print("• Loading sessions…")
    sessions = load_sessions(sessions_csv)
    if sessions.empty:
        raise SystemExit("No valid sessions after cleaning.")

    print("• Building per-user edges…")
    user_edges = build_user_edges(sessions)

    print("• Aggregating edges across users…")
    edges_list, edge_users_map = aggregate_edges(user_edges)

    print("• Computing node stats…")
    node_stats = build_node_stats(sessions)

    # --- Write files ---
    edges_file = out_dir / f"edges_{suffix}.json"
    edge_users_file = out_dir / f"edge_users_{suffix}.json"
    node_stats_file = out_dir / f"node_stats_{suffix}.json"

    print(f"• Writing {edges_file.name}")
    with edges_file.open("w", encoding="utf-8") as f:
        json.dump({"results_count": len(edges_list), "results": edges_list}, f, ensure_ascii=False)

    print(f"• Writing {edge_users_file.name}")
    with edge_users_file.open("w", encoding="utf-8") as f:
        json.dump(edge_users_map, f, ensure_ascii=False)

    print(f"• Writing per-user edge sequences -> {user_edges_dir}/<user>.json")
    for uid, edges in user_edges.items():
        rows = [{
            "id": i + 1,
            "origin": o,
            "target": t,
            "num_users": 1
        } for i, (o, t) in enumerate(edges)]
        with (user_edges_dir / f"{uid}.json").open("w", encoding="utf-8") as f:
            json.dump({"results_count": len(rows), "results": rows}, f, ensure_ascii=False)

    print(f"• Writing {node_stats_file.name}")
    with node_stats_file.open("w", encoding="utf-8") as f:
        json.dump(node_stats, f, ensure_ascii=False)

    # Optional: quick summary
    uids = sorted({int(u) for u in sessions["panelist_id"].dropna().unique()})
    print(f"✓ Done. Users: {uids} | Domains: {sessions['full_domain'].nunique()} | Edges: {len(edges_list)}")
    print(f"   Output dir: {out_dir}")

if __name__ == "__main__":
    main()
