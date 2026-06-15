import { Emitter, watchPosition } from "../util/emitter";
import { HostNet, ClientNet } from "../net/peer";
import type { ClientMsg, HostMsg } from "../net/protocol";
import { distance, bearing, plausibleMove } from "./geo";
import { makeToken } from "./qr";
import {
  CATCH_RANGE_M,
  DEFAULT_SETTINGS,
  POS_SEND_MS,
  TOKEN_ROTATE_MS,
  type GameSettings,
  type LatLng,
  type Player,
  type Role,
  type RoomState,
  type TimelineEvent,
} from "../types";

export interface GameEngine extends Emitter {
  readonly isHost: boolean;
  myId: string;
  state: RoomState;
  me(): Player | undefined;
  currentToken(): string | null;
  setReady(v: boolean): void;
  requestPing(): void;
  attemptCatch(hiderId: string, token: string): void;
  // host-only (no-ops on client)
  assign(id: string, role: Role): void;
  kick(id: string): void;
  start(): void;
  updateSettings(s: Partial<GameSettings>): void;
  destroy(): void;
}

function newPlayer(id: string, name: string, color: string, isHost = false): Player {
  return {
    id,
    name,
    color,
    isHost,
    role: "hider",
    ready: isHost,
    alive: true,
    foundAt: null,
    lat: null,
    lng: null,
    acc: null,
    lastSeen: Date.now(),
    outSince: null,
  };
}

// ════════════════════════════════════════════════════════════
//  HOST
// ════════════════════════════════════════════════════════════
export class HostEngine extends Emitter implements GameEngine {
  readonly isHost = true;
  myId: string;
  state: RoomState;
  private net: HostNet;
  private stopGeo: () => void = () => {};
  private tick = 0;
  private tokens = new Map<string, { cur: string; prev: string }>();
  private lastPingAt = 0;
  private lastCatchBy = new Map<string, number>();
  private timers: number[] = [];

  constructor(code: string, name: string, color: string, gen = 0, seed?: RoomState) {
    super();
    this.myId = "__host__"; // replaced with real peer id once net is ready
    this.net = new HostNet(code, gen);

    if (seed) {
      this.state = { ...seed, gen, code };
    } else {
      this.state = {
        code,
        gen,
        hostId: "",
        center: null,
        settings: { ...DEFAULT_SETTINGS },
        phase: "lobby",
        startedAt: null,
        endsAt: null,
        radius: DEFAULT_SETTINGS.maxRadius,
        players: {},
        result: null,
      };
    }

    this.net.on("ready", () => {
      this.myId = this.net.peer.id;
      this.state.hostId = this.myId;
      if (!seed) {
        this.state.players[this.myId] = newPlayer(this.myId, name, color, true);
      }
      this.emit("ready");
      this.broadcastState();
    });

    this.net.on("error", (e: any) => this.emit("net-error", e));
    this.net.on("msg", (from: string, msg: ClientMsg) => this.onClient(from, msg));
    this.net.on("client-open", (id: string) => {
      // (re)connection — send a welcome once they say hello
      this.emit("update");
    });
    this.net.on("client-close", (id: string) => {
      const p = this.state.players[id];
      if (!p) return;
      if (this.state.phase === "lobby") delete this.state.players[id];
      else p.lastSeen = Date.now(); // keep in roster; may reconnect
      this.broadcastState();
      this.emit("update");
    });

    this.stopGeo = watchPosition(
      (lat, lng, acc) => this.onHostPos(lat, lng, acc),
      () => this.emit("geo-error")
    );

    this.timers.push(window.setInterval(() => this.loop(), 500));
    this.timers.push(window.setInterval(() => this.rotateTokens(), TOKEN_ROTATE_MS));
  }

  static migrate(state: RoomState, myId: string, name: string, color: string): HostEngine {
    const seed: RoomState = JSON.parse(JSON.stringify(state));
    delete seed.players[seed.hostId]; // drop the lost host
    // promote me to host flag
    if (seed.players[myId]) seed.players[myId].isHost = true;
    return new HostEngine(state.code, name, color, state.gen + 1, seed);
  }

