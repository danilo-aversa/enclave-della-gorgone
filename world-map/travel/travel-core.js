// v0.59 2026-04-30T23:05:00.000Z
(function () {
  "use strict";

  var TRAVEL_DEFAULTS = {
    hexSize: 50,
    milesPerHex: 6,
    defaultTerrain: "plain",
    displayMode: "off", // off | debug | editor
    gridColor: "white", // black | cyan | white
    gridOpacity: 0.24,
    terrainOpacity: 0.75,
    autosaveDelayMs: 900,
    paintAutosaveDelayMs: 1400,
  };

  var TRAVEL_MAP_CONFIG = {
    faerun: {
      hexSize: 5,
      milesPerHex: 0.5,
      defaultTerrain: "plain",
      storageMode: "chunks", // unified | chunks | auto
      chunkSize: 128,
      maxLoadedChunks: 128,
      maxVisibleHexes: 18000,
      maxVisibleHexesDebug: 26000,
      maxPathIterations: 320000,
      autosaveDelayMs: 1200,
      paintAutosaveDelayMs: 1800,
      routeChunkBufferHexes: 128,
      routeChunkSampleStepHexes: 128,
    },
    moonshae: {
      hexSize: 24,
      milesPerHex: 3,
      defaultTerrain: "plain",
      storageMode: "chunks", // unified | chunks | auto
      chunkSize: 128,
      maxLoadedChunks: 64,
      routeChunkBufferHexes: 32,
      routeChunkSampleStepHexes: 48,
    },
  };

  var TRAVEL_MODES = {
    foot: {
      label: "A piedi",
      speedMilesPerDay: {
        slow: 18,
        normal: 24,
        fast: 30,
      },
      allowedWater: false,
      allowedBlocked: false,
      costMultiplier: 1,
      roadMultiplier: 0.6,
    },
    horse: {
      label: "A cavallo",
      speedMilesPerDay: {
        slow: 24,
        normal: 32,
        fast: 40,
      },
      allowedWater: false,
      allowedBlocked: false,
      costMultiplier: 0.85,
      roadMultiplier: 0.5,
      terrainMultipliers: {
        mountain: 1.25,
        swamp: 1.25,
        forest: 1.1,
        desert: 1.25,
        arctic: 1.25,
      },
    },
    wagon: {
      label: "Carro",
      speedMilesPerDay: {
        slow: 15,
        normal: 20,
        fast: 25,
      },
      allowedWater: false,
      allowedBlocked: false,
      costMultiplier: 1.15,
      roadMultiplier: 0.45,
      terrainMultipliers: {
        mountain: 1.6,
        swamp: 1.8,
        forest: 1.35,
        hill: 1.25,
        desert: 1.5,
        arctic: 1.7,
      },
    },
    ship: {
      label: "Nave",
      speedMilesPerDay: {
        slow: 36,
        normal: 48,
        fast: 60,
      },
      waterOnly: true,
      allowedWater: true,
      allowedBlocked: false,
      costMultiplier: 1,
      roadMultiplier: 1,
    },
    air: {
      label: "Volo",
      speedMilesPerDay: {
        slow: 36,
        normal: 48,
        fast: 60,
      },
      allowedWater: true,
      allowedBlocked: false,
      ignoreTerrainCost: true,
      costMultiplier: 1,
      roadMultiplier: 1,
    },
  };

  var WATER_REGION_TYPES = {
    ocean: "Oceano",
    sea: "Mare",
    lake: "Lago",
    river: "Fiume",
  };

  var TERRAIN_TYPES = {
    plain: {
      label: "Pianura",
      cost: 1,
      risk: 0,
      color: "rgba(180, 190, 150, 0.75)",
    },
    forest: {
      label: "Foresta",
      cost: 2,
      risk: 1,
      color: "rgba(72, 132, 78, 0.75)",
    },
    mountain: {
      label: "Montagna",
      cost: 3,
      risk: 2,
      color: "rgba(150, 150, 150, 0.75)",
    },
    hill: {
      label: "Collina",
      cost: 1.5,
      risk: 1,
      color: "rgba(158, 118, 72, 0.75)",
    },
    swamp: {
      label: "Palude",
      cost: 3,
      risk: 2,
      color: "rgba(86, 112, 78, 0.75)",
    },
    desert: {
      label: "Deserto",
      cost: 3,
      risk: 2,
      color: "rgba(214, 177, 96, 0.75)",
    },
    arctic: {
      label: "Artico",
      cost: 3,
      risk: 2,
      color: "rgba(210, 235, 240, 0.75)",
    },
    water: {
      label: "Acqua",
      cost: 2,
      risk: 1,
      water: true,
      color: "rgba(62, 134, 180, 0.75)",
    },
    city: {
      label: "Città",
      cost: 0.8,
      risk: 0,
      color: "rgba(215, 190, 130, 0.75)",
    },
    blocked: {
      label: "Bloccato",
      cost: Infinity,
      risk: 0,
      blocked: true,
      color: "rgba(210, 70, 70, 0.75)",
    },
  };

  var state = {
    world: null,
    map: null,
    mapId: "",
    width: 0,
    height: 0,
    config: null,
    canvas: null,
    ctx: null,
    editorPanel: null,
    editorHost: null,
    displayMode: "off",
    gridColor: "white",
    editorTerrain: "forest",
    editorRoad: false,
    editorBridge: false,
    editorTunnel: false,
    editorErase: false,
    selectiveEraseTerrains: {},
    brushSize: 1,
    overwriteHexes: true,
    brushPreviewHexes: [],
    isPainting: false,
    isMiddlePanning: false,
    middlePan: null,
    suppressNextContextMenu: false,
    suppressContextMenuUntil: 0,

    lastPaintedKey: "",
    cells: {},
    gridStore: null,
    redrawFrame: null,
    autosaveTimer: null,
    pendingAutosave: false,
    interactionHideTimer: null,
    isMapInteracting: false,
    calculatorPanel: null,
    calculatorHost: null,
    calculatorStart: null,
    calculatorEnd: null,
    calculatorWaypoints: [],
    calculatorPickMode: null,
    calculatorRouteRequestId: 0,
    routeLayer: null,
    routeShadowLayer: null,
    routeGlowLayer: null,
    startMarker: null,
    endMarker: null,
    waypointMarkers: [],
    pickPreviewMarker: null,
    regions: [],
    selectedRegionId: null,
    pulseRegionId: null,
    pulseRegionTimer: null,
    hoveredRegionId: null,
    hoveredRegionSource: "",
    regionContextMenu: null,
    selectiveEraseMenu: null,
    regionNames: {},
    regionHexLookup: {},
    highlightedRegionCellLookup: {},
    regionsDetached: false,
    regionsWindow: null,
    regionsWindowDrag: null,
    hasLocalOverride: false,
    staticGridLoaded: false,
    staticGridMissing: false,
    visibleChunkRequestKey: "",
    lastVisibleHexBounds: null,
    staticChunkIndex: null,
    staticChunkKeys: [],
  };

  window.EnclaveTravel = {
    init: init,
    setDisplayMode: setDisplayMode,
    toggleDebugGrid: toggleDebugGrid,
    toggleEditor: toggleEditor,
    openEditorInPanel: openEditorInPanel,
    openCalculatorInPanel: openCalculatorInPanel,
    setGridColor: setGridColor,
    getDisplayMode: function () {
      return state.displayMode;
    },
    getGridColor: function () {
      return state.gridColor;
    },
    redraw: redraw,
    pixelToHex: pixelToHex,
    hexToPixel: hexToPixel,
    roundHex: roundHex,
    hexKey: hexKey,
    parseHexKey: parseHexKey,
    getHexNeighbors: getHexNeighbors,
    hexDistance: hexDistance,
    findPath: findPath,
    calculateRoute: calculateRoute,
    calculateRouteAsync: calculateRouteAsync,
    preloadRouteChunks: preloadRouteChunks,
    calculateTravelEstimate: calculateTravelEstimate,
    getCellData: getCellData,
    getTerrainTypes: function () {
      return TERRAIN_TYPES;
    },
    getTravelModes: function () {
      return TRAVEL_MODES;
    },
    detectRegions: detectRegions,
    getRegions: function () {
      return state.regions.slice();
    },
    getState: function () {
      return state;
    },
    getConfig: function () {
      return Object.assign({}, state.config);
    },
    getGridStore: function () {
      return state.gridStore;
    },
    getVisibleHexBounds: getCurrentVisibleHexBounds,
    getAutoRevealContext: getAutoRevealContext,
    applyAutoRevealCells: applyAutoRevealCells,
  };

  function init(world) {
    if (!world || !world.map) {
      return;
    }

    if (state.map === world.map && state.mapId === world.mapId) {
      redraw();
      return;
    }

    state.world = world;
    state.map = world.map;
    state.mapId = world.mapId;
    state.width = Number(world.width) || 0;
    state.height = Number(world.height) || 0;
    state.config = Object.assign(
      {},
      TRAVEL_DEFAULTS,
      TRAVEL_MAP_CONFIG[state.mapId] || {}
    );
    state.displayMode = state.config.displayMode || "off";
    state.gridColor = state.config.gridColor || "white";
    state.gridOpacity = Number(state.config.gridOpacity) || 0.24;
    state.terrainOpacity = Number(state.config.terrainOpacity) || 0.75;
    state.cells = {};
    state.regionNames = {};
    initializeTravelGridStore();
    state.hasLocalOverride = false;
    state.staticGridLoaded = false;
    state.staticGridMissing = false;
    state.visibleChunkRequestKey = "";
    state.lastVisibleHexBounds = null;
    state.staticChunkIndex = null;
    state.staticChunkKeys = [];
    loadStaticGrid().then(function () {
      loadGridFromLocalStorage();
      syncEditorPanel();
      requestCurrentViewportChunks();
      redraw();
    });

    ensureCanvas();
    bindMapEvents();
    bindCanvasPainting();
    bindContextMenuSuppression();
    bindCalculatorPickCapture();
    redraw();
  }

  function initializeTravelGridStore() {
    if (!window.EnclaveTravelGridStore || typeof window.EnclaveTravelGridStore.init !== "function") {
      state.gridStore = null;
      return;
    }

    state.gridStore = window.EnclaveTravelGridStore.init({
      mapId: state.mapId,
      mapWidth: state.width,
      mapHeight: state.height,
      hexSize: state.config.hexSize,
      milesPerHex: state.config.milesPerHex,
      defaultTerrain: state.config.defaultTerrain,
      chunkSize: state.config.chunkSize || 128,
      maxLoadedChunks: state.config.maxLoadedChunks || 96,
      staticBasePath: "data/travel/chunks/" + state.mapId,
      storagePrefix: "enclave.travelGridStore",
      availableChunkKeys: state.staticChunkKeys || [],
    });
  }

  function syncGridStoreFromCells() {
    if (!state.gridStore || typeof state.gridStore.setCell !== "function") {
      return;
    }

    Object.keys(state.cells || {}).forEach(function (key) {
      var parsed = parseHexKey(key);
      state.gridStore.setCell(parsed.q, parsed.r, normalizeCellForStore(state.cells[key], parsed.q, parsed.r), {
        markDirty: false,
      });
    });
  }

  function normalizeCellForStore(cell, q, r) {
    var terrain = TERRAIN_TYPES[cell && cell.terrain] ? cell.terrain : state.config.defaultTerrain;

    return {
      q: q,
      r: r,
      terrain: terrain,
      road: !!(cell && cell.road),
      bridge: !!(cell && cell.bridge),
      tunnel: !!(cell && cell.tunnel),
      waterType: WATER_REGION_TYPES[cell && cell.waterType] ? cell.waterType : "",
      risk: Number.isFinite(Number(cell && cell.risk)) ? Number(cell.risk) : TERRAIN_TYPES[terrain].risk,
      blocked: terrain === "blocked" || !!(cell && cell.blocked),
      tags: Array.isArray(cell && cell.tags) ? cell.tags.map(String) : [],
    };
  }

  function readStoredCell(q, r) {
    var key = hexKey(q, r);

    if (state.cells && state.cells[key]) {
      return state.cells[key];
    }

    if (state.gridStore && typeof state.gridStore.getCell === "function") {
      return state.gridStore.getCell(q, r);
    }

    return null;
  }

  function writeStoredCell(q, r, cell, options) {
    options = options || {};
    var key = hexKey(q, r);
    var normalized = sanitizeSingleCell(cell, q, r);

    if (!normalized) {
      deleteStoredCell(q, r, options);
      return;
    }

    state.cells[key] = normalized;

    if (state.gridStore && typeof state.gridStore.setCell === "function") {
      state.gridStore.setCell(q, r, normalizeCellForStore(normalized, q, r), {
        markDirty: options.markDirty !== false,
      });
    }
  }

  function deleteStoredCell(q, r, options) {
    options = options || {};
    delete state.cells[hexKey(q, r)];

    if (state.gridStore && typeof state.gridStore.deleteCell === "function") {
      state.gridStore.deleteCell(q, r, {
        markDirty: options.markDirty !== false,
      });
    }
  }

  function getStoredCellKeys() {
    var keys = Object.keys(state.cells || {});

    if (!state.gridStore || typeof state.gridStore.forEachLoadedCell !== "function") {
      return keys;
    }

    var lookup = {};
    keys.forEach(function (key) {
      lookup[key] = true;
    });

    state.gridStore.forEachLoadedCell(function (cell) {
      lookup[hexKey(cell.q, cell.r)] = true;
    });

    return Object.keys(lookup);
  }

  function sanitizeSingleCell(cell, q, r) {
    cell = cell || {};
    var terrain = TERRAIN_TYPES[cell.terrain] ? cell.terrain : state.config.defaultTerrain;
    var road = !!cell.road;
    var bridge = !!cell.bridge;
    var tunnel = !!cell.tunnel;

    var waterType = WATER_REGION_TYPES[cell.waterType] ? cell.waterType : "";
    var risk = Number.isFinite(Number(cell.risk)) ? Number(cell.risk) : TERRAIN_TYPES[terrain].risk;
    var blocked = terrain === "blocked" || !!cell.blocked;
    var tags = Array.isArray(cell.tags) ? cell.tags.map(String) : [];

    if (
      terrain === state.config.defaultTerrain &&
      !road &&
      !bridge &&
      !tunnel &&
      !waterType &&
      !blocked &&
      risk === TERRAIN_TYPES[terrain].risk &&
      !tags.length
    ) {
      return null;
    }

    return {
      terrain: terrain,
      road: road,
      bridge: bridge,
      tunnel: tunnel,
      waterType: waterType,
      risk: risk,
      blocked: blocked,
      tags: tags,
    };
  }

  function ensureCanvas() {
    var container = state.map.getContainer();

    if (!container) {
      return;
    }

    if (state.canvas && state.canvas.parentNode === container) {
      state.ctx = state.canvas.getContext("2d");
      return;
    }

    if (state.canvas && state.canvas.parentNode) {
      state.canvas.parentNode.removeChild(state.canvas);
    }

    state.canvas = document.createElement("canvas");
    state.canvas.className = "world-map-travel-grid";
    state.canvas.setAttribute("data-world-map-travel-grid", "");
    state.canvas.setAttribute("aria-hidden", "true");
    state.canvas.style.position = "absolute";
    state.canvas.style.inset = "0";
    state.canvas.style.zIndex = "430";
    state.canvas.style.pointerEvents = "none";

    container.appendChild(state.canvas);
    state.ctx = state.canvas.getContext("2d");
  }

  function openEditorInPanel(host) {
    if (!host) {
      return;
    }

    state.editorHost = host;
    host.classList.remove("world-map-detail");
    host.classList.add("world-map-editor");
    ensureTravelDebugBubbleStyles();
    host.innerHTML = buildEditorPanelMarkup();
    state.editorPanel = host.querySelector("[data-world-map-travel-editor]");

    bindEditorPanelEvents(host);
    setDisplayMode("editor");
    syncEditorPanel();
  }

  function bindEditorPanelEvents(host) {
    if (!host || host._enclaveTravelEditorBound) {
      return;
    }

    host._enclaveTravelEditorBound = true;

    host.addEventListener("wheel", function (event) {
      var input = event.target.closest("input[type='range'], input[type='number']");

      if (!input || !host.contains(input)) {
        return;
      }

      if (!input.matches("[data-travel-editor-brush], [data-travel-grid-opacity], [data-travel-terrain-opacity]")) {
        return;
      }

      stepInputWithWheel(input, event);
    }, { passive: false });

    host.addEventListener("input", function (event) {
      var brush = event.target.closest("[data-travel-editor-brush]");
      var gridOpacity = event.target.closest("[data-travel-grid-opacity]");
      var terrainOpacity = event.target.closest("[data-travel-terrain-opacity]");

      if (brush) {
        updateBrushSizeFromInput(brush);
        return;
      }

      if (gridOpacity) {
        state.gridOpacity = clampNumber(Number(gridOpacity.value) || 0, 0, 1);
        syncOpacityInputs();
        redraw();
        return;
      }

      if (terrainOpacity) {
        state.terrainOpacity = clampNumber(Number(terrainOpacity.value) || 0, 0, 1);
        syncOpacityInputs();
        redraw();
      }
    });

    host.addEventListener("change", function (event) {
      var road = event.target.closest("[data-travel-editor-road]");
      var bridge = event.target.closest("[data-travel-editor-bridge]");
      var tunnel = event.target.closest("[data-travel-editor-tunnel]");
      var erase = event.target.closest("[data-travel-editor-erase]");
      var brush = event.target.closest("[data-travel-editor-brush]");
      var overwrite = event.target.closest("[data-travel-editor-overwrite]");
      var gridOpacity = event.target.closest("[data-travel-grid-opacity]");
      var terrainOpacity = event.target.closest("[data-travel-terrain-opacity]");
      var gridColor = event.target.closest("[data-travel-grid-color]");

      if (road) {
        setTravelTool("road", !!road.checked);
        return;
      }

      if (bridge) {
        setTravelTool("bridge", !!bridge.checked);
        return;
      }

      if (tunnel) {
        setTravelTool("tunnel", !!tunnel.checked);
        return;
      }

      if (erase) {
        setTravelTool("erase", !!erase.checked);
        return;
      }


      if (brush) {
        updateBrushSizeFromInput(brush);
      }

      if (overwrite) {
        state.overwriteHexes = !!overwrite.checked;
        syncEditorPanel();
      }

      if (gridOpacity) {
        state.gridOpacity = clampNumber(Number(gridOpacity.value) || 0, 0, 1);
        syncOpacityInputs();
        redraw();
      }

      if (terrainOpacity) {
        state.terrainOpacity = clampNumber(Number(terrainOpacity.value) || 0, 0, 1);
        syncOpacityInputs();
        redraw();
      }

      if (gridColor) {
        setGridColor(gridColor.value || "white");
      }
    });

    host.addEventListener("click", function (event) {
      var terrain = event.target.closest("[data-travel-editor-terrain]");
      var close = event.target.closest("[data-travel-editor-close]");
      var exportButton = event.target.closest("[data-travel-editor-export]");
      var exportVisibleChunksButton = event.target.closest("[data-travel-editor-export-visible-chunks]");
      var exportDirtyChunksButton = event.target.closest("[data-travel-editor-export-dirty-chunks]");
      var flushLocalButton = event.target.closest("[data-travel-editor-flush-local]");
      var autoRevealButton = event.target.closest("[data-travel-auto-reveal]");
      var saveCloseButton = event.target.closest("[data-travel-editor-save-close]");
      var importButton = event.target.closest("[data-travel-editor-import]");
      var gridToggle = event.target.closest("[data-travel-grid-toggle]");
      var gridColor = event.target.closest("[data-travel-grid-color]");
      var detectRegionsButton = event.target.closest("[data-travel-detect-regions]");
      var detachRegionsButton = event.target.closest("[data-travel-detach-regions]");
      var closeRegionsWindowButton = event.target.closest("[data-travel-close-regions-window]");
      var focusRegionButton = event.target.closest("[data-travel-focus-region]");
      var renameRegionInput = event.target.closest("[data-travel-region-name]");
      var renameRegionButton = event.target.closest("[data-travel-rename-region]");
      var waterTypeButton = event.target.closest("[data-travel-water-type]");
      var selectiveEraseButton = event.target.closest("[data-travel-selective-erase-terrain]");

      if (selectiveEraseButton) {
        toggleSelectiveEraseTerrain(selectiveEraseButton.getAttribute("data-travel-selective-erase-terrain"));
        return;
      }

      if (waterTypeButton) {
        applyWaterTypeToRegion(
          waterTypeButton.getAttribute("data-travel-region-id"),
          waterTypeButton.getAttribute("data-travel-water-type")
        );
        closeRegionContextMenu();
        return;
      }

      if (renameRegionButton) {
        promptRenameRegion(renameRegionButton.getAttribute("data-travel-rename-region"));
        closeRegionContextMenu();
        return;
      }

      if (terrain) {
        state.editorTerrain = terrain.getAttribute("data-travel-editor-terrain") || "plain";
        state.editorErase = false;
        syncEditorPanel();
        return;
      }

      if (gridToggle) {
        setDisplayMode(state.displayMode === "debug" ? "editor" : "debug");
        syncEditorPanel();
        return;
      }

      if (gridColor) {
        setGridColor(gridColor.getAttribute("data-travel-grid-color") || "white");
        syncEditorPanel();
        return;
      }

      if (detectRegionsButton) {
        state.regions = detectRegions();
        renderRegionsList();
        return;
      }

      if (detachRegionsButton) {
        openDetachedRegionsWindow();
        renderRegionsList();
        return;
      }

      if (closeRegionsWindowButton) {
        closeDetachedRegionsWindow();
        renderRegionsList();
        return;
      }

      if (focusRegionButton && !renameRegionInput) {
        focusRegion(focusRegionButton.getAttribute("data-travel-focus-region"));
        return;
      }

      if (close || saveCloseButton) {
        saveGridToLocalStorage();
        closeEditorPanel();
        return;
      }

      if (exportButton) {
        exportGridJson(exportButton);
        return;
      }

      if (exportVisibleChunksButton) {
        exportVisibleChunksJson(exportVisibleChunksButton);
        return;
      }

      if (exportDirtyChunksButton) {
        exportDirtyChunksJson(exportDirtyChunksButton);
        return;
      }

      if (flushLocalButton) {
        flushLocalGridOverride(flushLocalButton);
        return;
      }

      if (autoRevealButton) {
        runAutoReveal(autoRevealButton);
        return;
      }

      if (importButton) {
        importGridJson(importButton);
      }
    });

    host.addEventListener("mouseover", function (event) {
      var row = event.target.closest("[data-travel-focus-region]");

      if (row) {
        setHoveredRegion(row.getAttribute("data-travel-focus-region"), "list");
      }
    });

    host.addEventListener("mouseout", function (event) {
      var row = event.target.closest("[data-travel-focus-region]");

      if (row && !row.contains(event.relatedTarget)) {
        setHoveredRegion(null, "");
      }
    });

    host.addEventListener("contextmenu", function (event) {
      var eraseTool = event.target.closest("[data-travel-erase-tool]");
      var row = event.target.closest("[data-travel-focus-region]");

      if (eraseTool) {
        event.preventDefault();
        event.stopPropagation();
        openSelectiveEraseMenu(event.clientX, event.clientY);
        return;
      }

      if (!row) {
        return;
      }

      var region = getRegionById(row.getAttribute("data-travel-focus-region"));

      event.preventDefault();
      event.stopPropagation();

      if (!region) {
        closeRegionContextMenu();
        return;
      }

      openRegionContextMenu(region.id, event.clientX, event.clientY);
    });
  }

  function openCalculatorInPanel(host) {
    if (!host) {
      return;
    }

    state.calculatorHost = host;
    host.classList.remove("world-map-detail");
    host.classList.add("world-map-editor");
    host.innerHTML = buildCalculatorPanelMarkup();
    state.calculatorPanel = host.querySelector("[data-world-map-travel-calculator]");

    bindCalculatorPanelEvents(host);
    syncCalculatorPanel();
  }

  function bindCalculatorPanelEvents(host) {
    if (!host || host._enclaveTravelCalculatorBound) {
      return;
    }

    host._enclaveTravelCalculatorBound = true;

    host.addEventListener("click", function (event) {
      var pickStart = event.target.closest("[data-travel-pick-start]");
      var pickEnd = event.target.closest("[data-travel-pick-end]");
      var pickWaypoint = event.target.closest("[data-travel-pick-waypoint]");
      var removeWaypoint = event.target.closest("[data-travel-remove-waypoint]");
      var calculate = event.target.closest("[data-travel-calculate]");
      var clear = event.target.closest("[data-travel-clear-route]");
      var close = event.target.closest("[data-travel-close-calculator]");

      if (pickStart) {
        beginCalculatorPick("start");
        return;
      }

      if (pickEnd) {
        beginCalculatorPick("end");
        return;
      }

      if (pickWaypoint) {
        beginCalculatorPick("waypoint");
        return;
      }

      if (removeWaypoint) {
        removeCalculatorWaypoint(Number(removeWaypoint.getAttribute("data-travel-remove-waypoint")));
        return;
      }

      if (calculate) {
        calculateCurrentRoute();
        return;
      }

      if (clear) {
        clearCurrentRoute();
        syncCalculatorPanel();
        return;
      }

      if (close) {
        closeCalculatorPanel();
      }
    });
  }

  function closeCalculatorPanel() {
    state.calculatorPickMode = null;
    clearPickPreviewMarker();
    clearRouteLayer();

    if (state.calculatorHost) {
      state.calculatorHost.classList.remove("world-map-editor");
      state.calculatorHost.classList.add("world-map-detail");
      state.calculatorHost.innerHTML = '<p class="world-map-detail__empty">Seleziona un segnalino o una regione sulla mappa.</p>';
    }

    state.calculatorPanel = null;
    state.calculatorHost = null;
  }

  function buildCalculatorPanelMarkup() {
    return (
      '<aside class="world-map-travel-editor world-map-travel-calculator" data-world-map-travel-calculator>' +
      '<header class="world-map-travel-editor__header">' +
      '<strong>Travel Calculator</strong>' +
      '</header>' +
      '<section class="world-map-travel-calc-section">' +
      '<h3>Route</h3>' +
      '<div class="world-map-travel-calc-points">' +
      '<button type="button" data-travel-pick-start><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span data-travel-start-label>Start: —</span></button>' +
      '<button type="button" data-travel-pick-end><i class="fa-solid fa-flag-checkered" aria-hidden="true"></i><span data-travel-end-label>End: —</span></button>' +
      '<button type="button" data-travel-pick-waypoint><i class="fa-solid fa-map-pin" aria-hidden="true"></i><span>Add waypoint</span></button>' +
      '</div>' +
      '<div class="world-map-travel-waypoints" data-travel-waypoints></div>' +
      '</section>' +
      '<section class="world-map-travel-calc-section">' +
      '<h3>Options</h3>' +
      '<label class="world-map-travel-editor__field">' +
      '<span>Travel mode</span>' +
      '<select data-travel-mode>' + buildTravelModeOptions() + '</select>' +
      '</label>' +
      '<label class="world-map-travel-editor__field">' +
      '<span>Speed</span>' +
      '<select data-travel-speed>' +
      '<option value="slow">Slow</option>' +
      '<option value="normal" selected>Normal</option>' +
      '<option value="fast">Fast</option>' +
      '</select>' +
      '</label>' +
      '</section>' +
      '<section class="world-map-travel-calc-section" data-travel-result>' +
      '<h3>Result</h3>' +
      '<p class="world-map-travel-calc-empty">Select start and destination.</p>' +
      '</section>' +
      '<div class="world-map-travel-editor__actions">' +
      '<button type="button" data-travel-calculate aria-label="Calcola" title="Calcola"><i class="fa-solid fa-route" aria-hidden="true"></i></button>' +
      '<button type="button" data-travel-clear-route aria-label="Pulisci route" title="Pulisci route"><i class="fa-solid fa-eraser" aria-hidden="true"></i></button>' +
      '<button type="button" data-travel-close-calculator aria-label="Chiudi" title="Chiudi"><i class="fa-solid fa-check" aria-hidden="true"></i></button>' +
      '</div>' +
      '</aside>'
    );
  }

  function buildTravelModeOptions() {
    return Object.keys(TRAVEL_MODES).map(function (key) {
      return '<option value="' + escapeHtml(key) + '">' + escapeHtml(TRAVEL_MODES[key].label) + '</option>';
    }).join("");
  }

  function beginCalculatorPick(kind) {
    state.calculatorPickMode = kind === "end" || kind === "waypoint" ? kind : "start";
    ensurePickPreviewMarker();
    syncCalculatorPanel();
  }

  function handleCalculatorMapClick(event) {
    if (!state.calculatorPickMode) {
      return false;
    }

    var pixel = state.world.toImagePoint(event.latlng);

    if (!isPixelInsideMap(pixel.x, pixel.y)) {
      return true;
    }

    var hex = pixelToHex(pixel.x, pixel.y, state.config.hexSize);
    var center = hexToPixel(hex.q, hex.r, state.config.hexSize);
    var payload = {
      q: hex.q,
      r: hex.r,
      x: Math.round(center.x),
      y: Math.round(center.y),
    };

    if (state.calculatorPickMode === "start") {
      state.calculatorStart = payload;
      drawEndpointMarker("start", payload);
    } else if (state.calculatorPickMode === "end") {
      state.calculatorEnd = payload;
      drawEndpointMarker("end", payload);
    } else {
      state.calculatorWaypoints.push(payload);
      drawWaypointMarkers();
    }

    state.calculatorPickMode = null;
    clearPickPreviewMarker();
    syncCalculatorPanel();
    return true;
  }

  function calculateCurrentRoute() {
    if (!state.calculatorStart || !state.calculatorEnd) {
      renderCalculatorResult({ success: false, warnings: ["Select start and destination."] });
      return;
    }

    var modeSelect = state.calculatorPanel ? state.calculatorPanel.querySelector("[data-travel-mode]") : null;
    var speedSelect = state.calculatorPanel ? state.calculatorPanel.querySelector("[data-travel-speed]") : null;
    var payload = {
      start: state.calculatorStart,
      end: state.calculatorEnd,
      waypoints: state.calculatorWaypoints,
      travelMode: modeSelect ? modeSelect.value : "foot",
      speedMode: speedSelect ? speedSelect.value : "normal",
    };

    var requestId = beginCalculatorRouteRequest();
    renderCalculatorPending("Loading route chunks…");

    calculateRouteAsync(payload).then(function (result) {
      if (!isCurrentCalculatorRouteRequest(requestId)) {
        return;
      }

      drawRoute(result);
      renderCalculatorResult(result);
    }).catch(function (error) {
      if (!isCurrentCalculatorRouteRequest(requestId)) {
        return;
      }

      console.warn("Travel route calculation failed:", error);
      renderCalculatorResult({
        success: false,
        warnings: [error && error.message ? error.message : "Route calculation failed."],
      });
    });
  }

  function beginCalculatorRouteRequest() {
    state.calculatorRouteRequestId += 1;
    return state.calculatorRouteRequestId;
  }

  function isCurrentCalculatorRouteRequest(requestId) {
    return requestId === state.calculatorRouteRequestId;
  }

  function calculateRoute(payload) {
    payload = payload || {};

    return findRouteThroughPoints(
      [payload.start].concat(payload.waypoints || [], [payload.end]),
      {
        travelMode: payload.travelMode || "foot",
        speedMode: payload.speedMode || "normal",
        maxIterations: payload.maxIterations,
      }
    );
  }

  function calculateRouteAsync(payload) {
    payload = payload || {};

    var points = [payload.start].concat(payload.waypoints || [], [payload.end]);
    var options = {
      travelMode: payload.travelMode || "foot",
      speedMode: payload.speedMode || "normal",
      maxIterations: payload.maxIterations,
      chunkBufferHexes: payload.chunkBufferHexes,
      routeChunkBufferHexes: payload.routeChunkBufferHexes,
      routeChunkSampleStepHexes: payload.routeChunkSampleStepHexes,
    };

    var normalizedPoints = normalizeRoutePoints(points);
    options.routeSearchBoundsBySegment = buildRouteSegmentBoundsLists(normalizedPoints, options);

    return preloadRouteChunks(normalizedPoints, options).then(function (loadedChunkKeys) {
      var result = findRouteThroughPoints(points, options);
      result.loadedChunkKeys = loadedChunkKeys || [];
      result.loadedChunkCount = result.loadedChunkKeys.length;
      return result;
    });
  }

  function preloadRouteChunks(points, options) {
    if (!state.gridStore || typeof state.gridStore.loadChunksForBounds !== "function") {
      return Promise.resolve([]);
    }

    var normalizedPoints = normalizeRoutePoints(points);

    if (normalizedPoints.length < 2) {
      return Promise.resolve([]);
    }

    var segmentBoundsLists = options && Array.isArray(options.routeSearchBoundsBySegment)
      ? options.routeSearchBoundsBySegment
      : buildRouteSegmentBoundsLists(normalizedPoints, options || {});
    var boundsList = flattenBoundsLists(segmentBoundsLists);

    return Promise.all(boundsList.map(function (bounds) {
      return state.gridStore.loadChunksForBounds(bounds);
    })).then(function (loadedGroups) {
      syncLoadedGridStoreCellsIntoState();
      return flattenUniqueChunkKeys(loadedGroups);
    });
  }

  function normalizeRoutePoints(points) {
    return (points || []).map(normalizePathEndpoint).filter(Boolean);
  }

  function buildRouteSegmentBoundsLists(points, options) {
    var normalizedPoints = normalizeRoutePoints(points);
    var lists = [];

    for (var i = 0; i < normalizedPoints.length - 1; i += 1) {
      lists.push(getRouteSegmentCorridorBoundsList(normalizedPoints[i], normalizedPoints[i + 1], options || {}));
    }

    return lists;
  }

  function getRouteSegmentCorridorBoundsList(start, goal, options) {
    var distance = Math.max(1, hexDistance(start, goal));
    var buffer = getRouteChunkBufferHexes(options);
    var step = getRouteChunkSampleStepHexes(options);
    var sampleCount = Math.max(1, Math.ceil(distance / step));
    var bounds = [];
    var seen = {};

    for (var i = 0; i <= sampleCount; i += 1) {
      var t = i / sampleCount;
      var center = roundHex(
        start.q + (goal.q - start.q) * t,
        start.r + (goal.r - start.r) * t
      );
      var item = clampHexBoundsToMap({
        minQ: center.q - buffer,
        maxQ: center.q + buffer,
        minR: center.r - buffer,
        maxR: center.r + buffer,
      });
      var key = [item.minQ, item.maxQ, item.minR, item.maxR].join(":");

      if (!seen[key]) {
        seen[key] = true;
        bounds.push(item);
      }
    }

    return bounds;
  }

  function getRouteSegmentChunkBounds(start, goal, options) {
    var list = getRouteSegmentCorridorBoundsList(start, goal, options || {});
    return mergeBoundsList(list);
  }

  function getRouteChunkBufferHexes(options) {
    var configured = Number(options && (options.routeChunkBufferHexes || options.chunkBufferHexes));

    if (Number.isFinite(configured) && configured > 0) {
      return clampNumber(Math.round(configured), 12, 192);
    }

    return clampNumber(Number(state.config.routeChunkBufferHexes) || 64, 12, 192);
  }

  function getRouteChunkSampleStepHexes(options) {
    var configured = Number(options && options.routeChunkSampleStepHexes);

    if (Number.isFinite(configured) && configured > 0) {
      return clampNumber(Math.round(configured), 8, 256);
    }

    return clampNumber(Number(state.config.routeChunkSampleStepHexes) || Math.floor((state.config.chunkSize || 128) / 2), 8, 256);
  }

  function flattenBoundsLists(boundsLists) {
    var flat = [];
    var seen = {};

    (boundsLists || []).forEach(function (list) {
      (list || []).forEach(function (bounds) {
        var key = [bounds.minQ, bounds.maxQ, bounds.minR, bounds.maxR].join(":");

        if (!seen[key]) {
          seen[key] = true;
          flat.push(bounds);
        }
      });
    });

    return flat;
  }

  function mergeBoundsList(boundsList) {
    if (!boundsList || !boundsList.length) {
      return { minQ: 0, maxQ: 0, minR: 0, maxR: 0 };
    }

    return boundsList.reduce(function (merged, item) {
      return {
        minQ: Math.min(merged.minQ, item.minQ),
        maxQ: Math.max(merged.maxQ, item.maxQ),
        minR: Math.min(merged.minR, item.minR),
        maxR: Math.max(merged.maxR, item.maxR),
      };
    }, boundsList[0]);
  }

  function clampHexBoundsToMap(bounds) {
    return {
      minQ: Math.max(-4096, Math.floor(bounds.minQ)),
      maxQ: Math.min(4096, Math.ceil(bounds.maxQ)),
      minR: Math.max(-4096, Math.floor(bounds.minR)),
      maxR: Math.min(4096, Math.ceil(bounds.maxR)),
    };
  }

  function flattenUniqueChunkKeys(groups) {
    var lookup = {};

    (groups || []).forEach(function (group) {
      (group || []).forEach(function (chunkKey) {
        lookup[chunkKey] = true;
      });
    });

    return Object.keys(lookup).sort();
  }

  function findRouteThroughPoints(points, options) {
    var allCells = [];
    var allPixelPath = [];
    var totalCost = 0;
    var totalDistanceMiles = 0;
    var effectiveDistanceMiles = 0;
    var riskScore = 0;
    var warnings = [];

    if (!Array.isArray(points) || points.length < 2) {
      return buildFailedPathResult(points && points[0], points && points[1], ["Route needs at least two points."]);
    }

    for (var i = 0; i < points.length - 1; i += 1) {
      var segmentOptions = Object.assign({}, options || {});

      if (options && Array.isArray(options.routeSearchBoundsBySegment) && options.routeSearchBoundsBySegment[i]) {
        segmentOptions.searchBoundsList = options.routeSearchBoundsBySegment[i];
      }

      var segment = findPath(points[i], points[i + 1], segmentOptions);

      if (!segment.success) {
        return Object.assign({}, segment, {
          warnings: ["No path found between point " + (i + 1) + " and point " + (i + 2) + "."].concat(segment.warnings || []),
        });
      }

      allCells = allCells.concat(i === 0 ? segment.cells : segment.cells.slice(1));
      allPixelPath = allPixelPath.concat(i === 0 ? segment.pixelPath : segment.pixelPath.slice(1));
      totalCost += Number(segment.totalCost) || 0;
      totalDistanceMiles += Number(segment.totalDistanceMiles) || 0;
      effectiveDistanceMiles += Number(segment.effectiveDistanceMiles) || 0;
      riskScore += Number(segment.riskScore) || 0;
      warnings = warnings.concat(segment.warnings || []);
    }

    var mode = TRAVEL_MODES[options.travelMode] || TRAVEL_MODES.foot;
    var speedMode = options.speedMode || "normal";
    var speed = mode.speedMilesPerDay && mode.speedMilesPerDay[speedMode] ? mode.speedMilesPerDay[speedMode] : 24;

    return {
      success: true,
      cells: allCells,
      pixelPath: allPixelPath,
      totalCost: roundTo(totalCost, 2),
      totalDistanceMiles: roundTo(totalDistanceMiles, 2),
      effectiveDistanceMiles: roundTo(effectiveDistanceMiles, 2),
      estimatedDays: roundTo(speed > 0 ? effectiveDistanceMiles / speed : Infinity, 2),
      riskScore: roundTo(riskScore, 2),
      warnings: warnings,
    };
  }

  function drawRoute(result) {
    clearRouteLayer();

    if (!result || !result.success || !Array.isArray(result.pixelPath) || result.pixelPath.length < 2 || !state.map) {
      return;
    }

    var latlngs = result.pixelPath.map(function (point) {
      return state.world.toMapLatLng(point.x, point.y);
    });

    state.routeShadowLayer = L.polyline(latlngs, {
      color: "#030607",
      weight: 14,
      opacity: 0.68,
      interactive: false,
      className: "world-map-travel-route world-map-travel-route--shadow",
    }).addTo(state.map);

    state.routeGlowLayer = L.polyline(latlngs, {
      color: "#71ddca",
      weight: 9,
      opacity: 0.42,
      interactive: false,
      className: "world-map-travel-route world-map-travel-route--glow",
    }).addTo(state.map);

    state.routeLayer = L.polyline(latlngs, {
      color: "#f1d5a5",
      weight: 5,
      opacity: 1,
      dashArray: "12 7",
      interactive: false,
      className: "world-map-travel-route world-map-travel-route--main",
    }).addTo(state.map);
  }

  function clearRouteLayer() {
    [state.routeLayer, state.routeGlowLayer, state.routeShadowLayer].forEach(function (layer) {
      if (layer && state.map) {
        state.map.removeLayer(layer);
      }
    });

    state.routeLayer = null;
    state.routeGlowLayer = null;
    state.routeShadowLayer = null;
  }

  function clearCurrentRoute() {
    beginCalculatorRouteRequest();
    state.calculatorStart = null;
    state.calculatorEnd = null;
    state.calculatorWaypoints = [];
    state.calculatorPickMode = null;
    clearRouteLayer();
    clearEndpointMarkers();
    clearPickPreviewMarker();
  }

  function renderCalculatorPending(message) {
    var mount = state.calculatorPanel ? state.calculatorPanel.querySelector("[data-travel-result]") : null;

    if (!mount) {
      return;
    }

    mount.innerHTML =
      '<h3>Result</h3>' +
      '<p class="world-map-travel-calc-empty"><i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> ' +
      escapeHtml(message || "Calculating route…") +
      '</p>';
  }

  function renderCalculatorResult(result) {
    var mount = state.calculatorPanel ? state.calculatorPanel.querySelector("[data-travel-result]") : null;

    if (!mount) {
      return;
    }

    if (!result || !result.success) {
      mount.innerHTML = '<h3>Result</h3><p class="world-map-travel-calc-empty">' + escapeHtml((result && result.warnings && result.warnings[0]) || "No route.") + '</p>';
      return;
    }

    mount.innerHTML =
      '<h3>Result</h3>' +
      '<dl class="world-map-travel-calc-result">' +
      '<div><dt>Distance</dt><dd>' + result.totalDistanceMiles + ' mi</dd></div>' +
      '<div><dt>Effective</dt><dd>' + result.effectiveDistanceMiles + ' mi</dd></div>' +
      '<div><dt>Days</dt><dd>' + result.estimatedDays + '</dd></div>' +
      '<div><dt>Risk</dt><dd>' + result.riskScore + '</dd></div>' +
      '<div><dt>Chunks</dt><dd>' + (Number.isFinite(Number(result.loadedChunkCount)) ? result.loadedChunkCount : '—') + '</dd></div>' +
      '</dl>' +
      (result.warnings && result.warnings.length ? '<p class="world-map-travel-calc-warning">' + escapeHtml(result.warnings.join(" ")) + '</p>' : '');
  }

  function drawEndpointMarker(kind, payload) {
    if (!state.map || !payload) {
      return;
    }

    var markerKey = kind === "end" ? "endMarker" : "startMarker";
    var existing = state[markerKey];
    var latlng = state.world.toMapLatLng(payload.x, payload.y);

    if (existing) {
      existing.setLatLng(latlng);
      return;
    }

    state[markerKey] = L.marker(latlng, {
      interactive: false,
      zIndexOffset: 1200,
      icon: createTravelEndpointIcon(kind),
    }).addTo(state.map);
  }

  function clearEndpointMarkers() {
    [state.startMarker, state.endMarker].forEach(function (marker) {
      if (marker && state.map) {
        state.map.removeLayer(marker);
      }
    });

    state.startMarker = null;
    state.endMarker = null;
    clearWaypointMarkers();
  }

  function drawWaypointMarkers() {
    clearWaypointMarkers();

    state.calculatorWaypoints.forEach(function (waypoint, index) {
      var latlng = state.world.toMapLatLng(waypoint.x, waypoint.y);
      var marker = L.marker(latlng, {
        interactive: false,
        zIndexOffset: 1150,
        icon: createTravelWaypointIcon(index + 1),
      }).addTo(state.map);

      state.waypointMarkers.push(marker);
    });
  }

  function clearWaypointMarkers() {
    state.waypointMarkers.forEach(function (marker) {
      if (marker && state.map) {
        state.map.removeLayer(marker);
      }
    });

    state.waypointMarkers = [];
  }

  function removeCalculatorWaypoint(index) {
    if (!Number.isFinite(index) || index < 0 || index >= state.calculatorWaypoints.length) {
      return;
    }

    state.calculatorWaypoints.splice(index, 1);
    drawWaypointMarkers();
    syncCalculatorPanel();
  }

  function ensurePickPreviewMarker() {
    if (!state.map || state.pickPreviewMarker) {
      return;
    }

    state.pickPreviewMarker = L.marker(state.map.getCenter(), {
      interactive: false,
      zIndexOffset: 1400,
      opacity: 0.82,
      icon: createTravelEndpointIcon("preview"),
    }).addTo(state.map);
  }

  function clearPickPreviewMarker() {
    if (state.pickPreviewMarker && state.map) {
      state.map.removeLayer(state.pickPreviewMarker);
    }

    state.pickPreviewMarker = null;
  }

  function updatePickPreviewMarker(event) {
    if (!state.calculatorPickMode || !state.pickPreviewMarker || !event || !event.latlng) {
      return;
    }

    state.pickPreviewMarker.setLatLng(event.latlng);
  }

  function createTravelWaypointIcon(index) {
    return L.divIcon({
      className: "world-map-travel-endpoint-icon world-map-travel-endpoint-icon--waypoint",
      html: '<span><strong>' + escapeHtml(index) + '</strong></span>',
      iconSize: [30, 38],
      iconAnchor: [15, 34],
    });
  }

  function createTravelEndpointIcon(kind) {
    var iconClass = kind === "end" ? "fa-flag-checkered" : "fa-location-dot";
    var modifier = kind === "end" ? "end" : kind === "preview" ? "preview" : "start";

    return L.divIcon({
      className: "world-map-travel-endpoint-icon world-map-travel-endpoint-icon--" + modifier,
      html: '<span><i class="fa-solid ' + iconClass + '" aria-hidden="true"></i></span>',
      iconSize: [34, 42],
      iconAnchor: [17, 38],
    });
  }

  function syncCalculatorPanel() {
    if (!state.calculatorPanel) {
      return;
    }

    var start = state.calculatorPanel.querySelector("[data-travel-start-label]");
    var end = state.calculatorPanel.querySelector("[data-travel-end-label]");
    var pickStart = state.calculatorPanel.querySelector("[data-travel-pick-start]");
    var pickEnd = state.calculatorPanel.querySelector("[data-travel-pick-end]");
    var pickWaypoint = state.calculatorPanel.querySelector("[data-travel-pick-waypoint]");
    var waypointsMount = state.calculatorPanel.querySelector("[data-travel-waypoints]");

    if (start) {
      start.textContent = state.calculatorStart ? "Start: " + hexKey(state.calculatorStart.q, state.calculatorStart.r) : "Start: —";
    }

    if (end) {
      end.textContent = state.calculatorEnd ? "End: " + hexKey(state.calculatorEnd.q, state.calculatorEnd.r) : "End: —";
    }

    if (pickStart) {
      pickStart.classList.toggle("is-active", state.calculatorPickMode === "start");
    }

    if (pickEnd) {
      pickEnd.classList.toggle("is-active", state.calculatorPickMode === "end");
    }

    if (pickWaypoint) {
      pickWaypoint.classList.toggle("is-active", state.calculatorPickMode === "waypoint");
    }

    if (waypointsMount) {
      if (!state.calculatorWaypoints.length) {
        waypointsMount.innerHTML = "";
      } else {
        waypointsMount.innerHTML = state.calculatorWaypoints.map(function (waypoint, index) {
          return (
            '<div class="world-map-travel-waypoint-row">' +
            '<span>Waypoint ' + (index + 1) + ': ' + escapeHtml(hexKey(waypoint.q, waypoint.r)) + '</span>' +
            '<button type="button" data-travel-remove-waypoint="' + index + '" aria-label="Rimuovi waypoint"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
            '</div>'
          );
        }).join("");
      }
    }
  }

  function closeEditorPanel() {
    setDisplayMode("off");

    closeDetachedRegionsWindow();
    closeRegionContextMenu();
    closeSelectiveEraseMenu();
    state.hoveredRegionId = null;
    state.hoveredRegionSource = "";
    state.pulseRegionId = null;
    state.highlightedRegionCellLookup = {};

    if (state.editorHost) {
      state.editorHost.classList.remove("world-map-editor");
      state.editorHost.classList.add("world-map-detail");
      state.editorHost.innerHTML = '<p class="world-map-detail__empty">Seleziona un segnalino o una regione sulla mappa.</p>';
    }

    state.editorPanel = null;
    state.editorHost = null;
    redraw();
  }

  function buildEditorPanelMarkup() {
    return (
      '<aside class="world-map-travel-editor" data-world-map-travel-editor>' +
      '<header class="world-map-travel-editor__header">' +
      '<strong>Map Editor</strong>' +
      '<span class="world-map-travel-editor__status" data-travel-local-status></span>' +
      '</header>' +
      '<fieldset class="world-map-travel-editor__terrain" aria-label="Terreno">' +
      '<legend>Terreno</legend>' +
      '<div class="world-map-travel-editor__terrain-grid">' +
      buildTerrainButtons() +
      '</div>' +
      '</fieldset>' +
      '<div class="world-map-travel-editor__tool-row" aria-label="Tools">' +
      '<label class="world-map-travel-tool" title="Strada">' +
      '<input type="checkbox" data-travel-editor-road />' +
      '<span><i class="fa-solid fa-road" aria-hidden="true"></i></span>' +
      '</label>' +
      '<label class="world-map-travel-tool" title="Ponte">' +
      '<input type="checkbox" data-travel-editor-bridge />' +
      '<span><i class="fa-solid fa-bridge" aria-hidden="true"></i></span>' +
      '</label>' +
      '<label class="world-map-travel-tool" title="Galleria">' +
      '<input type="checkbox" data-travel-editor-tunnel />' +
      '<span><i class="fa-solid fa-archway" aria-hidden="true"></i></span>' +
      '</label>' +
      '<label class="world-map-travel-tool" title="Gomma" data-travel-erase-tool>' +
      '<input type="checkbox" data-travel-editor-erase />' +
      '<span><i class="fa-solid fa-eraser" aria-hidden="true"></i></span>' +
      '</label>' +
      '</div>' +
      '<label class="world-map-travel-editor__field world-map-travel-editor__field--brush">' +
      '<span>Brush</span>' +
      '<div class="world-map-travel-editor__brush-row">' +
      '<label class="world-map-travel-tool world-map-travel-tool--overwrite" title="Overwrite hexes">' +
      '<input type="checkbox" data-travel-editor-overwrite checked />' +
      '<span><i class="fa-solid fa-layer-group" aria-hidden="true"></i></span>' +
      '</label>' +
      '<input type="range" min="1" max="12" value="1" data-travel-editor-brush />' +
      '<input type="number" min="1" max="12" value="1" data-travel-editor-brush />' +
      '</div>' +
      '</label>' +
      buildGridControlsMarkup() +
      buildRegionsPanelMarkup() +
      '<div class="world-map-travel-editor__actions">' +
      '<button type="button" data-travel-auto-reveal aria-label="Auto Reveal Terrain" title="Auto Reveal Terrain"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i></button>' +
      '<button type="button" data-travel-editor-export aria-label="Export unified JSON" title="Export unified JSON"><i class="fa-solid fa-copy" aria-hidden="true"></i></button>' +
      '<button type="button" data-travel-editor-export-visible-chunks aria-label="Export visible chunks" title="Export visible chunks"><i class="fa-solid fa-table-cells-large" aria-hidden="true"></i></button>' +
      '<button type="button" data-travel-editor-export-dirty-chunks aria-label="Export dirty chunks" title="Export dirty chunks"><i class="fa-solid fa-file-export" aria-hidden="true"></i></button>' +
      '<button type="button" data-travel-editor-flush-local aria-label="Flush local override" title="Flush local override"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i></button>' +
      '<button type="button" data-travel-editor-import aria-label="Import JSON" title="Import JSON"><i class="fa-solid fa-file-import" aria-hidden="true"></i></button>' +
      '<button type="button" data-travel-editor-save-close aria-label="Salva e chiudi" title="Salva e chiudi"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i></button>' +
      '</div>' +
      '</aside>'
    );
  }

  function buildSelectiveEraseMenuMarkup() {
    return (
      '<div class="world-map-selective-erase-menu" data-travel-selective-erase-menu>' +
      '<header class="world-map-selective-erase-menu__header">' +
      '<strong>Gomma selettiva</strong>' +
      '<small>nessun filtro = cancella tutto</small>' +
      '</header>' +
      '<div class="world-map-selective-erase-menu__grid">' +
      buildSelectiveEraseOptions() +
      '</div>' +
      '</div>'
    );
  }

  function buildSelectiveEraseOptions() {
    return Object.keys(TERRAIN_TYPES).map(function (key) {
      var terrain = TERRAIN_TYPES[key];
      return (
        '<button type="button" class="world-map-selective-erase-option' +
        (state.selectiveEraseTerrains[key] ? ' is-active' : '') +
        '" data-travel-selective-erase-terrain="' + escapeHtml(key) + '" title="Cancella solo ' + escapeHtml(terrain.label) + '" aria-pressed="' + String(!!state.selectiveEraseTerrains[key]) + '">' +
        '<span class="world-map-selective-erase-option__swatch" style="--terrain-color: ' + escapeHtml(terrain.color) + '"><i class="fa-solid ' + escapeHtml(getTerrainIcon(key)) + '" aria-hidden="true"></i></span>' +
        '</button>'
      );
    }).join("");
  }

  function buildGridControlsMarkup() {
    return (
      '<section class="world-map-travel-editor__grid-tools" aria-label="Griglia">' +
      '<header class="world-map-travel-editor__section-head">' +
      '<span>Grid</span>' +
      '<div class="world-map-travel-context__colors" aria-label="Colore griglia">' +
      buildGridColorButton("black") +
      buildGridColorButton("cyan") +
      buildGridColorButton("white") +
      '</div>' +
      '</header>' +
      '<label class="world-map-travel-editor__field world-map-travel-editor__field--opacity">' +
      '<span>Grid opacity</span>' +
      '<div class="world-map-travel-editor__brush-row">' +
      '<input type="range" min="0" max="1" step="0.01" value="0.24" data-travel-grid-opacity />' +
      '<input type="number" min="0" max="1" step="0.01" value="0.24" data-travel-grid-opacity />' +
      '</div>' +
      '</label>' +
      '<label class="world-map-travel-editor__field world-map-travel-editor__field--opacity">' +
      '<span>Hex opacity</span>' +
      '<div class="world-map-travel-editor__brush-row">' +
      '<input type="range" min="0" max="1" step="0.01" value="0.75" data-travel-terrain-opacity />' +
      '<input type="number" min="0" max="1" step="0.01" value="0.75" data-travel-terrain-opacity />' +
      '</div>' +
      '</label>' +
      '</section>'
    );
  }

  function buildRegionsPanelMarkup() {
    return (
      '<section class="world-map-travel-editor__regions" data-travel-regions-inline aria-label="Regions">' +
      '<header class="world-map-travel-editor__section-head">' +
      '<span>Regions</span>' +
      '<div class="world-map-travel-section-actions">' +
      '<button type="button" class="world-map-travel-mini-button" data-travel-detect-regions aria-label="Detect regions" title="Detect regions">' +
      '<i class="fa-solid fa-layer-group" aria-hidden="true"></i>' +
      '</button>' +
      '<button type="button" class="world-map-travel-mini-button" data-travel-detach-regions aria-label="Detach regions" title="Detach regions">' +
      '<i class="fa-solid fa-up-right-from-square" aria-hidden="true"></i>' +
      '</button>' +
      '</div>' +
      '</header>' +
      '<div class="world-map-travel-regions-list" data-travel-regions-list>' +
      '<p class="world-map-travel-regions-empty">Click Detect to scan painted regions.</p>' +
      '</div>' +
      '</section>'
    );
  }

  function buildGridColorButton(value) {
    return (
      '<button type="button" class="world-map-travel-color world-map-travel-color--' +
      escapeHtml(value) +
      '" data-travel-grid-color="' +
      escapeHtml(value) +
      '" aria-label="Griglia ' +
      escapeHtml(value) +
      '" title="Griglia ' +
      escapeHtml(value) +
      '"></button>'
    );
  }

  function buildTerrainButtons() {
    var keys = Object.keys(TERRAIN_TYPES);

    return keys
      .map(function (key) {
        var label = TERRAIN_TYPES[key].label;
        var color = TERRAIN_TYPES[key].color;
        var icon = getTerrainIcon(key);

        return (
          '<button type="button" class="world-map-travel-terrain" data-travel-editor-terrain="' +
          escapeHtml(key) +
          '" title="' +
          escapeHtml(label) +
          '" aria-label="' +
          escapeHtml(label) +
          '">' +
          '<span class="world-map-travel-terrain__swatch" style="--terrain-color: ' +
          escapeHtml(color) +
          '"><i class="fa-solid ' +
          escapeHtml(icon) +
          '" aria-hidden="true"></i></span>' +
          '<span>' +
          escapeHtml(label) +
          '</span>' +
          '</button>'
        );
      })
      .join("");
  }

  function getTerrainIcon(key) {
    var icons = {
      plain: "fa-seedling",
      forest: "fa-tree",
      mountain: "fa-mountain",
      hill: "fa-mound",
      swamp: "fa-water",
      desert: "fa-sun",
      arctic: "fa-snowflake",
      water: "fa-droplet",
      city: "fa-city",
      blocked: "fa-ban",
    };

    return icons[key] || "fa-hexagon";
  }

  function buildTerrainOptions() {
    return Object.keys(TERRAIN_TYPES)
      .map(function (key) {
        return (
          '<option value="' +
          escapeHtml(key) +
          '"' +
          (key === state.editorTerrain ? " selected" : "") +
          '>' +
          escapeHtml(TERRAIN_TYPES[key].label) +
          '</option>'
        );
      })
      .join("");
  }

  function stepInputWithWheel(input, event) {
    event.preventDefault();
    event.stopPropagation();

    var step = Number(input.step) || 1;
    var min = input.min === "" ? -Infinity : Number(input.min);
    var max = input.max === "" ? Infinity : Number(input.max);
    var current = Number(input.value) || 0;
    var direction = event.deltaY < 0 ? 1 : -1;
    var next = current + direction * step;

    if (Number.isFinite(min)) {
      next = Math.max(min, next);
    }

    if (Number.isFinite(max)) {
      next = Math.min(max, next);
    }

    input.value = formatInputStepValue(next, step);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function formatInputStepValue(value, step) {
    if (step >= 1) {
      return String(Math.round(value));
    }

    var decimals = String(step).split(".")[1];
    return Number(value).toFixed(decimals ? decimals.length : 2);
  }

  function updateBrushSizeFromInput(input) {
    state.brushSize = clampNumber(Number(input.value) || 1, 1, 12);
    syncBrushInputs();
    updateBrushPreviewFromPointer(state.lastPointerEvent);
    scheduleRedraw();
  }

  function syncEditorPanel() {
    if (!state.editorPanel) {
      return;
    }

    state.editorPanel.hidden = false;

    var terrainButtons = state.editorPanel.querySelectorAll("[data-travel-editor-terrain]");
    var road = state.editorPanel.querySelector("[data-travel-editor-road]");
    var bridge = state.editorPanel.querySelector("[data-travel-editor-bridge]");
    var tunnel = state.editorPanel.querySelector("[data-travel-editor-tunnel]");
    var erase = state.editorPanel.querySelector("[data-travel-editor-erase]");
    var brushInputs = state.editorPanel.querySelectorAll("[data-travel-editor-brush]");
    var overwriteInput = state.editorPanel.querySelector("[data-travel-editor-overwrite]");
    var gridOpacityInputs = state.editorPanel.querySelectorAll("[data-travel-grid-opacity]");
    var terrainOpacityInputs = state.editorPanel.querySelectorAll("[data-travel-terrain-opacity]");
    var gridToggle = state.editorPanel.querySelector("[data-travel-grid-toggle]");
    var colorButtons = state.editorPanel.querySelectorAll("[data-travel-grid-color]");
    var localStatus = state.editorPanel.querySelector("[data-travel-local-status]");

    for (var i = 0; i < terrainButtons.length; i += 1) {
      var terrain = terrainButtons[i].getAttribute("data-travel-editor-terrain");
      terrainButtons[i].classList.toggle("is-active", terrain === state.editorTerrain);
      terrainButtons[i].setAttribute("aria-pressed", String(terrain === state.editorTerrain));
    }

    if (road) road.checked = !!state.editorRoad;
    if (bridge) bridge.checked = !!state.editorBridge;
    if (tunnel) tunnel.checked = !!state.editorTunnel;
    if (erase) erase.checked = !!state.editorErase;
    if (overwriteInput) overwriteInput.checked = !!state.overwriteHexes;
    syncSelectiveEraseMenu();

    var inlineRegions = state.editorPanel.querySelector("[data-travel-regions-inline]");
    if (inlineRegions) inlineRegions.hidden = !!state.regionsDetached;

    for (var j = 0; j < brushInputs.length; j += 1) {
      brushInputs[j].value = String(state.brushSize);
    }

    for (var go = 0; go < gridOpacityInputs.length; go += 1) {
      gridOpacityInputs[go].value = String(state.gridOpacity);
    }

    for (var to = 0; to < terrainOpacityInputs.length; to += 1) {
      terrainOpacityInputs[to].value = String(state.terrainOpacity);
    }

    if (gridToggle) {
      gridToggle.classList.toggle("is-active", state.displayMode === "debug" || state.displayMode === "editor");
      gridToggle.setAttribute("aria-pressed", String(state.displayMode === "debug" || state.displayMode === "editor"));
    }

    for (var k = 0; k < colorButtons.length; k += 1) {
      var color = colorButtons[k].getAttribute("data-travel-grid-color");
      colorButtons[k].classList.toggle("is-active", color === state.gridColor);
      colorButtons[k].setAttribute("aria-pressed", String(color === state.gridColor));
    }

    if (localStatus) {
      localStatus.innerHTML = buildGridSourceStatusMarkup();
      localStatus.classList.toggle("is-local", !!state.hasLocalOverride);
      localStatus.classList.toggle("is-missing", !state.hasLocalOverride && !!state.staticGridMissing);
    }
  }

  function toggleSelectiveEraseTerrain(terrain) {
    if (!TERRAIN_TYPES[terrain]) {
      return;
    }

    if (state.selectiveEraseTerrains[terrain]) {
      delete state.selectiveEraseTerrains[terrain];
    } else {
      state.selectiveEraseTerrains[terrain] = true;
    }

    syncSelectiveEraseMenu();
  }

  function syncSelectiveEraseMenu() {
    if (!state.selectiveEraseMenu) {
      return;
    }

    var options = state.selectiveEraseMenu.querySelectorAll("[data-travel-selective-erase-terrain]");

    for (var i = 0; i < options.length; i += 1) {
      var terrain = options[i].getAttribute("data-travel-selective-erase-terrain");
      var active = !!state.selectiveEraseTerrains[terrain];
      options[i].classList.toggle("is-active", active);
      options[i].setAttribute("aria-pressed", String(active));
    }
  }

  function setTravelTool(tool, enabled) {
    state.editorErase = false;

    if (tool === "erase") {
      state.editorErase = !!enabled;
      if (state.editorErase) {
        state.editorRoad = false;
        state.editorBridge = false;
        state.editorTunnel = false;
      }
      syncEditorPanel();
      return;
    }

    if (enabled) {
      state.editorRoad = tool === "road";
      state.editorBridge = tool === "bridge";
      state.editorTunnel = tool === "tunnel";
    } else {
      if (tool === "road") state.editorRoad = false;
      if (tool === "bridge") state.editorBridge = false;
      if (tool === "tunnel") state.editorTunnel = false;
    }

    syncEditorPanel();
  }

  function bindCalculatorPickCapture() {
    var container = state.map ? state.map.getContainer() : null;

    if (!container || container._enclaveTravelPickCaptureBound) {
      return;
    }

    container._enclaveTravelPickCaptureBound = true;

    container.addEventListener("click", function (event) {
      if (!state.calculatorPickMode) {
        return;
      }

      var rect = container.getBoundingClientRect();
      var containerPoint = L.point(event.clientX - rect.left, event.clientY - rect.top);
      var latlng = state.map.containerPointToLatLng(containerPoint);

      handleCalculatorMapClick({ latlng: latlng, originalEvent: event });

      event.preventDefault();
      event.stopPropagation();

      if (event.stopImmediatePropagation) {
        event.stopImmediatePropagation();
      }
    }, true);
  }

  function bindMapEvents() {
    if (state.map._enclaveTravelBound) {
      return;
    }

    state.map._enclaveTravelBound = true;
    state.map.on("movestart zoomstart zoom zoomanim", hideGridDuringInteraction);
    state.map.on("moveend zoomend resize", showGridAfterInteraction);
    state.map.on("contextmenu", suppressLeafletContextMenuAfterRightDrag);
    state.map.on("mousemove", updatePickPreviewMarker);
    state.map.on("click", function (event) {
      if (handleCalculatorMapClick(event)) {
        if (event && event.originalEvent) {
          event.originalEvent.preventDefault();
          event.originalEvent.stopPropagation();

          if (event.originalEvent.stopImmediatePropagation) {
            event.originalEvent.stopImmediatePropagation();
          }

          L.DomEvent.stop(event.originalEvent);
        }
      }
    });
  }

  function detectRegions() {
    var visited = new Set();
    var regions = [];
    var keys = getStoredCellKeys();

    keys.forEach(function (key) {
      if (visited.has(key)) {
        return;
      }

      var start = parseHexKey(key);
      var startCell = getCellData(start.q, start.r);
      var signature = getRegionSignature(startCell);
      var queue = [start];
      var cells = [];
      var qMin = start.q;
      var qMax = start.q;
      var rMin = start.r;
      var rMax = start.r;
      var riskTotal = 0;
      var costTotal = 0;

      visited.add(key);

      while (queue.length) {
        var current = queue.shift();
        var currentCell = getCellData(current.q, current.r);

        cells.push({ q: current.q, r: current.r });
        qMin = Math.min(qMin, current.q);
        qMax = Math.max(qMax, current.q);
        rMin = Math.min(rMin, current.r);
        rMax = Math.max(rMax, current.r);
        riskTotal += Number(currentCell.risk) || 0;
        costTotal += Number(currentCell.cost) || 0;

        getHexNeighbors(current.q, current.r).forEach(function (neighbor) {
          var neighborKey = hexKey(neighbor.q, neighbor.r);

          if (visited.has(neighborKey) || !readStoredCell(neighbor.q, neighbor.r)) {
            return;
          }

          var neighborCell = getCellData(neighbor.q, neighbor.r);

          if (getRegionSignature(neighborCell) !== signature) {
            return;
          }

          visited.add(neighborKey);
          queue.push(neighbor);
        });
      }

      var center = getRegionCenter(cells);
      var region = {
        id: getStableRegionId(startCell, center, cells.length),
        name: getRegionDisplayName(getStableRegionId(startCell, center, cells.length), startCell, regions.length + 1),
        signature: signature,
        terrain: startCell.terrain,
        waterType: startCell.waterType || "",
        road: !!startCell.road,
        bridge: !!startCell.bridge,
        tunnel: !!startCell.tunnel,
        blocked: !!startCell.blocked,
        size: cells.length,
        cells: cells,
        bounds: {
          qMin: qMin,
          qMax: qMax,
          rMin: rMin,
          rMax: rMax,
        },
        center: center,
        riskAvg: roundTo(riskTotal / Math.max(1, cells.length), 2),
        costAvg: roundTo(costTotal / Math.max(1, cells.length), 2),
      };

      regions.push(region);
    });

    regions.sort(function (a, b) {
      var categoryCompare = getRegionCategoryLabel(a).localeCompare(getRegionCategoryLabel(b), "it", { sensitivity: "base" });

      if (categoryCompare !== 0) {
        return categoryCompare;
      }

      return a.name.localeCompare(b.name, "it", { sensitivity: "base" });
    });

    state.regions = regions;
    rebuildRegionHexLookup();
    return regions;
  }

  function rebuildRegionHexLookup() {
    var lookup = {};

    state.regions.forEach(function (region) {
      (region.cells || []).forEach(function (cell) {
        lookup[hexKey(cell.q, cell.r)] = region.id;
      });
    });

    state.regionHexLookup = lookup;
  }

  function getRegionSignature(cell) {
    return [
      cell.terrain,
      cell.road ? "road" : "no-road",
      cell.tunnel ? "tunnel" : "no-tunnel",
      cell.terrain === "water" && cell.waterType ? "water:" + cell.waterType : "water:none",
      cell.blocked ? "blocked" : "open",
    ].join("|");
  }

  function getStableRegionId(cell, center, size) {
    return [
      "region",
      cell.terrain,
      cell.waterType || "none",
      center.q,
      center.r,
      size,
    ].join("-");
  }

  function getRegionDisplayName(regionId, cell, index) {
    if (state.regionNames && state.regionNames[regionId]) {
      return state.regionNames[regionId];
    }

    return getDefaultRegionName(cell, index);
  }

  function getDefaultRegionName(cell, index) {
    var terrain = getRegionCategoryLabel({ terrain: cell.terrain, waterType: cell.waterType || "" });
    var flags = [];

    if (cell.road) flags.push("Road");
    if (cell.bridge) flags.push("Bridge");
    if (cell.tunnel) flags.push("Tunnel");

    return terrain + (flags.length ? " + " + flags.join(" + ") : "") + " " + index;
  }

  function getRegionCenter(cells) {
    var xTotal = 0;
    var yTotal = 0;

    cells.forEach(function (cell) {
      var center = hexToPixel(cell.q, cell.r, state.config.hexSize);
      xTotal += center.x;
      yTotal += center.y;
    });

    var count = Math.max(1, cells.length);
    var point = {
      x: xTotal / count,
      y: yTotal / count,
    };
    var hex = pixelToHex(point.x, point.y, state.config.hexSize);

    return {
      q: hex.q,
      r: hex.r,
      x: Math.round(point.x),
      y: Math.round(point.y),
    };
  }

  function getRegionCategoryLabel(region) {
    var terrain = TERRAIN_TYPES[region.terrain] ? TERRAIN_TYPES[region.terrain].label : region.terrain;

    if (region.terrain === "water" && region.waterType && WATER_REGION_TYPES[region.waterType]) {
      return terrain + " (" + WATER_REGION_TYPES[region.waterType] + ")";
    }

    return terrain;
  }

  function getRegionById(regionId) {
    return state.regions.find(function (region) {
      return region.id === regionId;
    }) || null;
  }

  function renameRegion(regionId, value) {
    var region = getRegionById(regionId);

    if (!region) {
      return;
    }

    var name = String(value || "").trim();

    if (!state.regionNames) {
      state.regionNames = {};
    }

    if (name) {
      state.regionNames[regionId] = name;
      region.name = name;
    } else {
      delete state.regionNames[regionId];
      region.name = getDefaultRegionName(region, 1);
    }

    saveGridToLocalStorage();
    renderRegionsList();
  }

  function promptRenameRegion(regionId) {
    var region = getRegionById(regionId);

    if (!region) {
      return;
    }

    var nextName = window.prompt("Nuovo nome regione:", region.name);

    if (nextName === null) {
      return;
    }

    renameRegion(regionId, nextName);
  }

  function renderRegionsList() {
    var mounts = getRegionsListMounts();

    if (!mounts.length) {
      return;
    }

    if (state.editorPanel) {
      var inlineRegions = state.editorPanel.querySelector("[data-travel-regions-inline]");
      if (inlineRegions) inlineRegions.hidden = !!state.regionsDetached;
    }

    var html;

    if (!state.regions.length) {
      html = '<p class="world-map-travel-regions-empty">Click Detect to scan painted regions.</p>';
    } else {
      html = buildGroupedRegionsHtml(state.regions);
    }

    mounts.forEach(function (mount) {
      mount.innerHTML = html;
    });
  }

  function buildGroupedRegionsHtml(regions) {
    var html = "";
    var currentCategory = "";

    regions.forEach(function (region) {
      var category = getRegionCategoryLabel(region);
      var flags = [];

      if (region.road) flags.push("road");
      if (region.bridge) flags.push("bridge");
      if (region.tunnel) flags.push("tunnel");

      if (category !== currentCategory) {
        currentCategory = category;
        html += '<h4 class="world-map-travel-region-group">' + escapeHtml(category) + '</h4>';
      }

      html +=
        '<div class="world-map-travel-region-row' +
        (region.id === state.hoveredRegionId ? ' is-hovered' : '') +
        (region.id === state.pulseRegionId ? ' is-pulsing' : '') +
        '" data-travel-focus-region="' + escapeHtml(region.id) + '">' +
        '<span class="world-map-travel-region-row__name">' + escapeHtml(region.name) + '</span>' +
        '<span class="world-map-travel-region-row__meta">' + region.size + ' hex · risk ' + region.riskAvg + ' · cost ' + region.costAvg + (flags.length ? ' · ' + escapeHtml(flags.join(", ")) : '') + '</span>' +
        '</div>';
    });

    return html;
  }

  function getRegionsListMounts() {
    var mounts = [];

    if (state.editorPanel) {
      var inlineMount = state.editorPanel.querySelector("[data-travel-regions-list]");
      if (inlineMount) mounts.push(inlineMount);
    }

    if (state.regionsWindow) {
      var detachedMount = state.regionsWindow.querySelector("[data-travel-regions-list]");
      if (detachedMount) mounts.push(detachedMount);
    }

    return mounts;
  }

  function openDetachedRegionsWindow() {
    state.regionsDetached = true;

    if (state.regionsWindow) {
      state.regionsWindow.hidden = false;
      syncEditorPanel();
      return;
    }

    var windowEl = document.createElement("section");
    windowEl.className = "world-map-floating-regions";
    windowEl.setAttribute("data-travel-regions-window", "");
    windowEl.innerHTML =
      '<header class="world-map-floating-regions__header" data-travel-regions-window-drag>' +
      '<strong>Regions</strong>' +
      '<div class="world-map-travel-section-actions">' +
      '<button type="button" class="world-map-travel-mini-button" data-travel-detect-regions aria-label="Detect regions" title="Detect regions"><i class="fa-solid fa-layer-group" aria-hidden="true"></i></button>' +
      '<button type="button" class="world-map-travel-mini-button" data-travel-close-regions-window aria-label="Dock regions" title="Dock regions"><i class="fa-solid fa-down-left-and-up-right-to-center" aria-hidden="true"></i></button>' +
      '</div>' +
      '</header>' +
      '<div class="world-map-travel-regions-list" data-travel-regions-list></div>';

    windowEl.style.left = "calc(100vw - 420px)";
    windowEl.style.top = "110px";

    document.body.appendChild(windowEl);
    state.regionsWindow = windowEl;

    bindDetachedRegionsWindowEvents(windowEl);
    syncEditorPanel();
  }

  function closeDetachedRegionsWindow() {
    state.regionsDetached = false;

    if (state.regionsWindow) {
      state.regionsWindow.remove();
      state.regionsWindow = null;
    }

    syncEditorPanel();
  }

  function bindDetachedRegionsWindowEvents(windowEl) {
    if (!windowEl || windowEl._enclaveRegionsBound) {
      return;
    }

    windowEl._enclaveRegionsBound = true;

    windowEl.addEventListener("pointerdown", function (event) {
      var handle = event.target.closest("[data-travel-regions-window-drag]");

      if (!handle || event.target.closest("button")) {
        return;
      }

      event.preventDefault();
      var rect = windowEl.getBoundingClientRect();
      state.regionsWindowDrag = {
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
      };

      windowEl.classList.add("is-dragging");
      window.addEventListener("pointermove", handleRegionsWindowDrag);
      window.addEventListener("pointerup", stopRegionsWindowDrag, { once: true });
    });

    windowEl.addEventListener("click", function (event) {
      var detect = event.target.closest("[data-travel-detect-regions]");
      var close = event.target.closest("[data-travel-close-regions-window]");
      var focus = event.target.closest("[data-travel-focus-region]");
      var renameInput = event.target.closest("[data-travel-region-name]");
      var renameRegionButton = event.target.closest("[data-travel-rename-region]");
      var waterTypeButton = event.target.closest("[data-travel-water-type]");

      if (waterTypeButton) {
        applyWaterTypeToRegion(
          waterTypeButton.getAttribute("data-travel-region-id"),
          waterTypeButton.getAttribute("data-travel-water-type")
        );
        closeRegionContextMenu();
        return;
      }

      if (renameRegionButton) {
        promptRenameRegion(renameRegionButton.getAttribute("data-travel-rename-region"));
        closeRegionContextMenu();
        return;
      }

      if (detect) {
        state.regions = detectRegions();
        renderRegionsList();
        return;
      }

      if (close) {
        closeDetachedRegionsWindow();
        renderRegionsList();
        return;
      }

      if (focus && !renameInput) {
        focusRegion(focus.getAttribute("data-travel-focus-region"));
      }
    });

    windowEl.addEventListener("mouseover", function (event) {
      var row = event.target.closest("[data-travel-focus-region]");
      if (row) setHoveredRegion(row.getAttribute("data-travel-focus-region"), "list");
    });

    windowEl.addEventListener("mouseout", function (event) {
      var row = event.target.closest("[data-travel-focus-region]");
      if (row && !row.contains(event.relatedTarget)) setHoveredRegion(null, "");
    });

    windowEl.addEventListener("contextmenu", function (event) {
      var row = event.target.closest("[data-travel-focus-region]");

      if (!row) return;

      var region = getRegionById(row.getAttribute("data-travel-focus-region"));

      event.preventDefault();
      event.stopPropagation();

      if (!region) {
        closeRegionContextMenu();
        return;
      }

      openRegionContextMenu(region.id, event.clientX, event.clientY);
    });
  }

  function handleRegionsWindowDrag(event) {
    if (!state.regionsWindowDrag || !state.regionsWindow) {
      return;
    }

    var nextLeft = state.regionsWindowDrag.left + event.clientX - state.regionsWindowDrag.startX;
    var nextTop = state.regionsWindowDrag.top + event.clientY - state.regionsWindowDrag.startY;

    state.regionsWindow.style.left = clampNumber(nextLeft, 8, window.innerWidth - 260) + "px";
    state.regionsWindow.style.top = clampNumber(nextTop, 8, window.innerHeight - 120) + "px";
  }

  function stopRegionsWindowDrag() {
    window.removeEventListener("pointermove", handleRegionsWindowDrag);

    if (state.regionsWindow) {
      state.regionsWindow.classList.remove("is-dragging");
    }

    state.regionsWindowDrag = null;
  }

  function applyWaterTypeToRegion(regionId, waterType) {
    var region = getRegionById(regionId);
    var safeType = WATER_REGION_TYPES[waterType] ? waterType : "";

    if (!region || region.terrain !== "water") {
      return;
    }

    region.cells.forEach(function (cell) {
      var key = hexKey(cell.q, cell.r);
      var existing = readStoredCell(cell.q, cell.r);

      if (!existing) {
        return;
      }

      existing.waterType = safeType;
      writeStoredCell(cell.q, cell.r, existing);
    });

    state.regions = detectRegions();
    saveGridToLocalStorage();
    renderRegionsList();
    redraw();
  }

  function openSelectiveEraseMenu(x, y) {
    closeSelectiveEraseMenu();
    closeRegionContextMenu();

    var wrapper = document.createElement("div");
    wrapper.innerHTML = buildSelectiveEraseMenuMarkup();
    var menu = wrapper.firstElementChild;

    menu.style.position = "fixed";
    menu.style.left = "0px";
    menu.style.top = "0px";
    menu.style.zIndex = "13000";

    menu.addEventListener("click", function (event) {
      var button = event.target.closest("[data-travel-selective-erase-terrain]");

      if (!button) {
        return;
      }

      toggleSelectiveEraseTerrain(button.getAttribute("data-travel-selective-erase-terrain"));
    });

    document.body.appendChild(menu);
    state.selectiveEraseMenu = menu;
    clampFloatingMenuToViewport(menu, x, y);
    syncSelectiveEraseMenu();

    window.setTimeout(function () {
      document.addEventListener("pointerdown", closeSelectiveEraseMenuOnOutside, { once: true, capture: true });
    }, 0);
  }

  function clampFloatingMenuToViewport(menu, x, y) {
    if (!menu) {
      return;
    }

    var margin = 8;
    var rect = menu.getBoundingClientRect();
    var nextLeft = clampNumber(x, margin, Math.max(margin, window.innerWidth - rect.width - margin));
    var nextTop = clampNumber(y, margin, Math.max(margin, window.innerHeight - rect.height - margin));

    menu.style.left = nextLeft + "px";
    menu.style.top = nextTop + "px";
  }

  function closeSelectiveEraseMenuOnOutside(event) {
    if (state.selectiveEraseMenu && state.selectiveEraseMenu.contains(event.target)) {
      document.addEventListener("pointerdown", closeSelectiveEraseMenuOnOutside, { once: true, capture: true });
      return;
    }

    closeSelectiveEraseMenu();
  }

  function closeSelectiveEraseMenu() {
    if (state.selectiveEraseMenu) {
      state.selectiveEraseMenu.remove();
      state.selectiveEraseMenu = null;
    }
  }

  function openRegionContextMenu(regionId, x, y) {
    closeRegionContextMenu();

    var menu = document.createElement("div");
    menu.className = "world-map-region-context-menu";
    menu.setAttribute("data-travel-region-context-menu", "");
    menu.style.left = x + "px";
    menu.style.top = y + "px";

    var region = getRegionById(regionId);
    var html = '<button type="button" data-travel-rename-region="' + escapeHtml(regionId) + '">Rinomina</button>';

    if (region && region.terrain === "water") {
      html += '<hr aria-hidden="true" />';
      html += '<button type="button" data-travel-region-id="' + escapeHtml(regionId) + '" data-travel-water-type="">Acqua generica</button>';

      Object.keys(WATER_REGION_TYPES).forEach(function (key) {
        html += '<button type="button" data-travel-region-id="' + escapeHtml(regionId) + '" data-travel-water-type="' + escapeHtml(key) + '">' + escapeHtml(WATER_REGION_TYPES[key]) + '</button>';
      });
    }

    menu.innerHTML = html;
    menu.addEventListener("click", function (event) {
      var renameButton = event.target.closest("[data-travel-rename-region]");
      var button = event.target.closest("[data-travel-water-type]");

      if (renameButton) {
        promptRenameRegion(renameButton.getAttribute("data-travel-rename-region"));
        closeRegionContextMenu();
        return;
      }

      if (!button) {
        return;
      }

      applyWaterTypeToRegion(
        button.getAttribute("data-travel-region-id"),
        button.getAttribute("data-travel-water-type")
      );
      closeRegionContextMenu();
    });
    document.body.appendChild(menu);
    state.regionContextMenu = menu;

    window.setTimeout(function () {
      document.addEventListener("pointerdown", closeRegionContextMenuOnOutside, { once: true, capture: true });
    }, 0);
  }

  function closeRegionContextMenuOnOutside(event) {
    if (state.regionContextMenu && state.regionContextMenu.contains(event.target)) {
      document.addEventListener("pointerdown", closeRegionContextMenuOnOutside, { once: true, capture: true });
      return;
    }

    closeRegionContextMenu();
  }

  function closeRegionContextMenu() {
    if (state.regionContextMenu) {
      state.regionContextMenu.remove();
      state.regionContextMenu = null;
    }
  }

  function focusRegion(regionId) {
    var region = state.regions.find(function (item) {
      return item.id === regionId;
    });

    if (!region || !state.map) {
      return;
    }

    pulseRegion(region.id);
    hideGridDuringInteraction();

    var latlng = state.world.toMapLatLng(region.center.x, region.center.y);
    state.map.panTo(latlng, { animate: true });
  }

  function pulseRegion(regionId) {
    state.pulseRegionId = regionId;
    rebuildHighlightedRegionCellLookup(regionId);

    if (state.pulseRegionTimer) {
      window.clearTimeout(state.pulseRegionTimer);
    }

    renderRegionsList();
    scheduleRedraw();

    state.pulseRegionTimer = window.setTimeout(function () {
      state.pulseRegionTimer = null;
      state.pulseRegionId = null;
      rebuildHighlightedRegionCellLookup(state.hoveredRegionSource === "list" ? state.hoveredRegionId : null);
      renderRegionsList();
      scheduleRedraw();
    }, 1000);
  }

  function scheduleRedraw() {
    if (state.redrawFrame) {
      return;
    }

    state.redrawFrame = window.requestAnimationFrame(function () {
      state.redrawFrame = null;
      redraw();
    });
  }

  function hideGridDuringInteraction() {
    if (!state.canvas || state.displayMode === "off") {
      return;
    }

    if (state.interactionHideTimer) {
      window.clearTimeout(state.interactionHideTimer);
      state.interactionHideTimer = null;
    }

    state.isMapInteracting = true;
    state.brushPreviewHexes = [];
    state.canvas.hidden = true;
  }

  function showGridAfterInteraction() {
    if (state.interactionHideTimer) {
      window.clearTimeout(state.interactionHideTimer);
    }

    state.interactionHideTimer = window.setTimeout(function () {
      state.interactionHideTimer = null;
      state.isMapInteracting = false;
      redraw();
    }, 60);
  }

  function setDisplayMode(mode) {
    state.displayMode = mode === "debug" || mode === "editor" ? mode : "off";

    if (state.canvas) {
      state.canvas.style.pointerEvents = state.displayMode === "editor" ? "auto" : "none";
    }

    syncExternalControls();
    syncEditorPanel();
    redraw();
  }

  function toggleDebugGrid() {
    setDisplayMode(state.displayMode === "debug" ? "off" : "debug");
  }

  function toggleEditor() {
    setDisplayMode(state.displayMode === "editor" ? "off" : "editor");
  }

  function setGridColor(color) {
    state.gridColor = color === "black" || color === "cyan" || color === "white" ? color : "white";
    syncExternalControls();
    redraw();
  }

  function syncExternalControls() {
    var modeButtons = document.querySelectorAll("[data-travel-grid-mode]");
    var colorButtons = document.querySelectorAll("[data-travel-grid-color]");

    for (var i = 0; i < modeButtons.length; i += 1) {
      var mode = modeButtons[i].getAttribute("data-travel-grid-mode");
      modeButtons[i].classList.toggle("is-active", mode === state.displayMode);
      modeButtons[i].setAttribute("aria-pressed", String(mode === state.displayMode));
    }

    for (var j = 0; j < colorButtons.length; j += 1) {
      var color = colorButtons[j].getAttribute("data-travel-grid-color");
      colorButtons[j].classList.toggle("is-active", color === state.gridColor);
      colorButtons[j].setAttribute("aria-pressed", String(color === state.gridColor));
    }
  }

  function redraw() {
    if (!state.map || !state.canvas || !state.ctx) {
      return;
    }

    if (state.isMapInteracting) {
      state.canvas.hidden = true;
      return;
    }

    resizeCanvasToMap();
    clearCanvas();

    if (state.displayMode === "off") {
      state.canvas.hidden = true;
      return;
    }

    state.canvas.hidden = false;
    drawVisibleHexes();
    drawBrushPreview();
  }

  function resizeCanvasToMap() {
    var size = state.map.getSize();
    var ratio = window.devicePixelRatio || 1;
    var width = Math.max(1, Math.round(size.x));
    var height = Math.max(1, Math.round(size.y));

    if (state.canvas.width !== Math.round(width * ratio)) {
      state.canvas.width = Math.round(width * ratio);
    }

    if (state.canvas.height !== Math.round(height * ratio)) {
      state.canvas.height = Math.round(height * ratio);
    }

    state.canvas.style.width = width + "px";
    state.canvas.style.height = height + "px";
    state.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function clearCanvas() {
    var size = state.map.getSize();
    state.ctx.clearRect(0, 0, size.x, size.y);
  }

  function drawVisibleHexes() {
    var bounds = state.map.getBounds();
    var zoom = state.map.getZoom();
    var corners = [
      state.world.toImagePoint(bounds.getNorthWest()),
      state.world.toImagePoint(bounds.getNorthEast()),
      state.world.toImagePoint(bounds.getSouthWest()),
      state.world.toImagePoint(bounds.getSouthEast()),
    ];
    var margin = state.config.hexSize * 4;
    var minX = clampNumber(Math.min.apply(null, corners.map(function (p) { return p.x; })) - margin, 0, state.width);
    var maxX = clampNumber(Math.max.apply(null, corners.map(function (p) { return p.x; })) + margin, 0, state.width);
    var minY = clampNumber(Math.min.apply(null, corners.map(function (p) { return p.y; })) - margin, 0, state.height);
    var maxY = clampNumber(Math.max.apply(null, corners.map(function (p) { return p.y; })) + margin, 0, state.height);
    var hexCorners = [
      pixelToHex(minX, minY, state.config.hexSize),
      pixelToHex(maxX, minY, state.config.hexSize),
      pixelToHex(minX, maxY, state.config.hexSize),
      pixelToHex(maxX, maxY, state.config.hexSize),
    ];
    var qValues = hexCorners.map(function (h) { return h.q; });
    var rValues = hexCorners.map(function (h) { return h.r; });
    var qMin = Math.min.apply(null, qValues) - 6;
    var qMax = Math.max.apply(null, qValues) + 6;
    var rMin = Math.min.apply(null, rValues) - 6;
    var rMax = Math.max.apply(null, rValues) + 6;

    state.lastVisibleHexBounds = {
      minQ: qMin,
      maxQ: qMax,
      minR: rMin,
      maxR: rMax,
    };

    if (shouldSkipDenseGridRender(qMin, qMax, rMin, rMax)) {
      return;
    }

    requestVisibleGridChunks(state.lastVisibleHexBounds);

    state.ctx.lineWidth = getGridLineWidthForZoom(zoom);
    state.ctx.strokeStyle = getGridStrokeStyle();

    for (var q = qMin; q <= qMax; q += 1) {
      for (var r = rMin; r <= rMax; r += 1) {
        var center = hexToPixel(q, r, state.config.hexSize);

        if (center.x < minX - margin || center.x > maxX + margin || center.y < minY - margin || center.y > maxY + margin) {
          continue;
        }

        if (!isPixelInsideMap(center.x, center.y)) {
          continue;
        }

        drawHex(q, r, center);
      }
    }
  }

  function shouldSkipDenseGridRender(qMin, qMax, rMin, rMax) {
    var visibleHexes = getVisibleHexCount(qMin, qMax, rMin, rMax);
    var maxVisibleHexes = getMaxVisibleHexesForCurrentMode();

    if (visibleHexes > maxVisibleHexes) {
      state.canvas.dataset.travelGridSkipped = String(visibleHexes);
      return true;
    }

    delete state.canvas.dataset.travelGridSkipped;
    return false;
  }

  function getVisibleHexCount(qMin, qMax, rMin, rMax) {
    return Math.max(0, qMax - qMin + 1) * Math.max(0, rMax - rMin + 1);
  }

  function getMaxVisibleHexesForCurrentMode() {
    if (state.displayMode === "debug") {
      return Number(state.config.maxVisibleHexesDebug) || Number(state.config.maxVisibleHexes) || 26000;
    }

    return Number(state.config.maxVisibleHexes) || 18000;
  }

  function requestVisibleGridChunks(bounds) {
    if (!state.gridStore && window.EnclaveTravelGridStore && typeof window.EnclaveTravelGridStore.init === "function") {
      initializeTravelGridStore();
    }

    if (!state.gridStore || typeof state.gridStore.loadChunksForBounds !== "function") {
      return;
    }

    var key = [bounds.minQ, bounds.maxQ, bounds.minR, bounds.maxR].join(":");

    if (key === state.visibleChunkRequestKey) {
      return;
    }

    state.visibleChunkRequestKey = key;

    state.gridStore.loadChunksForBounds(bounds).then(function () {
      syncLoadedGridStoreCellsIntoState();
      scheduleRedraw();
    }).catch(function (error) {
      console.warn("Travel grid chunk load failed:", error);
    });
  }

  function syncLoadedGridStoreCellsIntoState() {
    if (!state.gridStore || typeof state.gridStore.forEachLoadedCell !== "function") {
      return;
    }

    state.gridStore.forEachLoadedCell(function (cell) {
      var normalized = sanitizeSingleCell(cell, cell.q, cell.r);

      if (normalized) {
        state.cells[hexKey(cell.q, cell.r)] = normalized;
      }
    });
  }

  function requestCurrentViewportChunks() {
    if (!state.map || !state.world || !state.gridStore) {
      return;
    }

    var bounds = getCurrentVisibleHexBounds();
    state.lastVisibleHexBounds = bounds;
    requestVisibleGridChunks(bounds);
  }

  function getGridStrokeStyle() {
    var opacity = state.displayMode === "editor" ? state.gridOpacity : Math.min(state.gridOpacity, 0.12);

    if (state.gridColor === "black") {
      return "rgba(0, 0, 0, " + opacity + ")";
    }

    if (state.gridColor === "cyan") {
      return "rgba(113, 221, 202, " + opacity + ")";
    }

    return "rgba(255, 255, 255, " + opacity + ")";
  }

  function getGridLineWidthForZoom(zoom) {
    if (zoom <= -3) return 0.45;
    if (zoom <= -2) return 0.55;
    return 0.75;
  }

  function bindContextMenuSuppression() {
    if (document._enclaveTravelContextSuppressionBound) {
      return;
    }

    document._enclaveTravelContextSuppressionBound = true;

    document.addEventListener("contextmenu", function (event) {
      if (!shouldSuppressContextMenu()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      state.suppressNextContextMenu = false;
      state.suppressContextMenuUntil = 0;
      state._rightMouseMoved = false;
    }, true);

    window.addEventListener("mouseup", function (event) {
      if (event.button !== 2 || state.displayMode !== "editor") {
        return;
      }

      if (state._rightMouseDown && state._rightMouseMoved) {
        state.suppressNextContextMenu = true;
        state.suppressContextMenuUntil = Date.now() + 1200;
      }

      state._rightMouseDown = false;
    }, true);
  }

  function suppressLeafletContextMenuAfterRightDrag(event) {
    if (!shouldSuppressContextMenu()) {
      return;
    }

    if (event && event.originalEvent) {
      event.originalEvent.preventDefault();
      event.originalEvent.stopPropagation();
    }

    if (window.L && L.DomEvent && event && event.originalEvent) {
      L.DomEvent.stop(event.originalEvent);
    }

    state.suppressNextContextMenu = false;
    state.suppressContextMenuUntil = 0;
    state._rightMouseMoved = false;
  }

  function shouldSuppressContextMenu() {
    if (state.displayMode !== "editor") {
      return false;
    }

    return !!state.suppressNextContextMenu || !!state._rightMouseMoved || Date.now() <= state.suppressContextMenuUntil;
  }

  function bindCanvasPainting() {
    if (!state.canvas || state.canvas._enclaveTravelPaintingBound) {
      return;
    }

    state.canvas._enclaveTravelPaintingBound = true;

    state.canvas.addEventListener("pointerdown", function (event) {
      state._rightMouseDown = event.button === 2;
      state._rightMouseMoved = false;
      if (state.displayMode !== "editor") {
        return;
      }

      if (event.button === 2) {
        state._rightMouseDown = true;
        state._rightMouseMoved = false;
      }

      if (event.button === 1 || event.button === 2) {
        beginMiddleMousePan(event);
        return;
      }

      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      state.isPainting = true;
      state.lastPaintedKey = "";
      paintFromPointerEvent(event);
      state.canvas.setPointerCapture(event.pointerId);
    });

    state.canvas.addEventListener("pointermove", function (event) {
      state.lastPointerEvent = event;
      updateBrushPreviewFromPointer(event);
      updateHoveredRegionFromPointer(event);

      if (state.isMiddlePanning) {
        continueMiddleMousePan(event);
        return;
      }

      if (!state.isPainting || state.displayMode !== "editor") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      paintFromPointerEvent(event);
    });

    state.canvas.addEventListener("pointerup", function (event) {
      if (state.isMiddlePanning) {
        stopMiddleMousePan(event);
        return;
      }

      stopPainting(event);
    });
    state.canvas.addEventListener("pointercancel", function (event) {
      if (state.isMiddlePanning) {
        stopMiddleMousePan(event);
        return;
      }

      stopPainting(event);
    });
    state.canvas.addEventListener("auxclick", function (event) {
      if (event.button === 1) {
        event.preventDefault();
      }
    });

    state.canvas.addEventListener("click", function (event) {
      if (state.displayMode === "editor") {
        event.stopPropagation();
      }
    }, true);

    state.canvas.addEventListener("pointerleave", function () {
      state.brushPreviewHexes = [];
      scheduleRedraw();
      setHoveredRegion(null, "");
    });

    state.canvas.addEventListener("contextmenu", function (event) {
      if (!shouldSuppressContextMenu()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      state.suppressNextContextMenu = false;
      state.suppressContextMenuUntil = 0;
      state._rightMouseMoved = false;
    }, true);
  }

  function beginMiddleMousePan(event) {
    event.preventDefault();
    event.stopPropagation();
    state.isMiddlePanning = true;
    state.middlePan = {
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      dragged: false,
    };
    state.canvas.setPointerCapture(event.pointerId);
  }

  function continueMiddleMousePan(event) {
    if (state._rightMouseDown) {
      if (Math.abs(event.clientX - state.middlePan.startX) > 4 || Math.abs(event.clientY - state.middlePan.startY) > 4) {
        state._rightMouseMoved = true;
      }
    }
    if (!state.middlePan) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    var dx = event.clientX - state.middlePan.x;
    var dy = event.clientY - state.middlePan.y;

    if (Math.abs(event.clientX - state.middlePan.startX) > 4 || Math.abs(event.clientY - state.middlePan.startY) > 4) {
      state.middlePan.dragged = true;
    }

    state.middlePan.x = event.clientX;
    state.middlePan.y = event.clientY;
    state.map.panBy([-dx, -dy], { animate: false });
  }

  function stopMiddleMousePan(event) {
    var dragged = !!(state.middlePan && state.middlePan.dragged);

    if (state._rightMouseDown && (state._rightMouseMoved || dragged)) {
      state.suppressNextContextMenu = true;
      state.suppressContextMenuUntil = Date.now() + 1200;
    }

    state.lastMiddlePanDragged = dragged;
    state.isMiddlePanning = false;
    state.middlePan = null;

    if (event && state.canvas && state.canvas.hasPointerCapture && state.canvas.hasPointerCapture(event.pointerId)) {
      state.canvas.releasePointerCapture(event.pointerId);
    }
  }

  function wasMiddleMousePanDrag() {
    var dragged = !!state.lastMiddlePanDragged;
    state.lastMiddlePanDragged = false;
    return dragged;
  }

  function stopPainting(event) {
    state.isPainting = false;
    state.lastPaintedKey = "";
    updateBrushPreviewFromPointer(event);
    scheduleRedraw();

    if (state.pendingAutosave) {
      scheduleGridAutosave();
    }

    if (event && state.canvas && state.canvas.hasPointerCapture && state.canvas.hasPointerCapture(event.pointerId)) {
      state.canvas.releasePointerCapture(event.pointerId);
    }
  }

  function updateHoveredRegionFromPointer(event) {
    if (!state.regions.length || state.isPainting || state.isMiddlePanning || state.displayMode !== "editor") {
      return;
    }

    var rect = state.canvas.getBoundingClientRect();
    var containerPoint = L.point(event.clientX - rect.left, event.clientY - rect.top);
    var latlng = state.map.containerPointToLatLng(containerPoint);
    var pixel = state.world.toImagePoint(latlng);

    if (!isPixelInsideMap(pixel.x, pixel.y)) {
      setHoveredRegion(null, "");
      return;
    }

    var hex = pixelToHex(pixel.x, pixel.y, state.config.hexSize);
    var region = getRegionByHex(hex.q, hex.r);
    setHoveredRegion(region ? region.id : null, "map");
  }

  function getRegionByHex(q, r) {
    var regionId = state.regionHexLookup[hexKey(q, r)];
    return regionId ? getRegionById(regionId) : null;
  }

  function setHoveredRegion(regionId, source) {
    var safeSource = regionId ? (source || "") : "";
    var previousSource = state.hoveredRegionSource;
    var previousRegionId = state.hoveredRegionId;

    if (previousRegionId === regionId && previousSource === safeSource) {
      return;
    }

    state.hoveredRegionId = regionId;
    state.hoveredRegionSource = safeSource;
    updateRegionHoverClasses(previousRegionId, regionId);

    if (state.pulseRegionId) {
      return;
    }

    if (safeSource === "list") {
      rebuildHighlightedRegionCellLookup(regionId);
      scheduleRedraw();
      return;
    }

    if (previousSource === "list") {
      rebuildHighlightedRegionCellLookup(null);
      scheduleRedraw();
    }
  }

  function rebuildHighlightedRegionCellLookup(regionId) {
    var lookup = {};
    var region = regionId ? getRegionById(regionId) : null;

    if (region && Array.isArray(region.cells)) {
      region.cells.forEach(function (cell) {
        lookup[hexKey(cell.q, cell.r)] = true;
      });
    }

    state.highlightedRegionCellLookup = lookup;
  }

  function updateRegionHoverClasses(previousRegionId, nextRegionId) {
    [previousRegionId, nextRegionId].forEach(function (regionId) {
      if (!regionId) {
        return;
      }

      var rows = document.querySelectorAll('[data-travel-focus-region="' + cssEscape(regionId) + '"]');

      for (var i = 0; i < rows.length; i += 1) {
        rows[i].classList.toggle("is-hovered", regionId === nextRegionId);
      }
    });
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(String(value));
    }

    return String(value).replace(/[^a-zA-Z0-9_-]/g, function (char) {
      return "\\" + char.charCodeAt(0).toString(16) + " ";
    });
  }

  function updateBrushPreviewFromPointer(event) {
    if (!event || state.displayMode !== "editor" || state.isMiddlePanning) {
      return;
    }

    var hex = getHexFromPointerEvent(event);

    if (!hex) {
      state.brushPreviewHexes = [];
      scheduleRedraw();
      return;
    }

    var next = getBrushHexes(hex.q, hex.r);
    var previousKey = state.brushPreviewHexes.map(function (item) { return hexKey(item.q, item.r); }).join("|");
    var nextKey = next.map(function (item) { return hexKey(item.q, item.r); }).join("|");

    if (previousKey === nextKey) {
      return;
    }

    state.brushPreviewHexes = next;
    scheduleRedraw();
  }

  function getHexFromPointerEvent(event) {
    if (!event || !state.canvas || !state.map || !state.world) {
      return null;
    }

    var rect = state.canvas.getBoundingClientRect();
    var containerPoint = L.point(event.clientX - rect.left, event.clientY - rect.top);
    var latlng = state.map.containerPointToLatLng(containerPoint);
    var pixel = state.world.toImagePoint(latlng);

    if (!isPixelInsideMap(pixel.x, pixel.y)) {
      return null;
    }

    return pixelToHex(pixel.x, pixel.y, state.config.hexSize);
  }

  function getBrushHexes(q, r) {
    var radius = Math.max(0, Number(state.brushSize) - 1);
    var hexes = [];

    for (var dq = -radius; dq <= radius; dq += 1) {
      for (var dr = Math.max(-radius, -dq - radius); dr <= Math.min(radius, -dq + radius); dr += 1) {
        var targetQ = q + dq;
        var targetR = r + dr;
        var center = hexToPixel(targetQ, targetR, state.config.hexSize);

        if (isPixelInsideMap(center.x, center.y)) {
          hexes.push({ q: targetQ, r: targetR });
        }
      }
    }

    return hexes;
  }

  function paintFromPointerEvent(event) {
    var hex = getHexFromPointerEvent(event);

    if (!hex) {
      return;
    }
    var key = hexKey(hex.q, hex.r);

    if (key === state.lastPaintedKey && state.brushSize === 1) {
      return;
    }

    state.lastPaintedKey = key;
    paintBrush(hex.q, hex.r);
    redraw();
  }

  function paintBrush(q, r) {
    getBrushHexes(q, r).forEach(function (hex) {
      paintCell(hex.q, hex.r);
    });
  }

  function paintCell(q, r) {
    var center = hexToPixel(q, r, state.config.hexSize);

    if (!isPixelInsideMap(center.x, center.y)) {
      return;
    }

    var key = hexKey(q, r);
    var terrain = state.editorTerrain || state.config.defaultTerrain || "plain";
    var road = !!state.editorRoad;
    var bridge = !!state.editorBridge;
    var tunnel = !!state.editorTunnel;

    if (state.editorErase) {
      var existingCell = readStoredCell(q, r) || null;
      var selectedEraseTerrains = Object.keys(state.selectiveEraseTerrains || {});

      if (!selectedEraseTerrains.length || (existingCell && selectedEraseTerrains.indexOf(existingCell.terrain) !== -1)) {
        deleteStoredCell(q, r);
        scheduleGridAutosave();
      }

      return;
    }

    if (!state.overwriteHexes && readStoredCell(q, r) && !road && !bridge && !tunnel) {
      return;
    }

    if (terrain === state.config.defaultTerrain && !road && !bridge && !tunnel) {
      deleteStoredCell(q, r);
      scheduleGridAutosave();
      return;
    }

    writeStoredCell(q, r, {
      terrain: terrain,
      road: road,
      bridge: bridge,
      tunnel: tunnel,
      waterType: "",
      risk: TERRAIN_TYPES[terrain] ? TERRAIN_TYPES[terrain].risk : 0,
      blocked: terrain === "blocked",
      tags: [],
    });

    scheduleGridAutosave();
  }

  function runAutoReveal(button) {
    var autoReveal = window.EnclaveTerrainAutoReveal;
    var original = button ? button.innerHTML : "";

    if (!autoReveal || typeof autoReveal.openModal !== "function") {
      window.alert("Auto Reveal module not loaded.");
      return;
    }

    try {
      autoReveal.openModal(Object.assign({
        world: state.world,
        travel: window.EnclaveTravel,
        gridStore: state.gridStore,
        applyCells: function (cells, options) {
          return applyAutoRevealCells(cells, Object.assign({ scope: "visible" }, options || {}));
        },
      }, getAutoRevealContext()));

      flashButton(button, original, '<i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>');
    } catch (error) {
      console.error("Auto Reveal failed:", error);
      window.alert(error && error.message ? error.message : "Auto Reveal failed.");
    }
  }

  function applyAutoRevealCells(cells, options) {
    options = options || {};

    var bounds = resolveAutoRevealBounds(options);
    var chunkLookup = buildAutoRevealChunkLookup(options.chunkKeys);
    var changed = 0;

    Object.keys(cells || {}).forEach(function (key) {
      var cell = cells[key];
      var position = parseAutoRevealCellPosition(key, cell);

      if (!position || !isAutoRevealCellAllowed(position.q, position.r, bounds, chunkLookup)) {
        return;
      }

      if (!cell || !TERRAIN_TYPES[cell.terrain]) {
        return;
      }

      var normalized = {
        terrain: cell.terrain,
        road: !!cell.road,
        bridge: !!cell.bridge,
        tunnel: !!cell.tunnel,
        waterType: WATER_REGION_TYPES[cell.waterType] ? cell.waterType : "",
        risk: Number.isFinite(Number(cell.risk)) ? Number(cell.risk) : TERRAIN_TYPES[cell.terrain].risk,
        blocked: cell.terrain === "blocked" || !!cell.blocked,
        tags: Array.isArray(cell.tags) ? cell.tags.map(String) : [],
      };

      writeStoredCell(position.q, position.r, normalized, {
        markDirty: options.markDirty !== false,
      });
      changed += 1;
    });

    if (!changed) {
      return {
        changed: 0,
        bounds: bounds,
      };
    }

    state.regions = [];
    state.regionHexLookup = {};
    state.highlightedRegionCellLookup = {};
    renderRegionsList();
    scheduleRedraw();

    if (options.autosave !== false) {
      scheduleGridAutosave();
    }

    return {
      changed: changed,
      bounds: bounds,
    };
  }

  function getAutoRevealContext() {
    var bounds = state.lastVisibleHexBounds || getCurrentVisibleHexBounds();
    var gridConfig = state.gridStore && typeof state.gridStore.getConfig === "function" ? state.gridStore.getConfig() : {};

    return {
      mapId: state.mapId,
      mapWidth: state.width,
      mapHeight: state.height,
      hexSize: state.config.hexSize,
      milesPerHex: state.config.milesPerHex,
      defaultTerrain: state.config.defaultTerrain,
      chunkSize: state.config.chunkSize || 128,
      scope: "visible",
      bounds: bounds,
      visibleHexBounds: bounds,
      availableChunkKeys: Array.isArray(gridConfig.availableChunkKeys) ? gridConfig.availableChunkKeys.slice() : state.staticChunkKeys.slice(),
      loadedChunkKeys: state.gridStore && typeof state.gridStore.getLoadedChunkKeys === "function" ? state.gridStore.getLoadedChunkKeys() : [],
    };
  }

  function resolveAutoRevealBounds(options) {
    if (options && options.bounds) {
      return normalizeAutoRevealBounds(options.bounds);
    }

    if (options && options.scope === "visible") {
      return normalizeAutoRevealBounds(state.lastVisibleHexBounds || getCurrentVisibleHexBounds());
    }

    return null;
  }

  function normalizeAutoRevealBounds(bounds) {
    if (!bounds) {
      return null;
    }

    var minQ = Number(bounds.minQ != null ? bounds.minQ : bounds.qMin);
    var maxQ = Number(bounds.maxQ != null ? bounds.maxQ : bounds.qMax);
    var minR = Number(bounds.minR != null ? bounds.minR : bounds.rMin);
    var maxR = Number(bounds.maxR != null ? bounds.maxR : bounds.rMax);

    if (!Number.isFinite(minQ) || !Number.isFinite(maxQ) || !Number.isFinite(minR) || !Number.isFinite(maxR)) {
      return null;
    }

    return {
      minQ: Math.min(minQ, maxQ),
      maxQ: Math.max(minQ, maxQ),
      minR: Math.min(minR, maxR),
      maxR: Math.max(minR, maxR),
    };
  }

  function parseAutoRevealCellPosition(key, cell) {
    if (isCellKey(key)) {
      return parseHexKey(key);
    }

    if (cell && Number.isFinite(Number(cell.q)) && Number.isFinite(Number(cell.r))) {
      return {
        q: Number(cell.q),
        r: Number(cell.r),
      };
    }

    return null;
  }

  function buildAutoRevealChunkLookup(chunkKeys) {
    if (!Array.isArray(chunkKeys) || !chunkKeys.length) {
      return null;
    }

    var lookup = {};

    chunkKeys.forEach(function (chunkKey) {
      if (chunkKey) {
        lookup[String(chunkKey)] = true;
      }
    });

    return lookup;
  }

  function isAutoRevealCellAllowed(q, r, bounds, chunkLookup) {
    if (bounds && (q < bounds.minQ || q > bounds.maxQ || r < bounds.minR || r > bounds.maxR)) {
      return false;
    }

    if (chunkLookup && !chunkLookup[getChunkKeyForHex(q, r)]) {
      return false;
    }

    return true;
  }

  function getChunkKeyForHex(q, r) {
    var chunkSize = Number(state.config.chunkSize) || 128;
    return Math.floor(Number(q) / chunkSize) + "_" + Math.floor(Number(r) / chunkSize);
  }

  function exportGridJson(button) {
    copyJsonToClipboard(button, buildGridPayload());
  }

  function exportVisibleChunksJson(button) {
    if (!state.gridStore || typeof state.gridStore.loadChunksForBounds !== "function") {
      copyJsonToClipboard(button, buildGridPayload());
      return;
    }

    var bounds = state.lastVisibleHexBounds || getCurrentVisibleHexBounds();

    state.gridStore.loadChunksForBounds(bounds).then(function (chunkKeys) {
      var payload = buildChunksExportPayload(chunkKeys || []);
      copyJsonToClipboard(button, payload);
    }).catch(function (error) {
      console.warn("Visible chunk export failed:", error);
      copyJsonToClipboard(button, buildGridPayload());
    });
  }

  function exportDirtyChunksJson(button) {
    if (!state.gridStore || typeof state.gridStore.getDirtyChunkKeys !== "function") {
      copyJsonToClipboard(button, buildGridPayload());
      return;
    }

    var chunkKeys = state.gridStore.getDirtyChunkKeys();
    copyJsonToClipboard(button, buildChunksExportPayload(chunkKeys));
  }

  function buildChunksExportPayload(chunkKeys) {
    var chunks = [];
    var unique = {};

    (chunkKeys || []).forEach(function (chunkKey) {
      if (!chunkKey || unique[chunkKey]) {
        return;
      }

      unique[chunkKey] = true;

      if (!state.gridStore || typeof state.gridStore.exportChunkPayload !== "function") {
        return;
      }

      var payload = state.gridStore.exportChunkPayload(chunkKey);

      if (payload) {
        chunks.push(payload);
      }
    });

    return {
      version: 1,
      format: "chunk-bundle",
      mapId: state.mapId,
      mapWidth: state.width,
      mapHeight: state.height,
      hexSize: state.config.hexSize,
      milesPerHex: state.config.milesPerHex,
      defaultTerrain: state.config.defaultTerrain,
      chunkSize: state.config.chunkSize || 128,
      chunkCount: chunks.length,
      chunks: chunks,
    };
  }

  function copyJsonToClipboard(button, payload) {
    var text = serializeGridPayload(payload);
    var original = button ? button.innerHTML : "";

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        flashButton(button, original, '<i class="fa-solid fa-check" aria-hidden="true"></i><span>Copied</span>');
      });
      return;
    }

    console.log(text);
  }

  function getCurrentVisibleHexBounds() {
    if (!state.map || !state.world) {
      return { minQ: 0, maxQ: 0, minR: 0, maxR: 0 };
    }

    var bounds = state.map.getBounds();
    var corners = [
      state.world.toImagePoint(bounds.getNorthWest()),
      state.world.toImagePoint(bounds.getNorthEast()),
      state.world.toImagePoint(bounds.getSouthWest()),
      state.world.toImagePoint(bounds.getSouthEast()),
    ];
    var margin = state.config.hexSize * 4;
    var minX = clampNumber(Math.min.apply(null, corners.map(function (p) { return p.x; })) - margin, 0, state.width);
    var maxX = clampNumber(Math.max.apply(null, corners.map(function (p) { return p.x; })) + margin, 0, state.width);
    var minY = clampNumber(Math.min.apply(null, corners.map(function (p) { return p.y; })) - margin, 0, state.height);
    var maxY = clampNumber(Math.max.apply(null, corners.map(function (p) { return p.y; })) + margin, 0, state.height);
    var hexCorners = [
      pixelToHex(minX, minY, state.config.hexSize),
      pixelToHex(maxX, minY, state.config.hexSize),
      pixelToHex(minX, maxY, state.config.hexSize),
      pixelToHex(maxX, maxY, state.config.hexSize),
    ];
    var qValues = hexCorners.map(function (h) { return h.q; });
    var rValues = hexCorners.map(function (h) { return h.r; });

    return {
      minQ: Math.min.apply(null, qValues) - 6,
      maxQ: Math.max.apply(null, qValues) + 6,
      minR: Math.min.apply(null, rValues) - 6,
      maxR: Math.max.apply(null, rValues) + 6,
    };
  }

  function serializeGridPayload(payload) {
    var runPattern = new RegExp("\\[\\n\\s+(-?\\d+),\\n\\s+(-?\\d+),\\n\\s+(-?\\d+)\\n\\s+\\]", "g");

    return JSON.stringify(payload, null, 2).replace(runPattern, function (_match, q, r, length) {
      return "[" + q + ", " + r + ", " + length + "]";
    });
  }

  function getGridSourceLabel() {
    if (state.hasLocalOverride) {
      return "Local override";
    }

    if (state.staticGridLoaded) {
      if (state.config.storageMode === "chunks") {
        return "Static chunks" + (state.staticChunkKeys.length ? " (" + state.staticChunkKeys.length + ")" : "");
      }

      return "Static JSON";
    }

    return state.config.storageMode === "chunks" ? "No static chunks" : "No static JSON";
  }

  function buildGridSourceStatusMarkup() {
    var label = getGridSourceLabel();

    if (!state.staticGridLoaded || state.config.storageMode !== "chunks") {
      return escapeHtml(label);
    }

    return (
      '<span class="world-map-travel-debug-bubble-wrap" tabindex="0">' +
      '<span class="world-map-travel-debug-bubble-trigger">' + escapeHtml(label) + '</span>' +
      buildChunkDebugBubbleMarkup() +
      '</span>'
    );
  }

  function buildChunkDebugBubbleMarkup() {
    var stats = getChunkDebugStats();

    return (
      '<span class="world-map-travel-debug-bubble" role="tooltip">' +
      '<strong>Chunk debug</strong>' +
      '<span><b>Loaded</b><em>' + stats.loaded + '</em></span>' +
      '<span><b>Available</b><em>' + stats.available + '</em></span>' +
      '<span><b>Missing</b><em>' + stats.missing + '</em></span>' +
      '<span><b>Dirty</b><em>' + stats.dirty + '</em></span>' +
      '<span><b>Max loaded</b><em>' + stats.maxLoaded + '</em></span>' +
      '<span><b>Visible request</b><em>' + escapeHtml(stats.visibleRequest || '—') + '</em></span>' +
      '</span>'
    );
  }

  function getChunkDebugStats() {
    var gridConfig = state.gridStore && typeof state.gridStore.getConfig === "function" ? state.gridStore.getConfig() : {};
    var loaded = state.gridStore && typeof state.gridStore.getLoadedChunkKeys === "function" ? state.gridStore.getLoadedChunkKeys() : [];
    var dirty = state.gridStore && typeof state.gridStore.getDirtyChunkKeys === "function" ? state.gridStore.getDirtyChunkKeys() : [];
    var available = Array.isArray(gridConfig.availableChunkKeys) ? gridConfig.availableChunkKeys : state.staticChunkKeys;
    var missing = Array.isArray(gridConfig.missingStaticChunkKeys) ? gridConfig.missingStaticChunkKeys : [];

    return {
      loaded: loaded.length,
      available: available.length,
      missing: missing.length,
      dirty: dirty.length,
      maxLoaded: Number(gridConfig.maxLoadedChunks || state.config.maxLoadedChunks || 0) || '—',
      visibleRequest: state.visibleChunkRequestKey || '',
    };
  }

  function ensureTravelDebugBubbleStyles() {
    if (document.querySelector("[data-travel-debug-bubble-styles]")) {
      return;
    }

    var style = document.createElement("style");
    style.setAttribute("data-travel-debug-bubble-styles", "");
    style.textContent = [
      ".world-map-travel-debug-bubble-wrap{position:relative;display:inline-flex;align-items:center;outline:none;}",
      ".world-map-travel-debug-bubble-trigger{cursor:help;}",
      ".world-map-travel-debug-bubble{position:absolute;right:0;top:calc(100% + 8px);z-index:30;display:grid;gap:0.35rem;min-width:190px;padding:0.72rem 0.78rem;border:1px solid rgba(113,221,202,0.32);border-radius:10px;background:rgba(9,18,22,0.96);box-shadow:0 14px 38px rgba(0,0,0,0.42);color:rgba(232,241,238,0.94);font-size:0.72rem;line-height:1.2;opacity:0;pointer-events:none;transform:translateY(-4px);transition:opacity 140ms ease,transform 140ms ease;}",
      ".world-map-travel-debug-bubble::before{content:\"\";position:absolute;right:18px;top:-6px;width:10px;height:10px;border-left:1px solid rgba(113,221,202,0.32);border-top:1px solid rgba(113,221,202,0.32);background:rgba(9,18,22,0.96);transform:rotate(45deg);}",
      ".world-map-travel-debug-bubble-wrap:hover .world-map-travel-debug-bubble,.world-map-travel-debug-bubble-wrap:focus-within .world-map-travel-debug-bubble{opacity:1;pointer-events:auto;transform:translateY(0);}",
      ".world-map-travel-debug-bubble strong{font-size:0.68rem;text-transform:uppercase;letter-spacing:0.08em;color:rgba(113,221,202,0.94);}",
      ".world-map-travel-debug-bubble span{display:flex;justify-content:space-between;gap:1rem;}",
      ".world-map-travel-debug-bubble b{font-weight:600;color:rgba(232,241,238,0.72);}",
      ".world-map-travel-debug-bubble em{font-style:normal;font-weight:700;color:rgba(241,213,165,0.95);text-align:right;max-width:8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}"
    ].join(String.fromCharCode(10));
    document.head.appendChild(style);
  }

  function importGridJson(button) {
    var text = window.prompt("Incolla il JSON della travel grid:");

    if (!text) {
      return;
    }

    try {
      var payload = JSON.parse(text);
      applyGridPayload(payload);
      saveGridToLocalStorage();
      redraw();
      flashButton(button, button ? button.innerHTML : "", '<i class="fa-solid fa-check" aria-hidden="true"></i><span>Imported</span>');
    } catch (error) {
      window.alert("JSON non valido o incompatibile.");
      console.error("Travel grid import failed:", error);
    }
  }

  function buildGridPayload() {
    return buildCompactGridPayload();
  }

  function buildDebugGridPayload() {
    return {
      version: 1,
      format: "cells",
      mapId: state.mapId,
      mapWidth: state.width,
      mapHeight: state.height,
      hexSize: state.config.hexSize,
      milesPerHex: state.config.milesPerHex,
      defaultTerrain: state.config.defaultTerrain,
      cells: state.cells,
    };
  }

  function buildCompactGridPayload() {
    var grouped = groupCellsForCompactExport(getStoredCellsSnapshot());

    return {
      version: 2,
      format: "rle",
      mapId: state.mapId,
      mapWidth: state.width,
      mapHeight: state.height,
      hexSize: state.config.hexSize,
      milesPerHex: state.config.milesPerHex,
      defaultTerrain: state.config.defaultTerrain,
      terrain: grouped.terrain,
      regionNames: state.regionNames || {},
      roads: grouped.roads,
      bridges: grouped.bridges,
      tunnels: grouped.tunnels,
      blocked: grouped.blocked,
      waterTypes: grouped.waterTypes,
      risks: grouped.risks,
      tags: grouped.tags,
    };
  }

  function getStoredCellsSnapshot() {
    var snapshot = Object.assign({}, state.cells || {});

    if (state.gridStore && typeof state.gridStore.forEachLoadedCell === "function") {
      state.gridStore.forEachLoadedCell(function (cell) {
        var normalized = sanitizeSingleCell(cell, cell.q, cell.r);

        if (normalized) {
          snapshot[hexKey(cell.q, cell.r)] = normalized;
        }
      });
    }

    return snapshot;
  }

  function groupCellsForCompactExport(cells) {
    var terrainRows = {};
    var roadRows = {};
    var bridgeRows = {};
    var tunnelRows = {};
    var blockedRows = {};
    var waterTypeRows = {};
    var riskRows = {};
    var tagRows = {};

    Object.keys(cells || {}).forEach(function (key) {
      var cell = cells[key] || {};
      var parsed = parseHexKey(key);
      var terrain = TERRAIN_TYPES[cell.terrain] ? cell.terrain : state.config.defaultTerrain;

      if (terrain !== state.config.defaultTerrain) {
        pushRowValue(terrainRows, terrain, parsed.r, parsed.q);
      }

      if (cell.road) {
        pushRowValue(roadRows, "roads", parsed.r, parsed.q);
      }

      if (cell.bridge) {
        pushRowValue(bridgeRows, "bridges", parsed.r, parsed.q);
      }

      if (cell.tunnel) {
        pushRowValue(tunnelRows, "tunnels", parsed.r, parsed.q);
      }

      if (cell.blocked) {
        pushRowValue(blockedRows, "blocked", parsed.r, parsed.q);
      }

      if (Number.isFinite(Number(cell.risk)) && Number(cell.risk) !== TERRAIN_TYPES[terrain].risk) {
        pushRowValue(riskRows, String(Number(cell.risk)), parsed.r, parsed.q);
      }

      if (cell.waterType && WATER_REGION_TYPES[cell.waterType]) {
        pushRowValue(waterTypeRows, cell.waterType, parsed.r, parsed.q);
      }

      if (Array.isArray(cell.tags) && cell.tags.length) {
        cell.tags.forEach(function (tag) {
          pushRowValue(tagRows, String(tag), parsed.r, parsed.q);
        });
      }
    });

    return {
      terrain: rowsToRunsByGroup(terrainRows),
      roads: rowsToRunsByGroup(roadRows).roads || [],
      bridges: rowsToRunsByGroup(bridgeRows).bridges || [],
      tunnels: rowsToRunsByGroup(tunnelRows).tunnels || [],
      blocked: rowsToRunsByGroup(blockedRows).blocked || [],
      waterTypes: rowsToRunsByGroup(waterTypeRows),
      risks: rowsToRunsByGroup(riskRows),
      tags: rowsToRunsByGroup(tagRows),
    };
  }

  function pushRowValue(groups, groupKey, r, q) {
    if (!groups[groupKey]) {
      groups[groupKey] = {};
    }

    if (!groups[groupKey][r]) {
      groups[groupKey][r] = [];
    }

    groups[groupKey][r].push(q);
  }

  function rowsToRunsByGroup(groups) {
    var output = {};

    Object.keys(groups || {}).forEach(function (groupKey) {
      var rows = groups[groupKey];
      output[groupKey] = [];

      Object.keys(rows)
        .map(Number)
        .sort(function (a, b) { return a - b; })
        .forEach(function (r) {
          var qValues = rows[r]
            .map(Number)
            .sort(function (a, b) { return a - b; });
          var uniqueQValues = [];
          var previous = null;

          qValues.forEach(function (q) {
            if (q !== previous) {
              uniqueQValues.push(q);
            }
            previous = q;
          });

          pushRunsForSortedValues(output[groupKey], r, uniqueQValues);
        });
    });

    return output;
  }

  function pushRunsForSortedValues(output, r, values) {
    var start = null;
    var last = null;

    values.forEach(function (q) {
      if (start === null) {
        start = q;
        last = q;
        return;
      }

      if (q === last + 1) {
        last = q;
        return;
      }

      output.push([start, r, last - start + 1]);
      start = q;
      last = q;
    });

    if (start !== null) {
      output.push([start, r, last - start + 1]);
    }
  }

  function applyGridPayload(payload) {
    if (!payload || typeof payload !== "object") {
      throw new Error("Missing payload.");
    }

    if (payload.mapId && payload.mapId !== state.mapId) {
      throw new Error("Grid mapId mismatch: " + payload.mapId + " !== " + state.mapId);
    }

    if (Number(payload.hexSize) && Number(payload.hexSize) !== Number(state.config.hexSize)) {
      throw new Error("Grid hexSize mismatch: " + payload.hexSize + " !== " + state.config.hexSize);
    }

    state.regionNames = payload.regionNames && typeof payload.regionNames === "object" ? payload.regionNames : {};

    if (payload.format === "chunk-bundle" && Array.isArray(payload.chunks)) {
      state.cells = expandChunkBundlePayload(payload);
      syncGridStoreFromCells();
      return;
    }

    if (payload.format === "rle" || payload.terrain || payload.roads) {
      state.cells = expandCompactGridPayload(payload);
      syncGridStoreFromCells();
      return;
    }

    state.cells = sanitizeCells(payload.cells || {});
    syncGridStoreFromCells();
  }

  function expandChunkBundlePayload(payload) {
    var next = {};

    (payload.chunks || []).forEach(function (chunkPayload) {
      var chunkCells = expandCompactGridPayload(chunkPayload);
      Object.keys(chunkCells).forEach(function (key) {
        next[key] = chunkCells[key];
      });
    });

    return sanitizeCells(next);
  }

  function expandCompactGridPayload(payload) {
    var next = {};
    var terrainGroups = payload.terrain || {};
    var roads = Array.isArray(payload.roads) ? payload.roads : [];
    var bridges = Array.isArray(payload.bridges) ? payload.bridges : [];
    var tunnels = Array.isArray(payload.tunnels) ? payload.tunnels : [];
    var blocked = Array.isArray(payload.blocked) ? payload.blocked : [];
    var waterTypes = payload.waterTypes || {};
    var risks = payload.risks || {};
    var tags = payload.tags || {};

    Object.keys(terrainGroups).forEach(function (terrain) {
      if (!TERRAIN_TYPES[terrain]) {
        return;
      }

      applyRunsToCells(terrainGroups[terrain], function (q, r) {
        var key = hexKey(q, r);
        next[key] = createCellData(terrain, false, []);
      });
    });

    applyRunsToCells(roads, function (q, r) {
      var key = hexKey(q, r);
      var existing = next[key] || createCellData(state.config.defaultTerrain, false, []);
      existing.road = true;
      next[key] = existing;
    });

    applyRunsToCells(bridges, function (q, r) {
      var key = hexKey(q, r);
      var existing = next[key] || createCellData(state.config.defaultTerrain, false, []);
      existing.bridge = true;
      next[key] = existing;
    });

    applyRunsToCells(tunnels, function (q, r) {
      var key = hexKey(q, r);
      var existing = next[key] || createCellData(state.config.defaultTerrain, false, []);
      existing.tunnel = true;
      next[key] = existing;
    });

    applyRunsToCells(blocked, function (q, r) {
      var key = hexKey(q, r);
      var existing = next[key] || createCellData(state.config.defaultTerrain, false, []);
      existing.blocked = true;
      next[key] = existing;
    });

    applyGroupedOrKeyedValuesToCells(waterTypes, next, "waterType", function (value) {
      return WATER_REGION_TYPES[value] ? value : "";
    });

    applyGroupedOrKeyedValuesToCells(risks, next, "risk", function (value) {
      return Number.isFinite(Number(value)) ? Number(value) : null;
    });

    Object.keys(tags).forEach(function (tag) {
      applyRunsToCells(tags[tag], function (q, r) {
        var key = hexKey(q, r);
        var existing = next[key] || createCellData(state.config.defaultTerrain, false, []);

        if (!Array.isArray(existing.tags)) {
          existing.tags = [];
        }

        if (existing.tags.indexOf(tag) === -1) {
          existing.tags.push(tag);
        }

        next[key] = existing;
      });
    });

    return sanitizeCells(next);
  }

  function applyGroupedOrKeyedValuesToCells(groups, cells, field, normalizeValue) {
    Object.keys(groups || {}).forEach(function (groupOrKey) {
      var value = groups[groupOrKey];

      if (isCellKey(groupOrKey)) {
        var parsed = parseHexKey(groupOrKey);
        var keyedCell = cells[groupOrKey] || createCellData(state.config.defaultTerrain, false, []);
        keyedCell[field] = normalizeValue(value);
        cells[hexKey(parsed.q, parsed.r)] = keyedCell;
        return;
      }

      applyRunsToCells(value, function (q, r) {
        var key = hexKey(q, r);
        var existing = cells[key] || createCellData(state.config.defaultTerrain, false, []);
        existing[field] = normalizeValue(groupOrKey);
        cells[key] = existing;
      });
    });
  }

  function isCellKey(value) {
    var parts = String(value || "").split(",");
    return parts.length === 2 && Number.isFinite(Number(parts[0])) && Number.isFinite(Number(parts[1]));
  }

  function applyRunsToCells(runs, callback) {
    if (!Array.isArray(runs)) {
      return;
    }

    runs.forEach(function (run) {
      var qStart = Number(run[0]);
      var r = Number(run[1]);
      var length = Number(run[2]);

      if (!Number.isFinite(qStart) || !Number.isFinite(r) || !Number.isFinite(length) || length <= 0) {
        return;
      }

      for (var offset = 0; offset < length; offset += 1) {
        callback(qStart + offset, r);
      }
    });
  }

  function createCellData(terrain, road, tags) {
    var safeTerrain = TERRAIN_TYPES[terrain] ? terrain : state.config.defaultTerrain;

    return {
      terrain: safeTerrain,
      road: !!road,
      bridge: false,
      tunnel: false,
      waterType: "",
      risk: TERRAIN_TYPES[safeTerrain] ? TERRAIN_TYPES[safeTerrain].risk : 0,
      blocked: safeTerrain === "blocked",
      tags: Array.isArray(tags) ? tags.map(String) : [],
    };
  }

  function sanitizeCells(cells) {
    var next = {};

    Object.keys(cells || {}).forEach(function (key) {
      var cell = cells[key] || {};
      var parsed = parseHexKey(key);
      var normalizedKey = hexKey(parsed.q, parsed.r);
      var terrain = TERRAIN_TYPES[cell.terrain] ? cell.terrain : state.config.defaultTerrain;
      var road = !!cell.road;
      var bridge = !!cell.bridge;
      var tunnel = !!cell.tunnel;
      var waterType = WATER_REGION_TYPES[cell.waterType] ? cell.waterType : "";

      var blocked = terrain === "blocked" || !!cell.blocked;
      var risk = Number.isFinite(Number(cell.risk)) ? Number(cell.risk) : TERRAIN_TYPES[terrain].risk;
      var tags = Array.isArray(cell.tags) ? cell.tags.map(String) : [];

      if (
        terrain === state.config.defaultTerrain &&
        !road &&
        !bridge &&
        !tunnel &&
        !waterType &&
        !blocked &&
        risk === TERRAIN_TYPES[terrain].risk &&
        !tags.length
      ) {
        return;
      }

      next[normalizedKey] = {
        terrain: terrain,
        road: road,
        bridge: bridge,
        tunnel: tunnel,
        waterType: waterType,
        risk: risk,
        blocked: blocked,
        tags: tags,
      };
    });

    return next;
  }

  function scheduleGridAutosave() {
    state.pendingAutosave = true;

    if (state.autosaveTimer) {
      window.clearTimeout(state.autosaveTimer);
    }

    var delay = state.isPainting
      ? Number(state.config.paintAutosaveDelayMs) || 1400
      : Number(state.config.autosaveDelayMs) || 900;

    state.autosaveTimer = window.setTimeout(function () {
      state.autosaveTimer = null;

      if (state.isPainting) {
        scheduleGridAutosave();
        return;
      }

      state.pendingAutosave = false;
      saveGridToLocalStorage();
    }, delay);
  }

  function saveGridToLocalStorage() {
    try {
      if (isChunkStorageActive() && state.gridStore && typeof state.gridStore.flushDirtyChunksToLocalStorage === "function") {
        state.gridStore.flushDirtyChunksToLocalStorage();
        window.localStorage.removeItem(getLocalStorageKey());
        window.localStorage.setItem(getLocalStorageChunkMetaKey(), JSON.stringify({
          version: 1,
          mapId: state.mapId,
          storageMode: "chunks",
          updatedAt: new Date().toISOString(),
        }));
      } else {
        window.localStorage.setItem(getLocalStorageKey(), JSON.stringify(buildGridPayload()));
        window.localStorage.removeItem(getLocalStorageChunkMetaKey());
      }

      state.hasLocalOverride = true;
      syncEditorPanel();
    } catch (error) {
      console.warn("Travel grid local save failed:", error);
    }
  }

  function loadStaticGrid() {
    var storageMode = state.config.storageMode || "auto";

    if (storageMode === "chunks") {
      return loadStaticChunkIndex();
    }

    if (storageMode === "unified") {
      return loadUnifiedStaticGrid();
    }

    return loadUnifiedStaticGrid().then(function (loaded) {
      if (loaded) {
        return loaded;
      }

      return loadStaticChunkIndex();
    });
  }

  function loadUnifiedStaticGrid() {
    var url = "data/travel/" + state.mapId + "-travel-grid.json";

    return fetch(url)
      .then(function (res) {
        if (!res.ok) {
          state.staticGridLoaded = false;
          state.staticGridMissing = true;
          return null;
        }

        state.staticGridMissing = false;
        return res.json().then(function (json) {
          applyGridPayload(json);
          state.staticGridLoaded = true;
          state.staticGridMissing = false;
          return json;
        });
      })
      .catch(function () {
        state.staticGridLoaded = false;
        state.staticGridMissing = true;
        return null;
      });
  }

  function loadStaticChunkIndex() {
    var url = "data/travel/chunks/" + state.mapId + "/index.json";

    return fetch(url)
      .then(function (res) {
        if (!res.ok) {
          return null;
        }

        return res.json();
      })
      .then(function (index) {
        if (!index || index.format !== "chunk-index") {
          return null;
        }

        state.staticGridLoaded = true;
        state.staticGridMissing = false;
        state.staticChunkIndex = index;
        state.staticChunkKeys = normalizeStaticChunkKeys(index);

        if (state.gridStore && typeof state.gridStore.configure === "function") {
          state.gridStore.configure({ availableChunkKeys: state.staticChunkKeys });
        }

        return index;
      })
      .catch(function () {
        state.staticChunkIndex = null;
        state.staticChunkKeys = [];
        return null;
      });
  }

  function normalizeStaticChunkKeys(index) {
    if (!index || !Array.isArray(index.chunks)) {
      return [];
    }

    return index.chunks.map(function (chunk) {
      if (typeof chunk === "string") {
        return chunk;
      }

      if (chunk && chunk.key) {
        return String(chunk.key);
      }

      if (chunk && Number.isFinite(Number(chunk.chunkQ)) && Number.isFinite(Number(chunk.chunkR))) {
        return Number(chunk.chunkQ) + "_" + Number(chunk.chunkR);
      }

      return "";
    }).filter(Boolean);
  }

  function loadGridFromLocalStorage() {
    try {
      var raw = window.localStorage.getItem(getLocalStorageKey());
      var chunkMeta = window.localStorage.getItem(getLocalStorageChunkMetaKey());

      if (!raw) {
        state.hasLocalOverride = !!chunkMeta;
        return;
      }

      applyGridPayload(JSON.parse(raw));
      state.hasLocalOverride = true;
    } catch (error) {
      console.warn("Travel grid local load failed:", error);
      state.cells = {};
    }
  }

  function flushLocalGridOverride(button) {
    var confirmed = window.confirm("Vuoi cancellare le modifiche locali e ricaricare il JSON statico del sito?");

    if (!confirmed) {
      return;
    }

    try {
      window.localStorage.removeItem(getLocalStorageKey());
      window.localStorage.removeItem(getLocalStorageChunkMetaKey());
    } catch (error) {
      console.warn("Travel grid local flush failed:", error);
    }

    state.hasLocalOverride = false;
    state.staticGridLoaded = false;
    state.staticGridMissing = false;
    state.staticChunkIndex = null;
    state.staticChunkKeys = [];
    state.cells = {};
    state.regionNames = {};

    if (state.gridStore && typeof state.gridStore.clearLocalOverride === "function") {
      state.gridStore.clearLocalOverride();
    }

    initializeTravelGridStore();
    state.regions = [];
    state.regionHexLookup = {};
    state.highlightedRegionCellLookup = {};

    loadStaticGrid().then(function () {
      requestCurrentViewportChunks();
      syncEditorPanel();
      renderRegionsList();
      redraw();
      flashButton(button, button ? button.innerHTML : "", '<i class="fa-solid fa-check" aria-hidden="true"></i>');
    });
  }

  function getLocalStorageKey() {
    return "enclave.travelGrid." + state.mapId + ".v1";
  }

  function getLocalStorageChunkMetaKey() {
    return "enclave.travelGrid." + state.mapId + ".chunks.v1";
  }

  function isChunkStorageActive() {
    return state.config && state.config.storageMode === "chunks";
  }

  function flashButton(button, original, replacement) {
    if (!button) {
      return;
    }

    button.innerHTML = replacement;
    window.setTimeout(function () {
      button.innerHTML = original;
    }, 1000);
  }

  function findPath(startInput, endInput, options) {
    options = options || {};

    var start = normalizePathEndpoint(startInput);
    var goal = normalizePathEndpoint(endInput);
    var modeKey = options.travelMode || "foot";
    var speedMode = options.speedMode || "normal";
    var mode = TRAVEL_MODES[modeKey] || TRAVEL_MODES.foot;
    var maxIterations = Number(options.maxIterations) || Number(state.config.maxPathIterations) || 120000;
    var searchBoundsList = options.disableSearchBounds ? null : options.searchBoundsList;

    if (!start || !goal) {
      return buildFailedPathResult(start, goal, ["Invalid start or destination."]);
    }

    if (!isHexInsideMap(start.q, start.r) || !isHexInsideMap(goal.q, goal.r)) {
      return buildFailedPathResult(start, goal, ["Start or destination is outside the map."]);
    }

    if (!searchBoundsList) {
      searchBoundsList = getRouteSegmentCorridorBoundsList(start, goal, options);
    }

    var startCellCost = getMovementCost(start.q, start.r, mode);
    var goalCellCost = getMovementCost(goal.q, goal.r, mode);

    if (!Number.isFinite(startCellCost)) {
      return buildFailedPathResult(start, goal, ["Start cell is not traversable."]);
    }

    if (!Number.isFinite(goalCellCost)) {
      return buildFailedPathResult(start, goal, ["Destination cell is not traversable."]);
    }

    var open = new MinHeap();
    var startKey = hexKey(start.q, start.r);
    var goalKey = hexKey(goal.q, goal.r);
    var cameFrom = {};
    var gScore = {};
    var fScore = {};
    var visited = new Set();
    var iterations = 0;

    gScore[startKey] = 0;
    fScore[startKey] = hexDistance(start, goal);
    open.push({ key: startKey, q: start.q, r: start.r, priority: fScore[startKey] });

    while (open.size()) {
      iterations += 1;

      if (iterations > maxIterations) {
        return buildFailedPathResult(start, goal, ["Pathfinding stopped: too many iterations."]);
      }

      var current = open.pop();

      if (visited.has(current.key)) {
        continue;
      }

      if (current.key === goalKey) {
        return buildPathResult(reconstructPath(cameFrom, current.key), {
          travelMode: modeKey,
          speedMode: speedMode,
        });
      }

      visited.add(current.key);

      var neighbors = getHexNeighbors(current.q, current.r);

      for (var i = 0; i < neighbors.length; i += 1) {
        var neighbor = neighbors[i];

        if (!isHexInsideMap(neighbor.q, neighbor.r)) {
          continue;
        }

        if (searchBoundsList && !isHexInsideAnyBounds(neighbor.q, neighbor.r, searchBoundsList)) {
          continue;
        }

        var neighborKey = hexKey(neighbor.q, neighbor.r);

        if (visited.has(neighborKey)) {
          continue;
        }

        var moveCost = getMovementCost(neighbor.q, neighbor.r, mode);

        if (!Number.isFinite(moveCost)) {
          continue;
        }

        var tentativeG = gScore[current.key] + moveCost;

        if (gScore[neighborKey] == null || tentativeG < gScore[neighborKey]) {
          cameFrom[neighborKey] = current.key;
          gScore[neighborKey] = tentativeG;
          fScore[neighborKey] = tentativeG + hexDistance(neighbor, goal);
          open.push({ key: neighborKey, q: neighbor.q, r: neighbor.r, priority: fScore[neighborKey] });
        }
      }
    }

    return buildFailedPathResult(start, goal, ["No path found."]);
  }

  function isHexInsideAnyBounds(q, r, boundsList) {
    if (!Array.isArray(boundsList) || !boundsList.length) {
      return true;
    }

    for (var i = 0; i < boundsList.length; i += 1) {
      var bounds = boundsList[i];

      if (q >= bounds.minQ && q <= bounds.maxQ && r >= bounds.minR && r <= bounds.maxR) {
        return true;
      }
    }

    return false;
  }

  function normalizePathEndpoint(input) {
    if (!input) {
      return null;
    }

    if (Number.isFinite(Number(input.q)) && Number.isFinite(Number(input.r))) {
      return {
        q: Number(input.q),
        r: Number(input.r),
      };
    }

    if (Number.isFinite(Number(input.x)) && Number.isFinite(Number(input.y))) {
      return pixelToHex(Number(input.x), Number(input.y), state.config.hexSize);
    }

    if (input.latlng) {
      var point = state.world.toImagePoint(input.latlng);
      return pixelToHex(point.x, point.y, state.config.hexSize);
    }

    return null;
  }

  function getCellData(q, r) {
    var key = hexKey(q, r);
    var cell = readStoredCell(q, r) || {};
    var terrain = TERRAIN_TYPES[cell.terrain] ? cell.terrain : state.config.defaultTerrain;

    return {
      q: q,
      r: r,
      terrain: terrain,
      cost: TERRAIN_TYPES[terrain] ? TERRAIN_TYPES[terrain].cost : 1,
      risk: Number.isFinite(Number(cell.risk)) ? Number(cell.risk) : (TERRAIN_TYPES[terrain] ? TERRAIN_TYPES[terrain].risk : 0),
      road: !!cell.road,
      bridge: !!cell.bridge,
      tunnel: !!cell.tunnel,
      waterType: WATER_REGION_TYPES[cell.waterType] ? cell.waterType : "",
      blocked: terrain === "blocked" || !!cell.blocked,
      water: !!(TERRAIN_TYPES[terrain] && TERRAIN_TYPES[terrain].water),
      tags: Array.isArray(cell.tags) ? cell.tags.slice() : [],
    };
  }

  function getMovementCost(q, r, mode) {
    var cell = getCellData(q, r);
    var terrain = TERRAIN_TYPES[cell.terrain] || TERRAIN_TYPES.plain;

    if (cell.blocked && !mode.allowedBlocked) {
      return Infinity;
    }

    if (mode.waterOnly && !terrain.water) {
      return Infinity;
    }

    if (terrain.water && !mode.allowedWater && !cell.bridge) {
      return Infinity;
    }

    var isBridgePassage = !!cell.bridge && terrain.water && !mode.waterOnly;
    var isTunnelPassage = !!cell.tunnel && (cell.terrain === "mountain" || cell.terrain === "hill");
    var cost = mode.ignoreTerrainCost || isBridgePassage || isTunnelPassage ? 1 : terrain.cost;

    if (!Number.isFinite(cost)) {
      return Infinity;
    }

    if (mode.terrainMultipliers && mode.terrainMultipliers[cell.terrain]) {
      cost *= mode.terrainMultipliers[cell.terrain];
    }

    cost *= Number(mode.costMultiplier) || 1;

    if (cell.road || cell.bridge || cell.tunnel) {
      cost *= Number(mode.roadMultiplier) || 1;
    }

    return Math.max(0.1, cost);
  }

  function reconstructPath(cameFrom, currentKey) {
    var total = [parseHexKey(currentKey)];

    while (cameFrom[currentKey]) {
      currentKey = cameFrom[currentKey];
      total.push(parseHexKey(currentKey));
    }

    return total.reverse();
  }

  function buildPathResult(cells, options) {
    options = options || {};

    var estimate = calculateTravelEstimate(cells, options);
    var pixelPath = cells.map(function (cell) {
      return hexToPixel(cell.q, cell.r, state.config.hexSize);
    });

    return Object.assign({}, estimate, {
      success: true,
      cells: cells,
      pixelPath: pixelPath,
      warnings: estimate.warnings || [],
    });
  }

  function buildFailedPathResult(start, goal, warnings) {
    return {
      success: false,
      start: start,
      goal: goal,
      cells: [],
      pixelPath: [],
      totalCost: Infinity,
      totalDistanceMiles: 0,
      effectiveDistanceMiles: Infinity,
      estimatedDays: Infinity,
      riskScore: 0,
      warnings: warnings || [],
    };
  }

  function calculateTravelEstimate(cells, options) {
    options = options || {};

    var modeKey = options.travelMode || "foot";
    var speedMode = options.speedMode || "normal";
    var mode = TRAVEL_MODES[modeKey] || TRAVEL_MODES.foot;
    var milesPerHex = Number(state.config.milesPerHex) || 1;
    var totalCost = 0;
    var riskScore = 0;
    var warnings = [];

    if (!Array.isArray(cells) || cells.length < 2) {
      return {
        totalCost: 0,
        totalDistanceMiles: 0,
        effectiveDistanceMiles: 0,
        estimatedDays: 0,
        riskScore: 0,
        warnings: ["Path has fewer than two cells."],
      };
    }

    for (var i = 1; i < cells.length; i += 1) {
      var cell = getCellData(cells[i].q, cells[i].r);
      var cost = getMovementCost(cells[i].q, cells[i].r, mode);

      if (!Number.isFinite(cost)) {
        warnings.push("Path includes an untraversable cell at " + hexKey(cells[i].q, cells[i].r) + ".");
        continue;
      }

      totalCost += cost;
      riskScore += Number(cell.risk) || 0;
    }

    var totalDistanceMiles = (cells.length - 1) * milesPerHex;
    var effectiveDistanceMiles = totalCost * milesPerHex;
    var speed = mode.speedMilesPerDay && mode.speedMilesPerDay[speedMode] ? mode.speedMilesPerDay[speedMode] : 24;
    var estimatedDays = speed > 0 ? effectiveDistanceMiles / speed : Infinity;

    return {
      totalCost: roundTo(totalCost, 2),
      totalDistanceMiles: roundTo(totalDistanceMiles, 2),
      effectiveDistanceMiles: roundTo(effectiveDistanceMiles, 2),
      estimatedDays: roundTo(estimatedDays, 2),
      riskScore: roundTo(riskScore, 2),
      warnings: warnings,
    };
  }

  function isHexInsideMap(q, r) {
    var center = hexToPixel(q, r, state.config.hexSize);
    return isPixelInsideMap(center.x, center.y);
  }

  function MinHeap() {
    this.items = [];
  }

  MinHeap.prototype.size = function () {
    return this.items.length;
  };

  MinHeap.prototype.push = function (item) {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  };

  MinHeap.prototype.pop = function () {
    if (!this.items.length) {
      return null;
    }

    var root = this.items[0];
    var end = this.items.pop();

    if (this.items.length) {
      this.items[0] = end;
      this.sinkDown(0);
    }

    return root;
  };

  MinHeap.prototype.bubbleUp = function (index) {
    var item = this.items[index];

    while (index > 0) {
      var parentIndex = Math.floor((index + 1) / 2) - 1;
      var parent = this.items[parentIndex];

      if (item.priority >= parent.priority) {
        break;
      }

      this.items[parentIndex] = item;
      this.items[index] = parent;
      index = parentIndex;
    }
  };

  MinHeap.prototype.sinkDown = function (index) {
    var length = this.items.length;
    var item = this.items[index];

    while (true) {
      var rightIndex = (index + 1) * 2;
      var leftIndex = rightIndex - 1;
      var swap = null;

      if (leftIndex < length) {
        var left = this.items[leftIndex];

        if (left.priority < item.priority) {
          swap = leftIndex;
        }
      }

      if (rightIndex < length) {
        var right = this.items[rightIndex];

        if ((swap === null && right.priority < item.priority) || (swap !== null && right.priority < this.items[swap].priority)) {
          swap = rightIndex;
        }
      }

      if (swap === null) {
        break;
      }

      this.items[index] = this.items[swap];
      this.items[swap] = item;
      index = swap;
    }
  };

  function roundTo(value, decimals) {
    var factor = Math.pow(10, decimals || 0);
    return Math.round(value * factor) / factor;
  }

  function drawBrushPreview() {
    if (state.displayMode !== "editor" || !state.brushPreviewHexes.length || state.isMiddlePanning) {
      return;
    }

    state.ctx.save();

    state.brushPreviewHexes.forEach(function (hex) {
      var center = hexToPixel(hex.q, hex.r, state.config.hexSize);
      var points = getHexCorners(center.x, center.y, state.config.hexSize);
      var first = mapPixelToContainer(points[0]);
      var key = hexKey(hex.q, hex.r);
      var existing = !!readStoredCell(hex.q, hex.r);
      var wouldSkip = !state.editorErase && !state.overwriteHexes && existing && !state.editorRoad && !state.editorBridge && !state.editorTunnel;

      state.ctx.beginPath();
      state.ctx.moveTo(first.x, first.y);

      for (var i = 1; i < points.length; i += 1) {
        var projected = mapPixelToContainer(points[i]);
        state.ctx.lineTo(projected.x, projected.y);
      }

      state.ctx.closePath();
      state.ctx.fillStyle = wouldSkip ? "rgba(160, 160, 160, 0.12)" : getBrushPreviewFill();
      state.ctx.strokeStyle = wouldSkip ? "rgba(180, 180, 180, 0.52)" : "rgba(241, 213, 165, 0.92)";
      state.ctx.lineWidth = 1.8;
      state.ctx.setLineDash(wouldSkip ? [3, 3] : []);
      state.ctx.fill();
      state.ctx.stroke();
    });

    state.ctx.restore();
  }

  function getBrushPreviewFill() {
    if (state.editorErase) {
      return "rgba(220, 70, 70, 0.22)";
    }

    var terrain = TERRAIN_TYPES[state.editorTerrain] || TERRAIN_TYPES.plain;
    return withOpacity(terrain.color || "rgba(241, 213, 165, 0.24)", 0.28);
  }

  function drawHex(q, r, center) {
    var key = hexKey(q, r);
    var cell = readStoredCell(q, r) || null;
    var points = getHexCorners(center.x, center.y, state.config.hexSize);
    var first = mapPixelToContainer(points[0]);

    state.ctx.beginPath();
    state.ctx.moveTo(first.x, first.y);

    for (var i = 1; i < points.length; i += 1) {
      var projected = mapPixelToContainer(points[i]);
      state.ctx.lineTo(projected.x, projected.y);
    }

    state.ctx.closePath();

    if (cell) {
      var terrain = TERRAIN_TYPES[cell.terrain] || TERRAIN_TYPES.plain;
      state.ctx.fillStyle = withOpacity(terrain.color || "rgba(255, 255, 255, 0.12)", state.terrainOpacity);
      state.ctx.fill();

      if (cell.road) {
        drawRoadMark(center);
      }

      if (cell.bridge) {
        drawBridgeMark(center);
      }

      if (cell.tunnel) {
        drawTunnelMark(center);
      }
    }

    if (isHighlightedRegionCell(q, r)) {
      state.ctx.save();
      state.ctx.fillStyle = state.pulseRegionId ? "rgba(241, 213, 165, 0.42)" : "rgba(241, 213, 165, 0.28)";
      state.ctx.strokeStyle = state.pulseRegionId ? "rgba(255, 238, 180, 0.98)" : "rgba(241, 213, 165, 0.9)";
      state.ctx.lineWidth = state.pulseRegionId ? 2.8 : 2.1;
      state.ctx.fill();
      state.ctx.stroke();
      state.ctx.restore();
      return;
    }

    state.ctx.stroke();
  }

  function isHighlightedRegionCell(q, r) {
    return !!state.highlightedRegionCellLookup[hexKey(q, r)];
  }

  function drawRoadMark(center) {
    var projected = mapPixelToContainer(center);
    state.ctx.save();
    state.ctx.beginPath();
    state.ctx.arc(projected.x, projected.y, 2.4, 0, Math.PI * 2);
    state.ctx.fillStyle = "rgba(241, 213, 165, 0.82)";
    state.ctx.fill();
    state.ctx.restore();
  }

  function drawBridgeMark(center) {
    var projected = mapPixelToContainer(center);
    state.ctx.save();
    state.ctx.strokeStyle = "rgba(241, 213, 165, 0.94)";
    state.ctx.lineWidth = 2.2;
    state.ctx.lineCap = "round";
    state.ctx.beginPath();
    state.ctx.moveTo(projected.x - 5, projected.y - 3);
    state.ctx.lineTo(projected.x + 5, projected.y + 3);
    state.ctx.moveTo(projected.x - 5, projected.y + 3);
    state.ctx.lineTo(projected.x + 5, projected.y - 3);
    state.ctx.stroke();
    state.ctx.restore();
  }

  function drawTunnelMark(center) {
    var projected = mapPixelToContainer(center);
    state.ctx.save();
    state.ctx.strokeStyle = "rgba(220, 220, 220, 0.92)";
    state.ctx.lineWidth = 2;
    state.ctx.setLineDash([3, 2]);
    state.ctx.beginPath();
    state.ctx.arc(projected.x, projected.y, 5, Math.PI, 0);
    state.ctx.stroke();
    state.ctx.restore();
  }

  function mapPixelToContainer(point) {
    var latlng = state.world.toMapLatLng(point.x, point.y);
    var containerPoint = state.map.latLngToContainerPoint(latlng);

    return {
      x: containerPoint.x,
      y: containerPoint.y,
    };
  }

  function getHexCorners(x, y, size) {
    var corners = [];

    for (var i = 0; i < 6; i += 1) {
      var angle = Math.PI / 180 * (60 * i - 30);
      corners.push({
        x: x + size * Math.cos(angle),
        y: y + size * Math.sin(angle),
      });
    }

    return corners;
  }

  function pixelToHex(x, y, size) {
    var q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / size;
    var r = (2 / 3 * y) / size;

    return roundHex(q, r);
  }

  function hexToPixel(q, r, size) {
    return {
      x: size * Math.sqrt(3) * (q + r / 2),
      y: size * 1.5 * r,
    };
  }

  function roundHex(q, r) {
    var x = q;
    var z = r;
    var y = -x - z;
    var rx = Math.round(x);
    var ry = Math.round(y);
    var rz = Math.round(z);
    var xDiff = Math.abs(rx - x);
    var yDiff = Math.abs(ry - y);
    var zDiff = Math.abs(rz - z);

    if (xDiff > yDiff && xDiff > zDiff) {
      rx = -ry - rz;
    } else if (yDiff > zDiff) {
      ry = -rx - rz;
    } else {
      rz = -rx - ry;
    }

    return { q: rx, r: rz };
  }

  function hexKey(q, r) {
    return String(q) + "," + String(r);
  }

  function parseHexKey(key) {
    var parts = String(key || "").split(",");

    return {
      q: Number(parts[0]) || 0,
      r: Number(parts[1]) || 0,
    };
  }

  function getHexNeighbors(q, r) {
    return [
      { q: q + 1, r: r },
      { q: q + 1, r: r - 1 },
      { q: q, r: r - 1 },
      { q: q - 1, r: r },
      { q: q - 1, r: r + 1 },
      { q: q, r: r + 1 },
    ];
  }

  function hexDistance(a, b) {
    return (
      Math.abs(a.q - b.q) +
      Math.abs(a.q + a.r - b.q - b.r) +
      Math.abs(a.r - b.r)
    ) / 2;
  }

  function isPixelInsideMap(x, y) {
    return x >= 0 && y >= 0 && x <= state.width && y <= state.height;
  }

  function syncBrushInputs() {
    if (!state.editorPanel) {
      return;
    }

    var brushInputs = state.editorPanel.querySelectorAll("[data-travel-editor-brush]");

    for (var i = 0; i < brushInputs.length; i += 1) {
      brushInputs[i].value = String(state.brushSize);
    }
  }

  function syncOpacityInputs() {
    if (!state.editorPanel) {
      return;
    }

    var gridOpacityInputs = state.editorPanel.querySelectorAll("[data-travel-grid-opacity]");
    var terrainOpacityInputs = state.editorPanel.querySelectorAll("[data-travel-terrain-opacity]");

    for (var i = 0; i < gridOpacityInputs.length; i += 1) {
      gridOpacityInputs[i].value = String(state.gridOpacity);
    }

    for (var j = 0; j < terrainOpacityInputs.length; j += 1) {
      terrainOpacityInputs[j].value = String(state.terrainOpacity);
    }
  }

  function withOpacity(color, opacity) {
    var match = String(color).match(/rgba?\(([^)]+)\)/i);

    if (!match) {
      return color;
    }

    var parts = match[1].split(",").map(function (part) {
      return part.trim();
    });

    return "rgba(" + parts[0] + ", " + parts[1] + ", " + parts[2] + ", " + clampNumber(opacity, 0, 1) + ")";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
})();
