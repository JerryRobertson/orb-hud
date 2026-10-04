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
  applyScale(game.settings.get(MODULE_ID, "scale") as number);
  applyAlwaysNumbers(game.settings.get(MODULE_ID, "alwaysNumbers") as boolean);
  applyHotbarMode(game.settings.get(MODULE_ID, "hotbarMode") as HotbarMode);
}