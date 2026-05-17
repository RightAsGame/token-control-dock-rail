import { HOOKS, MODULE_ID, SCENE_CONTROL_ANCHOR_ID, SETTINGS } from "./constants.js";
import { errorForControl, warnOnce } from "./logger.js";
import { createElement, debounce, emptyElement, getSetting, localize } from "./util.js";

const DOCK_ID = "token-control-dock";
const ANCHOR_ID = "token-control-dock-scene-control-anchor";
const FALLBACK_POSITION = { left: 72, top: 120 };
const DEFAULT_TOP_ROW_HEIGHT = 40;
const SCENE_CONTROLS_GAP = 6;
const RAIL_SEARCH_WIDTH = 160;

export class TokenControlDock {
  constructor({ registry, createContext }) {
    this.registry = registry;
    this.createContext = createContext;
    this.element = null;
    this.anchorElement = null;
    this.body = null;
    this.header = null;
    this.marker = null;
    this.count = null;
    this.visible = false;
    this.initialized = false;
    this.lastSelectionKey = "";
    this.refresh = debounce((reason = "refresh") => this.#render(reason));
    this.reposition = this.reposition.bind(this);
    this.onPotentialSelectionChange = this.onPotentialSelectionChange.bind(this);
    this.onAnchorClick = this.onAnchorClick.bind(this);
    this.registerSceneControlAnchor();
  }

  registerSceneControlAnchor() {
    Hooks.on("getSceneControlButtons", (controls) => {
      const tokens = controls?.tokens;
      if (!tokens) return;

      tokens.tools ??= {};
      tokens.tools[SCENE_CONTROL_ANCHOR_ID] = {
        name: SCENE_CONTROL_ANCHOR_ID,
        title: "TOKEN_CONTROL_DOCK.SceneControl.Title",
        icon: "fa-solid fa-grip-lines",
        button: true,
        order: 999,
        onChange: () => {
          this.reposition();
          this.refresh("sceneControlAnchor");
        }
      };
    });
  }

  initialize() {
    if (this.initialized) return;
    this.initialized = true;

    this.#createElement();
    this.#registerHooks();
    window.addEventListener("resize", this.reposition);
    document.addEventListener("pointerup", this.onPotentialSelectionChange, true);
    document.addEventListener("keyup", this.onPotentialSelectionChange, true);
  }

  isVisible() {
    return Boolean(this.initialized && this.visible && this.element && !this.element.classList.contains("tcd-hidden"));
  }

  destroy() {
    window.removeEventListener("resize", this.reposition);
    document.removeEventListener("pointerup", this.onPotentialSelectionChange, true);
    document.removeEventListener("keyup", this.onPotentialSelectionChange, true);
    this.element?.remove();
    this.anchorElement?.remove();
    this.element = null;
    this.anchorElement = null;
    this.body = null;
    this.header = null;
    this.marker = null;
    this.count = null;
    this.visible = false;
    this.initialized = false;
  }

  reposition() {
    if (!this.element) return;

    const positionMode = getSetting(MODULE_ID, SETTINGS.positionMode, "scene-controls");
    if (positionMode === "fallback-left") {
      this.#applyPosition(FALLBACK_POSITION.left, FALLBACK_POSITION.top);
      return;
    }

    const sceneControls = findSceneControlsElement();
    if (!sceneControls) {
      warnOnce("scene-controls-missing", "Scene Controls could not be located. Using fallback dock position.");
      this.#applyPosition(FALLBACK_POSITION.left, FALLBACK_POSITION.top);
      return;
    }

    this.#ensureAnchorElement(sceneControls);

    const rect = sceneControls.getBoundingClientRect();
    const position = getDockPosition(sceneControls, rect, this.anchorElement);
    const left = Math.max(0, Math.round(position.left));
    const top = Math.max(0, Math.round(position.top));

    this.#applyPosition(left, top);
  }

  onPotentialSelectionChange(event) {
    if (event?.target instanceof Node && this.element?.contains(event.target)) return;
    window.setTimeout(() => this.#refreshSelection("interaction"), 0);
  }

  onAnchorClick(event) {
    event.preventDefault();
    event.stopPropagation();
    this.reposition();
    this.refresh("anchorClicked");
  }

  #createElement() {
    this.element = createElement("div", {
      id: DOCK_ID,
      className: "token-control-dock tcd-hidden",
      attributes: {
        "aria-live": "polite"
      }
    });

    this.header = createElement("div", { className: "tcd-header" });
    const title = createElement("span", {
      className: "tcd-title",
      textContent: localize("TOKEN_CONTROL_DOCK.Ui.Title")
    });
    this.count = createElement("span", { className: "tcd-count" });
    this.header.append(title, this.count);

    this.marker = createElement("div", {
      className: "tcd-marker",
      attributes: { "aria-hidden": "true" }
    });
    this.body = createElement("div", { className: "tcd-body" });
    this.element.append(this.header, this.marker, this.body);
    this.element.addEventListener("click", (event) => this.#onClick(event));

    document.body.append(this.element);
    this.reposition();
  }

  #registerHooks() {
    Hooks.on("controlToken", () => this.#refreshSelection("controlToken"));
    Hooks.on("canvasReady", () => this.#refreshSelection("canvasReady"));
    Hooks.on("renderSceneControls", () => {
      this.reposition();
      this.refresh("renderSceneControls");
    });
    Hooks.on("updateToken", (document) => {
      if (this.#isSelectedTokenDocument(document)) this.refresh("updateToken");
    });
    Hooks.on("deleteToken", () => this.#refreshSelection("deleteToken"));

    if (typeof Hooks.events?.canvasTearDown !== "undefined") {
      Hooks.on("canvasTearDown", () => this.#refreshSelection("canvasTearDown"));
    } else {
      Hooks.on("canvasTearDown", () => this.#refreshSelection("canvasTearDown"));
    }
  }

  #refreshSelection(reason) {
    const context = this.createContext();
    const selectionKey = context.tokens.map((token) => token?.id ?? token?.document?.id ?? "").join("|");

    if (selectionKey !== this.lastSelectionKey) {
      this.lastSelectionKey = selectionKey;
      Hooks.callAll(HOOKS.selectionChanged, context);
    }

    this.refresh(reason);
  }

  #isSelectedTokenDocument(document) {
    if (!document) return false;
    const context = this.createContext();
    return context.tokenDocuments.some((selected) => selected === document || selected.id === document.id);
  }

  #render(reason) {
    if (!this.initialized || !this.element || !this.body) return;

    const context = this.createContext();
    const showDock = getSetting(MODULE_ID, SETTINGS.showDock, true);
    const canvasReady = Boolean(globalThis.canvas?.ready && globalThis.canvas?.scene);
    const hasSelection = context.selectionCount > 0;
    const visibleControls = showDock && canvasReady && hasSelection
      ? this.#getVisibleControls(context)
      : [];

    this.#applySettingsClasses();

    if (!showDock || !canvasReady || !hasSelection) {
      this.#hide();
      emptyElement(this.body);
      return;
    }

    this.#renderHeader(context);
    this.#renderControls(visibleControls, context);
    this.#show();
    this.reposition();

    Hooks.callAll(HOOKS.render, this.element, context);
  }

  #getVisibleControls(context) {
    const visible = [];

    for (const control of this.registry.getAll()) {
      if (this.#isControlVisible(control, context)) visible.push(control);
    }

    return visible;
  }

  #isControlVisible(control, context) {
    if (typeof control.visible !== "function") return true;

    try {
      return Boolean(control.visible(context));
    } catch (err) {
      errorForControl(control, err);
      return false;
    }
  }

  #isControlEnabled(control, context) {
    if (typeof control.enabled !== "function") return true;

    try {
      return Boolean(control.enabled(context));
    } catch (err) {
      errorForControl(control, err);
      return false;
    }
  }

  #isControlActive(control, context) {
    if (typeof control.active !== "function") return false;

    try {
      return Boolean(control.active(context));
    } catch (err) {
      errorForControl(control, err);
      return false;
    }
  }

  #renderHeader(context) {
    const showHeader = getSetting(MODULE_ID, SETTINGS.showHeader, true);
    this.header.hidden = !showHeader;
    this.count.textContent = localize("TOKEN_CONTROL_DOCK.Ui.SelectedCount", { count: context.selectionCount });
  }

