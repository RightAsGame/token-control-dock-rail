export function debounce(fn) {
  let pending = false;
  let lastArgs = [];

  return function debounced(...args) {
    lastArgs = args;
    if (pending) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      fn(...lastArgs);
    });
  };
}

export function localize(key, data = undefined) {
  if (!globalThis.game?.i18n) return key;
  if (data) return game.i18n.format(key, data);
  return game.i18n.localize(key);
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function emptyElement(element) {
  while (element.firstChild) element.firstChild.remove();
}

export function createElement(tag, options = {}) {
  const element = document.createElement(tag);

  if (options.id) element.id = options.id;
  if (options.className) element.className = options.className;
  if (options.textContent !== undefined) element.textContent = options.textContent;

  for (const [key, value] of Object.entries(options.attributes ?? {})) {
    if (value === false || value === null || value === undefined) continue;
    element.setAttribute(key, value === true ? "" : String(value));
  }

  return element;
}

export function getSetting(moduleId, key, fallback) {
  try {
    if (!globalThis.game?.settings) return fallback;
    return game.settings.get(moduleId, key);
  } catch (_err) {
    return fallback;
  }
}
