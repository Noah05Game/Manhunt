import L from "leaflet";
import type { LatLng, Player, Role } from "../types";
import { initials } from "../ui/components";

// Fix default marker asset paths (we use divIcons, but guard anyway)
delete (L.Icon.Default.prototype as any)._getIconUrl;

export class GameMap {
  map: L.Map;
  private markers = new Map<string, L.Marker>();
  private targets = new Map<string, LatLng>();
  private zone: L.Circle | null = null;
  private raf = 0;

  constructor(node: HTMLElement, center: LatLng) {
    this.map = L.map(node, {
      center: [center.lat, center.lng],
      zoom: 17,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 20,
      subdomains: "abcd",
      attribution: "&copy; OpenStreetMap &copy; CARTO",
    }).addTo(this.map);
    this.loop();
  }

  setZone(center: LatLng, radius: number) {
    if (!this.zone) {
      this.zone = L.circle([center.lat, center.lng], {
        radius,
        color: "#36e0c8",
        weight: 2,
        fillColor: "#36e0c8",
        fillOpacity: 0.06,
        className: "zone-circle",
      }).addTo(this.map);
    } else {
      this.zone.setLatLng([center.lat, center.lng]);
      // animate radius change via CSS-less smooth lerp
      const cur = this.zone.getRadius();
      if (Math.abs(cur - radius) > 0.5) {
        this.zone.setRadius(cur + (radius - cur) * 0.25);
      } else {
        this.zone.setRadius(radius);
      }
    }
  }

  fitZone(center: LatLng, radius: number) {
    const b = L.latLng(center.lat, center.lng).toBounds(radius * 2.4);
    this.map.fitBounds(b, { animate: true, padding: [30, 30] });
  }

  upsertPlayer(p: Player, meId: string) {
    if (p.lat == null || p.lng == null) return;
    const target = { lat: p.lat, lng: p.lng };
    this.targets.set(p.id, target);
    let m = this.markers.get(p.id);
    if (!m) {
      const icon = this.iconFor(p, p.id === meId);
      m = L.marker([target.lat, target.lng], { icon, zIndexOffset: p.id === meId ? 1000 : 0 }).addTo(this.map);
      this.markers.set(p.id, m);
    } else {
      m.setIcon(this.iconFor(p, p.id === meId));
    }
  }

  removePlayer(id: string) {
    this.markers.get(id)?.remove();
    this.markers.delete(id);
    this.targets.delete(id);
  }

  hidePlayer(id: string) {
    this.removePlayer(id);
  }

  private iconFor(p: Player, me: boolean): L.DivIcon {
    const role: Role = p.role;
    return L.divIcon({
      className: "",
      html: `<div class="player-marker ${role} ${me ? "me" : ""}">${initials(p.name)}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  }

  /** Smoothly interpolate markers toward their target each frame. */
  private loop = () => {
    for (const [id, m] of this.markers) {
      const target = this.targets.get(id);
      if (!target) continue;
      const cur = m.getLatLng();
      const nlat = cur.lat + (target.lat - cur.lat) * 0.18;
      const nlng = cur.lng + (target.lng - cur.lng) * 0.18;
      m.setLatLng([nlat, nlng]);
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  recenterOn(p: LatLng) {
    this.map.panTo([p.lat, p.lng], { animate: true });
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.map.remove();
  }
}
