import type { Ctx } from "../state";
import type { GameEngine } from "../game/engine";
import type { Player } from "../types";
import { el, avatar, fmtClock } from "../ui/components";

export function resultsScreen(ctx: Ctx) {
  const app = ctx.app;
  const engine = app.engine as GameEngine | null;
  const st = engine?.state;
  const result = st?.result;

  if (!engine || !st || !result) {
    ctx.go("home");
    return { el: el("div", {}) };
  }

  const started = st.startedAt ?? 0;
  const myId = engine.myId;
  const finished = st.endsAt && Date.now() > st.endsAt ? st.endsAt : Date.now();
  const players = Object.values(st.players);

  const survivalMs = (p: Player) => (p.foundAt != null ? p.foundAt - started : finished - started);

  // Hiders = anyone caught (originally hiding) or still tagged hider
  const survivors = players
    .filter((p) => p.role === "hider" && p.foundAt == null)
    .sort((a, b) => a.name.localeCompare(b.name));
  const caught = players
    .filter((p) => p.foundAt != null)
    .sort((a, b) => b.foundAt! - a.foundAt!); // last caught = survived longest
  const hunters = players.filter((p) => p.role === "hunter" && p.foundAt == null);

  const huntersWon = result.winner === "hunters";

  // ── winner banner ──
  const banner = el(
    "div",
    {
      class: "glass card",
      style:
        "text-align:center;border-color:" +
        (huntersWon ? "rgba(255,77,94,.5)" : "rgba(46,230,200,.5)") +
        ";box-shadow:0 20px 60px -20px " +
        (huntersWon ? "rgba(255,77,94,.5)" : "rgba(46,230,200,.5)"),
    },
    [
      el("div", { class: "kicker", style: "margin-bottom:8px" }, ["Game over"]),
      el(
        "h1",
        {
          class: "title",
          style:
            "font-size:2.6rem;margin:0;color:" + (huntersWon ? "var(--hunter)" : "var(--hider)"),
        },
        [huntersWon ? "Hunters win" : "Hiders win"]
      ),
      el("p", { class: "muted", style: "margin-top:8px" }, [result.reason]),
    ]
  );

  // ── leaderboard row ──
  function lbRow(p: Player, rank: number | null, sub: string, tagText: string, tagCls: string) {
    return el("div", { class: "player-row" }, [
      el(
        "div",
        {
          class: "mono",
          style: "width:22px;text-align:center;color:var(--ink-faint);font-size:14px",
        },
        [rank != null ? String(rank) : "—"]
      ),
      avatar(p.name, p.color),
      el("div", { class: "grow" }, [
        el("div", { class: "name" }, [p.name + (p.id === myId ? " (you)" : "")]),
        el("div", { class: "meta" }, [sub]),
      ]),
      el("span", { class: `tag ${tagCls}` }, [tagText]),
    ]);
  }

  const board = el("div", { class: "stack" });
  let rank = 1;
  for (const p of survivors) {
    board.append(lbRow(p, rank++, `survived · ${fmtClock(survivalMs(p))}`, "survived", "ready"));
  }
  // caught hiders ordered by survival time (longest first)
  const caughtByLongest = [...caught].sort((a, b) => survivalMs(b) - survivalMs(a));
  for (const p of caughtByLongest) {
    board.append(lbRow(p, rank++, `caught at ${fmtClock(survivalMs(p))}`, "caught", "hunter"));
  }
  for (const p of hunters) {
    board.append(lbRow(p, null, "hunter from the start", "hunter", "host"));
  }

  // ── found order ──
  const foundOrder = result.foundOrder
    .map((id, i) => {
      const p = st.players[id];
      if (!p) return null;
      return el("div", { class: "row", style: "gap:10px" }, [
        el("div", { class: "mono", style: "color:var(--hunter);width:20px" }, [`${i + 1}`]),
        avatar(p.name, p.color, ""),
        el("div", { class: "grow name" }, [p.name]),
        el("div", { class: "mono meta" }, [fmtClock((p.foundAt ?? started) - started)]),
      ]);
    })
    .filter(Boolean) as HTMLElement[];

  // ── timeline ──
  const tlColor: Record<string, string> = {
    start: "var(--ink-dim)",
    caught: "var(--hunter)",
    ping: "var(--signal)",
    shrink: "var(--radar)",
    zone: "var(--bad)",
    end: "var(--good)",
  };
  const timeline = result.timeline.map((ev) =>
    el("div", { class: "row", style: "gap:10px;align-items:flex-start" }, [
      el("div", { class: "mono", style: "width:46px;color:var(--ink-faint);font-size:12px" }, [fmtClock(ev.t)]),
      el("div", { style: `width:8px;height:8px;border-radius:50%;margin-top:5px;flex:none;background:${tlColor[ev.kind] ?? "var(--ink-dim)"}` }),
      el("div", { class: "grow", style: "font-size:14px" }, [ev.text]),
    ])
  );

  const homeBtn = el("button", { class: "btn btn-primary" }, ["Back to home"]);
  homeBtn.addEventListener("click", () => {
    app["engine"]?.destroy();
    (app as any).engine = null;
    ctx.go("home");
  });

  const section = (title: string, body: HTMLElement[]) =>
    body.length
      ? el("div", { class: "glass card" }, [
          el("div", { class: "kicker", style: "margin-bottom:12px" }, [title]),
          el("div", { class: "stack", style: "gap:10px" }, body),
        ])
      : null;

  const blocks = [
    banner,
    section("Leaderboard", [board]),
    section("Caught order", foundOrder),
    section("Replay timeline", [el("div", { class: "scroll-list", style: "max-height:260px" }, timeline)]),
  ].filter(Boolean) as HTMLElement[];

  return {
    el: el("div", {}, [
      el("div", { class: "field" }),
      el("div", { class: "row spread" }, [
        el("span", { class: "eyebrow" }, ["// debrief"]),
        el("span", { class: "kicker" }, [`room ${st.code}`]),
      ]),
      el("div", { class: "stack", style: "margin-top:16px" }, [...blocks, homeBtn, el("div", { style: "height:12px" })]),
    ]),
  };
}
