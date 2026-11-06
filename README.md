# OMORI Archipelago

[Archipelago](https://archipelago.gg) multiworld randomizer support for OMORI. Work in progress.

## Layout

- `apworld/omori/`: the Archipelago world (Python). Defines items, locations, regions, logic and options.
- `mod/`: the in-game client, a [OneLoader](https://mods.one) mod (JavaScript). It connects to the AP server, sends checks and receives items.
- `tools/`: dev tools. `extract.mjs` reads **your own** OMORI install and dumps the map/event graph (exits, item gains and the switches/variables/items that gate them) to `data/graph.json`.

## Design (draft)

- **Hub:** White Space. The door opens a menu with the areas you have unlocked. Area keys are items in the pool, Undertale-style.
- **Return:** Mari's picnic basket can warp you back to White Space.
- **Story flags:** when you enter an area from the hub, the mod sets the flags the vanilla game would have at that point, so its cutscenes run as intended. Bosses and story beats become AP events.
- **Missables:** detected from the event data, then either patched to stay available or left out of the location pool.
- **Party:** fixed (OMORI, AUBREY, KEL, HERO) at first. Party shuffle may come later as an option.

## Legal

This repo has no game assets or game data. You need your own copy of OMORI. `tools/` only reads your local install, and its output stays in `data/`, which is gitignored.