  me() {
    return this.state.players[this.myId];
  }

  private onHostPos(lat: number, lng: number, acc: number) {
    const p = this.state.players[this.myId];
    if (!p) return;
    p.lat = lat;
    p.lng = lng;
    p.acc = acc;
    p.lastSeen = Date.now();
    if (this.state.phase === "lobby") this.state.center = { lat, lng };
  }

  private onClient(from: string, msg: ClientMsg) {
    const now = Date.now();
    switch (msg.t) {
      case "hello": {
        const existing = this.state.players[from];
        if (existing) {
          existing.name = msg.name;
          existing.color = msg.color;
          existing.lastSeen = now;
        } else if (this.state.phase === "lobby") {
          this.state.players[from] = newPlayer(from, msg.name, msg.color);
        } else {
          // rejoin mid-game only if previously known
        }
        this.net.send(from, { t: "welcome", youId: from, state: this.state });
        this.broadcastState();
        this.emit("update");
        break;
      }
      case "pos": {
        const p = this.state.players[from];
        if (!p || !p.alive) break;
        const prev = p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null;
        const next: LatLng = { lat: msg.lat, lng: msg.lng };
        if (plausibleMove(prev, next, now - p.lastSeen, msg.acc)) {
          p.lat = msg.lat;
          p.lng = msg.lng;
          p.acc = msg.acc;
        }
        p.lastSeen = now;
        break;
      }
      case "ready": {
        const p = this.state.players[from];
        if (p) p.ready = msg.ready;
        this.broadcastState();
        this.emit("update");
        break;
      }
      case "pingReq":
        this.doPing(from);
        break;
      case "catch":
        this.doCatch(from, msg.hiderId, msg.token);
        break;
      case "bye":
        if (this.state.phase === "lobby") delete this.state.players[from];
        this.broadcastState();
        this.emit("update");
        break;
    }
  }

  // ── host controls ──
  assign(id: string, role: Role) {
    const p = this.state.players[id];
    if (p && this.state.phase === "lobby") {
      p.role = role;
      this.broadcastState();
      this.emit("update");
    }
  }

  kick(id: string) {
    if (id === this.myId) return;
    this.net.kick(id);
    delete this.state.players[id];
    this.broadcastState();
    this.emit("update");
  }

  updateSettings(s: Partial<GameSettings>) {
    Object.assign(this.state.settings, s);
    if (this.state.phase === "lobby") this.state.radius = this.state.settings.maxRadius;
    this.broadcastState();
    this.emit("update");
  }

  start() {
    if (this.state.phase !== "lobby") return;
    if (!this.state.center) {
      this.emit("toast", "Waiting for host GPS fix");
      return;
    }
    const ids = Object.keys(this.state.players);
    if (this.state.settings.autoAssign) this.autoAssign(ids);
    const now = Date.now();
    this.state.phase = "playing";
    this.state.startedAt = now;
    this.state.endsAt = now + this.state.settings.totalTime * 60_000;
    this.state.radius = this.state.settings.maxRadius;
    this.pushTimeline({ t: 0, kind: "start", text: "Game started" });
    this.broadcastState();
    this.emit("update");
  }

  private autoAssign(ids: string[]) {
    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    const n = Math.min(this.state.settings.numHunters, Math.max(1, ids.length - 1));
    shuffled.forEach((id, i) => {
      this.state.players[id].role = i < n ? "hunter" : "hider";
    });
  }

