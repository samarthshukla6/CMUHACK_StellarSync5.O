import type { ClientMessage, IncidentState, PathMatch, ServerMessage } from "./types";

export type BusHandlers = {
  onState?: (state: IncidentState) => void;
  onWelcome?: (id: string, state: IncidentState, lanUrl: string) => void;
  onMatch?: (matches: PathMatch[]) => void;
  onClose?: () => void;
};

export class IncidentBus {
  private ws: WebSocket | null = null;
  handlers: BusHandlers;
  private queue: ClientMessage[] = [];
  private reconnectTimer = 0;
  private closed = false;

  constructor(handlers: BusHandlers = {}) {
    this.handlers = handlers;
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect(): void {
    this.closed = false;
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${location.host}/ws`;
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onopen = () => {
      for (const msg of this.queue) ws.send(JSON.stringify(msg));
      this.queue = [];
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(String(ev.data)) as ServerMessage;
      if (msg.type === "welcome") this.handlers.onWelcome?.(msg.id, msg.state, msg.lanUrl);
      if (msg.type === "state") this.handlers.onState?.(msg.state);
      if (msg.type === "match") this.handlers.onMatch?.(msg.matches);
    };
    ws.onclose = () => {
      this.handlers.onClose?.();
      if (!this.closed) {
        this.reconnectTimer = window.setTimeout(() => this.connect(), 800);
      }
    };
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.queue.push(msg);
    }
  }

  close(): void {
    this.closed = true;
    window.clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}

export async function fetchLanUrl(): Promise<string> {
  try {
    const res = await fetch("/api/info");
    const data = (await res.json()) as { lanUrl: string };
    return data.lanUrl;
  } catch {
    return location.origin;
  }
}
