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
