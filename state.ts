// ── DOM ──────────────────────────────────────────────────────
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Record<string, any>> = {},
  children: (Node | string)[] = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v !== undefined && v !== null && v !== false) {
      node.setAttribute(k, String(v));
    }
  }
  for (const c of children) node.append(c);
  return node;
}

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel);

// ── Identity visuals ─────────────────────────────────────────
export function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `hsl(${h} 70% 62%)`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatar(name: string, color: string, cls = ""): HTMLElement {
  return el("div", { class: `avatar ${cls}`, style: `background:${color}` }, [initials(name)]);
}

// ── Toast ────────────────────────────────────────────────────
export function toast(msg: string, kind: "" | "good" | "bad" = "", ms = 2600) {
  const host = document.getElementById("toast-host")!;
  const t = el("div", { class: `toast ${kind}` }, [msg]);
  host.append(t);
  setTimeout(() => {
    t.style.transition = "opacity .3s, transform .3s";
    t.style.opacity = "0";
    t.style.transform = "translateY(10px)";
    setTimeout(() => t.remove(), 300);
  }, ms);
}

// ── Device APIs ──────────────────────────────────────────────
export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

let audioCtx: AudioContext | null = null;
export function beep(freq = 660, ms = 160, type: OscillatorType = "sine") {
  try {
    audioCtx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + ms / 1000);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + ms / 1000);
  } catch {
    /* no audio */
  }
}

let wakeLock: any = null;
export async function keepAwake() {
  try {
    wakeLock = await (navigator as any).wakeLock?.request("screen");
    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState === "visible" && !wakeLock) {
        wakeLock = await (navigator as any).wakeLock?.request("screen");
      }
    });
  } catch {
    /* not granted */
  }
}

export async function notify(title: string, body: string) {
  try {
    if (Notification.permission === "default") await Notification.requestPermission();
    if (Notification.permission === "granted") new Notification(title, { body });
  } catch {
    /* unsupported */
  }
}

// ── Flash overlay (catch / convert) ──────────────────────────
export function flash(text: string, color: string) {
  const f = el("div", { class: "flash" }, [
    el("div", { class: "burst", style: `color:${color}` }, [text]),
  ]);
  document.body.append(f);
  setTimeout(() => f.remove(), 2200);
}

export function fmtClock(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
