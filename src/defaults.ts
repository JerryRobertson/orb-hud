import type { OrbSettings } from "./resources";

const RED = "#b3202a";
const BLUE = "#2a5fc4";
const SHIELD = "#7fd4ff";

const hp = (value: string, max: string) => ({ kind: "attribute" as const, valuePath: value, maxPath: max });

// Starting world config per system. The GM edits the live copy in the config app.
const BY_SYSTEM: Record<string, OrbSettings> = {
  dnd5e: {
    red: {
      label: "HP", color: RED, main: hp("attributes.hp.value", "attributes.hp.max"),
      shields: [{ kind: "attribute", valuePath: "attributes.hp.temp", label: "Temp HP" }], shieldColor: SHIELD
    },
    blue: { label: "Spell Slots (1st)", color: BLUE, main: hp("spells.spell1.value", "spells.spell1.max") }
  },
  pf2e: {
    red: {
      label: "HP", color: RED, main: hp("attributes.hp.value", "attributes.hp.max"),
      shields: [{ kind: "attribute", valuePath: "attributes.hp.temp", label: "Temp HP" }], shieldColor: SHIELD
    },
    blue: { label: "Focus", color: BLUE, main: hp("resources.focus.value", "resources.focus.max") }
  },
  "heroes-unlimited": {
    red: {
      // HU keeps class/power/skill bonuses in derived totals (_total*Max); "hp.max" is only the base box.
      label: "HP", color: RED, main: hp("hp.value", "_totalHpMax|hp.max"),
      shields: [{ ...hp("sdc.value", "_totalSdcMax|sdc.max"), label: "S.D.C." }],
      shieldColor: SHIELD,
      // Worn armor belongs to the gear, not the person, so it's a gauge above the orb rather than shield.
      gauges: [
        { kind: "itemPool", itemType: "armor", valuePath: "sdc.value", maxPath: "sdc.max", activeWhen: "equipped,isNatural", label: "Armour" }
      ]
    },
    blue: { label: "P.P.E.", color: BLUE, main: hp("ppe.value", "_totalPpeMax|ppe.max") }
  }
};

const FALLBACK: OrbSettings = {
  red: { label: "HP", color: RED, main: hp("attributes.hp.value", "attributes.hp.max"), shields: [], shieldColor: SHIELD },
  blue: { label: "Resource", color: BLUE, main: hp("resources.primary.value", "resources.primary.max") }
};

export function getSystemDefaults(): OrbSettings {
  return foundry.utils.deepClone(BY_SYSTEM[game.system.id] ?? FALLBACK);
}