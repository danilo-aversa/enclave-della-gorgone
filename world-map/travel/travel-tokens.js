// v0.9 2026-04-29T21:10:00.000Z
(function () {
  "use strict";

  var TOKEN_TYPES = {
    party: {
      label: "Party",
      icon: "fa-person-hiking",
      color: "#71ddca",
    },
    expedition: {
      label: "Expedition",
      icon: "fa-campground",
      color: "#f1d5a5",
    },
    caravan: {
      label: "Caravan",
      icon: "fa-wagon-covered",
      color: "#d6b160",
    },
    ship: {
      label: "Ship",
      icon: "fa-ship",
      color: "#83bbce",
    },
    enemy: {
      label: "Enemy",
      icon: "fa-skull",
      color: "#d85c5c",
    },
    scout: {
      label: "Scout",
      icon: "fa-eye",
      color: "#a9d18e",
    },
  };

  var DEFAULT_TOKEN_TYPE = "party";
  var STORAGE_VERSION = 1;

  var state = {
    world: null,
    travel: null,
    map: null,
    mapId: "",
    tokens: [],
    tokenLayer: null,
    routeLayer: null,
    waypointLayer: null,
    tokenMarkers: {},
    waypointMarkers: {},
    selectedTokenId: "",
    pickMode: null,
    pickPreviewMarker: null,
    panel: null,
    host: null,
    autosaveTimer: null,
    hasLocalOverride: false,
  };

  window.EnclaveTravelTokens = {
    init: init,
    openPanel: openPanel,
    closePanel: closePanel,
    createToken: createToken,
    updateToken: updateToken,
    deleteToken: deleteToken,
    moveTokenToHex: moveTokenToHex,
    selectToken: selectToken,
    clearSelection: clearSelection,
    getTokens: function () {
      return state.tokens.map(cloneToken);
    },
    getSelectedToken: function () {
      return getTokenById(state.selectedTokenId);
    },
    getTokenTypes: function () {
      return Object.assign({}, TOKEN_TYPES);
    },
    exportPayload: buildPayload,
    applyPayload: applyPayload,
    saveToLocalStorage: saveToLocalStorage,
    loadFromLocalStorage: loadFromLocalStorage,
    flushLocalOverride: flushLocalOverride,
    getState: function () {
      return state;
    },
  };

  function init(context) {
    context = context || {};
    state.world = context.world || window.EnclaveWorldMap || null;
    state.travel = context.travel || window.EnclaveTravel || null;
    state.map = state.world ? state.world.map : null;
    state.mapId = state.world ? state.world.mapId : "";

    if (!state.world || !state.map || !state.travel) {
      return false;
    }

    ensureTokenLayer();
    ensureRouteLayer();
    ensureWaypointLayer();
    bindMapEvents();
    loadFromLocalStorage();
    renderTokens();
    return true;
  }

  function ensureTokenLayer() {
    if (!state.map) {
      return;
    }

    if (state.tokenLayer && state.map.hasLayer(state.tokenLayer)) {
      return;
    }

    state.tokenLayer = L.layerGroup().addTo(state.map);
  }

  function ensureRouteLayer() {
    if (!state.map) {
      return;
    }

    if (state.routeLayer && state.map.hasLayer(state.routeLayer)) {
      return;
    }

    state.routeLayer = L.layerGroup().addTo(state.map);
  }

  function ensureWaypointLayer() {
    if (!state.map) {
      return;
    }

    if (state.waypointLayer && state.map.hasLayer(state.waypointLayer)) {
      return;
    }

    state.waypointLayer = L.layerGroup().addTo(state.map);
  }

  function bindMapEvents() {
    if (!state.map || state.map._enclaveTravelTokensBound) {
      return;
    }

    state.map._enclaveTravelTokensBound = true;

    state.map.on("click", function (event) {
      if (state.pickMode) {
        handleMapPick(event);
        return;
      }

      clearSelection();
    });

    state.map.on("mousemove", function (event) {
      updatePickPreview(event);
    });
  }

  function openPanel(host) {
    if (!host) {
      return;
    }

    if (!state.world || !state.travel) {
      init({});
    }

    state.host = host;
    host.classList.remove("world-map-detail");
    host.classList.add("world-map-editor", "world-map-travel-tokens-host");
    host.innerHTML = buildPanelMarkup();
    state.panel = host.querySelector("[data-world-map-travel-tokens]");

    bindPanelEvents(host);
    renderPanel();
  }

  function closePanel() {
    state.pickMode = null;
    clearPickPreviewMarker();

    if (state.host) {
      state.host.classList.remove("world-map-editor", "world-map-travel-tokens-host");
      state.host.classList.add("world-map-detail");
      state.host.innerHTML = '<p class="world-map-detail__empty">Seleziona un segnalino o una regione sulla mappa.</p>';
    }

    state.panel = null;
    state.host = null;
  }

  function buildPanelMarkup() {
    return (
      '<aside class="world-map-travel-editor world-map-travel-tokens" data-world-map-travel-tokens>' +
      '<header class="world-map-travel-editor__header">' +
      '<strong>Travel Tokens</strong>' +
      '<span class="world-map-travel-editor__status" data-travel-token-status></span>' +
      '</header>' +
      '<section class="world-map-travel-token-section">' +
      '<h3>Create</h3>' +
      '<div class="world-map-travel-token-create">' +
      '<input type="text" value="Spedizione" data-travel-token-name aria-label="Nome token" />' +
      '<select data-travel-token-type aria-label="Tipo token">' + buildTokenTypeOptions(DEFAULT_TOKEN_TYPE) + '</select>' +
      '<button type="button" data-travel-token-pick-create title="Posiziona token"><i class="fa-solid fa-location-crosshairs" aria-hidden="true"></i></button>' +
      '</div>' +
      '</section>' +
      '<section class="world-map-travel-token-section world-map-travel-token-section--list">' +
      '<h3>Tokens</h3>' +
      '<div class="world-map-travel-token-list" data-travel-token-list></div>' +
      '</section>' +
      '<section class="world-map-travel-token-section" data-travel-token-detail hidden></section>' +
      '<div class="world-map-travel-editor__actions">' +
      '<button type="button" data-travel-token-export aria-label="Export JSON" title="Export JSON"><i class="fa-solid fa-copy" aria-hidden="true"></i></button>' +
      '<button type="button" data-travel-token-flush-local aria-label="Flush local override" title="Flush local override"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i></button>' +
      '<button type="button" data-travel-token-import aria-label="Import JSON" title="Import JSON"><i class="fa-solid fa-file-import" aria-hidden="true"></i></button>' +
      '<button type="button" data-travel-token-close aria-label="Chiudi" title="Chiudi"><i class="fa-solid fa-check" aria-hidden="true"></i></button>' +
      '</div>' +
      '</aside>'
    );
  }

  function buildTokenTypeOptions(selected) {
    return Object.keys(TOKEN_TYPES).map(function (key) {
      return '<option value="' + escapeHtml(key) + '"' + (key === selected ? " selected" : "") + '>' + escapeHtml(TOKEN_TYPES[key].label) + '</option>';
    }).join("");
  }

  function bindPanelEvents(host) {
    if (!host || host._enclaveTravelTokensPanelBound) {
      return;
    }

    host._enclaveTravelTokensPanelBound = true;

    host.addEventListener("click", function (event) {
      var createPick = event.target.closest("[data-travel-token-pick-create]");
      var selectButton = event.target.closest("[data-travel-token-select]");
      var moveButton = event.target.closest("[data-travel-token-move]");
      var deleteButton = event.target.closest("[data-travel-token-delete]");
      var destinationButton = event.target.closest("[data-travel-token-destination]");
      var waypointButton = event.target.closest("[data-travel-token-waypoint]");
      var clearWaypointsButton = event.target.closest("[data-travel-token-clear-waypoints]");
      var clearRouteButton = event.target.closest("[data-travel-token-clear-route]");
      var exportButton = event.target.closest("[data-travel-token-export]");
      var importButton = event.target.closest("[data-travel-token-import]");
      var flushButton = event.target.closest("[data-travel-token-flush-local]");
      var closeButton = event.target.closest("[data-travel-token-close]");

      if (createPick) {
        beginPickMode("create");
        return;
      }

      if (selectButton) {
        selectToken(selectButton.getAttribute("data-travel-token-select"));
        return;
      }

      if (moveButton) {
        selectToken(moveButton.getAttribute("data-travel-token-move"));
        beginPickMode("move");
        return;
      }

      if (deleteButton) {
        deleteToken(deleteButton.getAttribute("data-travel-token-delete"));
        return;
      }

      if (destinationButton) {
        selectToken(destinationButton.getAttribute("data-travel-token-destination"));
        beginPickMode("destination");
        return;
      }

      if (waypointButton) {
        selectToken(waypointButton.getAttribute("data-travel-token-waypoint"));
        beginPickMode("waypoint");
        return;
      }

      if (clearWaypointsButton) {
        clearTokenWaypoints(clearWaypointsButton.getAttribute("data-travel-token-clear-waypoints"));
        return;
      }

      if (clearRouteButton) {
        clearTokenRoute(clearRouteButton.getAttribute("data-travel-token-clear-route"));
        return;
      }

      if (exportButton) {
        exportJson(exportButton);
        return;
      }

      if (importButton) {
        importJson(importButton);
        return;
      }

      if (flushButton) {
        flushLocalOverride(flushButton);
        return;
      }

      if (closeButton) {
        saveToLocalStorage();
        closePanel();
      }
    });

    host.addEventListener("input", function (event) {
      var nameInput = event.target.closest("[data-travel-token-edit-name]");
      var colorInput = event.target.closest("[data-travel-token-edit-color]");
      var typeSelect = event.target.closest("[data-travel-token-edit-type]");

      if (nameInput) {
        updateToken(nameInput.getAttribute("data-travel-token-edit-name"), { name: nameInput.value });
        return;
      }

      if (colorInput) {
        updateToken(colorInput.getAttribute("data-travel-token-edit-color"), { color: colorInput.value });
        return;
      }

      if (typeSelect) {
        updateToken(typeSelect.getAttribute("data-travel-token-edit-type"), { type: typeSelect.value });
      }
    });
  }

  function renderPanel() {
    if (!state.panel) {
      return;
    }

    renderTokenStatus();
    renderTokenList();
    renderTokenDetail();
  }

  function renderTokenStatus() {
    var status = state.panel ? state.panel.querySelector("[data-travel-token-status]") : null;

    if (!status) {
      return;
    }

    status.textContent = state.hasLocalOverride ? "Local override" : "Local only";
    status.classList.toggle("is-local", !!state.hasLocalOverride);
  }

  function renderTokenList() {
    var mount = state.panel ? state.panel.querySelector("[data-travel-token-list]") : null;

    if (!mount) {
      return;
    }

    if (!state.tokens.length) {
      mount.innerHTML = '<p class="world-map-travel-regions-empty">Nessun travel token.</p>';
      return;
    }

    mount.innerHTML = state.tokens.map(function (token) {
      var type = TOKEN_TYPES[token.type] || TOKEN_TYPES[DEFAULT_TOKEN_TYPE];
      var active = token.id === state.selectedTokenId ? " is-active" : "";

      return (
        '<article class="world-map-travel-token-row' + active + '" data-travel-token-row="' + escapeHtml(token.id) + '">' +
        '<button type="button" class="world-map-travel-token-row__main" data-travel-token-select="' + escapeHtml(token.id) + '">' +
        '<span class="world-map-travel-token-dot" style="--token-color:' + escapeHtml(token.color || type.color) + '"><i class="fa-solid ' + escapeHtml(token.icon || type.icon) + '" aria-hidden="true"></i></span>' +
        '<span><strong>' + escapeHtml(token.name) + '</strong><small>' + escapeHtml(type.label) + ' · ' + escapeHtml(token.q + ',' + token.r) + '</small></span>' +
        '</button>' +
        '<button type="button" class="world-map-travel-mini-button" data-travel-token-move="' + escapeHtml(token.id) + '" aria-label="Muovi" title="Muovi"><i class="fa-solid fa-location-crosshairs" aria-hidden="true"></i></button>' +
        '<button type="button" class="world-map-travel-mini-button" data-travel-token-delete="' + escapeHtml(token.id) + '" aria-label="Elimina" title="Elimina"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>' +
        '</article>'
      );
    }).join("");
  }

  function renderTokenDetail() {
    var mount = state.panel ? state.panel.querySelector("[data-travel-token-detail]") : null;
    var token = getTokenById(state.selectedTokenId);

    if (!mount) {
      return;
    }

    if (!token) {
      mount.hidden = true;
      mount.innerHTML = "";
      return;
    }

    mount.hidden = false;
    mount.innerHTML =
      '<h3>Selected</h3>' +
      '<label class="world-map-travel-editor__field">' +
      '<span>Name</span>' +
      '<input type="text" value="' + escapeHtml(token.name) + '" data-travel-token-edit-name="' + escapeHtml(token.id) + '" />' +
      '</label>' +
      '<label class="world-map-travel-editor__field">' +
      '<span>Type</span>' +
      '<select data-travel-token-edit-type="' + escapeHtml(token.id) + '">' + buildTokenTypeOptions(token.type) + '</select>' +
      '</label>' +
      '<label class="world-map-travel-editor__field world-map-editor-form__field--color">' +
      '<span>Color</span>' +
      '<input type="color" value="' + escapeHtml(token.color || getTokenType(token.type).color) + '" data-travel-token-edit-color="' + escapeHtml(token.id) + '" />' +
      '</label>' +
      '<dl class="world-map-travel-calc-result">' +
      '<div><dt>Hex</dt><dd>' + escapeHtml(token.q + ',' + token.r) + '</dd></div>' +
      '<div><dt>Route</dt><dd>' + ((token.route || []).length || 0) + ' hex</dd></div>' +
      '<div><dt>Waypoints</dt><dd>' + ((token.routeWaypoints || []).length || 0) + '</dd></div>' +
      '<div><dt>Destination</dt><dd>' + getTokenDestinationLabel(token) + '</dd></div>' +
      '<div><dt>ETA</dt><dd>' + getTokenRouteEtaLabel(token) + '</dd></div>' +
      '</dl>' +
      '<div class="world-map-travel-token-detail-actions">' +
      '<button type="button" class="world-map-context-action" data-travel-token-waypoint="' + escapeHtml(token.id) + '"><i class="fa-solid fa-map-pin" aria-hidden="true"></i><span>Add waypoint</span></button>' +
      '<button type="button" class="world-map-context-action" data-travel-token-destination="' + escapeHtml(token.id) + '"><i class="fa-solid fa-route" aria-hidden="true"></i><span>Set destination</span></button>' +
      '<button type="button" class="world-map-context-action" data-travel-token-clear-waypoints="' + escapeHtml(token.id) + '"><i class="fa-solid fa-eraser" aria-hidden="true"></i><span>Clear waypoints</span></button>' +
      '<button type="button" class="world-map-context-action" data-travel-token-clear-route="' + escapeHtml(token.id) + '"><i class="fa-solid fa-ban" aria-hidden="true"></i><span>Clear route</span></button>' +
      '</div>';
  }

  function beginPickMode(mode) {
    state.pickMode = mode === "move" || mode === "destination" || mode === "waypoint" ? mode : "create";
    ensurePickPreviewMarker();
    renderPanel();
  }

  function handleMapPick(event) {
    var hex = latLngToHex(event.latlng);

    if (!hex) {
      return;
    }

    if (state.pickMode === "move") {
      var selected = getTokenById(state.selectedTokenId);

      if (selected) {
        moveTokenToHex(selected.id, hex.q, hex.r);
      }
    } else if (state.pickMode === "waypoint") {
      addWaypointToSelectedToken(hex.q, hex.r);
      state.pickMode = null;
      clearPickPreviewMarker();
      renderPanel();
      return;
    } else if (state.pickMode === "destination") {
      assignRouteToSelectedToken(hex.q, hex.r);
    } else {
      createTokenFromPanel(hex.q, hex.r);
    }

    state.pickMode = null;
    clearPickPreviewMarker();
    renderPanel();

    if (event.originalEvent) {
      event.originalEvent.preventDefault();
      event.originalEvent.stopPropagation();

      if (event.originalEvent.stopImmediatePropagation) {
        event.originalEvent.stopImmediatePropagation();
      }
    }
  }

  function createTokenFromPanel(q, r) {
    var nameInput = state.panel ? state.panel.querySelector("[data-travel-token-name]") : null;
    var typeSelect = state.panel ? state.panel.querySelector("[data-travel-token-type]") : null;
    var type = typeSelect && TOKEN_TYPES[typeSelect.value] ? typeSelect.value : DEFAULT_TOKEN_TYPE;
    var typeMeta = getTokenType(type);

    createToken({
      name: nameInput && nameInput.value.trim() ? nameInput.value.trim() : "Spedizione",
      type: type,
      q: q,
      r: r,
      color: typeMeta.color,
      icon: typeMeta.icon,
    });
  }

  function createToken(data) {
    var type = TOKEN_TYPES[data && data.type] ? data.type : DEFAULT_TOKEN_TYPE;
    var typeMeta = getTokenType(type);
    var token = sanitizeToken(Object.assign({
      id: createId("travel-token"),
      name: "Spedizione",
      type: type,
      q: 0,
      r: 0,
      color: typeMeta.color,
      icon: typeMeta.icon,
      route: [],
      routeWaypoints: [],
      routeIndex: 0,
    }, data || {}));

    state.tokens.push(token);
    state.selectedTokenId = token.id;
    renderToken(token);
    scheduleAutosave();
    renderPanel();
    return cloneToken(token);
  }

  function updateToken(tokenId, patch) {
    var token = getTokenById(tokenId);

    if (!token) {
      return null;
    }

    Object.assign(token, patch || {});
    sanitizeTokenInPlace(token);
    renderToken(token);
    scheduleAutosave();
    renderTokenList();
    renderTokenDetail();
    return cloneToken(token);
  }

  function deleteToken(tokenId) {
    var index = state.tokens.findIndex(function (token) {
      return token.id === tokenId;
    });

    if (index === -1) {
      return false;
    }

    removeTokenMarker(tokenId);
    removeTokenRoute(tokenId);
    removeTokenWaypoints(tokenId);
    state.tokens.splice(index, 1);

    if (state.selectedTokenId === tokenId) {
      state.selectedTokenId = "";
    }

    scheduleAutosave();
    renderPanel();
    return true;
  }

  function moveTokenToHex(tokenId, q, r) {
    var token = getTokenById(tokenId);

    if (!token) {
      return false;
    }

    token.q = Number(q) || 0;
    token.r = Number(r) || 0;
    token.route = [];
    token.routeWaypoints = [];
    token.routeIndex = 0;
    token.routeMeta = null;
    renderToken(token);
    renderTokenRoute(token);
    renderTokenWaypoints(token);
    scheduleAutosave();
    renderPanel();
    return true;
  }

  function addWaypointToSelectedToken(q, r) {
    var token = getTokenById(state.selectedTokenId);

    if (!token) {
      return false;
    }

    token.routeWaypoints = Array.isArray(token.routeWaypoints) ? token.routeWaypoints : [];
    token.routeWaypoints.push({ q: Number(q) || 0, r: Number(r) || 0 });

    if (token.routeMeta && token.routeMeta.destination) {
      recalculateTokenRoute(token);
    } else {
      renderTokenWaypoints(token);
    }

    scheduleAutosave();
    renderPanel();
    return true;
  }

  function assignRouteToSelectedToken(q, r) {
    var token = getTokenById(state.selectedTokenId);

    if (!token) {
      return false;
    }

    return assignRouteToToken(token, q, r, { silent: false });
  }

  function assignRouteToToken(token, q, r, options) {
    options = options || {};

    if (!token || !state.travel || typeof state.travel.calculateRoute !== "function") {
      return false;
    }

    var travelMode = inferTravelModeForToken(token);
    var waypoints = Array.isArray(token.routeWaypoints) ? token.routeWaypoints : [];
    var destination = { q: Number(q) || 0, r: Number(r) || 0 };
    var result = state.travel.calculateRoute({
      start: { q: token.q, r: token.r },
      end: destination,
      waypoints: waypoints,
      travelMode: travelMode,
      speedMode: "normal",
    });
    var path = extractRoutePath(result);

    if (!path.length) {
      if (!options.silent) {
        window.alert("Nessuna route trovata. Controlla che start, waypoint e destinazione siano attraversabili con il tipo di viaggio del token.");
      }
      renderTokenWaypoints(token);
      return false;
    }

    token.route = path.map(function (cell) {
      return { q: Number(cell.q) || 0, r: Number(cell.r) || 0 };
    });
    token.routeIndex = 0;
    token.routeMeta = {
      destination: destination,
      waypoints: waypoints.map(sanitizeRouteCell).filter(Boolean),
      travelMode: travelMode,
      speedMode: "normal",
      distance: Number(result.distance) || 0,
      cost: Number(result.cost) || 0,
      days: result.estimate && Number.isFinite(Number(result.estimate.days)) ? Number(result.estimate.days) : null,
      hours: result.estimate && Number.isFinite(Number(result.estimate.hours)) ? Number(result.estimate.hours) : null,
    };

    renderTokenRoute(token);
    renderTokenWaypoints(token);
    scheduleAutosave();
    renderPanel();
    return true;
  }

  function extractRoutePath(result) {
    if (!result || typeof result !== "object") {
      return [];
    }

    if (Array.isArray(result.path)) {
      return result.path;
    }

    if (Array.isArray(result.route)) {
      return result.route;
    }

    if (Array.isArray(result.cells)) {
      return result.cells;
    }

    if (Array.isArray(result.points)) {
      return result.points;
    }

    if (Array.isArray(result.segments)) {
      return result.segments.reduce(function (acc, segment, index) {
        var segmentPath = extractRoutePath(segment);

        if (!segmentPath.length) {
          return acc;
        }

        if (index > 0 && acc.length) {
          return acc.concat(segmentPath.slice(1));
        }

        return acc.concat(segmentPath);
      }, []);
    }

    return [];
  }

  function clearTokenRoute(tokenId) {
    var token = getTokenById(tokenId);

    if (!token) {
      return false;
    }

    token.route = [];
    token.routeIndex = 0;
    token.routeMeta = null;
    renderTokenRoute(token);
    renderTokenWaypoints(token);
    scheduleAutosave();
    renderPanel();
    return true;
  }

  function clearTokenWaypoints(tokenId) {
    var token = getTokenById(tokenId);

    if (!token) {
      return false;
    }

    token.routeWaypoints = [];
    token.route = [];
    token.routeIndex = 0;
    token.routeMeta = null;
    renderTokenRoute(token);
    scheduleAutosave();
    renderPanel();
    return true;
  }

  function inferTravelModeForToken(token) {
    if (token.type === "caravan") {
      return "cart";
    }

    if (token.type === "ship") {
      return "ship";
    }

    return "foot";
  }

  function getTokenDestinationLabel(token) {
    if (!token || !token.routeMeta || !token.routeMeta.destination) {
      return "—";
    }

    return token.routeMeta.destination.q + "," + token.routeMeta.destination.r;
  }

  function getTokenRouteEtaLabel(token) {
    if (!token || !token.routeMeta) {
      return "—";
    }

    if (Number.isFinite(Number(token.routeMeta.days))) {
      return roundTo(token.routeMeta.days, 1) + " giorni";
    }

    if (Number.isFinite(Number(token.routeMeta.hours))) {
      return roundTo(token.routeMeta.hours, 1) + " ore";
    }

    return "—";
  }

  function selectToken(tokenId) {
    var token = getTokenById(tokenId);

    state.selectedTokenId = token ? token.id : "";
    openTokensPanelFromSelection();
    renderTokens();
    renderRoutes();
    renderWaypoints();
    renderPanel();

    if (token && state.map && state.world) {
      var point = hexToPixel(token.q, token.r);
      state.map.panTo(state.world.toMapLatLng(point.x, point.y), { animate: true });
    }

    return token ? cloneToken(token) : null;
  }

  function clearSelection() {
    state.selectedTokenId = "";
    renderTokens();
    renderRoutes();
    renderWaypoints();
    renderPanel();
  }

  function openTokensPanelFromSelection() {
    var tab = document.querySelector('[data-world-map-side-tab="tokens"]');

    if (tab && typeof tab.click === "function") {
      tab.click();
      return;
    }

    var detailPanel = document.querySelector("#world-map-detail");

    if (detailPanel) {
      openPanel(detailPanel);
    }
  }

  function renderTokens() {
    ensureTokenLayer();

    Object.keys(state.tokenMarkers).forEach(function (tokenId) {
      if (!getTokenById(tokenId)) {
        removeTokenMarker(tokenId);
      }
    });

    state.tokens.forEach(renderToken);
    renderRoutes();
    renderWaypoints();
  }

  function renderRoutes() {
    ensureRouteLayer();

    if (!state.routeLayer) {
      return;
    }

    state.routeLayer.clearLayers();
    state.tokens.forEach(renderTokenRoute);
  }

  function renderWaypoints() {
    ensureWaypointLayer();

    if (!state.waypointLayer) {
      return;
    }

    state.waypointLayer.clearLayers();
    state.waypointMarkers = {};
    state.tokens.forEach(renderTokenWaypoints);
  }

  function renderTokenRoute(token) {
    ensureRouteLayer();

    if (!state.routeLayer || !state.world || !token || !Array.isArray(token.route) || token.route.length < 2) {
      return;
    }

    if (state.routeLayer.eachLayer) {
      state.routeLayer.eachLayer(function (layer) {
        if (layer.options && layer.options.tokenId === token.id) {
          state.routeLayer.removeLayer(layer);
        }
      });
    }

    var latlngs = getSmoothedRouteLatLngs(token.route);
    var color = token.color || getTokenType(token.type).color;
    var route = L.polyline(latlngs, {
      tokenId: token.id,
      color: color,
      weight: token.id === state.selectedTokenId ? 6 : 4,
      opacity: token.id === state.selectedTokenId ? 0.98 : 0.72,
      lineCap: "round",
      lineJoin: "round",
      smoothFactor: 1.6,
      className: "world-map-travel-token-route" + (token.id === state.selectedTokenId ? " is-selected" : ""),
    }).addTo(state.routeLayer);

    route.on("click", function (event) {
      if (event && event.originalEvent) {
        event.originalEvent.stopPropagation();
      }

      selectToken(token.id);
    });

    route.bringToBack();
  }

  function getSmoothedRouteLatLngs(routeCells) {
    var visualCells = simplifyRouteVisualCells(routeCells || []);
    var points = visualCells.map(function (cell) {
      var point = hexToPixel(cell.q, cell.r);
      return { x: point.x, y: point.y };
    });
    var smoothed = smoothRoutePoints(points, 8);

    return smoothed.map(function (point) {
      return state.world.toMapLatLng(point.x, point.y);
    });
  }

  function simplifyRouteVisualCells(routeCells) {
    var zigzagSimplified = simplifyZigZagRoute(routeCells || []);
    var cornerSimplified = simplifyMinorRouteSteps(zigzagSimplified);
    return dedupeVisualCells(cornerSimplified);
  }

  function simplifyMinorRouteSteps(routeCells) {
    if (!Array.isArray(routeCells) || routeCells.length < 5) {
      return routeCells || [];
    }

    var result = [routeCells[0]];
    var i = 1;

    while (i < routeCells.length - 1) {
      var previous = result[result.length - 1];
      var current = routeCells[i];
      var next = routeCells[i + 1];
      var prevDir = getStepDirection(previous, current);
      var nextDir = getStepDirection(current, next);
      var afterNext = routeCells[i + 2] || null;
      var afterDir = afterNext ? getStepDirection(next, afterNext) : "";

      if (prevDir && nextDir && prevDir !== nextDir && afterDir && afterDir === prevDir) {
        result.push(createRouteMidpointCell(previous, next));
        i += 1;
        continue;
      }

      result.push(current);
      i += 1;
    }

    result.push(routeCells[routeCells.length - 1]);
    return result;
  }

  function simplifyZigZagRoute(routeCells) {
    if (!Array.isArray(routeCells) || routeCells.length < 5) {
      return routeCells || [];
    }

    var simplified = [];
    var i = 0;

    while (i < routeCells.length) {
      var runEnd = findZigZagRunEnd(routeCells, i);

      if (runEnd > i + 3) {
        simplified.push(routeCells[i]);
        simplified.push(createRouteMidpointCell(routeCells[i], routeCells[runEnd]));
        i = runEnd;
        continue;
      }

      simplified.push(routeCells[i]);
      i += 1;
    }

    return dedupeVisualCells(simplified);
  }

  function findZigZagRunEnd(routeCells, startIndex) {
    if (startIndex + 4 >= routeCells.length) {
      return startIndex;
    }

    var first = getStepDirection(routeCells[startIndex], routeCells[startIndex + 1]);
    var second = getStepDirection(routeCells[startIndex + 1], routeCells[startIndex + 2]);

    if (!first || !second || first === second) {
      return startIndex;
    }

    var end = startIndex + 2;

    for (var i = startIndex + 2; i < routeCells.length - 1; i += 1) {
      var expected = (i - startIndex) % 2 === 0 ? first : second;
      var actual = getStepDirection(routeCells[i], routeCells[i + 1]);

      if (actual !== expected) {
        break;
      }

      end = i + 1;
    }

    return end;
  }

  function getStepDirection(a, b) {
    if (!a || !b) {
      return "";
    }

    return (Number(b.q) - Number(a.q)) + "," + (Number(b.r) - Number(a.r));
  }

  function createRouteMidpointCell(a, b) {
    return {
      q: (Number(a.q) + Number(b.q)) / 2,
      r: (Number(a.r) + Number(b.r)) / 2,
    };
  }

  function dedupeVisualCells(cells) {
    var result = [];
    var lastKey = "";

    cells.forEach(function (cell) {
      var key = Number(cell.q).toFixed(3) + "," + Number(cell.r).toFixed(3);

      if (key === lastKey) {
        return;
      }

      result.push(cell);
      lastKey = key;
    });

    return result;
  }

  function smoothRoutePoints(points, subdivisions) {
    if (!Array.isArray(points) || points.length < 3) {
      return points || [];
    }

    var result = [];
    var steps = Math.max(2, Number(subdivisions) || 6);

    for (var i = 0; i < points.length - 1; i += 1) {
      var p0 = points[Math.max(0, i - 1)];
      var p1 = points[i];
      var p2 = points[i + 1];
      var p3 = points[Math.min(points.length - 1, i + 2)];

      for (var step = 0; step < steps; step += 1) {
        if (i > 0 || step > 0) {
          result.push(catmullRomPoint(p0, p1, p2, p3, step / steps));
        } else {
          result.push({ x: p1.x, y: p1.y });
        }
      }
    }

    result.push(points[points.length - 1]);
    return result;
  }

  function catmullRomPoint(p0, p1, p2, p3, t) {
    var t2 = t * t;
    var t3 = t2 * t;

    return {
      x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    };
  }

  function renderTokenWaypoints(token) {
    ensureWaypointLayer();

    if (!state.waypointLayer || !state.world || !token) {
      return;
    }

    removeTokenWaypoints(token.id);

    var waypoints = Array.isArray(token.routeWaypoints) ? token.routeWaypoints : [];

    waypoints.forEach(function (waypoint, index) {
      renderWaypointMarker(token, waypoint, index, "waypoint");
    });

    if (token.routeMeta && token.routeMeta.destination) {
      renderWaypointMarker(token, token.routeMeta.destination, -1, "destination");
    }
  }

  function renderWaypointMarker(token, waypoint, index, kind) {
    var point = hexToPixel(waypoint.q, waypoint.r);
    var latlng = state.world.toMapLatLng(point.x, point.y);
    var key = token.id + ":" + kind + ":" + index;
    var marker = L.marker(latlng, {
      interactive: true,
      draggable: true,
      zIndexOffset: kind === "destination" ? 1550 : 1500,
      icon: createWaypointIcon(token, index, kind),
      tokenId: token.id,
    }).addTo(state.waypointLayer);

    marker.on("click", function (event) {
      if (event && event.originalEvent) {
        event.originalEvent.stopPropagation();
      }

      selectToken(token.id);
    });

    marker.on("dragend", function (event) {
      var movedHex = latLngToHex(event.target.getLatLng());

      if (!movedHex) {
        renderTokenWaypoints(token);
        return;
      }

      updateRouteControlPoint(token.id, index, kind, movedHex.q, movedHex.r);
    });

    marker.bindTooltip(kind === "destination" ? "Destination" : "Waypoint " + (index + 1), {
      direction: "top",
      opacity: 0.95,
    });

    state.waypointMarkers[key] = marker;
  }

  function updateRouteControlPoint(tokenId, index, kind, q, r) {
    var token = getTokenById(tokenId);

    if (!token) {
      return false;
    }

    if (kind === "destination") {
      if (!token.routeMeta) {
        token.routeMeta = {};
      }

      token.routeMeta.destination = { q: Number(q) || 0, r: Number(r) || 0 };
      recalculateTokenRoute(token);
      return true;
    }

    token.routeWaypoints = Array.isArray(token.routeWaypoints) ? token.routeWaypoints : [];

    if (!token.routeWaypoints[index]) {
      return false;
    }

    token.routeWaypoints[index] = { q: Number(q) || 0, r: Number(r) || 0 };

    if (token.routeMeta && token.routeMeta.destination) {
      recalculateTokenRoute(token);
    } else {
      renderTokenWaypoints(token);
      scheduleAutosave();
      renderPanel();
    }

    return true;
  }

  function recalculateTokenRoute(token) {
    if (!token || !token.routeMeta || !token.routeMeta.destination) {
      return false;
    }

    return assignRouteToToken(token, token.routeMeta.destination.q, token.routeMeta.destination.r, { silent: true });
  }

  function renderToken(token) {
    ensureTokenLayer();

    if (!state.map || !state.world || !state.tokenLayer || !token) {
      return;
    }

    var point = hexToPixel(token.q, token.r);
    var latlng = state.world.toMapLatLng(point.x, point.y);
    var marker = state.tokenMarkers[token.id];

    if (!marker) {
      marker = L.marker(latlng, {
        interactive: true,
        zIndexOffset: 1600,
        icon: createTokenIcon(token),
      }).addTo(state.tokenLayer);

      marker.on("click", function (event) {
        if (event && event.originalEvent) {
          event.originalEvent.stopPropagation();
        }

        selectToken(token.id);
      });

      marker.on("contextmenu", function (event) {
        if (event && event.originalEvent) {
          event.originalEvent.preventDefault();
          event.originalEvent.stopPropagation();
        }

        selectToken(token.id);
        beginPickMode("move");
      });

      state.tokenMarkers[token.id] = marker;
    }

    marker.setLatLng(latlng);
    marker.setIcon(createTokenIcon(token));
    marker.bindTooltip(token.name || "Travel token", {
      direction: "top",
      opacity: 0.95,
    });
  }

  function removeTokenMarker(tokenId) {
    var marker = state.tokenMarkers[tokenId];

    if (marker && state.tokenLayer) {
      state.tokenLayer.removeLayer(marker);
    }

    delete state.tokenMarkers[tokenId];
  }

  function removeTokenRoute(tokenId) {
    if (!state.routeLayer) {
      return;
    }

    state.routeLayer.eachLayer(function (layer) {
      if (layer.options && layer.options.tokenId === tokenId) {
        state.routeLayer.removeLayer(layer);
      }
    });
  }

  function removeTokenWaypoints(tokenId) {
    if (!state.waypointLayer) {
      return;
    }

    state.waypointLayer.eachLayer(function (layer) {
      if (layer.options && layer.options.tokenId === tokenId) {
        state.waypointLayer.removeLayer(layer);
      }
    });

    Object.keys(state.waypointMarkers).forEach(function (key) {
      if (key.indexOf(tokenId + ":") === 0) {
        delete state.waypointMarkers[key];
      }
    });
  }

  function createTokenIcon(token) {
    var type = getTokenType(token.type);
    var isSelected = token.id === state.selectedTokenId;
    var icon = token.icon || type.icon;
    var color = token.color || type.color;

    return L.divIcon({
      className: "",
      html:
        '<span class="world-map-travel-token-marker' + (isSelected ? ' is-selected' : '') + '" style="--token-color:' + escapeHtml(color) + '">' +
        '<i class="fa-solid ' + escapeHtml(icon) + '" aria-hidden="true"></i>' +
        '</span>',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  }

  function createWaypointIcon(token, index, kind) {
    var color = token.color || getTokenType(token.type).color;
    var content = kind === "destination"
      ? '<i class="fa-solid fa-flag-checkered" aria-hidden="true"></i>'
      : '<span>' + escapeHtml(String(index + 1)) + '</span>';

    return L.divIcon({
      className: "",
      html:
        '<span class="world-map-travel-waypoint-marker world-map-travel-waypoint-marker--' + escapeHtml(kind) + (token.id === state.selectedTokenId ? ' is-selected' : '') + '" style="--token-color:' + escapeHtml(color) + '">' +
        content +
        '</span>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }

  function ensurePickPreviewMarker() {
    if (!state.map || state.pickPreviewMarker) {
      return;
    }

    state.pickPreviewMarker = L.marker(state.map.getCenter(), {
      interactive: false,
      zIndexOffset: 1700,
      opacity: 0.82,
      icon: L.divIcon({
        className: "",
        html: '<span class="world-map-travel-token-marker world-map-travel-token-marker--preview"><i class="fa-solid fa-location-crosshairs" aria-hidden="true"></i></span>',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      }),
    }).addTo(state.map);
  }

  function clearPickPreviewMarker() {
    if (state.pickPreviewMarker && state.map) {
      state.map.removeLayer(state.pickPreviewMarker);
    }

    state.pickPreviewMarker = null;
  }

  function updatePickPreview(event) {
    if (!state.pickMode || !state.pickPreviewMarker || !event || !event.latlng) {
      return;
    }

    state.pickPreviewMarker.setLatLng(event.latlng);
  }

  function latLngToHex(latlng) {
    if (!state.world || !state.travel || !latlng) {
      return null;
    }

    var point = state.world.toImagePoint(latlng);

    if (state.world.isPointInsideImage && !state.world.isPointInsideImage(point)) {
      return null;
    }

    return state.travel.pixelToHex(point.x, point.y, readHexSize());
  }

  function hexToPixel(q, r) {
    if (state.travel && typeof state.travel.hexToPixel === "function") {
      return state.travel.hexToPixel(Number(q) || 0, Number(r) || 0, readHexSize());
    }

    var size = readHexSize();
    return {
      x: size * Math.sqrt(3) * ((Number(q) || 0) + (Number(r) || 0) / 2),
      y: size * 1.5 * (Number(r) || 0),
    };
  }

  function readHexSize() {
    if (state.travel && typeof state.travel.getConfig === "function") {
      var config = state.travel.getConfig();
      return Number(config.hexSize) || 10;
    }

    return 10;
  }

  function getTokenById(tokenId) {
    return state.tokens.find(function (token) {
      return token.id === tokenId;
    }) || null;
  }

  function getTokenType(type) {
    return TOKEN_TYPES[type] || TOKEN_TYPES[DEFAULT_TOKEN_TYPE];
  }

  function sanitizeToken(token) {
    var next = Object.assign({}, token || {});
    sanitizeTokenInPlace(next);
    return next;
  }

  function sanitizeTokenInPlace(token) {
    var type = TOKEN_TYPES[token.type] ? token.type : DEFAULT_TOKEN_TYPE;
    var typeMeta = getTokenType(type);

    token.id = String(token.id || createId("travel-token"));
    token.name = String(token.name || "Spedizione").trim() || "Spedizione";
    token.type = type;
    token.q = Number(token.q) || 0;
    token.r = Number(token.r) || 0;
    token.color = isHexColor(token.color) ? token.color : typeMeta.color;
    token.icon = String(token.icon || typeMeta.icon);
    token.route = Array.isArray(token.route) ? token.route.map(sanitizeRouteCell).filter(Boolean) : [];
    token.routeWaypoints = Array.isArray(token.routeWaypoints) ? token.routeWaypoints.map(sanitizeRouteCell).filter(Boolean) : [];
    token.routeIndex = Math.max(0, Number(token.routeIndex) || 0);
    token.routeMeta = sanitizeRouteMeta(token.routeMeta);
  }

  function sanitizeRouteCell(cell) {
    if (!cell) {
      return null;
    }

    return {
      q: Number(cell.q) || 0,
      r: Number(cell.r) || 0,
    };
  }

  function sanitizeRouteMeta(meta) {
    if (!meta || typeof meta !== "object") {
      return null;
    }

    return {
      destination: meta.destination ? sanitizeRouteCell(meta.destination) : null,
      waypoints: Array.isArray(meta.waypoints) ? meta.waypoints.map(sanitizeRouteCell).filter(Boolean) : [],
      travelMode: String(meta.travelMode || "foot"),
      speedMode: String(meta.speedMode || "normal"),
      distance: Number(meta.distance) || 0,
      cost: Number(meta.cost) || 0,
      days: Number.isFinite(Number(meta.days)) ? Number(meta.days) : null,
      hours: Number.isFinite(Number(meta.hours)) ? Number(meta.hours) : null,
    };
  }

  function cloneToken(token) {
    return JSON.parse(JSON.stringify(token || null));
  }

  function buildPayload() {
    return {
      version: STORAGE_VERSION,
      mapId: state.mapId,
      tokens: state.tokens.map(cloneToken),
    };
  }

  function applyPayload(payload) {
    if (!payload || typeof payload !== "object") {
      throw new Error("Missing travel token payload.");
    }

    if (payload.mapId && payload.mapId !== state.mapId) {
      throw new Error("Travel token mapId mismatch: " + payload.mapId + " !== " + state.mapId);
    }

    state.tokens = Array.isArray(payload.tokens) ? payload.tokens.map(sanitizeToken) : [];

    if (state.selectedTokenId && !getTokenById(state.selectedTokenId)) {
      state.selectedTokenId = "";
    }

    renderTokens();
    renderPanel();
  }

  function saveToLocalStorage() {
    try {
      window.localStorage.setItem(getLocalStorageKey(), JSON.stringify(buildPayload()));
      state.hasLocalOverride = true;
      renderPanel();
    } catch (error) {
      console.warn("Travel token local save failed:", error);
    }
  }

  function loadFromLocalStorage() {
    try {
      var raw = window.localStorage.getItem(getLocalStorageKey());

      if (!raw) {
        state.hasLocalOverride = false;
        return;
      }

      applyPayload(JSON.parse(raw));
      state.hasLocalOverride = true;
      renderRoutes();
    } catch (error) {
      console.warn("Travel token local load failed:", error);
      state.tokens = [];
      state.hasLocalOverride = false;
    }
  }

  function flushLocalOverride(button) {
    var confirmed = window.confirm("Vuoi cancellare i travel token locali?");

    if (!confirmed) {
      return;
    }

    try {
      window.localStorage.removeItem(getLocalStorageKey());
    } catch (error) {
      console.warn("Travel token local flush failed:", error);
    }

    state.tokens = [];
    state.selectedTokenId = "";
    state.hasLocalOverride = false;
    renderTokens();
    renderPanel();
    flashButton(button, button ? button.innerHTML : "", '<i class="fa-solid fa-check" aria-hidden="true"></i>');
  }

  function scheduleAutosave() {
    if (state.autosaveTimer) {
      window.clearTimeout(state.autosaveTimer);
    }

    state.autosaveTimer = window.setTimeout(function () {
      state.autosaveTimer = null;
      saveToLocalStorage();
    }, 250);
  }

  function exportJson(button) {
    var text = JSON.stringify(buildPayload(), null, 2);
    var original = button ? button.innerHTML : "";

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        flashButton(button, original, '<i class="fa-solid fa-check" aria-hidden="true"></i>');
      });
      return;
    }

    console.log(text);
  }

  function importJson(button) {
    var text = window.prompt("Incolla il JSON dei travel token:");

    if (!text) {
      return;
    }

    try {
      applyPayload(JSON.parse(text));
      saveToLocalStorage();
      flashButton(button, button ? button.innerHTML : "", '<i class="fa-solid fa-check" aria-hidden="true"></i>');
    } catch (error) {
      window.alert("JSON non valido o incompatibile.");
      console.error("Travel token import failed:", error);
    }
  }

  function getLocalStorageKey() {
    return "enclave.travelTokens." + state.mapId + ".v1";
  }

  function createId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function roundTo(value, digits) {
    var factor = Math.pow(10, digits || 1);
    return Math.round(Number(value) * factor) / factor;
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

  function isHexColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || ""));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
