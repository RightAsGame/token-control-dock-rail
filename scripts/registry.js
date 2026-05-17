import { warn } from "./logger.js";

const VALID_TYPES = new Set(["button", "toggle", "component"]);

export class ControlRegistry {
  constructor() {
    this.controls = new Map();
  }

  register(control) {
    const normalized = this.#normalize(control);
    const existing = this.controls.get(normalized.key);

    if (existing) {
      warn(`Replacing duplicate control registration "${normalized.key}".`);
      this.#destroy(existing);
    }

    this.controls.set(normalized.key, normalized);
    return normalized;
  }

  unregister(moduleIdOrKey, id = undefined) {
    const key = id === undefined ? moduleIdOrKey : `${moduleIdOrKey}.${id}`;
    const control = this.controls.get(key);
    if (!control) return false;

    this.#destroy(control);
    return this.controls.delete(key);
  }

  get(moduleIdOrKey, id = undefined) {
    const key = id === undefined ? moduleIdOrKey : `${moduleIdOrKey}.${id}`;
    return this.controls.get(key) ?? null;
  }

  getAll() {
    return Array.from(this.controls.values()).sort(compareControls);
  }

  #normalize(control) {
    if (!control || typeof control !== "object") {
      throw new Error("Control registration must be an object.");
    }

    const id = String(control.id ?? "").trim();
    const moduleId = String(control.moduleId ?? "").trim();
    const title = String(control.title ?? "").trim();

    if (!id) throw new Error("Control registration requires a non-empty id.");
    if (!moduleId) throw new Error(`Control "${id}" requires a non-empty moduleId.`);
    if (!title) throw new Error(`Control "${moduleId}.${id}" requires a non-empty title.`);

    const type = VALID_TYPES.has(control.type) ? control.type : "button";

    return {
      ...control,
      id,
      moduleId,
      title,
      key: `${moduleId}.${id}`,
      label: control.label ? String(control.label) : "",
      icon: control.icon ? String(control.icon) : "",
      group: control.group ? String(control.group) : "default",
      order: Number.isFinite(Number(control.order)) ? Number(control.order) : 100,
      type,
      tooltip: control.tooltip ? String(control.tooltip) : "",
      cssClass: control.cssClass ? String(control.cssClass) : ""
    };
  }

  #destroy(control) {
    if (typeof control.onDestroy !== "function") return;
    try {
      control.onDestroy();
    } catch (err) {
      warn(`Error while destroying control "${control.key}".`, err);
    }
  }
}

function compareControls(a, b) {
  return a.group.localeCompare(b.group)
    || a.order - b.order
    || a.title.localeCompare(b.title)
    || a.key.localeCompare(b.key);
}
