# Token Control Dock API

The public API is exposed at:

```js
game.tokenControlDock
```

## Lifecycle Hooks

```js
Hooks.once("tokenControlDockApiReady", api => {});
Hooks.once("tokenControlDockReady", api => {});
```

`tokenControlDockApiReady` fires during `setup`, after the API exists but before canvas-dependent UI starts.

`tokenControlDockReady` fires during `ready`, after the dock UI is initialized.

## API Object

```js
{
  VERSION,
  MODULE_ID,
  registerControl,
  unregisterControl,
  getControl,
  getControls,
  refresh,
  getSelection,
  isVisible
}
```

### registerControl(control)

Registers or replaces a control. The internal key is `${moduleId}.${id}`.

Required fields:

- `id`: string
- `moduleId`: string
- `title`: string

Optional fields:

- `label`: string
- `icon`: string
- `group`: string, default `"default"`
- `order`: number, default `100`
- `type`: `"button" | "toggle" | "component"`, default `"button"`
- `tooltip`: string
- `cssClass`: string
- `visible(context): boolean`
- `enabled(context): boolean`
- `active(context): boolean`
- `onClick(context, event): Promise<void> | void`
- `render(context): HTMLElement`
- `onRender(element, context): void`
- `onDestroy(): void`

Component controls must return an `HTMLElement`. Raw HTML strings are not accepted in the MVP.

### unregisterControl(moduleIdOrKey, id)

Removes a control. Use either:

```js
api.unregisterControl("my-module.my-control");
api.unregisterControl("my-module", "my-control");
```

Returns `true` when a control was removed.

### getControl(moduleIdOrKey, id)

Returns a registered control or `null`.

### getControls()

Returns all registered controls sorted by group, order, title, and key.

### refresh(reason)

Debounced dock refresh. Safe to call before the canvas or dock UI exists.

### getSelection()

Returns the current selected-token state:

```js
{
  tokens,
  tokenDocuments,
  actors,
  primaryToken,
  primaryTokenDocument,
  primaryActor,
  selectionCount
}
```

Before canvas is available, this returns an empty selection.

### isVisible()

Returns `true` only when the dock UI is initialized and visible.

## Callback Context

Every callback receives:

```js
{
  tokens,
  tokenDocuments,
  actors,
  primaryToken,
  primaryTokenDocument,
  primaryActor,
  selectionCount,
  user,
  isGM,
  canvas,
  event
}
```

`event` is present for click callbacks.

## Public Hooks

```js
Hooks.callAll("tokenControlDockApiReady", game.tokenControlDock);
Hooks.callAll("tokenControlDockReady", game.tokenControlDock);
Hooks.callAll("tokenControlDockSelectionChanged", context);
Hooks.callAll("tokenControlDockRender", dockElement, context);
Hooks.callAll("tokenControlDockControlClicked", control, context, event);
```

## Examples

### Simple Button

```js
Hooks.once("tokenControlDockApiReady", api => {
  api.registerControl({
    id: "log-selection",
    moduleId: "example-module",
    title: "Log Selection",
    icon: "fa-solid fa-bug",
    onClick: ({ tokens }) => console.log(tokens)
  });
});
```

### GM-Only Button

```js
game.tokenControlDock.registerControl({
  id: "gm-only",
  moduleId: "example-module",
  title: "GM Only",
  label: "GM",
  visible: ({ isGM }) => isGM,
  onClick: () => console.log("GM clicked")
});
```

### Multi-Token Update Button

```js
game.tokenControlDock.registerControl({
  id: "set-name-prefix",
  moduleId: "example-module",
  title: "Prefix Token Names",
  label: "Prefix",
  enabled: ({ tokenDocuments, user }) => tokenDocuments.every(doc => doc.canUserModify?.(user, "update")),
  onClick: async ({ tokenDocuments }) => {
    await Promise.all(tokenDocuments.map(doc => doc.update({ name: `Marked ${doc.name}` })));
  }
});
```

### Custom Component

```js
game.tokenControlDock.registerControl({
  id: "component",
  moduleId: "example-module",
  title: "Custom Component",
  type: "component",
  render: ({ selectionCount }) => {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = `${selectionCount} selected`;
    element.addEventListener("click", () => console.log("component clicked"));
    return element;
  }
});
```
