import type { Adapter } from "./index";

/**
 * HU stores only the "base box" in system.<pool>.max. Class (power category), skill, power and
 * level bonuses are added in prepareDerivedData and exposed as system._total<Pool>Max.
 */
const TOTAL_MAX: Record<string, string> = {
  hp: "_totalHpMax",
  sdc: "_totalSdcMax",
  ppe: "_totalPpeMax",
  isp: "_totalIspMax"
};

export const heroesUnlimited: Adapter = {
  /**
   * Stored `<pool>.max` is the permanent base form; power categories, skills, levels and alternate forms
   * (e.g. Alter Physical Structure) are layered on top in derived data. The system exposes the real ceiling
   * through HUActor#effectiveVitalMax, so any config pointing at `hp.max`, `sdc.max`, `ppe.max` or `isp.max`
   * (including ones saved before this was handled) reads the effective value.
   */
  effectiveMax(actor, maxPath) {
    const key = /^(hp|sdc|ppe|isp)\.max$/.exec(maxPath)?.[1];
    if (!key) return null;
    const effective =
      typeof actor.effectiveVitalMax === "function"
        ? actor.effectiveVitalMax(key)
        : actor.system?.[`_total${key[0].toUpperCase()}${key.slice(1)}Max`];
    return typeof effective === "number" ? effective : null;
  },
  /** Prefer the derived total, falling back to the base box. */
  barMax: (bar) => (TOTAL_MAX[bar] ? `${TOTAL_MAX[bar]}|${bar}.max` : null),
  poolPresets: [
    {
      id: "hu-armor",
      label: "Worn armor S.D.C. (equipped or natural)",
      // Mirrors the system's own damage routing: worn armor absorbs first, then personal S.D.C., then H.P.
      source: { itemType: "armor", valuePath: "sdc.value", maxPath: "sdc.max", activeWhen: "equipped,isNatural" }
    }
  ]
};
