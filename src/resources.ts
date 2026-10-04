export type ResourceSource = (
  | { kind: "attribute"; valuePath: string; maxPath?: string }
  | { kind: "itemUses"; itemName: string }
  /**
   * Sums a pool across the actor's items of one type (e.g. worn armor S.D.C.).
   * Paths are relative to item.system. An item counts only if any `activeWhen` path (comma-separated) is truthy;
   * leave it empty to count every item of that type.
   */
  | { kind: "itemPool"; itemType: string; valuePath: string; maxPath?: string; activeWhen?: string }
) & { label?: string };

export interface OrbConfig {
  label: string;
  color: string;
  main: ResourceSource;
  /** Red orb only: protective pools drained before health, summed into the shell. */
  shields?: ResourceSource[];
  shieldColor?: string;
  /** Labelled mini-bars shown above the orb (e.g. worn armor). Informational: they don't count toward the shield. */
  gauges?: ResourceSource[];
}

export interface OrbSettings {
  red: OrbConfig;
  blue: OrbConfig;
}

export type OrbKey = keyof OrbSettings;

export interface ResourceReading {
  value: number;
  /** Absent for counters: show the number only. */
  max?: number;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

/** Reads a source off an actor. Returns null when the path doesn't exist, so the orb hides. */
export function readSource(actor: any, source: ResourceSource): ResourceReading | null {
  if (source.kind === "attribute") {
    if (!source.valuePath) return null;
    const value = num(foundry.utils.getProperty(actor.system, source.valuePath));
    if (value === null) return null;
    if (!source.maxPath) return { value };
    // maxPath may list fallbacks separated by "|"; the first one that exists wins
    // (e.g. a derived total, then the base value).
    for (const path of source.maxPath.split("|")) {
      const max = num(foundry.utils.getProperty(actor.system, path.trim()));
      if (max !== null) return { value, max };
    }
    return { value };
  }
  if (source.kind === "itemPool") {
    const gates = (source.activeWhen ?? "").split(",").map((p) => p.trim()).filter(Boolean);
    const items = actor.items.filter(
      (i: any) =>
        i.type === source.itemType &&
        (!gates.length || gates.some((p) => !!foundry.utils.getProperty(i.system, p)))
    );
    let value = 0;
    let max = 0;
    let found = 0;
    let hasMax = !!source.maxPath;
    for (const item of items) {
      const v = num(foundry.utils.getProperty(item.system, source.valuePath));
      if (v === null) continue;
      found++;
      value += v;
      if (source.maxPath) {
        const m = num(foundry.utils.getProperty(item.system, source.maxPath));
        if (m === null) hasMax = false;
        else max += m;
      }
    }
    if (!found) return null; // nothing worn: the source hides rather than showing 0
    return hasMax ? { value, max } : { value };
  }

  const item = actor.items.find((i: any) => i.name === source.itemName);
  const uses = item?.system?.uses;
  const max = num(uses?.max);
  if (!uses || max === null) return null;
  const value = num(uses.value) ?? max - (num(uses.spent) ?? 0);
  return { value, max };
}