  #renderControls(controls, context) {
    emptyElement(this.body);

    const byGroup = new Map();
    for (const control of controls) {
      if (!byGroup.has(control.group)) byGroup.set(control.group, []);
      byGroup.get(control.group).push(control);
    }

    for (const [group, groupControls] of byGroup.entries()) {
      const section = createElement("section", {
        className: "tcd-group",
        attributes: {
          "data-group": group,
          "aria-label": group
        }
      });
      const controlList = createElement("div", { className: "tcd-controls" });

      for (const control of groupControls) {
        const element = this.#renderControl(control, context);
        if (element) controlList.append(element);
      }

      section.append(controlList);
      this.body.append(section);
    }
  }

  #renderControl(control, context) {
    if (control.type === "component") return this.#renderComponent(control, context);
    return this.#renderButton(control, context);
  }

  #renderButton(control, context) {
    const enabled = this.#isControlEnabled(control, context);
    const active = this.#isControlActive(control, context);
    const button = createElement("button", {
      className: [
        "tcd-control",
        "tcd-button",
        control.icon ? "tcd-has-icon" : "",
        control.cssClass,
        active ? "tcd-active" : ""
      ].filter(Boolean).join(" "),
      attributes: {
        type: "button",
        "data-control-key": control.key,
        "aria-label": control.title,
        title: control.tooltip || control.title,
        disabled: !enabled,
        "aria-pressed": control.type === "toggle" ? String(active) : null
      }
    });

    if (control.icon) {
      const icon = createElement("i", {
        className: `tcd-icon ${control.icon}`,
        attributes: { "aria-hidden": "true" }
      });
      button.append(icon);
    }

    const text = control.label || (!control.icon ? control.title : "");
    if (text) {
      button.append(createElement("span", {
        className: "tcd-label",
        textContent: text
      }));
    }

    return button;
  }

  #renderComponent(control, context) {
    let element;

    try {
      element = control.render?.(context);
    } catch (err) {
      errorForControl(control, err);
      return null;
    }

    if (!(element instanceof HTMLElement)) {
      errorForControl(control, new Error("Component render must return an HTMLElement."));
      return null;
    }

    element.classList.add("tcd-component");
    element.dataset.controlKey = control.key;

    if (control.cssClass) {
      for (const className of control.cssClass.split(/\s+/).filter(Boolean)) element.classList.add(className);
    }

    if (typeof control.onRender === "function") {
      try {
        control.onRender(element, context);
      } catch (err) {
        errorForControl(control, err);
      }
    }

    return element;
  }

  async #onClick(event) {
    const target = event.target instanceof Element ? event.target.closest("[data-control-key]") : null;
    if (!target || !this.element?.contains(target)) return;

    const control = this.registry.get(target.dataset.controlKey);
    if (!control) return;

    const context = this.createContext(event);

    if (!this.#isControlEnabled(control, context)) return;
    if (typeof control.onClick !== "function") return;

    try {
      await control.onClick(context, event);
      Hooks.callAll(HOOKS.controlClicked, control, context, event);
      this.refresh("controlClicked");
    } catch (err) {
      errorForControl(control, err);
      globalThis.ui?.notifications?.error?.(localize("TOKEN_CONTROL_DOCK.Ui.ActionFailed"));
    }
  }

  #show() {
    const wasVisible = this.visible;
    this.visible = true;
    this.element.classList.remove("tcd-hidden");
    this.anchorElement?.classList.add("active");
    if (!wasVisible) this.element.classList.add("tcd-visible");
  }

  #hide() {
    this.visible = false;
    this.element?.classList.add("tcd-hidden");
    this.element?.classList.remove("tcd-visible");
    this.anchorElement?.classList.remove("active");
  }

  #applySettingsClasses() {
    const compact = getSetting(MODULE_ID, SETTINGS.compactMode, false);
    this.element.classList.toggle("tcd-compact", compact);
  }

  #applyPosition(left, top) {
    this.element.style.setProperty("--tcd-left", `${left}px`);
    this.element.style.setProperty("--tcd-top", `${top}px`);
  }

  #ensureAnchorElement(sceneControls) {
    const nativeAnchor = findDockSceneControlAnchor(sceneControls);
    if (nativeAnchor) {
      this.anchorElement = nativeAnchor;
      this.anchorElement.classList.toggle("active", this.visible);
      return;
    }

    if (this.anchorElement?.isConnected && sceneControls.contains(this.anchorElement)) {
      this.anchorElement.classList.toggle("active", this.visible);
      return;
    }

    const tokenTools = findTokenToolAnchors(sceneControls, sceneControls.getBoundingClientRect());
    const insertionAnchor = tokenTools.at(-1) ?? findTokenControlAnchor(sceneControls, sceneControls.getBoundingClientRect());
    const fallbackParent = findRailInsertionParent(sceneControls, insertionAnchor);
    const anchor = createElement("button", {
      id: ANCHOR_ID,
      className: "scene-control tcd-scene-anchor",
      attributes: {
        type: "button",
        "data-tool": SCENE_CONTROL_ANCHOR_ID,
        "aria-label": localize("TOKEN_CONTROL_DOCK.SceneControl.Title"),
        title: localize("TOKEN_CONTROL_DOCK.SceneControl.Title")
      }
    });
    anchor.append(createElement("i", {
      className: "fa-solid fa-grip-lines",
      attributes: { "aria-hidden": "true" }
    }));
    anchor.addEventListener("click", this.onAnchorClick);

    if (insertionAnchor?.parentElement) {
      insertionAnchor.insertAdjacentElement("afterend", anchor);
    } else {
      fallbackParent.append(anchor);
    }

    this.anchorElement = anchor;
    this.anchorElement.classList.toggle("active", this.visible);
  }
}

