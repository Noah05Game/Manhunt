:root {
  /* ── Palette: night-radar tactical ───────────────────────── */
  --bg: #070a12;
  --bg-2: #0b1120;
  --ink: #eef3ff;
  --ink-dim: #9fb0cf;
  --ink-faint: #5d6e8f;

  --glass: rgba(20, 28, 48, 0.55);
  --glass-2: rgba(28, 38, 64, 0.7);
  --glass-line: rgba(120, 150, 210, 0.18);
  --glass-line-strong: rgba(140, 170, 230, 0.32);

  --hunter: #ff4d5e;
  --hunter-soft: rgba(255, 77, 94, 0.16);
  --hider: #2ee6c8;
  --hider-soft: rgba(46, 230, 200, 0.14);
  --signal: #ffb23d;
  --radar: #36e0c8;

  --good: #34e08a;
  --warn: #ffb23d;
  --bad: #ff4d5e;

  --r-lg: 26px;
  --r-md: 18px;
  --r-sm: 12px;

  --sat: env(safe-area-inset-top, 0px);
  --sab: env(safe-area-inset-bottom, 0px);

  --ease: cubic-bezier(0.22, 1, 0.36, 1);
  --spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html,
body {
  margin: 0;
  height: 100%;
  overscroll-behavior: none;
}

body {
  background: var(--bg);
  color: var(--ink);
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  user-select: none;
  touch-action: manipulation;
}

#app {
  position: relative;
  min-height: 100dvh;
  isolation: isolate;
}

