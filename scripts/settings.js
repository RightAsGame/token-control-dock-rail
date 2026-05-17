import { MODULE_ID, SETTINGS } from "./constants.js";

export function registerSettings({ onChange } = {}) {
  game.settings.register(MODULE_ID, SETTINGS.showDock, {
    name: "TOKEN_CONTROL_DOCK.Settings.ShowDock.Name",
    hint: "TOKEN_CONTROL_DOCK.Settings.ShowDock.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange
  });

  game.settings.register(MODULE_ID, SETTINGS.showHeader, {
    name: "TOKEN_CONTROL_DOCK.Settings.ShowHeader.Name",
    hint: "TOKEN_CONTROL_DOCK.Settings.ShowHeader.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange
  });

  game.settings.register(MODULE_ID, SETTINGS.compactMode, {
    name: "TOKEN_CONTROL_DOCK.Settings.CompactMode.Name",
    hint: "TOKEN_CONTROL_DOCK.Settings.CompactMode.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange
  });

  game.settings.register(MODULE_ID, SETTINGS.positionMode, {
    name: "TOKEN_CONTROL_DOCK.Settings.PositionMode.Name",
    hint: "TOKEN_CONTROL_DOCK.Settings.PositionMode.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      "scene-controls": "Beside Scene Controls",
      "fallback-left": "Fallback Left"
    },
    default: "scene-controls",
    onChange
  });
}
