# Changelog

## 0.1.5

- Restricted the rail experiment to Foundry native Scene Controls anchoring.
- Removed the manual DOM-created fallback anchor.
- Added visible diagnostics for Scene Controls hook registration.

## 0.1.4

- Reworked the dock from a floating panel into a Scene Controls rail attachment.
- Added a native Token Controls tool to provide a stable dock anchor.
- Added a selected-token marker that can appear even before dependent controls are visible.
- Rendered dependent module controls as compact buttons attached beneath the marker.

## 0.1.3

- Moved the dock to the right of the visible Scene Controls cluster to avoid overlapping the left-side menu.
- Added lightweight interaction refresh checks to improve selection-change reliability.

## 0.1.1

- Adjusted dock positioning to better avoid overlapping expanded Scene Controls tools.

## 0.1.0

- Initial MVP implementation.
- Adds `game.tokenControlDock` API.
- Adds selected-token dock UI.
- Adds client settings.
- Adds documentation for dependent module authors.
