import { MODULE_ID } from "../constants";
import { resolveActor } from "../actor-resolver";
import { editableOrbs, getOrbSettings, getWorldOrbs } from "../orb-settings";
import { readSource, type OrbConfig, type OrbKey, type ResourceSource } from "../resources";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const ROW_PARTIAL = "modules/orb-hud/templates/source-row.hbs";

type Role = "main" | "shield";

interface Option { value: string; label: string; selected: boolean }
interface Group { label: string; options: Option[] }

const emptyRow = (): ResourceSource => ({ kind: "attribute", valuePath: "", maxPath: "" });
const joinPath = (p: unknown): string => (Array.isArray(p) ? p.join(".") : String(p));

export class OrbConfigApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "orb-hud-config",
    tag: "div",
    classes: ["orb-hud-config"],
    position: { width: 600, height: "auto" },
    window: { title: "ORBHUD.Config.Title", icon: "fa-solid fa-circle-half-stroke", resizable: false },
    actions: {
      addShield: OrbConfigApp.#onAddShield,
      removeShield: OrbConfigApp.#onRemoveShield,
      save: OrbConfigApp.#onSave,
      reset: OrbConfigApp.#onReset
    }
  };

  static PARTS = {
    form: { template: "modules/orb-hud/templates/orb-config.hbs" }
  };

  /** Open scoped to an actor, or (no argument) as the world default. */
  static open(actor?: any): OrbConfigApp {
    const app = new OrbConfigApp({ actor, id: `orb-hud-config-${actor?.uuid?.replaceAll(".", "-") ?? "world"}` });
    void app.render({ force: true });
    return app;
  }

  actor: any | null;
  #sample: any | null;
  #form: Record<OrbKey, OrbConfig>;

  constructor(options: any = {}) {
    super(options);
    this.actor = options.actor ?? null;
    this.#sample =
      this.actor ?? resolveActor() ?? game.actors.find((a: any) => a.hasPlayerOwner) ?? game.actors.contents[0] ?? null;
    this.#form = foundry.utils.deepClone(getOrbSettings(this.actor)) as Record<OrbKey, OrbConfig>;
  }

  get #orbs(): OrbKey[] {
    return this.actor ? editableOrbs(this.actor) : (["red", "blue"] as OrbKey[]);
  }

  // ---- context ----------------------------------------------------------------------------

  #tracked(): { bars: string[]; values: string[] } {
    try {
      const t = TokenDocument.getTrackedAttributes(this.#sample?.system ?? {});
      return { bars: (t.bar ?? []).map(joinPath), values: (t.value ?? []).map(joinPath) };
    } catch (err) {
      console.warn(`${MODULE_ID} | getTrackedAttributes failed`, err);
      return { bars: [], values: [] };
    }
  }

  #groups(row: ResourceSource, tracked: { bars: string[]; values: string[] }): Group[] {
    const items: string[] = (this.#sample?.items?.contents ?? [])
      .filter((i: any) => i.system?.uses?.max !== undefined && i.system?.uses?.max !== null)
      .map((i: any) => i.name);
    if (row.kind === "itemUses" && !items.includes(row.itemName)) items.push(row.itemName);

    let current = "custom";
    if (row.kind === "itemUses") current = `item:${row.itemName}`;
    else if (row.maxPath && row.valuePath === `${row.maxPath.replace(/\.max$/, "")}.value` && tracked.bars.includes(row.maxPath.replace(/\.max$/, "")))
      current = `bar:${row.maxPath.replace(/\.max$/, "")}`;
    else if (!row.maxPath && tracked.values.includes(row.valuePath)) current = `val:${row.valuePath}`;

    const opt = (value: string, label: string): Option => ({ value, label, selected: value === current });
    return [
      { label: game.i18n.localize("ORBHUD.Config.Other"), options: [opt("custom", game.i18n.localize("ORBHUD.Config.CustomPath"))] },
      { label: game.i18n.localize("ORBHUD.Config.TrackedBars"), options: tracked.bars.map((p) => opt(`bar:${p}`, p)) },
      { label: game.i18n.localize("ORBHUD.Config.TrackedValues"), options: tracked.values.map((p) => opt(`val:${p}`, p)) },
      { label: game.i18n.localize("ORBHUD.Config.ItemUses"), options: items.map((n) => opt(`item:${n}`, n)) }
    ].filter((g) => g.options.length);
  }

  #live(row: ResourceSource): string {
    if (!this.#sample) return "—";
    const r = readSource(this.#sample, row);
    if (!r) return game.i18n.localize("ORBHUD.Config.NotFound");
    return r.max === undefined ? `${r.value}` : `${r.value} / ${r.max}`;
  }

  #rowCtx(row: ResourceSource, orb: OrbKey, role: Role, idx: number, tracked: { bars: string[]; values: string[] }) {
    return {
      orb, role, idx,
      groups: this.#groups(row, tracked),
      isItem: row.kind === "itemUses",
      isShield: role === "shield",
      valuePath: row.kind === "attribute" ? row.valuePath : "",
      maxPath: row.kind === "attribute" ? row.maxPath ?? "" : "",
      label: row.label ?? "",
      live: this.#live(row)
    };
  }

  protected async _prepareContext(): Promise<Record<string, unknown>> {
    const tracked = this.#tracked();
    const orbs = this.#orbs.map((key) => {
      const cfg = this.#form[key];
      return {
        key,
        title: game.i18n.localize(key === "red" ? "ORBHUD.Config.RedOrb" : "ORBHUD.Config.BlueOrb"),
        isRed: key === "red",
        label: cfg.label,
        color: cfg.color,
        shieldColor: cfg.shieldColor ?? "#7fd4ff",
        main: this.#rowCtx(cfg.main, key, "main", 0, tracked),
        shields: (cfg.shields ?? []).map((s, i) => this.#rowCtx(s, key, "shield", i, tracked))
      };
    });
    return {
      orbs,
      sampleName: this.#sample?.name ?? "",
      scopeNote: this.actor
        ? game.i18n.format("ORBHUD.Config.ActorScope", { name: this.actor.name })
        : game.i18n.localize("ORBHUD.Config.WorldScope"),
      canReset: !!this.actor && !!this.actor.getFlag(MODULE_ID, "orbs")
    };
  }

  // ---- DOM <-> state ----------------------------------------------------------------------

  #el(): HTMLElement {
    return this.element as HTMLElement;
  }

  #readRow(row: HTMLElement): ResourceSource {
    const q = (f: string) => row.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-field="${f}"]`)!;
    const pick = q("pick").value;
    const label = (row.querySelector<HTMLInputElement>('[data-field="label"]')?.value ?? "").trim();
    const base = label ? { label } : {};
    if (pick.startsWith("item:")) return { kind: "itemUses", itemName: pick.slice(5), ...base };
    const valuePath = q("valuePath").value.trim();
    const maxPath = q("maxPath").value.trim();
    return { kind: "attribute", valuePath, ...(maxPath ? { maxPath } : {}), ...base };
  }

  /** Pulls the current field values from the DOM into this.#form. */
  #capture(): void {
    const root = this.#el();
    for (const key of this.#orbs) {
      const cfg = this.#form[key];
      const field = (f: string) => root.querySelector<HTMLInputElement>(`[data-orb-field="${f}"][data-orb="${key}"]`);
      cfg.label = field("label")?.value.trim() || cfg.label;
      cfg.color = field("color")?.value || cfg.color;
      cfg.main = this.#readRow(root.querySelector<HTMLElement>(`[data-row][data-orb="${key}"][data-role="main"]`)!);
      if (key === "red") {
        cfg.shieldColor = field("shieldColor")?.value || cfg.shieldColor;
        cfg.shields = [...root.querySelectorAll<HTMLElement>(`[data-row][data-orb="red"][data-role="shield"]`)].map((r) => this.#readRow(r));
      }
    }
  }

  protected _onRender(context: unknown, options: unknown): void {
    (super._onRender as any)?.(context, options);
    for (const row of this.#el().querySelectorAll<HTMLElement>("[data-row]")) {
      const pick = row.querySelector<HTMLSelectElement>('[data-field="pick"]')!;
      const vp = row.querySelector<HTMLInputElement>('[data-field="valuePath"]')!;
      const mp = row.querySelector<HTMLInputElement>('[data-field="maxPath"]')!;
      const live = row.querySelector<HTMLElement>('[data-field="live"]')!;
      const update = () => (live.textContent = this.#live(this.#readRow(row)));

      pick.addEventListener("change", () => {
        const [type, ...rest] = pick.value.split(":");
        const val = rest.join(":");
        const isItem = type === "item";
        vp.hidden = mp.hidden = isItem;
        if (type === "bar") { vp.value = `${val}.value`; mp.value = `${val}.max`; }
        else if (type === "val") { vp.value = val; mp.value = ""; }
        update();
      });
      vp.addEventListener("input", update);
      mp.addEventListener("input", update);
    }
  }

  // ---- actions ----------------------------------------------------------------------------

  static #onAddShield(this: OrbConfigApp): void {
    this.#capture();
    (this.#form.red.shields ??= []).push(emptyRow());
    void this.render();
  }

  static #onRemoveShield(this: OrbConfigApp, _ev: Event, target: HTMLElement): void {
    this.#capture();
    this.#form.red.shields?.splice(Number(target.dataset.idx), 1);
    void this.render();
  }

  static async #onReset(this: OrbConfigApp): Promise<void> {
    if (!this.actor) return;
    await this.actor.update({ [`flags.${MODULE_ID}.-=orbs`]: null });
    ui.notifications.info(game.i18n.localize("ORBHUD.Config.ResetDone"));
    void this.close();
  }

  static async #onSave(this: OrbConfigApp): Promise<void> {
    this.#capture();
    for (const key of this.#orbs) {
      if (!this.#form[key].main.kind || (this.#form[key].main.kind === "attribute" && !(this.#form[key].main as any).valuePath)) {
        ui.notifications.warn(game.i18n.localize("ORBHUD.Config.NeedSource"));
        return;
      }
    }

    if (!this.actor) {
      const world = foundry.utils.deepClone(getWorldOrbs());
      for (const key of this.#orbs) world[key] = this.#form[key];
      await game.settings.set(MODULE_ID, "orbs", world);
    } else {
      // Keep sections this user can't edit; store only the sections that differ from the world default.
      const world = getWorldOrbs();
      const existing = foundry.utils.deepClone(this.actor.getFlag(MODULE_ID, "orbs") ?? {});
      for (const key of this.#orbs) {
        if (foundry.utils.objectsEqual(this.#form[key], world[key])) delete existing[key];
        else existing[key] = this.#form[key];
      }
      // Clear first so removed keys and shrunken arrays don't survive the deep merge in update().
      await this.actor.update({ [`flags.${MODULE_ID}.-=orbs`]: null });
      if (Object.keys(existing).length) await this.actor.setFlag(MODULE_ID, "orbs", existing);
    }
    void this.close();
  }
}