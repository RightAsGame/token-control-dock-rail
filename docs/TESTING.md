# Manual Testing

## Foundry Versions

- Foundry VTT v13 latest stable available to tester
- Foundry VTT v14 latest stable available to tester

## Systems

- Simple Worldbuilding or another generic system
- dnd5e if available, but not required

## User Roles

- GM
- Player with owned token
- Player without owned token

## Test Matrix

1. Module appears in Manage Modules.
2. Module enables without console error.
3. `game.tokenControlDock` exists in the console during startup and after ready.
4. `Hooks.once("tokenControlDockApiReady", api => ...)` fires.
5. `Hooks.once("tokenControlDockReady", api => ...)` fires.
6. Register a console button.
7. Token Controls includes a Token Control Dock anchor tool.
8. Selecting one token shows the dock marker attached to the anchor tool.
9. Deselecting all tokens hides the dock marker.
10. Selecting multiple tokens keeps the dock marker active.
11. Registered controls appear as compact buttons below the dock marker.
12. Registered button receives correct selected tokens.
13. Registered button works with multiple tokens.
14. `visible: () => false` hides a control but leaves the selected-token marker visible.
15. Throwing `visible` callback does not break the dock.
16. `enabled: () => false` disables a control.
17. Throwing `enabled` callback disables that control.
18. Throwing `onClick` callback logs an error and does not break the dock.
19. `unregisterControl` removes a control.
20. `showDock` false hides the dock.
21. `showHeader` false does not affect the visual marker or attached controls.
22. `compactMode` changes styling.
23. `positionMode` fallback-left uses the fallback position.
24. Dock survives scene change.
25. Dock hides when canvas is unavailable.
26. Dock reappears after returning to a scene.
27. Dock does not block Scene Controls.
28. Dock does not appear over modal dialogs.
29. Player cannot use a dependent control unless that control allows it.
30. Token without actor does not crash.
31. Deleted selected token refreshes dock.
32. Reload browser; dock initializes cleanly.

## Console Test Control

```js
game.tokenControlDock.registerControl({
  id: "debug-log-selection",
  moduleId: "token-control-dock-debug",
  title: "Log Selection",
  icon: "fa-solid fa-bug",
  group: "Debug",
  order: 999,
  visible: ({ selectionCount }) => selectionCount > 0,
  onClick: ({ tokens }) => console.log("Selected tokens:", tokens)
});
```
