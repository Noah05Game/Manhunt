import QRCode from "qrcode";

export interface CatchPayload {
  v: 1;
  k: "catch";
  r: string; // room code
  h: string; // hider id
  t: string; // rotating token
}

export interface JoinPayload {
  v: 1;
  k: "join";
  r: string; // room code
}

export function makeToken(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function renderQR(canvas: HTMLCanvasElement, data: string, size = 280): Promise<void> {
  await QRCode.toCanvas(canvas, data, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#070a12", light: "#ffffff" },
  });
}

export function encodeCatch(p: CatchPayload): string {
  return JSON.stringify(p);
}

export function encodeJoin(code: string): string {
  const p: JoinPayload = { v: 1, k: "join", r: code };
  return JSON.stringify(p);
}

export function decodePayload(raw: string): CatchPayload | JoinPayload | null {
  try {
    const p = JSON.parse(raw);
    if (p && p.v === 1 && (p.k === "catch" || p.k === "join")) return p;
  } catch {
    /* not ours */
  }
  return null;
}
