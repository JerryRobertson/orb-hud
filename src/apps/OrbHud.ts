import { resolveActor } from "../actor-resolver";
import { editableOrbs, getOrbSettings } from "../orb-settings";
import { readSource, type OrbConfig, type ResourceSource } from "../resources";
import { OrbConfigApp } from "./OrbConfig";
import { getAdapter } from "../adapters";
import { SLOT_DRAG_TYPE, getDragData, parseDrop } from "../bar/drop";
import { getSlots, setSlots, slotViews, type SlotEntry, type SlotView } from "../bar/slots";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

interface OrbView {
  label: string;
  color: string;
  pct: number;
  counter: boolean;
  text: string;
  tooltip: string;
  shield?: { pct: number; width: string; color: string; active: boolean; lines: string[] };
}

interface HudState {
  actor: any | null;
  red: OrbView | null;
  blue: OrbView | null;
  slots: SlotView[];
}

type PartId = "red" | "bar" | "blue";
const fmt = (label: string, r: { value: number; max?: number }) =>
  `${label} ${r.max === undefined ? r.value : `${r.value} / ${r.max}`}`;

function buildOrb(actor: any, cfg: OrbConfig): OrbView | null {
  const r = readSource(actor, cfg.main);
  if (!r) return null;
  const counter = r.max === undefined;
  const pct = counter ? 100 : r.max! > 0 ? Math.min(100, Math.max(0, (r.value / r.max!) * 100)) : 0;
  const text = counter ? `${r.value}` : `${r.value} / ${r.max}`;
  const lines = [fmt(cfg.label, r)];

  let shield: OrbView["shield"];
  if (cfg.shields?.length) {
    let total = 0;
    const shieldLines: string[] = [];
    for (const src of cfg.shields as ResourceSource[]) {
      const s = readSource(actor, src);
      if (!s) continue;
      total += s.value;
      if (s.value > 0) {
        lines.push(fmt(src.label || "Shield", s));
        shieldLines.push(s.max === undefined ? `${s.value}` : `${s.value} / ${s.max}`);
      }
    }
    // Shields are measured against health max, so they read as a share of the HP they cover.
    const spct = r.max && r.max > 0 ? Math.min(100, (total / r.max) * 100) : total > 0 ? 100 : 0;
    // The front advances in proportion to shield / HP max; 112% clears the feathered edge so 100% is fully covered.
    const width = total <= 0 ? "0%" : `${Math.max(12, spct * 1.12).toFixed(1)}%`;
    shield = { pct: spct, width, color: cfg.shieldColor || "#7fd4ff", active: total > 0, lines: shieldLines };
  }
  return { label: cfg.label, color: cfg.color, pct, counter, text, tooltip: lines.join("\n"), shield };
}