/* Ambient radar field that lives behind every screen */
.field {
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(120% 80% at 50% -10%, #122039 0%, transparent 55%),
    radial-gradient(80% 60% at 100% 110%, #0e1a30 0%, transparent 60%),
    var(--bg);
  overflow: hidden;
}
.field::before {
  content: "";
  position: absolute;
  inset: -40%;
  background-image:
    linear-gradient(var(--glass-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--glass-line) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: radial-gradient(circle at 50% 35%, #000 0%, transparent 70%);
  opacity: 0.4;
}
.field .sweep {
  position: absolute;
  left: 50%;
  top: 35%;
  width: 150vmax;
  height: 150vmax;
  translate: -50% -50%;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(54, 224, 200, 0.12) 22deg,
    transparent 45deg
  );
  animation: sweep 7s linear infinite;
}
.field .ring {
  position: absolute;
  left: 50%;
  top: 35%;
  border: 1px solid rgba(54, 224, 200, 0.18);
  border-radius: 50%;
  translate: -50% -50%;
  animation: ping-out 4.5s var(--ease) infinite;
}
.field .ring:nth-child(2) { animation-delay: 1.5s; }
.field .ring:nth-child(3) { animation-delay: 3s; }

@keyframes sweep { to { rotate: 360deg; } }
@keyframes ping-out {
  0% { width: 60px; height: 60px; opacity: 0.6; }
  100% { width: 90vmin; height: 90vmin; opacity: 0; }
}

/* ── Screen routing ──────────────────────────────────────── */
.screen {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: calc(var(--sat) + 18px) 20px calc(var(--sab) + 18px);
  animation: screen-in 0.42s var(--ease) both;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.screen.leaving { animation: screen-out 0.3s var(--ease) both; }

@keyframes screen-in {
  from { opacity: 0; transform: translateY(14px) scale(0.99); }
  to { opacity: 1; transform: none; }
}
@keyframes screen-out {
  to { opacity: 0; transform: translateY(-10px) scale(0.99); }
}

/* ── Type ────────────────────────────────────────────────── */
.eyebrow {
  font-family: "Space Mono", monospace;
  font-size: 12px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
h1.title {
  font-family: "Space Grotesk", sans-serif;
  font-weight: 700;
  font-size: clamp(2.4rem, 11vw, 3.4rem);
  line-height: 0.96;
  letter-spacing: -0.02em;
  margin: 10px 0 6px;
}
.subtitle { color: var(--ink-dim); font-size: 15px; line-height: 1.5; margin: 0; }
.mono { font-family: "Space Mono", monospace; }

/* ── Glass surfaces ──────────────────────────────────────── */
.glass {
  background: var(--glass);
  border: 1px solid var(--glass-line);
  border-radius: var(--r-md);
  backdrop-filter: blur(22px) saturate(140%);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
}
.card { padding: 18px; }
.stack { display: flex; flex-direction: column; gap: 14px; }
.row { display: flex; align-items: center; gap: 12px; }
.spread { justify-content: space-between; }
.grow { flex: 1; min-width: 0; }
.center { display: flex; align-items: center; justify-content: center; }
.spacer { flex: 1; }

/* ── Buttons ─────────────────────────────────────────────── */
.btn {
  appearance: none;
  border: 1px solid var(--glass-line-strong);
  background: var(--glass-2);
  color: var(--ink);
  font-family: "Space Grotesk", sans-serif;
  font-weight: 600;
  font-size: 16px;
  padding: 16px 20px;
  border-radius: var(--r-md);
  width: 100%;
  cursor: pointer;
  transition: transform 0.18s var(--spring), filter 0.18s var(--ease), opacity 0.2s;
  backdrop-filter: blur(14px);
}
.btn:active { transform: scale(0.96); filter: brightness(1.1); }
.btn:disabled { opacity: 0.4; pointer-events: none; }
.btn.ghost { background: transparent; border-color: var(--glass-line); }
.btn.small { padding: 10px 14px; font-size: 14px; width: auto; }
.btn.danger { color: var(--hunter); border-color: rgba(255, 77, 94, 0.4); }

.btn-primary {
  position: relative;
  overflow: hidden;
  border: none;
  background: linear-gradient(135deg, var(--hider) 0%, #1fb8e0 100%);
  color: #04140f;
  box-shadow: 0 12px 36px -12px rgba(46, 230, 200, 0.6);
}
.btn-primary.hunter { background: linear-gradient(135deg, var(--hunter) 0%, #ff8a3d 100%); color: #1a0405; box-shadow: 0 12px 36px -12px rgba(255, 77, 94, 0.55); }

/* Big animated home buttons */
.mega {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px;
  border-radius: var(--r-lg);
  overflow: hidden;
  border: 1px solid var(--glass-line-strong);
  background: var(--glass-2);
  cursor: pointer;
  transition: transform 0.2s var(--spring);
  animation: rise 0.6s var(--ease) both;
}
.mega:active { transform: scale(0.97); }
.mega::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 120% at 0% 0%, var(--accent, var(--hider-soft)), transparent 60%);
  opacity: 0.9;
}
.mega .glyph {
  position: relative;
  width: 56px;
  height: 56px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: var(--accent-solid, var(--hider));
  color: #061410;
  font-size: 26px;
  box-shadow: 0 8px 24px -8px var(--accent-solid, var(--hider));
}
.mega .glyph::before {
  content: "";
  position: absolute;
  inset: -8px;
  border-radius: 22px;
  border: 1px solid var(--accent-solid, var(--hider));
  opacity: 0.4;
  animation: pulse-ring 2.6s var(--ease) infinite;
}
.mega .label { position: relative; }
.mega .label h2 { font-family: "Space Grotesk"; margin: 0; font-size: 22px; }
.mega .label p { margin: 2px 0 0; color: var(--ink-dim); font-size: 13px; }
.mega.host { --accent: var(--hunter-soft); --accent-solid: var(--hunter); }
.mega.join { --accent: var(--hider-soft); --accent-solid: var(--hider); }

@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 0.5; }
  70% { transform: scale(1.15); opacity: 0; }
  100% { opacity: 0; }
}
@keyframes rise {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: none; }
}

/* ── Form controls ───────────────────────────────────────── */
label.field-label {
  display: block;
  font-family: "Space Mono", monospace;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-bottom: 8px;
}
input[type="text"],
input[type="number"] {
  width: 100%;
  background: rgba(8, 13, 26, 0.6);
  border: 1px solid var(--glass-line);
  border-radius: var(--r-sm);
  color: var(--ink);
  font-size: 16px;
  font-family: "Inter";
  padding: 14px 16px;
  outline: none;
  transition: border-color 0.2s;
}
input:focus { border-color: var(--hider); }
input.code-input {
  font-family: "Space Mono", monospace;
  font-size: 28px;
  letter-spacing: 0.4em;
  text-align: center;
  padding: 18px;
}

.slider-row { display: flex; align-items: center; gap: 14px; }
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 4px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--hider) var(--fill, 50%), rgba(255, 255, 255, 0.12) var(--fill, 50%));
  outline: none;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--ink);
  border: 4px solid var(--hider);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}