function findSceneControlsElement() {
  const selectors = [
    "#scene-controls",
    "#controls",
    ".scene-controls",
    "[data-application-id='scene-controls']",
    "[data-appid='scene-controls']"
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement && element.offsetParent !== null) return element;
  }

  return null;
}

function getDockPosition(sceneControls, rect, knownAnchor = null) {
  const dockAnchor = knownAnchor?.isConnected ? knownAnchor : findDockSceneControlAnchor(sceneControls);
  if (dockAnchor) {
    const anchorRect = dockAnchor.getBoundingClientRect();
    return {
      left: anchorRect.right + SCENE_CONTROLS_GAP,
      top: anchorRect.top
    };
  }

  const railBounds = getSceneControlsRailBounds(sceneControls, rect);
  const rulerAnchor = findRulerControlAnchor(sceneControls, rect);

  return {
    left: railBounds.right + SCENE_CONTROLS_GAP,
    top: rulerAnchor?.top ?? getDockTop(sceneControls, rect, SCENE_CONTROLS_GAP)
  };
}

function findDockSceneControlAnchor(sceneControls) {
  const selectors = [
    `#${ANCHOR_ID}`,
    `[data-tool="${SCENE_CONTROL_ANCHOR_ID}"]`,
    `[data-control="${SCENE_CONTROL_ANCHOR_ID}"]`,
    `[data-action="${SCENE_CONTROL_ANCHOR_ID}"]`,
    `[aria-label="${localize("TOKEN_CONTROL_DOCK.SceneControl.Title")}"]`,
    `[title="${localize("TOKEN_CONTROL_DOCK.SceneControl.Title")}"]`
  ];

  for (const selector of selectors) {
    const element = sceneControls.querySelector(selector);
    if (element instanceof HTMLElement && element.offsetParent !== null) return element;
  }

  return null;
}

