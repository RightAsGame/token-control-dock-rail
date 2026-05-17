import { MODULE_ID, VERSION } from "./constants.js";

export function createTokenControlDockApi({ registry, dock, getSelection }) {
  return Object.freeze({
    VERSION,
    MODULE_ID,

    registerControl(control) {
      const registered = registry.register(control);
      dock?.refresh?.("controlsChanged");
      return registered;
    },

    unregisterControl(moduleIdOrKey, id = undefined) {
      const removed = registry.unregister(moduleIdOrKey, id);
      if (removed) dock?.refresh?.("controlsChanged");
      return removed;
    },

    getControl(moduleIdOrKey, id = undefined) {
      return registry.get(moduleIdOrKey, id);
    },

    getControls() {
      return registry.getAll();
    },

    refresh(reason = "api") {
      dock?.refresh?.(reason);
    },

    getSelection() {
      return getSelection();
    },

    isVisible() {
      return Boolean(dock?.isVisible?.());
    }
  });
}