input[type="range"]::-moz-range-thumb {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--ink); border: 4px solid var(--hider);
}
.num-mini {
  width: 84px;
  text-align: center;
  font-family: "Space Mono", monospace;
  padding: 10px;
  font-size: 15px;
}

/* Toggle */
.toggle {
  --on: var(--hider);
  position: relative;
  width: 52px;
  height: 30px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--glass-line);
  flex: none;
  transition: background 0.25s;
  cursor: pointer;
}
.toggle::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--ink);
  transition: transform 0.25s var(--spring);
}
.toggle.on { background: var(--on); }
.toggle.on::after { transform: translateX(22px); }

.seg {
  display: flex;
  background: rgba(8, 13, 26, 0.6);
  border: 1px solid var(--glass-line);
  border-radius: var(--r-sm);
  padding: 4px;
  gap: 4px;
}
.seg button {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--ink-dim);
  font-family: "Space Grotesk";
  font-weight: 600;
  padding: 10px;
  border-radius: 9px;
  font-size: 14px;
  transition: background 0.2s, color 0.2s;
}
.seg button.active { background: var(--glass-2); color: var(--ink); }

/* ── Avatars & player rows ───────────────────────────────── */
.avatar {
  width: 42px;
  height: 42px;
  flex: none;
  border-radius: 13px;
  display: grid;
  place-items: center;
  font-family: "Space Grotesk";
  font-weight: 700;
  font-size: 16px;
  color: #04140f;
}
.player-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--r-sm);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--glass-line);
}
.player-row .name { font-weight: 600; font-size: 15px; }
.player-row .meta { font-size: 12px; color: var(--ink-faint); font-family: "Space Mono"; }
.tag {
  font-family: "Space Mono", monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 7px;
}
.tag.hunter { background: var(--hunter-soft); color: var(--hunter); }
.tag.hider { background: var(--hider-soft); color: var(--hider); }
.tag.host { background: rgba(255, 178, 61, 0.15); color: var(--signal); }
.tag.ready { background: rgba(52, 224, 138, 0.15); color: var(--good); }

.dot {
  width: 8px; height: 8px; border-radius: 50%; flex: none;
  background: var(--ink-faint);
}
.dot.live { background: var(--good); box-shadow: 0 0 0 0 rgba(52, 224, 138, 0.6); animation: live 2s infinite; }
.dot.bad { background: var(--bad); }
@keyframes live {
  0% { box-shadow: 0 0 0 0 rgba(52, 224, 138, 0.6); }
  70% { box-shadow: 0 0 0 7px rgba(52, 224, 138, 0); }
  100% { box-shadow: 0 0 0 0 rgba(52, 224, 138, 0); }
}

/* ── Map & game HUD ──────────────────────────────────────── */
#map { position: absolute; inset: 0; z-index: 0; background: #0b1120; }
.leaflet-container { background: #0b1120; font-family: "Inter"; }
.leaflet-control-attribution { font-size: 9px; opacity: 0.5; }

.player-marker {
  width: 30px; height: 30px; border-radius: 50%;
  display: grid; place-items: center;
  font-family: "Space Grotesk"; font-weight: 700; font-size: 12px;
  color: #04140f;
  border: 2px solid #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
  transition: transform 0.9s linear;
}
.player-marker.me { box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.25); }
.player-marker.hunter { background: var(--hunter); }
.player-marker.hider { background: var(--hider); }

