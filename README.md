import type { Ctx } from "../state";
import { el, avatar, toast } from "../ui/components";

export function homeScreen(ctx: Ctx) {
  const app = ctx.app;
  const nameInput = el("input", {
    type: "text",
    value: app.profile.name,
    placeholder: "Your name",
    maxlength: "16",
    autocomplete: "off",
  }) as HTMLInputElement;

  const av = avatar(app.profile.name || "?", app.profile.color || "#2ee6c8");
  nameInput.addEventListener("input", () => {
    const v = nameInput.value.trim();
    if (v) {
      app.setProfile(v);
      av.style.background = app.profile.color;
      av.textContent = v.slice(0, 2).toUpperCase();
    }
  });

  const requireName = (then: () => void) => {
    const v = nameInput.value.trim();
    if (!v) {
      nameInput.focus();
      toast("Enter your name first", "bad");
      return;
    }
    app.setProfile(v);
    then();
  };

  const hostBtn = el("button", { class: "mega host" }, [
    el("div", { class: "glyph" }, ["⌖"]),
    el("div", { class: "label" }, [el("h2", {}, ["Host Game"]), el("p", {}, ["Set the zone, invite players"])]),
  ]);
  hostBtn.addEventListener("click", () => requireName(() => ctx.go("host")));

  const joinBtn = el("button", { class: "mega join" }, [
    el("div", { class: "glyph" }, ["⊹"]),
    el("div", { class: "label" }, [el("h2", {}, ["Join Game"]), el("p", {}, ["Scan a QR or enter a code"])]),
  ]);
  joinBtn.addEventListener("click", () =>
    requireName(() => ctx.go("join", { code: (ctx.app as any).pendingJoinCode }))
  );

  return {
    el: el("div", {}, [
      el("div", { class: "field" }, [
        el("div", { class: "sweep" }),
        el("div", { class: "ring" }),
        el("div", { class: "ring" }),
        el("div", { class: "ring" }),
      ]),
      el("div", { class: "row spread", style: "margin-top:8px" }, [
        el("span", { class: "eyebrow" }, ["// manhunt"]),
        av,
      ]),
      el("h1", { class: "title", style: "margin-top:auto" }, ["The zone\nis closing."]),
      el("p", { class: "subtitle" }, [
        "Hunters track hiders across the real world inside a shrinking circle. Last hider standing wins.",
      ]),
      el("div", { class: "stack", style: "margin-top:24px" }, [
        el("div", {}, [el("label", { class: "field-label" }, ["Display name"]), nameInput]),
        hostBtn,
        joinBtn,
      ]),
      el("div", { class: "spacer" }),
      el("p", { class: "kicker", style: "text-align:center;margin-top:18px" }, ["peer-to-peer · no servers · gps required"]),
    ]),
  };
}
