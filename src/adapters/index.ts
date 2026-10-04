import type { SlotEntry } from "../bar/slots";
import { dnd5e } from "./dnd5e";
import { generic } from "./generic";
import { heroesUnlimited } from "./heroes-unlimited";
import { pf2e } from "./pf2e";

export interface UseContext {
  actor: any;
  event?: Event;
}

export interface Usage {
  /** Badge text, e.g. remaining uses or quantity. */
  text: string;
  depleted: boolean;
}

/** A ready-made item-pool source the config screen offers for this system. */
export interface PoolPreset {
  id: string;
  label: string;
  source: { itemType: string; valuePath: string; maxPath?: string; activeWhen?: string };
}

export interface Adapter {
  /**
   * Max path to use when the GM picks a tracked bar. Systems that add bonuses in derived data
   * (so the "base" `<bar>.max` is too low) return their effective-total path; null means `<bar>.max`.
   */
  barMax?(bar: string): string | null;
  /** Item-pool shortcuts shown in the shield source dropdown (e.g. worn armor S.D.C.). */
  poolPresets?: PoolPreset[];
  /** Turns system-specific drag data (e.g. PF2e strikes) into a slot entry, or null if unsupported. */
  convertDrop?(data: any, actor: any): Promise<SlotEntry | null>;
  /** Uses the slotted document. */
  use?(doc: any, ctx: UseContext): Promise<void>;
  /** Remaining uses / quantity for the badge. */
  usage?(doc: any): Usage | null;
  /** Short cost label for the tooltip (e.g. "1 Action"). */
  cost?(doc: any): string | null;
}

const SYSTEMS: Record<string, Adapter> = { dnd5e, pf2e, "heroes-unlimited": heroesUnlimited };

/** The generic adapter works everywhere; system adapters override only what they need. */
export const getAdapter = (): Adapter => ({ ...generic, ...(SYSTEMS[game.system.id] ?? {}) });