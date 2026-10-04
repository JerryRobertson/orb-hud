import { getAdapter } from "../adapters";
import { MODULE_ID } from "../constants";
import { keyLabel } from "../keybinds";

export const SLOT_COUNT = 10;

export interface SlotEntry {
  type: "Item" | "Macro";
  uuid: string;
}
export type Slots = (SlotEntry | null)[];

export interface SlotView {
  index: number;
  filled: boolean;
  broken: boolean;
  img: string | null;
  name: string;
  tooltip: string;
  badge: string;
  depleted: boolean;
  key: string;
}

/** User-flag fallback key for actors the user doesn't own (flag keys can't hold dots). */
const userKey = (actor: any): string => actor.uuid.replaceAll(".", "_");

const normalize = (raw: any): SlotEntry | null =>
  raw && (raw.type === "Item" || raw.type === "Macro") && typeof raw.uuid === "string"
    ? { type: raw.type, uuid: raw.uuid }
    : null;

export function getSlots(actor: any): Slots {
  const raw = actor.isOwner
    ? actor.getFlag(MODULE_ID, "slots")
    : game.user.getFlag(MODULE_ID, "slots")?.[userKey(actor)];
  return Array.from({ length: SLOT_COUNT }, (_, i) => normalize(raw?.[i]));
}

/** Owners store the bar on the actor so it follows the character; everyone else on their own user. */
export async function setSlots(actor: any, slots: Slots): Promise<void> {
  if (actor.isOwner) await actor.setFlag(MODULE_ID, "slots", slots);
  else await game.user.setFlag(MODULE_ID, "slots", { [userKey(actor)]: slots });
}

export function resolveEntry(entry: SlotEntry): any | null {
  try {
    return fromUuidSync(entry.uuid, { strict: false }) ?? null;
  } catch {
    return null;
  }
}

export function slotView(entry: SlotEntry | null, index: number): SlotView {
  const key = keyLabel(index);
  const empty = { index, filled: false, broken: false, img: null, name: "", tooltip: "", badge: "", depleted: false, key };
  if (!entry) return empty;
  const doc = resolveEntry(entry);
  if (!doc) {
    return { ...empty, filled: true, broken: true, tooltip: game.i18n.localize("ORBHUD.Bar.Missing") };
  }
  const adapter = getAdapter();
  const usage = adapter.usage?.(doc) ?? null;
  const cost = adapter.cost?.(doc) ?? null;
  const esc = foundry.utils.escapeHTML;
  const lines = [`<strong>${esc(doc.name)}</strong>`];
  if (cost) lines.push(esc(cost));
  if (usage) lines.push(`${esc(game.i18n.localize("ORBHUD.Bar.Uses"))}: ${esc(usage.text)}`);
  return {
    ...empty,
    filled: true,
    img: doc.img ?? doc.texture?.src ?? null,
    name: doc.name,
    tooltip: lines.join("<br>"),
    badge: usage?.text ?? "",
    depleted: usage?.depleted ?? false
  };
}

export const slotViews = (actor: any): SlotView[] => getSlots(actor).map(slotView);