export class OrbHud extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "orb-hud",
    tag: "div",
    classes: ["orb-hud"],
    window: { frame: false, positioned: false },
    actions: {}
  };

  static PARTS = {
    red: { template: "modules/orb-hud/templates/orb-red.hbs" },
    bar: { template: "modules/orb-hud/templates/orb-bar.hbs" },
    blue: { template: "modules/orb-hud/templates/orb-blue.hbs" }
  };

  /** Signatures of what was last rendered; a change means that part must re-render. */
  #orbSig = "";
  #barSig = "";
  #bound = false;

  #state(): HudState {
    const actor = resolveActor();
    if (!actor) return { actor: null, red: null, blue: null, slots: [] };
    const cfg = getOrbSettings(actor);
    return { actor, red: buildOrb(actor, cfg.red), blue: buildOrb(actor, cfg.blue), slots: slotViews(actor) };
  }

  static #orbSigOf(s: HudState): string {
    const o = (v: OrbView | null) => (v ? `${v.label}|${v.color}|${v.counter}|${v.shield?.color ?? ""}` : "-");
    return `${s.actor?.uuid ?? "-"}::${o(s.red)}::${o(s.blue)}`;
  }

  static #barSigOf(s: HudState): string {
    return `${s.actor?.uuid ?? "-"}::${s.slots.map((v) => `${v.filled}${v.broken}${v.name}${v.img}${v.badge}${v.depleted}`).join(",")}`;
  }

  protected async _prepareContext(options: any): Promise<Record<string, unknown>> {
    const s = this.#state();
    const parts: PartId[] = options?.parts ?? ["red", "bar", "blue"];
    if (parts.includes("red") || parts.includes("blue")) this.#orbSig = OrbHud.#orbSigOf(s);
    if (parts.includes("bar")) this.#barSig = OrbHud.#barSigOf(s);
    return { red: s.red, blue: s.blue, slots: s.slots };
  }

  protected _onRender(context: unknown, options: unknown): void {
    (super._onRender as any)?.(context, options);
    const root = this.element as HTMLElement;
    root.classList.toggle("orb-hud--hidden", !resolveActor());
    if (this.#bound) return;
    this.#bound = true;
    this.#bindEvents(root);
  }

  /** Delegated on the persistent root so partial re-renders never duplicate listeners. */
  #bindEvents(root: HTMLElement): void {
    const slotOf = (ev: Event) => (ev.target as HTMLElement).closest<HTMLElement>("[data-slot]");

    root.addEventListener("contextmenu", (ev) => {
      const slot = slotOf(ev);
      if (slot) {
        ev.preventDefault();
        void this.#clearSlot(Number(slot.dataset.slot));
        return;
      }
      if ((ev.target as HTMLElement).closest('[data-orb="blue"]')) {
        ev.preventDefault();
        const actor = resolveActor();
        if (actor && editableOrbs(actor).includes("blue")) OrbConfigApp.open(actor);
      }
    });

    root.addEventListener("click", (ev) => {
      const slot = slotOf(ev);
      if (!slot || ev.button !== 0) return;
      const index = Number(slot.dataset.slot);
      if (ev.shiftKey) void this.#openSheet(index);
      else this.useSlot(index, ev);
    });

    root.addEventListener("dragstart", (ev) => {
      const slot = slotOf(ev);
      const actor = resolveActor();
      if (!slot || !actor || !ev.dataTransfer) return;
      ev.dataTransfer.effectAllowed = "move";
      ev.dataTransfer.setData("text/plain", JSON.stringify({ type: SLOT_DRAG_TYPE, index: Number(slot.dataset.slot), actorUuid: actor.uuid }));
    });

    root.addEventListener("dragend", (ev) => {
      const slot = slotOf(ev);
      if (!slot || ev.dataTransfer?.dropEffect !== "none") return;
      if (ev.clientX === 0 && ev.clientY === 0) return; // cancelled with Esc
      const bar = root.querySelector<HTMLElement>(".orb-hud__bar")?.getBoundingClientRect();
      const inside = bar && ev.clientX >= bar.left && ev.clientX <= bar.right && ev.clientY >= bar.top && ev.clientY <= bar.bottom;
      if (!inside) void this.#clearSlot(Number(slot.dataset.slot));
    });

    root.addEventListener("dragover", (ev) => {
      if (slotOf(ev)) ev.preventDefault();
    });

    root.addEventListener("drop", (ev) => {
      const slot = slotOf(ev);
      if (!slot) return;
      ev.preventDefault();
      ev.stopPropagation();
      void this.#onDrop(ev, Number(slot.dataset.slot));
    });
  }

  /** Uses the slotted entry. Returns true when the slot is filled, so keybinds know they consumed the key. */
  useSlot(index: number, event?: Event): boolean {
    const actor = resolveActor();
    const entry = actor ? getSlots(actor)[index] : null;
    if (!actor || !entry) return false;
    void this.#activate(actor, entry, event);
    return true;
  }

  async #activate(actor: any, entry: SlotEntry, event?: Event): Promise<void> {
    const doc = await fromUuid(entry.uuid);
    if (!doc) {
      ui.notifications.warn(game.i18n.localize("ORBHUD.Bar.Missing"));
      return;
    }
    try {
      await getAdapter().use?.(doc, { actor, event });
    } catch (err) {
      console.error("orb-hud | failed to use slot", err);
      ui.notifications.error(game.i18n.format("ORBHUD.Bar.UseFailed", { name: doc.name }));
    }
  }

  async #openSheet(index: number): Promise<void> {
    const actor = resolveActor();
    const entry = actor ? getSlots(actor)[index] : null;
    if (!entry) return;
    (await fromUuid(entry.uuid))?.sheet?.render(true);
  }

  async #onDrop(ev: DragEvent, index: number): Promise<void> {
    const actor = resolveActor();
    if (!actor) return;
    const result = parseDrop(getDragData(ev), actor);
    if (!result) return;
    let entry = result.kind === "entry" ? result.entry : null;
    if (result.kind === "convert") {
      entry = (await getAdapter().convertDrop?.(result.data, actor)) ?? null;
      if (!entry) return;
    }
    const slots = getSlots(actor);
    if (result.kind === "swap") {
      if (result.from === index) return;
      [slots[index], slots[result.from]] = [slots[result.from], slots[index]];
    } else {
      slots[index] = entry;
    }
    await setSlots(actor, slots);
    this.refresh();
  }

  async #clearSlot(index: number): Promise<void> {
    const actor = resolveActor();
    if (!actor) return;
    const slots = getSlots(actor);
    if (!slots[index]) return;
    slots[index] = null;
    await setSlots(actor, slots);
    this.refresh();
  }

  /** Cheap update path: restyle in place when only values changed, re-render only what changed otherwise. */
  refresh(): void {
    const s = this.#state();
    if (!this.rendered) {
      void this.render({ force: true });
      return;
    }
    (this.element as HTMLElement).classList.toggle("orb-hud--hidden", !s.actor);

    if (OrbHud.#orbSigOf(s) !== this.#orbSig) {
      void this.render({ force: true });
      return;
    }
    if (OrbHud.#barSigOf(s) !== this.#barSig) void this.render({ parts: ["bar"] });

    for (const key of ["red", "blue"] as const) {
      const view = s[key];
      const el = (this.element as HTMLElement).querySelector<HTMLElement>(`[data-orb="${key}"]`);
      if (!view || !el) continue;
      el.style.setProperty("--fill", String(view.pct));
      el.title = view.tooltip;
      const main = el.querySelector(".orb-hud__num-main");
      if (main) main.textContent = view.text;
      const box = el.querySelector(".orb-hud__num-shields");
      if (box && view.shield) {
        box.replaceChildren(...view.shield.lines.map((t) => Object.assign(document.createElement("div"), { textContent: t })));
      }
      if (view.shield) {
        el.style.setProperty("--shield-width", view.shield.width);
        const wasActive = el.classList.contains("orb-hud__orb--shielded");
        el.classList.toggle("orb-hud__orb--shielded", view.shield.active);
        if (wasActive && !view.shield.active) {
          el.classList.add("orb-hud__orb--cracking");
          window.setTimeout(() => el.classList.remove("orb-hud__orb--cracking"), 1000);
        }
      }
    }
  }
}