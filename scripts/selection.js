export function getSelection() {
  const selectedTokens = getControlledTokens();
  const tokenDocuments = selectedTokens.map((token) => token?.document).filter(Boolean);
  const actors = dedupeActors(selectedTokens.map((token) => token?.actor).filter(Boolean));

  const primaryToken = selectedTokens[0] ?? null;
  const primaryTokenDocument = primaryToken?.document ?? null;
  const primaryActor = primaryToken?.actor ?? null;

  return {
    tokens: selectedTokens,
    tokenDocuments,
    actors,
    primaryToken,
    primaryTokenDocument,
    primaryActor,
    selectionCount: selectedTokens.length
  };
}

export function createContext(event = undefined) {
  return {
    ...getSelection(),
    user: globalThis.game?.user ?? null,
    isGM: Boolean(globalThis.game?.user?.isGM),
    canvas: globalThis.canvas ?? null,
    ...(event ? { event } : {})
  };
}

function getControlledTokens() {
  const controlled = globalThis.canvas?.tokens?.controlled;
  if (!Array.isArray(controlled)) return [];
  return controlled.filter(Boolean);
}

function dedupeActors(actors) {
  const seen = new Set();
  const unique = [];

  for (const actor of actors) {
    const key = actor.id ?? actor.uuid ?? actor;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(actor);
  }

  return unique;
}
