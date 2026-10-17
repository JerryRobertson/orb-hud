import { MODULE_ID } from "./constants";

/** Selected token's actor, else the user's character, else null (HUD hides). */
export function resolveActor(): any | null {
  // Anyone can hide the whole HUD (setting, token-controls button or key).
  if (game.settings.get(MODULE_ID, "visibility") === "none") return null;
  const token = canvas?.tokens?.controlled?.[0];
  if (token?.actor) return token.actor;
  return game.user.character ?? null;
}