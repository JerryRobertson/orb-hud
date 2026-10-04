export type ResourceSource = (
  | { kind: "attribute"; valuePath: string; maxPath?: string }
  | { kind: "itemUses"; itemName: string }
) & { label?: string };

export interface OrbConfig {
  label: string;
  color: string;
  main: ResourceSource;
  /** Red orb only: protective pools drained before health, summed into the shell. */
  shields?: ResourceSource[];
  shieldColor?: string;
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
    const max = num(foundry.utils.getProperty(actor.system, source.maxPath));
    return max === null ? { value } : { value, max };
  }
  const item = actor.items.find((i: any) => i.name === source.itemName);
  const uses = item?.system?.uses;
  const max = num(uses?.max);
  if (!uses || max === null) return null;
  const value = num(uses.value) ?? max - (num(uses.spent) ?? 0);
  return { value, max };
}