/** Selected token's actor, else the user's character, else null (HUD hides). */
export function resolveActor(): any | null {
  const token = canvas?.tokens?.controlled?.[0];
  if (token?.actor) return token.actor;
  return game.user.character ?? null;
}