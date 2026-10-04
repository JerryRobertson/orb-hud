import { genericUsage } from "./generic";
import type { Adapter } from "./index";

export const dnd5e: Adapter = {
  async use(doc, { actor, event }) {
    if (doc.documentName === "Macro") {
      await doc.execute({ actor, token: actor.getActiveTokens?.()[0] });
      return;
    }
    await doc.use({ event }, { event });
  },
  cost(doc) {
    const label = doc.labels?.activation;
    return typeof label === "string" && label ? label : null;
  },
  /** Item uses/quantity first; otherwise the spell slots this spell would spend. */
  usage(doc) {
    const own = genericUsage(doc);
    if (own) return own;
    if (doc.type !== "spell") return null;
    try {
      const actor = doc.parent;
      const level = Number(doc.system.level);
      const method = doc.system.method ?? doc.system.preparation?.mode;
      if (!actor?.system?.spells || !(level > 0) || ["atwill", "innate", "ritual"].includes(method)) return null;

      const key =
        CONFIG.DND5E?.spellcasting?.[method]?.getSpellSlotKey?.(level) ?? (method === "pact" ? "pact" : `spell${level}`);
      const slot = actor.system.spells[key];
      if (!slot || typeof slot.value !== "number") return null;

      // Greyed only when nothing could cast it: no slot at this level, or (for normal slots) any higher level.
      let any = slot.value > 0;
      if (key !== "pact") {
        for (let l = level + 1; l <= 9 && !any; l++) any = (actor.system.spells[`spell${l}`]?.value ?? 0) > 0;
      }
      return { text: String(slot.value), depleted: !any };
    } catch (err) {
      console.warn("orb-hud | could not read dnd5e spell slots", err);
      return null;
    }
  }
};