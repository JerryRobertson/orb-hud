import { MODULE_ID } from "./constants";
import { getSystemDefaults } from "./defaults";
import { OrbConfigApp } from "./apps/OrbConfig";

export type HotbarMode = "shift" | "hide" | "none";

function applyHotbarMode(mode: HotbarMode): void {
  document.body.classList.toggle("orb-hud-hide-hotbar", mode === "hide");
  document.body.classList.toggle("orb-hud-shift-hotbar", mode === "shift");
}

function applyAlwaysNumbers(on: boolean): void {
  document.body.classList.toggle("orb-hud-always-numbers", on);
}

function applyScale(percent: number): void {
  document.documentElement.style.setProperty("--orb-hud-scale", String(percent / 100));
}

export type Visibility = "both" | "orbs" | "bar" | "none";

/** "orbs" means orbs only (bar hidden); "bar" means bar only (orbs hidden); "none" is handled by the HUD hiding itself. */
function applyVisibility(v: Visibility): void {
  document.body.classList.toggle("orb-hud-hide-bar", v === "orbs");
  document.body.classList.toggle("orb-hud-hide-orbs", v === "bar");
}

export const getVisibility = (): Visibility => game.settings.get(MODULE_ID, "visibility") as Visibility;

/** True when the ability bar is not visible, so its keys and paging should be inactive. */
export const isBarHidden = (): boolean => ["orbs", "none"].includes(getVisibility());

/** Hide everything, or bring back whatever was showing before. Returns true (so it can be a keybind handler). */
export function toggleHud(): boolean {
  const current = getVisibility();
  if (current === "none") {
    void game.settings.set(MODULE_ID, "visibility", game.settings.get(MODULE_ID, "lastVisibility") || "both");
  } else {
    void game.settings.set(MODULE_ID, "lastVisibility", current);
    void game.settings.set(MODULE_ID, "visibility", "none");
  }
  return true;
}

function applyPosition(position: "bottom" | "top"): void {
  document.body.classList.toggle("orb-hud-top", position === "top");
}

export function registerSettings(onOrbsChange: () => void): void {
  game.settings.register(MODULE_ID, "hotbarMode", {
    name: "ORBHUD.Settings.HotbarMode.Name",
    hint: "ORBHUD.Settings.HotbarMode.Hint",
    scope: "client",
    config: true,
    type: String,
    default: "shift",
    choices: {
      shift: "ORBHUD.Settings.HotbarMode.Shift",
      hide: "ORBHUD.Settings.HotbarMode.Hide",
      none: "ORBHUD.Settings.HotbarMode.None"
    },
    onChange: (mode: HotbarMode) => applyHotbarMode(mode)
  });

  const refreshHud = () => (game.modules.get(MODULE_ID) as any).api?.hud?.refresh();

  game.settings.register(MODULE_ID, "barPages", {
    name: "ORBHUD.Settings.BarPages.Name",
    hint: "ORBHUD.Settings.BarPages.Hint",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 1, max: 9, step: 1 },
    default: 3,
    onChange: refreshHud
  });

  // Which page this user is looking at; remembered between sessions.
  game.settings.register(MODULE_ID, "barPage", {
    scope: "client",
    config: false,
    type: Number,
    default: 0,
    onChange: refreshHud
  });

  game.settings.register(MODULE_ID, "visibility", {
    name: "ORBHUD.Settings.Visibility.Name",
    hint: "ORBHUD.Settings.Visibility.Hint",
    scope: "client",
    config: true,
    type: String,
    default: "both",
    choices: {
      both: "ORBHUD.Settings.Visibility.Both",
      orbs: "ORBHUD.Settings.Visibility.Orbs",
      bar: "ORBHUD.Settings.Visibility.Bar",
      none: "ORBHUD.Settings.Visibility.None"
    },
    onChange: (v: Visibility) => {
      applyVisibility(v);
      refreshHud();
      ui.controls?.render();
    }
  });

  // What the toggle restores when un-hiding.
  game.settings.register(MODULE_ID, "lastVisibility", { scope: "client", config: false, type: String, default: "both" });

  // Legacy GM-only on/off switch from v1.2; migrated to "visibility" on first load.
  game.settings.register(MODULE_ID, "gmView", { scope: "client", config: false, type: Boolean, default: true });

  game.settings.register(MODULE_ID, "position", {
    name: "ORBHUD.Settings.Position.Name",
    hint: "ORBHUD.Settings.Position.Hint",
    scope: "client",
    config: true,
    type: String,
    default: "bottom",
    choices: {
      bottom: "ORBHUD.Settings.Position.Bottom",
      top: "ORBHUD.Settings.Position.Top"
    },
    onChange: (position: "bottom" | "top") => {
      applyPosition(position);
      // Re-render so the bar's tooltips open away from the nearest screen edge.
      void (game.modules.get(MODULE_ID) as any).api?.hud?.render({ force: true });
    }
  });

  game.settings.register(MODULE_ID, "scale", {
    name: "ORBHUD.Settings.Scale.Name",
    hint: "ORBHUD.Settings.Scale.Hint",
    scope: "client",
    config: true,
    type: Number,
    range: { min: 75, max: 150, step: 5 },
    default: 100,
    onChange: (v: number) => applyScale(v)
  });

  game.settings.register(MODULE_ID, "alwaysNumbers", {
    name: "ORBHUD.Settings.AlwaysNumbers.Name",
    hint: "ORBHUD.Settings.AlwaysNumbers.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: (on: boolean) => applyAlwaysNumbers(on)
  });

  game.settings.register(MODULE_ID, "orbs", {
    scope: "world",
    config: false,
    type: Object,
    default: getSystemDefaults(),
    onChange: onOrbsChange
  });

  game.settings.register(MODULE_ID, "overridePolicy", {
    name: "ORBHUD.Settings.Policy.Name",
    hint: "ORBHUD.Settings.Policy.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "blue",
    choices: {
      none: "ORBHUD.Settings.Policy.None",
      blue: "ORBHUD.Settings.Policy.Blue",
      both: "ORBHUD.Settings.Policy.Both"
    }
  });

  game.settings.registerMenu(MODULE_ID, "orbConfig", {
    name: "ORBHUD.Settings.Config.Name",
    label: "ORBHUD.Settings.Config.Label",
    hint: "ORBHUD.Settings.Config.Hint",
    icon: "fa-solid fa-circle-half-stroke",
    type: OrbConfigApp,
    restricted: true
  });
}

export function applyClientSettings(): void {
  // Migrate the old GM-only switch: someone who had the HUD turned off keeps it off.
  if (game.settings.get(MODULE_ID, "gmView") === false) {
    void game.settings.set(MODULE_ID, "visibility", "none");
    void game.settings.set(MODULE_ID, "gmView", true);
  }
  applyVisibility(getVisibility());
  applyPosition(game.settings.get(MODULE_ID, "position") as "bottom" | "top");
  applyScale(game.settings.get(MODULE_ID, "scale") as number);
  applyAlwaysNumbers(game.settings.get(MODULE_ID, "alwaysNumbers") as boolean);
  applyHotbarMode(game.settings.get(MODULE_ID, "hotbarMode") as HotbarMode);
}