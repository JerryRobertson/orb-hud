import type { Adapter, Usage } from "./index";

/** Remaining uses from system.uses, else consumable quantity. Shared by most systems. */
export function genericUsage(doc: any): Usage | null {
  if (doc?.documentName !== "Item") return null;
  const sys = doc.system;
  const max = Number(sys?.uses?.max);
  if (max > 0) {
    const value = Number(sys.uses.value ?? max - Number(sys.uses.spent ?? 0));
    return { text: String(value), depleted: value <= 0 };
  }
  if (doc.type === "consumable" && typeof sys?.quantity === "number") {
    return { text: String(sys.quantity), depleted: sys.quantity <= 0 };
  }
  return null;
}

export const generic: Adapter = {
  async use(doc, { actor, event }) {
    if (doc.documentName === "Macro") {
      const token = actor.getActiveTokens?.()[0];
      await doc.execute({ actor, token });
      return;
    }
    // Item: try the system's own entry points, then fall back to posting to chat.
    for (const method of ["use", "roll", "toMessage", "toChat", "displayCard"]) {
      if (typeof doc[method] === "function") {
        if (method !== "use") console.warn(`orb-hud | no adapter for ${game.system.id}; falling back to item.${method}()`);
        await doc[method]({ event });
        return;
      }
    }
    ui.notifications.warn(`Orb HUD: don't know how to use "${doc.name}" in ${game.system.id}.`);
  },
  usage: genericUsage,
  cost: () => null
};