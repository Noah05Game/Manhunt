import Peer, { type DataConnection } from "peerjs";
import { peerIdFor } from "./protocol";
import type { ClientMsg, HostMsg } from "./protocol";

type Handler = (...args: any[]) => void;

class Emitter {
  private map = new Map<string, Set<Handler>>();
  on(ev: string, fn: Handler) {
    (this.map.get(ev) ?? this.map.set(ev, new Set()).get(ev)!).add(fn);
    return () => this.off(ev, fn);
  }
  off(ev: string, fn: Handler) {
    this.map.get(ev)?.delete(fn);
  }
  emit(ev: string, ...args: any[]) {
    this.map.get(ev)?.forEach((fn) => fn(...args));
  }
}

// Optional free STUN. For symmetric NATs a TURN server is required; supply one
// via VITE_TURN_URL / VITE_TURN_USER / VITE_TURN_CRED if you have one.
const iceServers: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];
const turnUrl = import.meta.env.VITE_TURN_URL;
if (turnUrl) {
  iceServers.push({
    urls: turnUrl,
    username: import.meta.env.VITE_TURN_USER,
    credential: import.meta.env.VITE_TURN_CRED,
  });
}

const peerConfig = { config: { iceServers }, debug: 1 } as const;

/** HOST: owns a stable id derived from the room code + generation. */
export class HostNet extends Emitter {
  peer: Peer;
  conns = new Map<string, DataConnection>();
  ready = false;

  constructor(public code: string, public gen: number) {
    super();
    this.peer = new Peer(peerIdFor(code, gen), peerConfig);
    this.peer.on("open", () => {
      this.ready = true;
      this.emit("ready");
    });
    this.peer.on("connection", (conn) => this.attach(conn));
    this.peer.on("error", (err) => this.emit("error", err));
    this.peer.on("disconnected", () => {
      // try to reconnect to the broker (does not affect existing data channels)
      if (!this.peer.destroyed) this.peer.reconnect();
    });
  }

  private attach(conn: DataConnection) {
    conn.on("open", () => {
      this.conns.set(conn.peer, conn);
      this.emit("client-open", conn.peer);
    });
    conn.on("data", (data) => this.emit("msg", conn.peer, data as ClientMsg));
    conn.on("close", () => {
      this.conns.delete(conn.peer);
      this.emit("client-close", conn.peer);
    });
    conn.on("error", () => {
      this.conns.delete(conn.peer);
      this.emit("client-close", conn.peer);
    });
  }

  send(to: string, msg: HostMsg) {
    const c = this.conns.get(to);
    if (c && c.open) c.send(msg);
  }

  broadcast(msg: HostMsg) {
    for (const c of this.conns.values()) if (c.open) c.send(msg);
  }

  kick(id: string) {
    this.send(id, { t: "kicked" });
    setTimeout(() => this.conns.get(id)?.close(), 120);
  }

  destroy() {
    try {
      this.peer.destroy();
    } catch {
      /* noop */
    }
  }
}

/** CLIENT: connects to the host's derived id. */
export class ClientNet extends Emitter {
  peer: Peer;
  conn: DataConnection | null = null;
  closed = false;

  constructor(public code: string, public gen: number) {
    super();
    this.peer = new Peer(peerConfig);
    this.peer.on("open", () => this.connect());
    this.peer.on("error", (err) => this.emit("error", err));
    this.peer.on("disconnected", () => {
      if (!this.peer.destroyed && !this.closed) this.peer.reconnect();
    });
  }

  get myId() {
    return this.peer.id;
  }

  private connect() {
    const conn = this.peer.connect(peerIdFor(this.code, this.gen), { reliable: true });
    this.conn = conn;
    conn.on("open", () => this.emit("open"));
    conn.on("data", (data) => this.emit("msg", data as HostMsg));
    conn.on("close", () => this.emit("host-close"));
    conn.on("error", (err) => this.emit("conn-error", err));
  }

  /** Re-point at a new host generation after migration. */
  retarget(gen: number) {
    this.gen = gen;
    try {
      this.conn?.close();
    } catch {
      /* noop */
    }
    this.connect();
  }

  send(msg: ClientMsg) {
    if (this.conn && this.conn.open) this.conn.send(msg);
  }

  destroy() {
    this.closed = true;
    try {
      this.peer.destroy();
    } catch {
      /* noop */
    }
  }
}