  // ── periodic loop ──
  private loop() {
    this.tick++;
    const s = this.state;
    if (s.phase === "playing" && s.center && s.startedAt) {
      const now = Date.now();
      const elapsedMin = (now - s.startedAt) / 60_000;

      // shrink
      if (s.settings.shrinking) {
        const target = Math.max(s.settings.minRadius, s.settings.maxRadius - s.settings.shrinkSpeed * elapsedMin);
        if (target < s.radius - 0.1) {
          if (Math.floor(s.radius / 25) !== Math.floor(target / 25)) {
            this.pushTimeline({ t: now - s.startedAt, kind: "shrink", text: `Zone ${Math.round(target)} m` });
          }
          s.radius = target;
        }
      }

      // out-of-zone enforcement
      for (const p of Object.values(s.players)) {
        if (!p.alive || p.foundAt != null || p.lat == null || p.lng == null) continue;
        const d = distance(s.center, { lat: p.lat, lng: p.lng });
        if (d > s.radius) {
          if (p.outSince == null) p.outSince = now;
          else if (now - p.outSince >= s.settings.outOfZoneTimer * 1000) {
            this.eliminate(p, "left the zone");
          }
        } else if (p.outSince != null) {
          p.outSince = null;
        }
      }

      // time up → hiders win
      if (s.endsAt && now >= s.endsAt) {
        this.endGame("hiders", "Time expired");
        return;
      }
      // all hiders caught → hunters win
      if (!this.anyHidersLeft()) {
        this.endGame("hunters", "All hiders found");
        return;
      }
    }
    // broadcast at ~2 Hz
    this.broadcastState();
    if (this.tick % 2 === 0) this.emit("update");
  }

  private anyHidersLeft(): boolean {
    return Object.values(this.state.players).some(
      (p) => p.role === "hider" && p.alive && p.foundAt == null
    );
  }

  private eliminate(p: Player, reason: string) {
    const s = this.state;
    p.foundAt = Date.now();
    if (s.settings.eliminateMode === "convert") {
      p.role = "hunter";
      p.outSince = null;
    } else {
      p.alive = false;
    }
    this.pushTimeline({
      t: Date.now() - (s.startedAt ?? Date.now()),
      kind: "zone",
      text: `${p.name} ${reason}`,
    });
    this.net.broadcast({ t: "caught", hiderId: p.id, byId: "zone" });
    this.emit("caught", { hiderId: p.id, byId: "zone" });
  }

  // ── pings ──
  private doPing(hunterId: string) {
    const now = Date.now();
    const hunter = this.state.players[hunterId];
    if (!hunter || hunter.role !== "hunter") return;
    if (now - this.lastPingAt < this.state.settings.pingInterval * 1000) {
      const wait = Math.ceil((this.state.settings.pingInterval * 1000 - (now - this.lastPingAt)) / 1000);
      this.net.send(hunterId, { t: "ping", bearing: null, dist: null, inRange: false });
      this.emitToHost(hunterId, `Ping recharging — ${wait}s`);
      return;
    }
    this.lastPingAt = now;
    if (hunter.lat == null || hunter.lng == null) return;
    const hPos = { lat: hunter.lat, lng: hunter.lng };

    let nearest: { p: Player; d: number } | null = null;
    for (const p of Object.values(this.state.players)) {
      if (p.role !== "hider" || !p.alive || p.foundAt != null || p.lat == null || p.lng == null) continue;
      const d = distance(hPos, { lat: p.lat, lng: p.lng });
      if (d <= this.state.settings.pingRange) {
        // notify the hider — they are being detected
        this.net.send(p.id, { t: "ping", bearing: null, dist: null, inRange: true });
        if (!nearest || d < nearest.d) nearest = { p, d };
      }
    }
    // directional hint to all hunters
    for (const h of Object.values(this.state.players)) {
      if (h.role !== "hunter" || h.lat == null || h.lng == null) continue;
      if (nearest) {
        const b = bearing({ lat: h.lat, lng: h.lng }, { lat: nearest.p.lat!, lng: nearest.p.lng! });
        const d = distance({ lat: h.lat, lng: h.lng }, { lat: nearest.p.lat!, lng: nearest.p.lng! });
        this.net.send(h.id, { t: "ping", bearing: b, dist: Math.round(d), inRange: true });
      } else {
        this.net.send(h.id, { t: "ping", bearing: null, dist: null, inRange: false });
      }
    }
    this.pushTimeline({ t: now - (this.state.startedAt ?? now), kind: "ping", text: `${hunter.name} pinged` });
    // local host feedback handled via 'ping' event if host is a hunter
    if (nearest && this.me()?.role === "hunter") {
      const meP = this.me()!;
      if (meP.lat != null && meP.lng != null) {
        const b = bearing({ lat: meP.lat, lng: meP.lng }, { lat: nearest.p.lat!, lng: nearest.p.lng! });
        this.emit("ping", { bearing: b, dist: Math.round(nearest.d), inRange: true });
      }
    } else if (this.me()?.role === "hider" && nearest?.p.id === this.myId) {
      this.emit("ping", { inRange: true });
    }
  }

