"""SQLite-backed storage for recorded paths — the building's long-term memory.

A path is a named, coloured walk (e.g. "Path to Radiology") saved as an ordered
list of waypoints. Each waypoint carries a pose and, when recorded from a real
camera, a visual embedding used later for recognition (see match_embedding).
"""

from __future__ import annotations

import json
import math
import sqlite3
import time
import uuid
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent / "data" / "nogps.db"

# Cosine-similarity floor before a stored waypoint counts as "recognised".
# Mobilenet embeddings of unrelated indoor scenes still cluster fairly high,
# so this needs field-tuning against real hallway footage, not just guessed.
MATCH_THRESHOLD = 0.55


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    conn = _connect()
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS paths (
                id TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                color TEXT NOT NULL,
                floor INTEGER NOT NULL,
                created_at REAL NOT NULL,
                demo INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS waypoints (
                path_id TEXT NOT NULL,
                seq INTEGER NOT NULL,
                x REAL NOT NULL,
                y REAL NOT NULL,
                z REAL NOT NULL,
                yaw REAL NOT NULL,
                embedding TEXT,
                thumb TEXT,
                PRIMARY KEY (path_id, seq)
            );
            """
        )
        conn.commit()
        seed_demo_path(conn)
    finally:
        conn.close()


def seed_demo_path(conn: sqlite3.Connection) -> None:
    (count,) = conn.execute("SELECT COUNT(*) FROM paths").fetchone()
    if count:
        return
    waypoints = [
        {"x": 0.0, "y": y, "z": 0.0, "yaw": 0.0, "embedding": None, "thumb": None}
        for y in range(0, 13, 2)
    ] + [
        {"x": x, "y": 12.0, "z": 0.0, "yaw": math.pi / 2, "embedding": None, "thumb": None}
        for x in (1.0, 2.5, 4.0)
    ]
    _insert_path(conn, "demo-radiology", "Radiology", "#2dd4bf", 1, waypoints, demo=True)
    conn.commit()


def _insert_path(
    conn: sqlite3.Connection,
    path_id: str,
    label: str,
    color: str,
    floor: int,
    waypoints: list[dict[str, Any]],
    demo: bool = False,
) -> None:
    conn.execute(
        "INSERT INTO paths (id, label, color, floor, created_at, demo) VALUES (?, ?, ?, ?, ?, ?)",
        (path_id, label, color, floor, time.time() * 1000, int(demo)),
    )
    conn.executemany(
        "INSERT INTO waypoints (path_id, seq, x, y, z, yaw, embedding, thumb) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
            (
                path_id,
                seq,
                wp["x"],
                wp["y"],
                wp["z"],
                wp["yaw"],
                json.dumps(wp["embedding"]) if wp.get("embedding") else None,
                wp.get("thumb"),
            )
            for seq, wp in enumerate(waypoints)
        ],
    )


def create_path(label: str, color: str, floor: int, waypoints: list[dict[str, Any]]) -> str:
    if not waypoints:
        raise ValueError("cannot save an empty path")
    path_id = f"path-{uuid.uuid4().hex[:8]}"
    conn = _connect()
    try:
        _insert_path(conn, path_id, label, color, floor, waypoints)
        conn.commit()
    finally:
        conn.close()
    return path_id


def list_paths(floor: int | None = None) -> list[dict[str, Any]]:
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT id, label, color, floor, created_at, demo FROM paths"
            + (" WHERE floor = ?" if floor is not None else "")
            + " ORDER BY created_at DESC",
            (floor,) if floor is not None else (),
        ).fetchall()
        summaries = []
        for path_id, label, color, path_floor, created_at, demo in rows:
            pts = conn.execute(
                "SELECT x, y FROM waypoints WHERE path_id = ? ORDER BY seq", (path_id,)
            ).fetchall()
            summaries.append(
                {
                    "id": path_id,
                    "label": label,
                    "color": color,
                    "floor": path_floor,
                    "createdAt": created_at,
                    "points": len(pts),
                    "polyline": [{"x": x, "y": y} for x, y in pts],
                    "demo": bool(demo),
                }
            )
        return summaries
    finally:
        conn.close()


def _cosine(a: list[float], b: list[float]) -> float:
    n = min(len(a), len(b))
    if not n:
        return 0.0
    dot = sum(a[i] * b[i] for i in range(n))
    na = math.sqrt(sum(v * v for v in a)) or 1.0
    nb = math.sqrt(sum(v * v for v in b)) or 1.0
    return dot / (na * nb)


ROUTE_LEGS = 8


def match_embedding(floor: int, embedding: list[float], top_k: int = 3) -> list[dict[str, Any]]:
    """Find which recorded paths this floor's live view most resembles.

    Returns, per candidate path, a confidence score and a turn-by-turn
    *relative* route: the sequence of turns and leg lengths the original
    recorder walked from a similarly-framed waypoint onward. It's relative
    (not a point on a shared map) because two phones never share a
    dead-reckoning origin — but chained turn-by-turn, it traces the actual
    corners of the recorded walk instead of one straight-line guess.
    """
    conn = _connect()
    try:
        paths = conn.execute(
            "SELECT id, label, color FROM paths WHERE floor = ? AND demo = 0", (floor,)
        ).fetchall()
        best: list[dict[str, Any]] = []
        for path_id, label, color in paths:
            rows = conn.execute(
                "SELECT seq, x, y, yaw, embedding FROM waypoints WHERE path_id = ? ORDER BY seq", (path_id,)
            ).fetchall()
            if not rows:
                continue
            top_idx, top_score = -1, -1.0
            for i, (_seq, _x, _y, _yaw, emb_json) in enumerate(rows):
                if not emb_json:
                    continue
                score = _cosine(embedding, json.loads(emb_json))
                if score > top_score:
                    top_score, top_idx = score, i
            if top_idx < 0 or top_score < MATCH_THRESHOLD:
                continue
            route = _build_route(rows, top_idx)
            if not route:
                continue
            best.append(
                {
                    "pathId": path_id,
                    "label": label,
                    "color": color,
                    "confidence": round(top_score, 3),
                    "bearingOffsetDeg": route[0]["bearingDeg"],
                    "route": route,
                }
            )
        best.sort(key=lambda m: m["confidence"], reverse=True)
        return best[:top_k]
    finally:
        conn.close()


def _build_route(rows: list[tuple], start_idx: int) -> list[dict[str, float]]:
    """Turn the recorded waypoints after start_idx into relative turn+distance legs."""
    heading = rows[start_idx][3]
    prev_x, prev_y = rows[start_idx][1], rows[start_idx][2]
    route: list[dict[str, float]] = []
    for i in range(start_idx + 1, min(len(rows), start_idx + 1 + ROUTE_LEGS)):
        _seq, x, y, _yaw, _emb = rows[i]
        dist = math.hypot(x - prev_x, y - prev_y)
        if dist < 0.15:
            continue
        leg_heading = math.atan2(x - prev_x, y - prev_y)
        route.append(
            {
                "bearingDeg": round(math.degrees(_wrap_angle(leg_heading - heading)), 1),
                "distanceM": round(min(dist, 2.4), 2),
            }
        )
        heading = leg_heading
        prev_x, prev_y = x, y
    return route


def _wrap_angle(rad: float) -> float:
    while rad > math.pi:
        rad -= 2 * math.pi
    while rad < -math.pi:
        rad += 2 * math.pi
    return rad
