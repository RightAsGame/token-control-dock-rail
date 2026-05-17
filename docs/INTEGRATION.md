# Hosting Controls in Token Control Dock

This guide is for developers who want their Foundry VTT module to add controls to Token Control Dock.

Token Control Dock is a shared selected-token UI. It does not provide token actions by itself. Your module registers controls, decides when they are visible, decides when they are enabled, and performs the actual action when clicked.

## Requirements

Your module should require Token Control Dock in `module.json`:

```json
{
  "relationships": {
    "requires": [
      {
        "id": "token-control-dock",
        "type": "module",
        "compatibility": {
          "minimum": "0.1.3"
        }
      }
    ]
  }
}
```

If Token Control Dock is optional for your module, check for the API before registering controls:

```js
const api = game.tokenControlDock;
if (!api) return;
```

## When to Register

Preferred:

```js
Hooks.once("tokenControlDockApiReady", api => {
  api.registerControl({
    id: "my-control",
    moduleId: "my-module",
    title: "My Control",
    icon: "fa-solid fa-wand-magic-sparkles",
    visible: ({ selectionCount }) => selectionCount > 0,
    onClick: async (context) => {
      console.log(context.tokens);
    }
  });
});
```

Late registration is also supported:

```js
game.tokenControlDock?.registerControl({ ... });
```

Use `tokenControlDockApiReady` when you only need the API/registry. Use `tokenControlDockReady` if your setup depends on the dock UI already existing.

## Control Schema

Required fields:

- `id`: unique control id within your module.
- `moduleId`: your Foundry module id.
- `title`: human-readable title used for accessibility and fallback text.

Optional fields:

- `label`: visible button text.
- `icon`: Font Awesome class, such as `"fa-solid fa-skull"`.
- `group`: group heading in the dock, default `"default"`.
- `order`: sort order within the group, default `100`.
- `type`: `"button"`, `"toggle"`, or `"component"`, default `"button"`.
- `tooltip`: button title text. Falls back to `title`.
- `cssClass`: extra CSS classes.
- `visible(context)`: return false to hide the control.
- `enabled(context)`: return false to disable the control.
- `active(context)`: return true for active toggle state.
- `onClick(context, event)`: run the control action.
- `render(context)`: for component controls, return an `HTMLElement`.
- `onRender(element, context)`: called after a component is rendered.
- `onDestroy()`: called when your control is replaced or unregistered.

The internal key is `${moduleId}.${id}`. Registering the same key again replaces the old control.

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

`tokens` comes from `canvas.tokens.controlled`. Actorless or broken tokens are possible, so do not assume every token has an actor.

`event` is present for click callbacks.

## Visibility and Permissions

Token Control Dock is permission-neutral. Your module must decide who can see or use each control.

For GM-only controls:

```js
visible: ({ isGM }) => isGM
```

For token update permissions:

```js
enabled: ({ tokenDocuments, user, isGM }) => {
  return tokenDocuments.every(doc => {
    if (doc.canUserModify) return doc.canUserModify(user, "update");
    return isGM;
  });
}
```

Keep `visible` for whether the control belongs in the dock at all. Use `enabled` when the user should see the control but cannot currently use it.

## Single and Multi-Token Controls

Controls should explicitly decide whether they support multiple selected tokens.

Single-token only:

```js
visible: ({ selectionCount }) => selectionCount === 1
```

Multi-token action:

```js
onClick: async ({ tokenDocuments }) => {
  await Promise.all(tokenDocuments.map(doc => doc.update({ hidden: true })));
}
```

## Component Controls

Use `type: "component"` only when a button or toggle is not enough.

Component `render` must return an `HTMLElement`. Raw HTML strings are not accepted.

```js
game.tokenControlDock.registerControl({
  id: "owner-select",
  moduleId: "my-module",
  title: "Owner Select",
  type: "component",
  group: "Ownership",
  render: (context) => {
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Owner");
    select.append(new Option("No owner", ""));
    return select;
  }
});
```

Avoid expensive work inside `render`; the dock may refresh whenever selection or token data changes.

## Error Isolation

Token Control Dock catches errors from dependent controls:

- Throwing `visible` hides the control.
- Throwing `enabled` disables the control.
- Throwing `active` treats the control as inactive.
- Throwing `render` skips the component.
- Throwing `onClick` logs the error and shows a generic notification.

Errors are logged with your control key:

```text
Token Control Dock | Error in control "my-module.my-control"
```

Even though errors are isolated, your module should still handle expected failure cases and show helpful notifications where appropriate.

## Good Dock Citizenship

- Keep controls compact.
- Prefer icons for repeated actions.
- Use clear `title` and `aria-label` text.
- Avoid system-specific assumptions unless your module is system-specific.
- Do not mutate Token Control Dock DOM outside your own component element.
- Do not rely on Token Control Dock internals or private fields.
- Do not patch Foundry core classes to integrate with the dock.
- Unregister controls if your module disables a feature at runtime.

## Full Example

```js
Hooks.once("tokenControlDockApiReady", api => {
  api.registerControl({
    id: "mark-reviewed",
    moduleId: "my-module",
    title: "Mark Reviewed",
    icon: "fa-solid fa-check",
    group: "Workflow",
    order: 20,
    visible: ({ selectionCount }) => selectionCount > 0,
    enabled: ({ tokenDocuments, user, isGM }) => {
      return tokenDocuments.every(doc => {
        if (doc.canUserModify) return doc.canUserModify(user, "update");
        return isGM;
      });
    },
    onClick: async ({ tokenDocuments }) => {
      await Promise.all(tokenDocuments.map(doc => {
        return doc.setFlag("my-module", "reviewed", true);
      }));
      ui.notifications.info("Selected tokens marked reviewed.");
    }
  });
});
```

## Testing Checklist

Test your controls with:

- no token selected,
- one token selected,
- multiple tokens selected,
- a token without an actor,
- a GM user,
- a player who owns the token,
- a player who does not own the token,
- `visible`, `enabled`, and `onClick` failure cases.

Your module should fail gracefully without preventing other Token Control Dock controls from rendering or working.