  private emitToHost(id: string, text: string) {
    if (id === this.myId) this.emit("toast", text);
  }

  // ── catch ──
  private doCatch(hunterId: string, hiderId: string, token: string) {
    const now = Date.now();
    const hunter = this.state.players[hunterId];
    const hider = this.state.players[hiderId];
    if (!hunter || hunter.role !== "hunter" || !hunter.alive) return;
    if (!hider || hider.role !== "hider" || !hider.alive || hider.foundAt != null) {
      this.net.send(hunterId, { t: "ping", bearing: null, dist: null, inRange: false });
      this.emitToHost(hunterId, "Invalid target");
      return;
    }
    // anti-spam: 1.5s cooldown per hunter
    if (now - (this.lastCatchBy.get(hunterId) ?? 0) < 1500) return;
    this.lastCatchBy.set(hunterId, now);

    const tok = this.tokens.get(hiderId);
    if (!tok || (token !== tok.cur && token !== tok.prev)) {
      this.emitToHost(hunterId, "QR expired — rescan");
      this.net.send(hunterId, { t: "ping", bearing: null, dist: null, inRange: false });
      return;
    }
    if (hunter.lat == null || hunter.lng == null || hider.lat == null || hider.lng == null) return;
    const d = distance({ lat: hunter.lat, lng: hunter.lng }, { lat: hider.lat, lng: hider.lng });
    const slop = Math.min((hunter.acc ?? 0) + (hider.acc ?? 0), 15);
    if (d > CATCH_RANGE_M + slop) {
      this.emitToHost(hunterId, `Too far — ${Math.round(d)} m`);
      this.net.send(hunterId, { t: "ping", bearing: null, dist: null, inRange: false });
      return;
    }
    // valid catch → convert
    hider.foundAt = now;
    hider.role = "hunter";
    hider.outSince = null;
    this.pushTimeline({ t: now - (this.state.startedAt ?? now), kind: "caught", text: `${hunter.name} caught ${hider.name}` });
    this.net.broadcast({ t: "caught", hiderId, byId: hunterId });
    this.emit("caught", { hiderId, byId: hunterId });
    this.broadcastState();
    this.emit("update");
    if (!this.anyHidersLeft()) this.endGame("hunters", "All hiders found");
  }

  private rotateTokens() {
    if (this.state.phase !== "playing") return;
    for (const p of Object.values(this.state.players)) {
      if (p.role === "hider" && p.alive && p.foundAt == null) {
        const prev = this.tokens.get(p.id)?.cur ?? "";
        const cur = makeToken();
        this.tokens.set(p.id, { cur, prev });
        if (p.id === this.myId) this.emit("token", cur);
        else this.net.send(p.id, { t: "token", token: cur });
      }
    }
  }

  currentToken(): string | null {
    return this.tokens.get(this.myId)?.cur ?? null;
  }

  setReady(v: boolean) {
    const p = this.me();
    if (p) {
      p.ready = v;
      this.broadcastState();
      this.emit("update");
    }
  }

  requestPing() {
    this.doPing(this.myId);
  }

  attemptCatch(hiderId: string, token: string) {
    this.doCatch(this.myId, hiderId, token);
  }

  private endGame(winner: "hunters" | "hiders", reason: string) {
    const s = this.state;
    if (s.phase === "ended") return;
    s.phase = "ended";
    const foundOrder = Object.values(s.players)
      .filter((p) => p.foundAt != null)
      .sort((a, b) => (a.foundAt! - b.foundAt!))
      .map((p) => p.id);
    s.result = {
      winner,
      reason,
      foundOrder,
      timeline: this.timeline,
    };
    this.pushTimeline({ t: Date.now() - (s.startedAt ?? Date.now()), kind: "end", text: reason });
    this.net.broadcast({ t: "ended", state: s });
    this.emit("ended", s);
    this.emit("update");
  }

