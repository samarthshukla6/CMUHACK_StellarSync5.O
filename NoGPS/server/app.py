from __future__ import annotations

import asyncio
import json
import socket
import time
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

import store
from sim_agents import sim_findings, sim_unit

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "web" / "dist"

app = FastAPI(title="NoGPS")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

responders: dict[str, dict[str, Any]] = {}
beacons: list[dict[str, Any]] = [
    {"id": "b-exit", "name": "beacon 1", "x": 0.0, "y": 18.0, "z": 0.0, "kind": "exit"}
]
findings: list[dict[str, Any]] = []
clients: set[WebSocket] = set()
# tracker id -> path being recorded right now (label/color/floor chosen up front,
# waypoints appended live); committed to the store on path_finish.
recordings: dict[str, dict[str, Any]] = {}
# Cached path summaries — snapshot_state() runs on every broadcast tick (~8Hz),
# so it reads this instead of hitting SQLite every time; refreshed only when a
# recording is actually saved.
paths_cache: list[dict[str, Any]] = []
# Trail for the scripted demo walker — kept separate from real responder
# paths so "simulation" never gets mixed into live tracker state.
sim_trail: list[dict[str, float]] = []


def lan_ip() -> str:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


def lan_url() -> str:
    return f"https://{lan_ip()}:8443"


def snapshot_state() -> dict[str, Any]:
    units = list(responders.values())
    guide = sim_unit()
    pose = guide["pose"]
    if not sim_trail or abs(sim_trail[-1]["x"] - pose["x"]) + abs(sim_trail[-1]["y"] - pose["y"]) > 0.15:
        sim_trail.append({**pose})
        if len(sim_trail) > 240:
            del sim_trail[0 : len(sim_trail) - 240]
    guide["path"] = sim_trail
    units.append(guide)

    shown = findings if findings else sim_findings()
    for item in shown:
        item["distanceM"] = ((item["x"]) ** 2 + (item["y"]) ** 2) ** 0.5
    return {
        "responders": units,
        "beacons": beacons,
        "findings": shown,
        "paths": paths_cache,
        "serverTime": time.time() * 1000,
        "fps": 22,
    }


async def broadcast() -> None:
    payload = json.dumps({"type": "state", "state": snapshot_state()})
    dead: list[WebSocket] = []
    for ws in list(clients):
        try:
            await ws.send_text(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        clients.discard(ws)


@app.get("/api/info")
def info() -> dict[str, str]:
    return {"lanUrl": lan_url(), "ip": lan_ip()}


@app.websocket("/ws")
async def ws_hub(ws: WebSocket) -> None:
    await ws.accept()
    clients.add(ws)
    await ws.send_text(
        json.dumps({"type": "welcome", "id": str(uuid.uuid4())[:8], "state": snapshot_state(), "lanUrl": lan_url()})
    )
    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            kind = msg.get("type")
            if kind == "join" and msg.get("role") == "tracker":
                responders[msg["id"]] = {
                    "id": msg["id"],
                    "name": msg.get("name", "spot"),
                    "source": msg.get("source", "real"),
                    "color": "#4ea6ff" if msg.get("source") != "replay" else "#5ee9a0",
                    "pose": {"t": 0, "x": 0, "y": 0, "z": 0, "yaw": 0},
                    "path": [],
                    "kfCount": 0,
                    "fps": 0,
                    "latencyMs": 0,
                    "heading": 0,
                    "snapshot": None,
                    "lastSeen": time.time() * 1000,
                    "floor": 1,
                }
            elif kind == "pose":
                unit = responders.get(msg["id"])
                if not unit:
                    responders[msg["id"]] = {
                        "id": msg["id"],
                        "name": msg.get("name", "phone"),
                        "source": "real",
                        "color": "#4ea6ff",
                        "pose": msg["pose"],
                        "path": [],
                        "kfCount": 0,
                        "fps": 0,
                        "latencyMs": 0,
                        "heading": 0,
                        "snapshot": None,
                        "lastSeen": time.time() * 1000,
                        "floor": 1,
                    }
                    unit = responders[msg["id"]]
                if unit:
                    pose = msg["pose"]
                    unit["pose"] = pose
                    unit["kfCount"] = msg.get("kfCount", unit["kfCount"])
                    unit["fps"] = msg.get("fps", 0)
                    unit["latencyMs"] = msg.get("latencyMs", 0)
                    unit["heading"] = msg.get("heading", 0)
                    unit["lastSeen"] = time.time() * 1000
                    path = unit["path"]
                    if not path or abs(path[-1]["x"] - pose["x"]) + abs(path[-1]["y"] - pose["y"]) > 0.12:
                        path.append(pose)
                        if len(path) > 400:
                            del path[0 : len(path) - 400]
            elif kind == "snapshot":
                unit = responders.get(msg["id"])
                if unit:
                    unit["snapshot"] = msg.get("jpeg")
            elif kind == "finding":
                item = dict(msg["finding"])
                item["id"] = f"f-{uuid.uuid4().hex[:6]}"
                item["t"] = time.time() * 1000
                item["distanceM"] = (item.get("x", 0) ** 2 + item.get("y", 0) ** 2) ** 0.5
                findings.append(item)
            elif kind == "beacon":
                item = dict(msg["beacon"])
                item["id"] = f"b-{uuid.uuid4().hex[:6]}"
                beacons.append(item)
            elif kind == "reset":
                unit = responders.get(msg["id"])
                if unit:
                    unit["path"] = []
                    unit["pose"] = {"t": 0, "x": 0, "y": 0, "z": 0, "yaw": 0}
            elif kind == "path_start":
                recordings[msg["id"]] = {
                    "label": msg["label"].strip()[:64] or "Untitled path",
                    "color": msg["color"],
                    "floor": msg.get("floor", 1),
                    "waypoints": [],
                }
            elif kind == "path_point":
                rec = recordings.get(msg["id"])
                if rec:
                    rec["waypoints"].append(msg["waypoint"])
            elif kind == "path_finish":
                rec = recordings.pop(msg["id"], None)
                if rec and rec["waypoints"]:
                    await asyncio.to_thread(store.create_path, rec["label"], rec["color"], rec["floor"], rec["waypoints"])
                    paths_cache[:] = await asyncio.to_thread(store.list_paths)
            elif kind == "path_cancel":
                recordings.pop(msg["id"], None)
            elif kind == "match_query":
                matches = await asyncio.to_thread(store.match_embedding, msg.get("floor", 1), msg["embedding"])
                await ws.send_text(json.dumps({"type": "match", "matches": matches}))
                continue
            await broadcast()
    except WebSocketDisconnect:
        pass
    finally:
        clients.discard(ws)


async def sim_tick() -> None:
    while True:
        await asyncio.sleep(0.12)
        if clients:
            await broadcast()


@app.on_event("startup")
async def startup() -> None:
    store.init_db()
    paths_cache[:] = store.list_paths()
    asyncio.create_task(sim_tick())


if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/")
    def landing() -> FileResponse:
        return FileResponse(DIST / "index.html")

    @app.get("/track.html")
    def track() -> FileResponse:
        return FileResponse(DIST / "track.html")

    @app.get("/dashboard.html")
    def dashboard() -> FileResponse:
        return FileResponse(DIST / "dashboard.html")
