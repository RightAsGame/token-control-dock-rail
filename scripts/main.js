import { createTokenControlDockApi } from "./api.js";
import { HOOKS } from "./constants.js";
import { TokenControlDock } from "./dock.js";
import { ControlRegistry } from "./registry.js";
import { registerSettings } from "./settings.js";
import { createContext, getSelection } from "./selection.js";

let registry;
let dock;
let api;

Hooks.once("init", () => {
  registry = new ControlRegistry();
  dock = new TokenControlDock({ registry, createContext });

  registerSettings({
    onChange: () => {
      dock.refresh("settingChanged");
      dock.reposition();
    }
  });

  api = createTokenControlDockApi({ registry, dock, getSelection });
  game.tokenControlDock = api;
});

Hooks.once("setup", () => {
  Hooks.callAll(HOOKS.apiReady, game.tokenControlDock);
});

Hooks.once("ready", () => {
  dock.initialize();
  dock.refresh("ready");
  Hooks.callAll(HOOKS.ready, game.tokenControlDock);
});
