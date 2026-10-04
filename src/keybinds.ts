import { MODULE_ID } from "./constants";
import { SLOT_COUNT } from "./bar/slots";

const DEFAULT_KEYS = ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5"];

/** Registers one rebindable key per slot. `use` returns true when it consumed the key. */
export function registerKeybinds(
  use: (index: number, event: Event | undefined) => boolean,
  changePage: (delta: number) => boolean
): void {
  // Unbound by default; players can assign keys under Configure Controls.
  game.keybindings.register(MODULE_ID, "pageUp", {
    name: "ORBHUD.Keys.PagePrev",
    editable: [],
    onDown: () => changePage(-1)
  });
  game.keybindings.register(MODULE_ID, "pageDown", {
    name: "ORBHUD.Keys.PageNext",
    editable: [],
    onDown: () => changePage(1)
  });
  for (let i = 0; i < SLOT_COUNT; i++) {
    game.keybindings.register(MODULE_ID, `slot${i + 1}`, {
      name: game.i18n.format("ORBHUD.Keys.Slot", { n: i + 1 }),
      editable: DEFAULT_KEYS[i] ? [{ key: DEFAULT_KEYS[i] }] : [],
      onDown: (ctx: any) => use(i, ctx?.event)
    });
  }
}

/** Display string for a slot's first binding, e.g. "Q" or "1". */
export function keyLabel(index: number): string {
  const binding = game.keybindings.get(MODULE_ID, `slot${index + 1}`)?.[0];
  if (!binding) return "";
  const KM = foundry.helpers?.interaction?.KeyboardManager ?? (globalThis as any).KeyboardManager;
  return KM.getKeycodeDisplayString(binding.key);
}