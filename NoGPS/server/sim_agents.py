"""Scripted demo content: a walking dummy unit and placeholder findings.

Kept clearly separate from real tracker state in app.py, and rendered in its
own "Simulation" section on the dashboard — never mixed into the live tiles.
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass


@dataclass
class Waypoint:
    x: float
    y: float


GUIDE_LOOP = [
    Waypoint(2, 2),
    Waypoint(2, 14),
    Waypoint(10, 14),
    Waypoint(10, 2),
    Waypoint(2, 2),
]


def _polyline_point(path: list[Waypoint], t: float, speed: float) -> tuple[float, float, float]:
    segs = []
    total = 0.0
    for a, b in zip(path, path[1:]):
        length = math.hypot(b.x - a.x, b.y - a.y) + 1e-6
        segs.append((a, b, length))
        total += length
    dist = (t * speed) % total
    acc = 0.0
    for a, b, length in segs:
        if acc + length >= dist:
            u = (dist - acc) / length
            return a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, math.atan2(b.x - a.x, b.y - a.y)
        acc += length
    last = path[-1]
    return last.x, last.y, 0.0


def sim_unit(now: float | None = None) -> dict:
    t = now if now is not None else time.time()
    x, y, yaw = _polyline_point(GUIDE_LOOP, t, speed=0.9)
    return {
        "id": "sim-guide",
        "name": "sim-guide",
        "source": "sim",
        "color": "#c084fc",
        "pose": {"t": t * 1000, "x": x, "y": y, "z": 0.0, "yaw": yaw},
        "path": [],
        "kfCount": 0,
        "fps": 12,
        "latencyMs": 6,
        "heading": (math.degrees(yaw) + 360) % 360,
        "snapshot": None,
        "lastSeen": t * 1000,
        "floor": 1,
    }


def sim_findings(now: float | None = None) -> list[dict]:
    t = now if now is not None else time.time()
    return [
        {
            "id": "sim-blocked",
            "kind": "blocked",
            "label": "blocked route",
            "confidence": 0.97,
            "x": 12.0,
            "y": 18.0,
            "z": 0.0,
            "seenBy": "facilities",
            "seenCount": 1,
            "distanceM": 9.0,
            "assignedTo": "front desk",
            "t": t * 1000,
        },
        {
            "id": "sim-hazard",
            "kind": "hazard",
            "label": "hazard",
            "confidence": 0.96,
            "x": 16.0,
            "y": 12.0,
            "z": 0.0,
            "seenBy": "facilities",
            "seenCount": 1,
            "distanceM": 8.0,
            "assignedTo": "front desk",
            "t": t * 1000,
        },
    ]
