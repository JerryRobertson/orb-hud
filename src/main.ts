import { OrbHud } from "./apps/OrbHud";
import { OrbConfigApp } from "./apps/OrbConfig";
import { MODULE_ID } from "./constants";
import { applyClientSettings, registerSettings } from "./settings";
import { resolveActor } from "./actor-resolver";
import { editableOrbs } from "./orb-settings";
import { registerKeybinds } from "./keybinds";

let hud: OrbHud | undefined;

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | init`);
  registerSettings(() => hud?.refresh());
  registerKeybinds((index, event) => hud?.useSlot(index, event) ?? false);
  void foundry.applications.handlebars.loadTemplates([
    "modules/orb-hud/templates/source-row.hbs"
  ]);
});

/** Adds an "Orb HUD" button to actor sheets (ApplicationV2 and legacy v1 sheets). */
function registerSheetButtons(): void {
  Hooks.on("getHeaderControlsApplicationV2", (app: any, controls: any[]) => {
    const actor = app.document;
    if (actor?.documentName !== "Actor" || !editableOrbs(actor).length) return;
    app.options.actions.orbHudConfig = () => OrbConfigApp.open(actor);
    controls.push({ icon: "fa-solid fa-circle-half-stroke", label: "ORBHUD.Title", action: "orbHudConfig" });
  });

  Hooks.on("getActorSheetHeaderButtons", (sheet: any, buttons: any[]) => {
    const actor = sheet.document ?? sheet.actor;
    if (!actor || !editableOrbs(actor).length) return;
    buttons.unshift({
      label: game.i18n.localize("ORBHUD.Title"),
      class: "orb-hud-config",
      icon: "fa-solid fa-circle-half-stroke",
      onclick: () => OrbConfigApp.open(actor)
    });
  });
}

Hooks.once("ready", () => {
  applyClientSettings();
  hud = new OrbHud();
  void hud.render({ force: true });
  (game.modules.get(MODULE_ID) as any).api = { hud };
  registerSheetButtons();

  const refresh = foundry.utils.debounce(() => hud?.refresh(), 50);
  const isCurrent = (actor: any) => !!actor && actor.uuid === resolveActor()?.uuid;

  Hooks.on("controlToken", refresh);
  Hooks.on("canvasReady", refresh);
  Hooks.on("updateActor", (actor: any) => isCurrent(actor) && refresh());
  Hooks.on("updateToken", (token: any) => isCurrent(token.actor) && refresh());
  Hooks.on("updateUser", (user: any) => user.id === game.user.id && refresh());
  for (const h of ["createMacro", "updateMacro", "deleteMacro"]) Hooks.on(h, refresh);
  for (const h of ["createItem", "updateItem", "deleteItem"]) {
    Hooks.on(h, (item: any) => isCurrent(item.parent) && refresh());
  }
});