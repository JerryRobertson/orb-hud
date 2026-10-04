# Orb HUD

System-agnostic Foundry VTT module: red and blue resource orbs plus a drag-and-drop ability bar.
Targets Foundry v13 (minimum), v14 (verified). See the plan PDF for the full design.

## Develop

```
npm install
npm run link -- -DataPath "<your Foundry Data folder>"   # junction into Data/modules/orb-hud
npm run dev                                              # rebuild dist/orb-hud.js on change
```

Enable the module in a world; a blank HUD frame appears at the bottom of the screen (phase 1).