# Developer Notes

## Architecture

Token Control Dock is split into small modules:

- `scripts/main.js`: Foundry lifecycle wiring.
- `scripts/api.js`: public API surface.
- `scripts/registry.js`: control validation, storage, sorting, and unregister.
- `scripts/selection.js`: safe selected-token context creation.
- `scripts/dock.js`: DOM creation, rendering, click handling, and positioning.
- `scripts/settings.js`: client settings.
- `scripts/logger.js`: consistent console logging.
- `scripts/util.js`: small shared utilities.

## Lifecycle

During `init`, the module registers settings, creates the registry and API object, and assigns `game.tokenControlDock`.

During `setup`, the module fires `tokenControlDockApiReady`. Dependent modules can safely register controls here.

During `ready`, the module creates the dock DOM, registers canvas/UI hooks, refreshes, and fires `tokenControlDockReady`.

Canvas-dependent behavior is defensive. Before the canvas exists, `getSelection()` returns an empty selection, `refresh()` is safe, and `isVisible()` returns false.

## Why No TokenHUD Patching

The native Token HUD is Foundry UI owned by core and other modules often interact with it. Patching or replacing it increases compatibility risk. Token Control Dock is an independent UI layer, so dependent modules get selected-token controls without modifying Foundry's Token HUD.

## Why No SceneControls Patching

The dock is contextual selected-token UI, not a scene tool mode. For MVP, the module positions itself beside Scene Controls but does not mutate Scene Controls, call `getSceneControlButtons`, patch SceneControls, or add a Scene Controls toggle.

## Compatibility

The module targets Foundry v14 and remains compatible with v13 by avoiding private APIs and relying on public hooks and defensive DOM positioning. Scene Controls are located through several broad selectors, and a fixed fallback position is used when no suitable element is found.

## Safe Callback Policy

Dependent module callbacks are isolated:

- `visible` errors hide the control.
- `enabled` errors disable the control.
- `active` errors treat the control as inactive.
- `render` errors skip the component.
- `onClick` errors are logged and shown as a generic notification.

Errors are logged with the control key so the owner can be identified.

## Permission-Neutral Behavior

The dock does not enforce GM-only behavior. Controls decide visibility and enabled state from the callback context. The context includes `user`, `isGM`, selected tokens, token documents, actors, and the canvas.
