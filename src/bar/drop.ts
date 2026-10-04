import { getAdapter } from "../adapters";
import type { SlotEntry } from "./slots";

/** Custom drag payload for dragging a slot to reorder or clear it. */
export const SLOT_DRAG_TYPE = "OrbHudSlot";

export type DropResult =
  | { kind: "entry"; entry: SlotEntry }
  | { kind: "swap"; from: number }
  | { kind: "convert"; data: any }
  | null;

export function getDragData(event: DragEvent): any {
  const TextEditor = foundry.applications.ux.TextEditor.implementation;
  return TextEditor.getDragEventData(event);
}

/** Turns drag data into a slot entry (or a swap request). Rejects items owned by other actors unless GM. */
export function parseDrop(data: any, actor: any): DropResult {
  if (!data?.type) return null;

  if (data.type === SLOT_DRAG_TYPE) {
    return data.actorUuid === actor.uuid && Number.isInteger(data.index) ? { kind: "swap", from: data.index } : null;
  }

  if (data.type === "Macro" && typeof data.uuid === "string") {
    return { kind: "entry", entry: { type: "Macro", uuid: data.uuid } };
  }

  if (data.type === "Item" && typeof data.uuid === "string") {
    const item = fromUuidSync(data.uuid, { strict: false });
    const owner = item?.parent;
    if (owner?.documentName === "Actor" && owner.id !== actor.id && !game.user.isGM) {
      ui.notifications.warn(game.i18n.localize("ORBHUD.Bar.OtherActor"));
      return null;
    }
    return { kind: "entry", entry: { type: "Item", uuid: data.uuid } };
  }

  return null;
}