import type { LatLng } from "../types";

const R = 6371000; // earth radius m
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Haversine distance in meters */
export function distance(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const la1 = rad(a.lat);
  const la2 = rad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing a→b in degrees (0 = north, clockwise) */
export function bearing(a: LatLng, b: LatLng): number {
  const dLng = rad(b.lng - a.lng);
  const la1 = rad(a.lat);
  const la2 = rad(b.lat);
  const y = Math.sin(dLng) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

export function compass(b: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(b / 45) % 8];
}

/**
 * Reject implausible jumps. A real runner tops out around 12 m/s; we allow a
 * generous margin plus GPS slop. Returns true if the update should be accepted.
 */
export function plausibleMove(prev: LatLng | null, next: LatLng, dtMs: number, acc: number): boolean {
  if (!prev) return true;
  if (dtMs <= 0) return true;
  const d = distance(prev, next);
  const maxSpeed = 25; // m/s — bicycle-fast, blocks teleporting
  const allowed = (maxSpeed * dtMs) / 1000 + Math.min(acc, 60) + 8;
  return d <= allowed;
}
