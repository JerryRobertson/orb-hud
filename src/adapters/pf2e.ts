import { genericUsage } from "./generic";
import type { Adapter } from "./index";

/**
 * PF2e drags strikes/actions as { type: "Action", index }, which isn't a document.
 * Mirror what PF2e's own hotbar does: find or create a world macro that calls
 * game.pf2e.rollActionMacro, and slot that macro.
 */
export const pf2e: Adapter = {
  /** Item uses/quantity first; otherwise what the spell draws on: focus points, innate uses, or slots. */
  usage(doc) {
    const own = genericUsage(doc);
    if (own) return own;
    if (doc.type !== "spell" || doc.isCantrip || doc.isRitual) return null;
    try {
      const entry = doc.spellcasting;
      const actor = doc.actor;
      if (!entry || !actor) return null;

      if (doc.isFocusSpell || entry.category === "focus") {
        const focus = actor.system.resources?.focus;
        return typeof focus?.value === "number" ? { text: String(focus.value), depleted: focus.value <= 0 } : null;
      }

      const kind = entry.system?.prepared?.value;
      if (kind === "innate") {
        const uses = doc.system.location?.uses;
        return typeof uses?.value === "number" ? { text: String(uses.value), depleted: uses.value <= 0 } : null;
      }

      const slot = entry.system?.slots?.[`slot${doc.rank}`];
      if (!slot) return null;
      if (kind === "prepared") {
        const left = (slot.prepared ?? []).filter((p: any) => p?.id === doc.id && !p.expended).length;
        return { text: String(left), depleted: left <= 0 };
      }
      return typeof slot.value === "number" ? { text: String(slot.value), depleted: slot.value <= 0 } : null;
    } catch (err) {
      console.warn("orb-hud | could not read PF2e spell slots", err);
      return null;
    }
  },

  async use(doc, { actor, event }) {
    if (doc.documentName === "Macro") {
      await doc.execute({ actor, token: actor.getActiveTokens?.()[0] });
      return;
    }
    if (doc.type === "spell") {
      try {
        await doc.spellcasting.cast(doc, { rank: doc.rank });
        return;
      } catch (err) {
        console.warn("orb-hud | PF2e spell cast failed, posting the spell card instead", err);
      }
    }
    if (doc.type === "consumable" && typeof doc.consume === "function") {
      await doc.consume();
      return;
    }
    await doc.toMessage(event);
  },

  async convertDrop(data, actor) {
    if (data?.type !== "Action" || data.index === undefined) return null;
    const action = actor.system?.actions?.[data.index];
    if (!action) return null;

    const kind = game.i18n.localize(action.type === "strike" ? "PF2E.WeaponStrikeLabel" : action.attackRollType);
    const name = `${kind}: ${action.label}`;
    const command = `game.pf2e.rollActionMacro({ actorUUID: "${actor.uuid}",  type: "${action.type}", itemId: "${action.item.id}", slug: "${action.slug}" })`;

    const existing = game.macros.find((m: any) => m.name === name && m.command === command);
    const macro =
      existing ??
      (await getDocumentClass("Macro").create(
        { name, command, type: "script", img: action.item.img, flags: { pf2e: { actionMacro: true } } },
        { renderSheet: false }
      ));
    return macro ? { type: "Macro", uuid: macro.uuid } : null;
  }
};