.hud-top {
  position: absolute;
  top: calc(var(--sat) + 12px);
  left: 12px;
  right: 12px;
  z-index: 500;
  display: flex;
  gap: 10px;
  align-items: stretch;
}
.hud-pill {
  padding: 10px 14px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.hud-pill .k { font-family: "Space Mono"; font-size: 9px; letter-spacing: 0.14em; color: var(--ink-faint); text-transform: uppercase; }
.hud-pill .v { font-family: "Space Mono"; font-size: 18px; font-weight: 700; }

.hud-bottom {
  position: absolute;
  bottom: calc(var(--sab) + 14px);
  left: 12px;
  right: 12px;
  z-index: 500;
  display: flex;
  gap: 10px;
}
.hud-bottom .btn { padding: 16px; }

.role-banner {
  position: absolute;
  top: calc(var(--sat) + 70px);
  left: 50%;
  translate: -50%;
  z-index: 500;
  padding: 8px 18px;
  border-radius: 30px;
  font-family: "Space Grotesk";
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.04em;
}

/* Out-of-zone warning */
.zone-warn {
  position: absolute;
  inset: 0;
  z-index: 600;
  pointer-events: none;
  box-shadow: inset 0 0 0 4px var(--bad), inset 0 0 120px rgba(255, 77, 94, 0.35);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: calc(var(--sat) + 120px);
  opacity: 0;
  transition: opacity 0.3s;
  animation: warn-flash 1s ease-in-out infinite;
}
.zone-warn.show { opacity: 1; }
.zone-warn .count {
  font-family: "Space Mono";
  font-size: 64px;
  font-weight: 700;
  color: var(--bad);
  text-shadow: 0 0 30px rgba(255, 77, 94, 0.6);
}
@keyframes warn-flash { 50% { opacity: 0.55; } }

/* ── QR fullscreen overlay ───────────────────────────────── */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(4, 7, 14, 0.92);
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: calc(var(--sat) + 20px) 20px calc(var(--sab) + 20px);
  gap: 22px;
  animation: screen-in 0.3s var(--ease);
}
.qr-frame {
  position: relative;
  padding: 22px;
  border-radius: 28px;
  background: #fff;
}
.qr-frame::before {
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: 34px;
  background: conic-gradient(from 0deg, var(--hider), var(--signal), var(--hunter), var(--hider));
  z-index: -1;
  animation: sweep 3s linear infinite;
  filter: blur(2px);
}
.qr-frame canvas, .qr-frame img { display: block; border-radius: 10px; }
#scanner-view { width: min(90vw, 420px); border-radius: 22px; overflow: hidden; border: 1px solid var(--glass-line-strong); }
#scanner-view video { width: 100% !important; height: auto !important; display: block; }

/* ── Onboarding ──────────────────────────────────────────── */
.steps { counter-reset: step; display: flex; flex-direction: column; gap: 12px; }
.step {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 14px;
  border-radius: var(--r-sm);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--glass-line);
}
.step .num {
  counter-increment: step;
  flex: none;
  width: 30px; height: 30px;
  border-radius: 9px;
  display: grid; place-items: center;
  font-family: "Space Mono"; font-weight: 700;
  background: var(--hider-soft); color: var(--hider);
}
.step .num::before { content: counter(step); }
.step .txt { font-size: 14px; line-height: 1.45; padding-top: 4px; }
.step .txt b { color: var(--ink); }

/* ── Misc ────────────────────────────────────────────────── */
.divider { height: 1px; background: var(--glass-line); margin: 4px 0; }
.muted { color: var(--ink-dim); font-size: 13px; line-height: 1.5; }
.kicker { font-family: "Space Mono"; font-size: 11px; color: var(--ink-faint); letter-spacing: 0.16em; text-transform: uppercase; }

#toast-host {
  position: fixed;
  left: 0; right: 0;
  bottom: calc(var(--sab) + 20px);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}
.toast {
  background: var(--glass-2);
  border: 1px solid var(--glass-line-strong);
  backdrop-filter: blur(20px);
  padding: 12px 18px;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 500;
  animation: toast-in 0.3s var(--spring);
  max-width: 86vw;
}
.toast.bad { border-color: rgba(255, 77, 94, 0.5); }
.toast.good { border-color: rgba(52, 224, 138, 0.5); }
@keyframes toast-in {
  from { opacity: 0; transform: translateY(16px) scale(0.95); }
  to { opacity: 1; transform: none; }
}

/* Catch / convert flash */
.flash {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: grid;
  place-items: center;
  pointer-events: none;
  animation: flash-fade 2.2s var(--ease) forwards;
}
.flash .burst {
  text-align: center;
  font-family: "Space Grotesk";
  font-weight: 700;
  font-size: clamp(2rem, 9vw, 3.4rem);
  animation: burst 2.2s var(--spring) forwards;
}
@keyframes flash-fade { 0%,75% { opacity: 1; } 100% { opacity: 0; } }
@keyframes burst {
  0% { transform: scale(0.4); opacity: 0; }
  20% { transform: scale(1.05); opacity: 1; }
  85% { transform: scale(1); }
}

.scroll-list { display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.05ms !important; }
}
