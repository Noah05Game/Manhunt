import type { GameSettings, Role, RoomState } from "../types";

/** Client → Host */
export type ClientMsg =
  | { t: "hello"; name: string; color: string }
  | { t: "pos"; lat: number; lng: number; acc: number }
  | { t: "ready"; ready: boolean }
  | { t: "pingReq" }
  | { t: "catch"; hiderId: string; token: string }
  | { t: "bye" };

/** Host → Client */
export type HostMsg =
  | { t: "welcome"; youId: string; state: RoomState }
  | { t: "state"; state: RoomState }
  | { t: "kicked" }
  | { t: "token"; token: string } // private rotating catch token for this hider
  | { t: "ping"; bearing: number | null; dist: number | null; inRange: boolean }
  | { t: "caught"; hiderId: string; byId: string }
  | { t: "ended"; state: RoomState }
  | { t: "hostInfo"; gen: number };

/** Host control actions performed locally by the host UI */
export type HostAction =
  | { t: "assign"; id: string; role: Role }
  | { t: "kick"; id: string }
  | { t: "start" }
  | { t: "settings"; settings: Partial<GameSettings> };

export const ROOM_PREFIX = "mh";
export const peerIdFor = (code: string, gen = 0) => `${ROOM_PREFIX}-${code}-g${gen}`;
