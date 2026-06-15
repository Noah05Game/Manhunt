type Handler = (...args: any[]) => void;

export class Emitter {
  private map = new Map<string, Set<Handler>>();
  on(ev: string, fn: Handler): () => void {
    let set = this.map.get(ev);
    if (!set) this.map.set(ev, (set = new Set()));
    set.add(fn);
    return () => this.off(ev, fn);
  }
  off(ev: string, fn: Handler) {
    this.map.get(ev)?.delete(fn);
  }
  emit(ev: string, ...args: any[]) {
    this.map.get(ev)?.forEach((fn) => fn(...args));
  }
}

export function watchPosition(
  cb: (lat: number, lng: number, acc: number) => void,
  onError?: (e: GeolocationPositionError) => void
): () => void {
  if (!navigator.geolocation) {
    onError?.({ code: 2, message: "no geolocation" } as GeolocationPositionError);
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (p) => cb(p.coords.latitude, p.coords.longitude, p.coords.accuracy),
    (e) => onError?.(e),
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}
