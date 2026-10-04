import type { Adapter } from "./index";

export const heroesUnlimited: Adapter = {
  poolPresets: [
    {
      id: "hu-armor",
      label: "Worn armor S.D.C. (equipped or natural)",
      // Mirrors the system's own damage routing: worn armor absorbs first, then personal S.D.C., then H.P.
      source: { itemType: "armor", valuePath: "sdc.value", maxPath: "sdc.max", activeWhen: "equipped,isNatural" }
    }
  ]
};
