# Orb HUD

A system-agnostic [Foundry VTT](https://foundryvtt.com) module that docks an action-RPG style HUD at the bottom of the screen: a red orb on the left, a blue orb on the right, and a drag-and-drop ability bar between them.

<!-- TODO: replace with a short screen recording, e.g. docs/orb-hud.gif -->
<!-- ![Orb HUD in action](docs/orb-hud.gif) -->

- **Red orb:** health. Protective pools (Temp HP, S.D.C., wards) are drawn as a frosty shield that creeps across the orb and absorbs hits first. The shield covers the orb in proportion to *shield ÷ max HP*, and fully covers it once the shield is at least your HP.
- **Blue orb:** a secondary pool (Chakra, Ki, Mana, Focus, spell slots, item uses...).
- **Ability bar:** drag items, spells, feats and macros from a sheet onto 10 slots, then click them or press a key.
- **Damage trail:** a paler layer lags behind the fill so a hit shows how much was lost.
- **Original art only.** Everything is drawn with CSS and SVG; no copyrighted game assets are included.

## Compatibility

| Foundry | Status |
|---|---|
| v13 | minimum |
| v14 | verified |

Works with any game system, because orbs are configured by data path rather than hard-coded. Systems with a little extra support:

| System | Extra support |
|---|---|
| D&D 5e | uses `item.use()`; activation cost in tooltips; sensible starting orbs |
| Pathfinder 2e | casts spells and consumes consumables; strikes can be dragged onto the bar; sensible starting orbs |
| Heroes Unlimited | sensible starting orbs (HP with S.D.C. shield, P.P.E.) |

On any other system, items and macros are used through the generic adapter (`item.use()`, `roll()`, `toMessage()`, ...), and the GM picks the orb sources in the config screen.

## Install

In Foundry, open **Add-on Modules → Install Module** and paste this into **Manifest URL**:

```
https://github.com/JerryRobertson/orb-hud/releases/latest/download/module.json
```

Then enable **Orb HUD** in your world under **Manage Modules**.

## Using it

### Which actor is shown

The HUD shows the actor of the token you have selected, otherwise your assigned character. With neither, it hides. The GM sees whichever token they select.

### Configuring the orbs (GM)

Open **Game Settings → Configure Settings → Orb HUD → Configure orbs**.

- Pick each orb's source from the dropdown, which lists the same tracked attributes as the token-bar picker plus any items with uses, or type a custom data path. The live value from a sample actor shows beside each source.
- Give each orb a label and colour.
- Add any number of **shield** sources to the red orb (Temp HP, S.D.C., wards...). They are summed into the shield.
- A path that doesn't exist on an actor hides that orb instead of showing 0/0. A source with no max shows as a plain number.

### Per-actor overrides

An **Orb HUD** button in the actor sheet header opens the same screen for that actor. It saves only what differs from the world default, so a monk can use Ki while a wizard uses Mana.

Players can override the blue orb of actors they own (from the sheet button, or by right-clicking the blue orb). The world setting **Players may override** controls this: *Nothing*, *Blue orb only* (default) or *Both orbs*.

### Ability bar

- **Add:** drag an item, spell, feat or macro onto a slot.
- **Use:** click the slot or press its key. Defaults: `Q W E R T 1 2 3 4 5`. Rebind them under **Configure Controls → Orb HUD**.
- **Rearrange:** drag one slot onto another to swap them.
- **Clear:** right-click a slot, or drag it off the bar.
- **Open the sheet:** Shift-click a slot.
- Badges show remaining uses or quantity. A slot greys out at 0, and gets a red border if the item or macro no longer exists.

The bar is stored on the actor, so it follows the character to whichever user controls it.

## Client settings

| Setting | What it does |
|---|---|
| Core hotbar | Move it above the HUD (default), hide it, or leave it alone |
| Always show orb numbers | Show `value / max` all the time instead of on hover |
| HUD scale | 75%–150% |

Colours and timings are CSS variables (`--orb-hud-size`, `--orb-hud-fill-duration`, `--orb-hud-trail-delay`, ...), so you can restyle the HUD without editing code. Animations respect `prefers-reduced-motion`.

## Development

```
npm install
npm run link -- -DataPath "<your Foundry Data folder>"   # junction into Data/modules/orb-hud
npm run dev                                              # rebuild dist/orb-hud.js on change
npm run build                                            # typecheck and bundle
```

Source is TypeScript bundled by Vite into a single `dist/orb-hud.js`. Adding a system means adding one file under `src/adapters/`.

### Releasing

Publish a GitHub release with a tag like `v0.2.0`. The workflow in `.github/workflows/release.yml` builds the module, stamps the version and URLs into `module.json`, and attaches `module.json` and `module.zip` to the release.

## License

[MIT](LICENSE). Foundry VTT itself is covered by its own [terms of use](https://foundryvtt.com/article/license/).
