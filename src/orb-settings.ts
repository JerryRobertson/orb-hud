import { MODULE_ID } from "./constants";
import type { OrbKey, OrbSettings } from "./resources";

export type OverridePolicy = "none" | "blue" | "both";

export function getWorldOrbs(): OrbSettings {
  return game.settings.get(MODULE_ID, "orbs") as OrbSettings;
}

/** World default with the actor's partial override laid over it, orb by orb (main/shields replaced whole). */
export function getOrbSettings(actor?: any): OrbSettings {
  const world = getWorldOrbs();
  const override = actor?.getFlag(MODULE_ID, "orbs") as Partial<OrbSettings> | undefined;
  if (!override) return world;
  return {
    red: { ...world.red, ...override.red },
    blue: { ...world.blue, ...override.blue }
  };
}

/** Which orbs the current user may configure for this actor. */
export function editableOrbs(actor?: any): OrbKey[] {
  if (game.user.isGM) return ["red", "blue"];
  if (!actor?.isOwner) return [];
  const policy = game.settings.get(MODULE_ID, "overridePolicy") as OverridePolicy;
  return policy === "both" ? ["red", "blue"] : policy === "blue" ? ["blue"] : [];
}