import { MODULE_ID } from "./constants";

/** Selected token's actor, else the user's character, else null (HUD hides). */
export function resolveActor(): any | null {
  // The GM can switch their own HUD off (setting or scene-controls toggle).
  if (game.user.isGM && !game.settings.get(MODULE_ID, "gmView")) return null;
  const token = canvas?.tokens?.controlled?.[0];
  if (token?.actor) return token.actor;
  return game.user.character ?? null;
}