function findTokenControlAnchor(sceneControls, rect) {
  const patterns = [
    /(^|\b)(token|tokens)(\b|$)/i,
    /token controls/i,
    /select token/i
  ];

  const candidates = getRailControlCandidates(sceneControls, rect)
    .map((candidate) => ({
      ...candidate,
      score: scoreRailAnchor(candidate.element, candidate.text, patterns)
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.rect.top - b.rect.top || a.rect.left - b.rect.left);

  return candidates[0]?.element ?? null;
}

function findTokenToolAnchors(sceneControls, rect) {
  const layerAnchor = findTokenControlAnchor(sceneControls, rect);
  const layerRect = layerAnchor?.getBoundingClientRect();
  const rawCandidates = getRailControlCandidates(sceneControls, rect)
    .filter(({ element }) => element !== layerAnchor && !element.closest(`#${ANCHOR_ID}`))
    .filter(({ rect: candidateRect }) => {
      if (!layerRect) return true;
      const isToolColumn = candidateRect.left > layerRect.left + 8;
      const isNearTokenTools = candidateRect.top >= layerRect.top - 8
        && candidateRect.top <= layerRect.top + 220;
      return isToolColumn && isNearTokenTools;
    });

  const toolColumnLeft = rawCandidates.reduce((left, { rect: candidateRect }) => {
    if (left === null) return candidateRect.left;
    return Math.min(left, candidateRect.left);
  }, null);

  const candidates = rawCandidates
    .filter(({ rect: candidateRect }) => toolColumnLeft === null || Math.abs(candidateRect.left - toolColumnLeft) <= 12)
    .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);

  return candidates.map(({ element }) => element);
}

function findRailInsertionParent(sceneControls, tokenAnchor) {
  const parent = tokenAnchor?.parentElement;
  if (parent instanceof HTMLElement) return parent;

  const groups = Array.from(sceneControls.querySelectorAll("menu, ul, ol, nav, div"))
    .filter((element) => element instanceof HTMLElement)
    .map((element) => ({
      element,
      controls: Array.from(element.children).filter((child) => child instanceof HTMLElement
        && child.getBoundingClientRect().width >= 24
        && child.getBoundingClientRect().height >= 24).length
    }))
    .sort((a, b) => b.controls - a.controls);

  return groups[0]?.element ?? sceneControls;
}

function getDockTop(sceneControls, rect, gap) {
  const topRow = findSceneControlTopRow(sceneControls, rect);
  if (topRow) return topRow.bottom + gap;
  return rect.top + DEFAULT_TOP_ROW_HEIGHT + gap;
}

function getSceneControlsRailBounds(sceneControls, rect) {
  const railRects = getRailControlCandidates(sceneControls, rect).map(({ rect: candidateRect }) => candidateRect);

  if (railRects.length === 0) {
    return {
      left: rect.left,
      right: rect.left + DEFAULT_TOP_ROW_HEIGHT
    };
  }

  return railRects.reduce((bounds, candidateRect) => ({
    left: Math.min(bounds.left, candidateRect.left),
    right: Math.max(bounds.right, candidateRect.right)
  }), {
    left: railRects[0].left,
    right: railRects[0].right
  });
}

function findSceneControlTopRow(sceneControls, rect) {
  const descendants = [sceneControls, ...Array.from(sceneControls.querySelectorAll("*"))];
  const candidates = descendants
    .filter((element) => element instanceof HTMLElement)
    .map((element) => ({ element, rect: element.getBoundingClientRect() }))
    .filter(({ rect: candidateRect }) => {
      const hasButtonSize = candidateRect.width >= 24 && candidateRect.height >= 24;
      const startsNearTop = Math.abs(candidateRect.top - rect.top) <= 10;
      const overlapsSceneControls = candidateRect.left >= rect.left - 8
        && candidateRect.left <= rect.right + 320;
      const isTopRowHeight = candidateRect.height <= DEFAULT_TOP_ROW_HEIGHT + 18;
      return hasButtonSize && startsNearTop && overlapsSceneControls && isTopRowHeight;
    })
    .sort((a, b) => b.rect.bottom - a.rect.bottom || b.rect.right - a.rect.right);

  return candidates[0]?.rect ?? null;
}

function findRulerControlAnchor(sceneControls, rect) {
  const patterns = [
    /(^|\b)(ruler|measure|measured|measurement)(\b|$)/i,
    /measure controls/i
  ];

  const candidates = getRailControlCandidates(sceneControls, rect)
    .map((candidate) => ({
      ...candidate,
      score: scoreRailAnchor(candidate.element, candidate.text, patterns)
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.rect.top - b.rect.top || a.rect.left - b.rect.left);

  return candidates[0]?.rect ?? null;
}

function getRailControlCandidates(sceneControls, rect) {
  const descendants = [sceneControls, ...Array.from(sceneControls.querySelectorAll("*"))];

  return descendants
    .filter((element) => element instanceof HTMLElement)
    .map((element) => {
      const candidateRect = element.getBoundingClientRect();
      const text = [
        element.id,
        element.className,
        element.dataset?.control,
        element.dataset?.tool,
        element.dataset?.action,
        element.getAttribute("aria-label"),
        element.getAttribute("title")
      ].filter(Boolean).join(" ");

      return { element, rect: candidateRect, text };
    })
    .filter(({ rect: candidateRect }) => {
      const hasControlSize = candidateRect.width >= 24 && candidateRect.width <= 72
        && candidateRect.height >= 24 && candidateRect.height <= 72;
      const insideRailBand = candidateRect.left >= rect.left - 8
        && candidateRect.left <= rect.left + RAIL_SEARCH_WIDTH
        && candidateRect.top >= rect.top - 8
        && candidateRect.top <= rect.top + 480;
      return hasControlSize && insideRailBand;
    });
}

function scoreRailAnchor(element, text, patterns) {
  if (!patterns.some((pattern) => pattern.test(text))) return 0;

  let score = 0;
  score += 4;
  if (element.classList.contains("active")) score += 2;
  if (element.getAttribute("aria-pressed") === "true") score += 2;
  if (element.matches("button, a, li, [role='button']")) score += 1;
  return score;
}