  private timeline: TimelineEvent[] = [];
  private pushTimeline(e: TimelineEvent) {
    this.timeline.push(e);
  }

  private broadcastState() {
    this.net.broadcast({ t: "state", state: this.state });
  }

  destroy() {
    this.timers.forEach((t) => clearInterval(t));
    this.stopGeo();
    this.net.destroy();
  }
}

// ════════════════════════════════════════════════════════════
//  CLIENT
// ════════════════════════════════════════════════════════════
export class ClientEngine extends Emitter implements GameEngine {
  readonly isHost = false;
  myId = "";
  state: RoomState;
  private net: ClientNet;
  private stopGeo: () => void = () => {};
  private token: string | null = null;
  private lastPosSend = 0;

  constructor(code: string, gen: number, private name: string, private color: string) {
    super();
    this.state = {
      code,
      gen,
      hostId: "",
      center: null,
      settings: { ...DEFAULT_SETTINGS },
      phase: "lobby",
      startedAt: null,
      endsAt: null,
      radius: DEFAULT_SETTINGS.maxRadius,
      players: {},
      result: null,
    };
    this.net = new ClientNet(code, gen);
    this.net.on("open", () => {
      this.myId = this.net.myId;
      this.net.send({ t: "hello", name, color });
      this.emit("connected");
    });
    this.net.on("msg", (msg: HostMsg) => this.onHost(msg));
    this.net.on("host-close", () => this.emit("host-lost"));
    this.net.on("error", (e: any) => this.emit("net-error", e));
    this.net.on("conn-error", (e: any) => this.emit("conn-error", e));

    this.stopGeo = watchPosition(
      (lat, lng, acc) => this.onPos(lat, lng, acc),
      () => this.emit("geo-error")
    );
  }

  private onPos(lat: number, lng: number, acc: number) {
    const now = Date.now();
    if (now - this.lastPosSend < POS_SEND_MS) return;
    this.lastPosSend = now;
    this.net.send({ t: "pos", lat, lng, acc });
    if (this.state.players[this.myId]) {
      const p = this.state.players[this.myId];
      p.lat = lat;
      p.lng = lng;
      p.acc = acc;
    }
  }

  private onHost(msg: HostMsg) {
    switch (msg.t) {
      case "welcome":
        this.myId = msg.youId;
        this.state = msg.state;
        this.emit("update");
        break;
      case "state": {
        const prevPhase = this.state.phase;
        this.state = msg.state;
        if (prevPhase !== "playing" && msg.state.phase === "playing") this.emit("started");
        this.emit("update");
        break;
      }
      case "token":
        this.token = msg.token;
        this.emit("token", msg.token);
        break;
      case "ping":
        this.emit("ping", { bearing: msg.bearing, dist: msg.dist, inRange: msg.inRange });
        break;
      case "caught":
        this.emit("caught", { hiderId: msg.hiderId, byId: msg.byId });
        break;
      case "ended":
        this.state = msg.state;
        this.emit("ended", msg.state);
        this.emit("update");
        break;
      case "kicked":
        this.emit("kicked");
        break;
    }
  }

  me() {
    return this.state.players[this.myId];
  }
  currentToken() {
    return this.token;
  }
  setReady(v: boolean) {
    this.net.send({ t: "ready", ready: v });
  }
  requestPing() {
    this.net.send({ t: "pingReq" });
  }
  attemptCatch(hiderId: string, token: string) {
    this.net.send({ t: "catch", hiderId, token });
  }
  // host-only no-ops
  assign() {}
  kick() {}
  start() {}
  updateSettings() {}

  retarget(gen: number) {
    this.net.retarget(gen);
  }

  getName() {
    return this.name;
  }
  getColor() {
    return this.color;
  }

  destroy() {
    this.stopGeo();
    this.net.send({ t: "bye" });
    this.net.destroy();
  }
}
