const PREFIX = "Token Control Dock |";

const warned = new Set();

export function log(...args) {
  console.log(PREFIX, ...args);
}

export function warn(...args) {
  console.warn(PREFIX, ...args);
}

export function warnOnce(key, ...args) {
  if (warned.has(key)) return;
  warned.add(key);
  warn(...args);
}

export function error(...args) {
  console.error(PREFIX, ...args);
}

export function errorForControl(control, err) {
  const key = control?.key ?? `${control?.moduleId ?? "unknown"}.${control?.id ?? "unknown"}`;
  error(`Error in control "${key}"`, err);
}
