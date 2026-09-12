export type AgentSource = "real" | "sim" | "replay";

export type FindingKind = "casualty" | "hazard" | "blocked";

export interface Pose {
  t: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface Responder {
  id: string;
  name: string;
  source: AgentSource;
  color: string;
  pose: Pose;
  path: Pose[];
  kfCount: number;
  fps: number;
  latencyMs: number;
  heading: number;
  snapshot: string | null;
  lastSeen: number;
  floor: number;
}

export interface Beacon {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  kind: "exit" | "rally" | "custom";
}

export interface Finding {
  id: string;
  kind: FindingKind;
  label: string;
  confidence: number;
  x: number;
  y: number;
  z: number;
  seenBy: string;
  seenCount: number;
  distanceM: number;
  assignedTo: string;
  t: number;
}

export interface PathSummary {
  id: string;
  label: string;
  color: string;
  floor: number;
  createdAt: number;
  points: number;
  polyline: { x: number; y: number }[];
  demo?: boolean;
}

export interface PathWaypointInput {
  x: number;
  y: number;
  z: number;
  yaw: number;
  embedding: number[] | null;
  thumb: string | null;
}

export interface RouteLeg {
  bearingDeg: number;
  distanceM: number;
}

export interface PathMatch {
  pathId: string;
  label: string;
  color: string;
  confidence: number;
  bearingOffsetDeg: number;
  route: RouteLeg[];
}

export interface IncidentState {
  responders: Responder[];
  beacons: Beacon[];
  findings: Finding[];
  paths: PathSummary[];
  serverTime: number;
  fps: number;
}

export type FilterMode = "all" | "real" | "sim";

export type ClientMessage =
  | { type: "join"; role: "tracker" | "dashboard"; id: string; name: string; source: AgentSource }
  | { type: "pose"; id: string; pose: Pose; kfCount: number; fps: number; latencyMs: number; heading: number }
  | { type: "snapshot"; id: string; jpeg: string }
  | { type: "finding"; finding: Omit<Finding, "id" | "t" | "distanceM"> }
  | { type: "beacon"; beacon: Omit<Beacon, "id"> }
  | { type: "calibrate"; id: string; meters: number }
  | { type: "reset"; id: string }
  | { type: "path_start"; id: string; floor: number; label: string; color: string }
  | { type: "path_point"; id: string; waypoint: PathWaypointInput }
  | { type: "path_finish"; id: string }
  | { type: "path_cancel"; id: string }
  | { type: "match_query"; id: string; floor: number; embedding: number[] };

export type ServerMessage =
  | { type: "welcome"; id: string; state: IncidentState; lanUrl: string }
  | { type: "state"; state: IncidentState }
  | { type: "match"; matches: PathMatch[] }
  | { type: "pong"; t: number };
