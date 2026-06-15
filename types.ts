export type Platform = "ios" | "android" | "desktop";

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as any).standalone === true
  );
}

export function getPlatform(): Platform {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua) || (/Mac/.test(ua) && "ontouchend" in document)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/** iOS only adds-to-home-screen from real Safari, not in-app/Chrome/Firefox. */
export function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const isiOS = /iPhone|iPad|iPod/i.test(ua) || (/Mac/.test(ua) && "ontouchend" in document);
  const webkit = /WebKit/i.test(ua);
  const notOther = !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/i.test(ua);
  return isiOS && webkit && notOther;
}

let deferredPrompt: any = null;
const listeners = new Set<() => void>();

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  listeners.forEach((l) => l());
});
window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
});

export function canPrompt(): boolean {
  return !!deferredPrompt;
}

export function onPromptAvailable(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === "accepted";
}
