(function () {
  "use strict";

  var DEFAULT_MAP_ID = "faerun";
  var WORLD_MAPS = {
    faerun: {
      id: "faerun",
      title: "Faerûn",
      parentId: null,
      width: 10200,
      height: 6600,
      baseMode: "tiles",
      image: "assets/map-placeholder.webp",
      tileUrl: "tiles/faerun/{z}/{x}/{y}.webp",
      tileSize: 512,
      minTileZoom: -4,
      maxTileZoom: 0,
      fallbackMarkers: "data/world-map-markers.json",
      fallbackOverlays: "data/world-map-overlays.json",
      fallbackLabels: "data/world-map-labels.json",
    },

    moonshae: {
      id: "moonshae",
      title: "Moonshae Isles",
      parentId: "faerun",
      width: 864,
      height: 1193,
      baseMode: "image",
      image: "assets/moonshae-full.webp",
      fallbackMarkers: "data/world-map-markers.json",
      fallbackOverlays: "data/world-map-overlays.json",
      fallbackLabels: "data/world-map-labels.json",
    },
  };

  var currentMapId = readCurrentMapId();
  var currentMapConfig = readMapConfig(currentMapId);

  var MAP_WIDTH = currentMapConfig.width;
  var MAP_HEIGHT = currentMapConfig.height;
  var MAP_BASE_MODE = currentMapConfig.baseMode; // "tiles" oppure "image"
  var MAP_IMAGE = currentMapConfig.image;
  var MAP_TILE_URL = currentMapConfig.tileUrl;
  var MAP_TILE_SIZE = currentMapConfig.tileSize;
  var MAP_MIN_TILE_ZOOM = currentMapConfig.minTileZoom;
  var MAP_MAX_TILE_ZOOM = currentMapConfig.maxTileZoom;

  var SUPABASE_URL = "https://atglgaritxzowshenaqr.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Z2xnYXJpdHh6b3dzaGVuYXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzcxNDQsImV4cCI6MjA5MjM1MzE0NH0.ObDvvWMkddZL8wABKyI-TBi4KgVoYArJQjoOnAmVVe8";
  var SAVE_WORLD_MAP_ITEM_ENDPOINT = SUPABASE_URL + "/functions/v1/save-world-map-item";
  var MAP_ADMIN_CODES = ["Enclave", "danilo-a7k2"];
  var WORLD_MAP_MARKERS_TABLE = "world_map_markers";
  var WORLD_MAP_OVERLAYS_TABLE = "world_map_overlays";
  var WORLD_MAP_LABELS_TABLE = "world_map_labels";

  var layerGroups = {};
  var zoomManagedLayers = [];
  var markersIndex = [];
  var mapSearchIndex = [];
  var selectedLayer = null;
  var imageBounds = null;
  var labelLayers = [];
  var activeMoveMode = null;
  var activeVertexEdit = null;
  var overlayDraftClickLockUntil = 0;
  var mapPointerState = {
    downX: 0,
    downY: 0,
    button: null,
    dragged: false,
    suppressDraftPanelUntil: 0,
  };
  var floatingPanelState = {
    width: null,
    height: null,
    isDragging: false,
    isResizing: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
  };

  document.addEventListener("DOMContentLoaded", initWorldMap);

  function readCurrentMapId() {
    var params = new URLSearchParams(window.location.search || "");
    return params.get("map") || DEFAULT_MAP_ID;
  }

  function readMapConfig(mapId) {
    return WORLD_MAPS[mapId] || WORLD_MAPS[DEFAULT_MAP_ID];
  }

  function applyMapConfig(config) {
    currentMapConfig = config || WORLD_MAPS[DEFAULT_MAP_ID];
    currentMapId = currentMapConfig.id;
    MAP_WIDTH = currentMapConfig.width;
    MAP_HEIGHT = currentMapConfig.height;
    MAP_BASE_MODE = currentMapConfig.baseMode;
    MAP_IMAGE = currentMapConfig.image;
    MAP_TILE_URL = currentMapConfig.tileUrl;
    MAP_TILE_SIZE = currentMapConfig.tileSize;
    MAP_MIN_TILE_ZOOM = currentMapConfig.minTileZoom;
    MAP_MAX_TILE_ZOOM = currentMapConfig.maxTileZoom;
  }

  function buildWorldMapEndpoint(tableName) {
    return (
      SUPABASE_URL +
      "/rest/v1/" +
      tableName +
      "?select=*&map_id=eq." +
      encodeURIComponent(currentMapId) +
      "&visibility=eq.public&order=updated_at.desc"
    );
  }

  async function initWorldMap() {
    applyMapConfig(readMapConfig(currentMapId));

    if (!window.L) {
      showMapError("Leaflet non è stato caricato.");
      return;
    }

    var mapElement = document.querySelector("#world-map");

    if (!mapElement) {
      return;
    }

    var bounds = [
      [-MAP_HEIGHT, 0],
      [0, MAP_WIDTH],
    ];
    imageBounds = bounds;

    var map = L.map(mapElement, {
      crs: L.CRS.Simple,
      minZoom: MAP_MIN_TILE_ZOOM,
      maxZoom: 2,
      zoomControl: true,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 90,
      attributionControl: false,
      maxBoundsViscosity: 1.0,
      bounceAtZoomLimits: false,
    });

    window.__worldMapInstance = map;
    exposeWorldMapBridge(map, bounds);
    bindMapClickGuard(map);

    var baseLayer = createMapBaseLayer(bounds);
    baseLayer.addTo(map);
    lockMapToImageBounds(map, bounds);

    map.on("click", function (event) {
      if (activeMoveMode) {
        commitMoveMode(event.latlng);
        return;
      }

      clearSelection();
    });

    map.getContainer().addEventListener("click", function onMapContainerClick(event) {
      if (!activeMoveMode) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      commitMoveMode(map.mouseEventToLatLng(event));
    }, true);

    map.on("mousemove", function (event) {
      if (activeMoveMode) {
        previewMoveMode(event.latlng);
      }
    });

    await Promise.all([loadMarkers(map), loadOverlays(map), loadLabels(map)]);

    bindLayerFilters(map);
    bindLayerFilterActions(map);
    bindMapHeader();
    bindMapViewActions(map, bounds);
    bindMapFullscreenToggle(map);
    bindMapLegend();
    bindLayerDockScroll();
    bindMapSearch(map);
    bindCoordinateReadout(map);
    bindMapDraftTools(map);
    bindMapEditor(map);
    bindMapPermissionState();
    bindZoomVisibility(map);
    bindLabelScaling(map);
    updateZoomVisibility(map);
    updateLabelScaling(map);
    updateLayerDockState(map);
    initTravelSystemBridge();
  }

  function exposeWorldMapBridge(map, bounds) {
    window.EnclaveWorldMap = {
      map: map,
      mapId: currentMapId,
      mapConfig: currentMapConfig,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      bounds: bounds,
      toMapLatLng: toMapLatLng,
      toImagePoint: toImagePoint,
      isPointInsideImage: isPointInsideImage,
      getLayerGroup: getLayerGroup,
      canManageMap: canManageMap,
    };
  }

  function initTravelSystemBridge() {
    if (window.EnclaveTravel && typeof window.EnclaveTravel.init === "function") {
      window.EnclaveTravel.init(window.EnclaveWorldMap);
    }
  }

  function bindMapClickGuard(map) {
    var container = map.getContainer();

    if (!container) {
      return;
    }

    container.addEventListener("pointerdown", function (event) {
      mapPointerState.downX = event.clientX;
      mapPointerState.downY = event.clientY;
      mapPointerState.button = event.button;
      mapPointerState.dragged = false;
    }, true);

    container.addEventListener("pointermove", function (event) {
      var dx = Math.abs(event.clientX - mapPointerState.downX);
      var dy = Math.abs(event.clientY - mapPointerState.downY);

      if (dx > 5 || dy > 5) {
        mapPointerState.dragged = true;
      }
    }, true);

    container.addEventListener("pointerup", function (event) {
      var dx = Math.abs(event.clientX - mapPointerState.downX);
      var dy = Math.abs(event.clientY - mapPointerState.downY);

      mapPointerState.dragged = mapPointerState.dragged || dx > 5 || dy > 5;

      if ((event.button === 2 || mapPointerState.button === 2) && mapPointerState.dragged) {
        mapPointerState.suppressDraftPanelUntil = Date.now() + 900;
      }
    }, true);
  }

  function wasMapDraggedClick() {
    return !!mapPointerState.dragged;
  }

  function shouldSuppressDraftPanelFromRightDrag() {
    if (Date.now() <= mapPointerState.suppressDraftPanelUntil) {
      mapPointerState.suppressDraftPanelUntil = 0;
      return true;
    }

    return false;
  }

  function toMapLatLng(x, y) {
    return L.latLng(-Number(y || 0), Number(x || 0));
  }

  function createMapBaseLayer(bounds) {
    if (MAP_BASE_MODE === "tiles") {
      return createImageTileLayer(bounds);
    }

    var image = L.imageOverlay(MAP_IMAGE, bounds);

    image.on("error", function () {
      showMapError("Immagine mappa non trovata: " + MAP_IMAGE);
    });

    return image;
  }

  function createImageTileLayer(bounds) {
    var layer = L.layerGroup();
    var activeTiles = new Map();
    var pendingRemovalTimer = null;
    var mapRef = null;

    layer.onAdd = function onAdd(map) {
      mapRef = map;
      updateVisibleTiles();
      map.on("moveend zoomend resize", updateVisibleTiles);
    };

    layer.onRemove = function onRemove(map) {
      map.off("moveend zoomend resize", updateVisibleTiles);
      clearActiveTiles();
      mapRef = null;
    };

    function updateVisibleTiles() {
      if (!mapRef) {
        return;
      }

      var nativeZoom = clampTileZoom(Math.round(mapRef.getZoom()));
      var meta = getTileLevelMeta(nativeZoom);
      var scale = Math.pow(2, nativeZoom);
      var visible = mapRef.getBounds();

      var minX = clampNumber(Math.floor(visible.getWest() * scale / MAP_TILE_SIZE) - 1, 0, meta.cols - 1);
      var maxX = clampNumber(Math.floor(visible.getEast() * scale / MAP_TILE_SIZE) + 1, 0, meta.cols - 1);
      var minY = clampNumber(Math.floor((-visible.getNorth()) * scale / MAP_TILE_SIZE) - 1, 0, meta.rows - 1);
      var maxY = clampNumber(Math.floor((-visible.getSouth()) * scale / MAP_TILE_SIZE) + 1, 0, meta.rows - 1);
      var needed = new Set();

      for (var x = minX; x <= maxX; x += 1) {
        for (var y = minY; y <= maxY; y += 1) {
          var key = nativeZoom + ":" + x + ":" + y;
          needed.add(key);

          if (!activeTiles.has(key)) {
            addTile(nativeZoom, x, y, scale);
          }
        }
      }

      scheduleUnusedTileRemoval(needed);
    }

    function scheduleUnusedTileRemoval(needed) {
      if (pendingRemovalTimer) {
        window.clearTimeout(pendingRemovalTimer);
      }

      pendingRemovalTimer = window.setTimeout(function () {
        activeTiles.forEach(function (tileLayer, key) {
          if (!needed.has(key)) {
            layer.removeLayer(tileLayer);
            activeTiles.delete(key);
          }
        });
      }, 180);
    }

    function addTile(zoom, x, y, scale) {
      var left = (x * MAP_TILE_SIZE) / scale;
      var right = ((x + 1) * MAP_TILE_SIZE) / scale;
      var top = (y * MAP_TILE_SIZE) / scale;
      var bottom = ((y + 1) * MAP_TILE_SIZE) / scale;

      var tileBounds = [
        toMapLatLng(left, bottom),
        toMapLatLng(right, top),
      ];

      var url = MAP_TILE_URL
        .replace("{z}", String(zoom))
        .replace("{x}", String(x))
        .replace("{y}", String(y));

      var tileLayer = L.imageOverlay(url, tileBounds, {
        interactive: false,
        opacity: 0,
      });

      tileLayer.once("load", function () {
        tileLayer.setOpacity(1);
      });

      tileLayer.on("error", function () {
        console.warn("Tile mappa non trovato:", url);
      });

      activeTiles.set(zoom + ":" + x + ":" + y, tileLayer);
      layer.addLayer(tileLayer);
    }

    function clearActiveTiles() {
      if (pendingRemovalTimer) {
        window.clearTimeout(pendingRemovalTimer);
        pendingRemovalTimer = null;
      }

      activeTiles.forEach(function (tileLayer) {
        layer.removeLayer(tileLayer);
      });
      activeTiles.clear();
    }

    return layer;
  }

  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clampTileZoom(zoom) {
    if (zoom < MAP_MIN_TILE_ZOOM) {
      return MAP_MIN_TILE_ZOOM;
    }

    if (zoom > MAP_MAX_TILE_ZOOM) {
      return MAP_MAX_TILE_ZOOM;
    }

    return zoom;
  }

  function getTileLevelMeta(zoom) {
    var scale = Math.pow(2, zoom);
    var width = Math.ceil(MAP_WIDTH * scale);
    var height = Math.ceil(MAP_HEIGHT * scale);

    return {
      cols: Math.ceil(width / MAP_TILE_SIZE),
      rows: Math.ceil(height / MAP_TILE_SIZE),
    };
  }

  function lockMapToImageBounds(map, bounds) {
    updateMapMinZoom(map, bounds);
    map.setMaxBounds(bounds);
    resetMapView(map, bounds, false);

    map.on("resize", function () {
      updateMapMinZoom(map, bounds);
      enforceMapBounds(map, bounds);
    });

    map.on("moveend zoomend dragend", function () {
      enforceMapBounds(map, bounds);
    });
  }

  function updateMapMinZoom(map, bounds) {
    var minZoom = getCoverZoom(map, bounds);
    map.setMinZoom(minZoom);
  }

  function enforceMapBounds(map, bounds) {
    var minZoom = getCoverZoom(map, bounds);

    if (map.getZoom() < minZoom) {
      map.setZoom(minZoom, { animate: false });
      return;
    }

    map.panInsideBounds(bounds, { animate: false });
  }

  function resetMapView(map, bounds, animate) {
    var minZoom = getCoverZoom(map, bounds);
    var center = toMapLatLng(MAP_WIDTH / 2, MAP_HEIGHT / 2);

    map.setMinZoom(minZoom);

    if (animate) {
      map.flyTo(center, minZoom, {
        animate: true,
        duration: 0.45,
      });
      return;
    }

    map.setView(center, minZoom);
    map.panInsideBounds(bounds, { animate: false });
  }

  function getCoverZoom(map, bounds) {
    return map.getBoundsZoom(bounds, true) + 0.25;
  }

  function cancelMoveMode() {
    if (!activeMoveMode) {
      return;
    }

    applyMovePreview(activeMoveMode.layer, activeMoveMode.originalData);
    activeMoveMode = null;
    setMoveCursor(false);
  }

  function setMoveCursor(isActive) {
    var stage = document.querySelector(".world-map-stage");

    if (stage) {
      stage.classList.toggle("is-moving-map-element", !!isActive);
    }
  }

  function clearSelection() {
    if (selectedLayer) {
      resetLayerStyle(selectedLayer);
      selectedLayer = null;
    }

    syncSelectedDockLayer(null);
    showEmptyDetail();
  }

  function showEmptyDetail() {
    var panel = document.querySelector("#world-map-detail");

    if (!panel) return;

    panel.innerHTML =
      '<p class="world-map-detail__empty">Seleziona un segnalino o una regione sulla mappa.</p>';
  }

  function normalizeMarker(m) {
    return {
      id: m.id || "",
      map_id: m.map_id || currentMapId,
      type: m.type || "location",
      title: m.title || "Senza titolo",
      x: Number(m.x) || 0,
      y: Number(m.y) || 0,
      status: m.status || null,
      urgency: m.urgency || null,
      visibility: m.visibility || "public",
      description: m.description || "",
      tags: Array.isArray(m.tags) ? m.tags : [],
      lastUpdate: m.lastUpdate || m.last_update || null,
      missionLink: m.missionLink || m.mission_link || null,
      assignedGroup: m.assignedGroup || m.assigned_group || null,
      reward: m.reward || null,
      risk: m.risk || null,
      priority: isTruthyPermission(m.priority),
    };
  }

  async function loadMarkers(map) {
    try {
      var data = await loadMapCollection(
        buildWorldMapEndpoint(WORLD_MAP_MARKERS_TABLE),
        currentMapConfig.fallbackMarkers
      );

      data.forEach(function (raw) {
        var m = normalizeMarker(raw);
        if (m.visibility && m.visibility !== "public") {
          return;
        }

        var marker = L.marker(toMapLatLng(m.x, m.y), {
          icon: createMarkerIcon(m.type, m.priority),
        }).addTo(getLayerGroup(map, getLayerName(m.type)));

        marker._worldMapData = m;
        marker._worldMapKind = "marker";
        marker._worldMapType = m.type;
        marker._worldMapLayerName = getLayerName(m.type);
        marker._worldMapMinZoom = getMarkerMinZoom(m.type, m.priority);
        zoomManagedLayers.push(marker);

        marker.bindTooltip(m.title || "Segnalino", {
          direction: "top",
          opacity: 0.95,
        });

        markersIndex.push({ layer: marker, data: m });
        mapSearchIndex.push({ layer: marker, data: m, kind: "marker" });

        marker.on("click", function (e) {
          L.DomEvent.stopPropagation(e);
          selectLayer(marker);
          showDetail(m);

          map.flyTo(toMapLatLng(m.x, m.y), Math.max(map.getZoom(), 0), {
            animate: true,
            duration: 0.45,
          });
        });

        marker.on("contextmenu", function (e) {
          openElementContextMenu(e, marker);
        });
      });
    } catch (err) {
      console.warn("Errore marker:", err);
    }
  }

  async function loadMapCollection(supabaseEndpoint, fallbackPath) {
    var supabaseData = await loadMapCollectionFromSupabase(supabaseEndpoint);

    if (supabaseData.length) {
      return supabaseData;
    }

    try {
      return await loadMapCollectionFromJson(fallbackPath);
    } catch (error) {
      console.warn("JSON locale mappa non disponibile:", fallbackPath, error);
      return [];
    }
  }

  async function loadMapCollectionFromSupabase(endpoint) {
    try {
      var response = await fetch(endpoint, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: "Bearer " + SUPABASE_ANON_KEY,
        },
      });

      if (!response.ok) {
        throw new Error("Lettura Supabase non riuscita (" + response.status + ").");
      }

      var payload = await response.json();
      return Array.isArray(payload) ? payload : [];
    } catch (error) {
      console.warn("Dati mappa Supabase non disponibili, uso JSON locale:", error);
      return [];
    }
  }

  async function loadMapCollectionFromJson(path) {
    var response = await fetch(path);

    if (!response.ok) {
      throw new Error("JSON locale non trovato: " + path);
    }

    var payload = await response.json();
    return Array.isArray(payload) ? payload : [];
  }

  function normalizeLabel(l) {
    return {
      id: l.id || "",
      map_id: l.map_id || currentMapId,
      type: "label",
      title: l.title || "Senza titolo",
      x: Number(l.x) || 0,
      y: Number(l.y) || 0,
      size: Number(l.size) || 18,
      angle: Number(l.angle) || 0,
      color: l.color || "black",
      visibility: l.visibility || "public",
    };
  }

  async function loadLabels(map) {
    try {
      var data = await loadMapCollection(
        buildWorldMapEndpoint(WORLD_MAP_LABELS_TABLE),
        currentMapConfig.fallbackLabels
      );

      data.forEach(function (raw) {
        var label = normalizeLabel(raw);
        if (label.visibility && label.visibility !== "public") {
          return;
        }

        var layer = createLabelLayer(map, label);
        layer.addTo(getLayerGroup(map, getLayerName(label.type)));
      });
    } catch (err) {
      console.warn("Errore label:", err);
    }
  }

  function createLabelLayer(map, data) {
    var layer = L.marker(toMapLatLng(data.x, data.y), {
      icon: createLabelIcon(data),
      interactive: true,
    });

    layer._worldMapData = data;
    layer._worldMapKind = "label";
    layer._worldMapType = "label";
    layer._worldMapLayerName = getLayerName("label");
    layer._worldMapMinZoom = getLabelMinZoom(data.size);
    zoomManagedLayers.push(layer);
    labelLayers.push(layer);
    mapSearchIndex.push({ layer: layer, data: data, kind: "label" });

    layer.on("click", function (e) {
      L.DomEvent.stopPropagation(e);

      if (data && data.targetMapId && WORLD_MAPS[data.targetMapId]) {
        window.location.search = "?map=" + data.targetMapId;
        return;
      }

      selectLayer(layer);
      showDetail(data);

      var ll = layer.getLatLng && layer.getLatLng();
      if (ll) {
        map.flyTo(ll, Math.max(map.getZoom(), 0), {
          animate: true,
          duration: 0.45,
        });
      }
    });

    layer.on("contextmenu", function (e) {
      openElementContextMenu(e, layer);
    });

    return layer;
  }

  function createLabelIcon(data) {
    var size = clampNumber(Number(data.size) || 18, 10, 48);
    var labelClass = size < 35 ? "world-map-label--secondary" : "world-map-label--primary";
    var colorClass = getLabelColorClass(data.color);

    return L.divIcon({
      className: "",
      html:
        '<span class="world-map-label ' +
        labelClass +
        " " +
        colorClass +
        '" style="font-size:' +
        size +
        'px; --world-map-label-angle:' +
        (Number(data.angle) || 0) +
        'deg">' +
        escapeHtml(data.title || "Etichetta") +
        "</span>",
      iconSize: null,
      iconAnchor: [0, 0],
    });
  }

  function getLabelColorClass(color) {
    var colorMap = {
      black: "world-map-label--black",
      water: "world-map-label--water",
      forest: "world-map-label--forest",
      mountain: "world-map-label--mountain",
      hill: "world-map-label--hill",
    };

    return colorMap[color] || colorMap.black;
  }

  function normalizeOverlay(o) {
    return {
      id: o.id || "",
      map_id: o.map_id || currentMapId,
      type: o.type || "domain",
      title: o.title || "Senza titolo",
      color: o.color || "#7b3ff2",
      opacity: o.opacity != null ? Number(o.opacity) : 0.25,
      status: o.status || null,
      visibility: o.visibility || "public",
      description: o.description || "",
      tags: Array.isArray(o.tags) ? o.tags : [],
      points: Array.isArray(o.points) ? o.points : [],
      svgPath: o.svgPath || o.svg_path || null,
      svgViewBox: o.svgViewBox || o.svg_view_box || "0 0 " + MAP_WIDTH + " " + MAP_HEIGHT,
      svgX: Number(o.svgX ?? o.svg_x ?? 0) || 0,
      svgY: Number(o.svgY ?? o.svg_y ?? 0) || 0,
      svgWidth:
        Number(o.svgWidth ?? o.svg_width ?? getSvgViewBoxSize(o.svgViewBox || o.svg_view_box).width) || MAP_WIDTH,
      svgHeight:
        Number(o.svgHeight ?? o.svg_height ?? getSvgViewBoxSize(o.svgViewBox || o.svg_view_box).height) || MAP_HEIGHT,
      geometryMode: o.geometryMode || o.geometry_mode || (o.svgPath || o.svg_path ? "svg" : "poly"),
      targetMapId: o.targetMapId || o.target_map_id || null,
    };
  }

  async function loadOverlays(map) {
    try {
      var data = await loadMapCollection(
        buildWorldMapEndpoint(WORLD_MAP_OVERLAYS_TABLE),
        currentMapConfig.fallbackOverlays
      );

      data.forEach(function (raw) {
        var o = normalizeOverlay(raw);
        if (o.visibility && o.visibility !== "public") {
          return;
        }

        var layer;
        var style;

        if (o.svgPath) {
          style = getOverlayStyle(o);
          layer = createSvgPathOverlayLayer(map, o, style);
        } else {
          if (!Array.isArray(o.points) || !o.points.length) {
            return;
          }

          var points = o.points.map(function (point) {
            return toMapLatLng(point[0], point[1]);
          });

          if (o.type === "route" || o.type === "border") {
            style = {
              color: o.color || "#7b3ff2",
              weight: 3,
              opacity: 0.9,
              dashArray: o.type === "border" ? "8 6" : null,
            };

            layer = L.polyline(points, style);
          } else {
            style = getOverlayStyle(o);
            layer = L.polygon(points, style);
          }
        }

        layer._worldMapData = o;
        layer._worldMapKind = "overlay";
        layer._worldMapBaseStyle = style;
        layer._worldMapType = o.type;
        layer._worldMapLayerName = getLayerName(o.type);
        layer._worldMapMinZoom = getOverlayMinZoom(o.type, o.targetMapId);
        zoomManagedLayers.push(layer);
        if (!o.svgPath) {
          layer.addTo(getLayerGroup(map, getLayerName(o.type)));
        }

        mapSearchIndex.push({ layer: layer, data: o, kind: "overlay" });

        if (!o.svgPath && layer.bindTooltip) {
          layer.bindTooltip(o.title || "Regione", {
            sticky: true,
            opacity: 0.95,
          });
        }

        layer.on("click", function (e) {
          L.DomEvent.stopPropagation(e);

          if (o.targetMapId && WORLD_MAPS[o.targetMapId]) {
            if (wasMapDraggedClick()) {
              return;
            }

            window.location.search = "?map=" + encodeURIComponent(o.targetMapId);
            return;
          }

          selectLayer(layer);
          showDetail(o);

          map.flyToBounds(layer.getBounds(), {
            padding: [60, 60],
            maxZoom: 0,
            animate: true,
            duration: 0.45,
          });
        });

        layer.on("contextmenu", function (e) {
          openElementContextMenu(e, layer);
        });
      });
    } catch (err) {
      console.warn("Errore overlay:", err);
    }
  }

  function createSvgPathOverlayLayer(map, data, style) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    svg.setAttribute("viewBox", normalizeSvgViewBox(data.svgViewBox));
    svg.setAttribute("preserveAspectRatio", "none");
    svg.classList.add("world-map-svg-overlay");
    svg.style.pointerEvents = "none";

    path.setAttribute("d", data.svgPath || "");
    path.classList.add("world-map-svg-overlay__path");
    applySvgPathStyle(path, style);
    svg.appendChild(path);

    var layer = L.svgOverlay(svg, getSvgOverlayBounds(data), {
      interactive: true,
    }).addTo(getLayerGroup(map, getLayerName(data.type)));

    layer._worldMapSvg = svg;
    layer._worldMapSvgPath = path;

    path.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (data.targetMapId && WORLD_MAPS[data.targetMapId]) {
        if (wasMapDraggedClick()) {
          return;
        }

        window.location.search = "?map=" + encodeURIComponent(data.targetMapId);
        return;
      }

      selectLayer(layer);
      showDetail(data);
    });

    path.addEventListener("contextmenu", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (!canManageMap()) {
        return;
      }

      selectLayer(layer);
      showDetail(data);

      var panel = document.querySelector("[data-world-map-marker-draft]");
      if (panel) {
        showElementContextPanel(panel, layer, {
          x: event.clientX,
          y: event.clientY,
        });
      }
    });

    return layer;
  }

  function getSvgViewBoxSize(value) {
    var parts = parseSvgViewBoxParts(value);

    return {
      width: parts ? parts[2] : MAP_WIDTH,
      height: parts ? parts[3] : MAP_HEIGHT,
    };
  }

  function parseSvgViewBoxParts(value) {
    var raw = String(value || "").trim();
    var parts = raw
      .replace(/,/g, " ")
      .split(/\s+/)
      .map(Number)
      .filter(function (n) {
        return Number.isFinite(n);
      });

    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return parts;
    }

    return null;
  }

  function getSvgOverlayBounds(data) {
    var x = Number(data.svgX) || 0;
    var y = Number(data.svgY) || 0;
    var width = Number(data.svgWidth) || MAP_WIDTH;
    var height = Number(data.svgHeight) || MAP_HEIGHT;

    return [
      toMapLatLng(x, y + height),
      toMapLatLng(x + width, y),
    ];
  }

  function normalizeSvgViewBox(value) {
    var parts = parseSvgViewBoxParts(value);

    if (parts) {
      return parts.join(" ");
    }

    return "0 0 " + MAP_WIDTH + " " + MAP_HEIGHT;
  }

  function applySvgPathStyle(path, style) {
    if (!path) {
      return;
    }

    var isMapLink = !!style.isMapLink;

    path.setAttribute("fill", style.fillColor || style.color || "#7b3ff2");
    path.setAttribute("fill-opacity", String(style.fillOpacity != null ? style.fillOpacity : 0.25));
    path.setAttribute("stroke", style.color || "#7b3ff2");
    path.setAttribute("stroke-opacity", String(style.opacity != null ? style.opacity : 0.9));
    path.setAttribute("stroke-width", String(style.weight || 2));
    path.style.pointerEvents = "visiblePainted";
    path.classList.toggle("world-map-svg-overlay__path--map-link", isMapLink);

    if (style.filter) {
      path.setAttribute("filter", style.filter);
    } else {
      path.removeAttribute("filter");
    }

    if (style.dashArray) {
      path.setAttribute("stroke-dasharray", style.dashArray);
    } else {
      path.removeAttribute("stroke-dasharray");
    }
  }

  function getOverlayStyle(o) {
    var color = o.color || "#7b3ff2";
    var opacity = o.opacity != null ? Number(o.opacity) : 0.25;

    if (!Number.isFinite(opacity)) {
      opacity = 0.25;
    }

    var base = {
      color: color,
      fillColor: color,
      fillOpacity: opacity,
      weight: 2,
      opacity: 0.9,
      isMapLink: !!o.targetMapId,
    };

    if (o.type === "fracture-zone" || o.type === "corruption") {
      base.weight = 3;
      base.dashArray = "6 5";
      base.fillOpacity = o.opacity != null ? opacity : 0.18;
    }

    if (o.type === "war-zone") {
      base.weight = 3;
      base.dashArray = "10 6";
      base.fillOpacity = o.opacity != null ? opacity : 0.16;
    }

    if (o.type === "domain" || o.type === "influence") {
      base.weight = 2;
      base.fillOpacity = o.opacity != null ? opacity : 0.26;
    }

    if (o.targetMapId) {
      base.fillOpacity = opacity;
      base.opacity = Math.min(opacity, 0);
      base.weight = 10;
      base.filter = "blur(20px)";
    }

    return base;
  }

  function selectLayer(layer) {
    if (selectedLayer) {
      resetLayerStyle(selectedLayer);
    }

    selectedLayer = layer;
    applySelectedStyle(layer);
    syncSelectedDockLayer(layer);
  }

  function applySelectedStyle(layer) {
    if (layer._worldMapSvgPath) {
      var svgBase = layer._worldMapBaseStyle || {};
      applySvgPathStyle(layer._worldMapSvgPath, {
        color: svgBase.color,
        fillColor: svgBase.fillColor,
        dashArray: svgBase.dashArray,
        weight: (svgBase.weight || 2) + 2,
        opacity: 1,
        fillOpacity: Math.min((svgBase.fillOpacity || 0.25) + 0.1, 0.6),
      });
    } else if (layer.setStyle) {
      var base = layer._worldMapBaseStyle || {};

      layer.setStyle({
        color: base.color,
        fillColor: base.fillColor,
        dashArray: base.dashArray,
        weight: (base.weight || 2) + 2,
        opacity: 1,
        fillOpacity: Math.min((base.fillOpacity || 0.25) + 0.1, 0.6),
      });

      if (layer.bringToFront) {
        layer.bringToFront();
      }
    } else if (layer._icon) {
      layer._icon.classList.add("is-selected");
    }
  }

  function resetLayerStyle(layer) {
    if (layer._worldMapSvgPath) {
      applySvgPathStyle(layer._worldMapSvgPath, layer._worldMapBaseStyle || {});
    } else if (layer.setStyle) {
      layer.setStyle(
        layer._worldMapBaseStyle || {
          weight: 2,
          opacity: 0.9,
        }
      );
    } else if (layer._icon) {
      layer._icon.classList.remove("is-selected");
    }
  }

  function showDetail(item) {
    var panel = document.querySelector("#world-map-detail");

    if (!panel) {
      return;
    }

    var kind = selectedLayer && selectedLayer._worldMapKind ? selectedLayer._worldMapKind : "elemento";
    var typeLabel = kind === "label" ? "Etichetta" : labelType(item.type);

    panel.innerHTML =
      '<article class="world-map-detail-card">' +
      '<header class="world-map-detail-card__head">' +
      '<p class="world-map-detail__eyebrow">' +
      escapeHtml(typeLabel) +
      "</p>" +
      '<h2 class="world-map-detail__title">' +
      escapeHtml(item.title || "Senza titolo") +
      "</h2>" +
      "</header>" +
      buildDetailMetaMarkup(item, kind) +
      (item.description && kind !== "label"
        ? '<p class="world-map-detail__desc">' + escapeHtml(item.description) + "</p>"
        : "") +
      (item.tags && item.tags.length && kind !== "label"
        ? '<div class="world-map-detail__tags">' +
          item.tags
            .map(function (tag) {
              return "<span>" + escapeHtml(tag) + "</span>";
            })
            .join("") +
          "</div>"
        : "") +
      (item.lastUpdate
        ? '<p class="world-map-detail__small">Aggiornato: ' + escapeHtml(item.lastUpdate) + "</p>"
        : "") +
      (item.missionLink
        ? '<a class="world-map-detail__link" href="' + escapeHtml(item.missionLink) + '">Apri missione</a>'
        : "") +
      buildDetailActionsMarkup() +
      "</article>";
  }

  function buildDetailMetaMarkup(item, kind) {
    var entries = [];

    if (kind === "marker" || kind === "label") {
      entries.push(["X", item.x]);
      entries.push(["Y", item.y]);
    }

    if (kind === "label") {
      entries.push(["Dimensione", item.size]);
      entries.push(["Angolo", item.angle || 0]);
      entries.push(["Colore", labelColorName(item.color)]);
    }

    if (item.status) {
      entries.push(["Stato", labelStatus(item.status)]);
    }

    if (item.urgency) {
      entries.push(["Urgenza", item.urgency]);
    }

    if (item.risk) {
      entries.push(["Rischio", item.risk]);
    }

    if (item.priority) {
      entries.push(["Priorità", "Sì"]);
    }

    if (!entries.length) {
      return "";
    }

    return (
      '<dl class="world-map-detail__meta-list">' +
      entries
        .map(function (entry) {
          return (
            "<div>" +
            "<dt>" +
            escapeHtml(entry[0]) +
            "</dt>" +
            "<dd>" +
            escapeHtml(entry[1]) +
            "</dd>" +
            "</div>"
          );
        })
        .join("") +
      "</dl>"
    );
  }

  function labelColorName(color) {
    var labels = {
      black: "Nero",
      water: "Acque",
      forest: "Boschi",
      mountain: "Montagne",
      hill: "Colline",
    };

    return labels[color] || color || "Nero";
  }

  function buildDetailActionsMarkup() {
    if (!canManageMap()) {
      return "";
    }

    return (
      '<div class="world-map-detail__actions">' +
      '<button type="button" class="world-map-detail__btn" data-world-map-edit-selected aria-label="Modifica" title="Modifica"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i></button>' +
      '<button type="button" class="world-map-detail__btn" data-world-map-move-selected aria-label="Muovi" title="Muovi"><i class="fa-solid fa-arrows-up-down-left-right" aria-hidden="true"></i></button>' +
      (selectedLayer && selectedLayer._worldMapKind === "overlay"
        ? '<button type="button" class="world-map-detail__btn" data-world-map-edit-vertices-selected aria-label="Modifica vertici" title="Modifica vertici"><i class="fa-solid fa-bezier-curve" aria-hidden="true"></i></button>'
        : "") +
      '<button type="button" class="world-map-detail__btn" data-world-map-copy-selected-json aria-label="Copia JSON" title="Copia JSON"><i class="fa-solid fa-copy" aria-hidden="true"></i></button>' +
      '<button type="button" class="world-map-detail__btn world-map-detail__btn--danger" data-world-map-delete-selected aria-label="Elimina" title="Elimina"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>' +
      "</div>"
    );
  }

  function createMarkerIcon(type, priority) {
    var iconMap = {
      enclave: "fa-shield-halved",
      mission: "fa-crosshairs",
      rumor: "fa-comment-dots",
      fracture: "fa-burst",
      treasure: "fa-gem",
      war: "fa-khanda",
      mystery: "fa-eye",
      location: "fa-location-dot",
    };

    var safeType = type || "location";
    var iconClass = iconMap[safeType] || "fa-location-dot";

    return L.divIcon({
      className: "",
      html:
        '<span class="world-map-marker world-map-marker--' +
        escapeHtml(safeType) +
        (priority ? ' world-map-marker--priority' : '') +
        '" data-marker-type="' +
        escapeHtml(safeType) +
        '">' +
        '<i class="fa-solid ' +
        iconClass +
        '"></i>' +
        "</span>",
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  }

  function labelType(type) {
    var labels = {
      enclave: "Enclave",
      mission: "Missione",
      rumor: "Rumor",
      fracture: "Frattura",
      treasure: "Tesoro",
      war: "Guerra",
      mystery: "Mistero",
      location: "Luogo",
      domain: "Dominio",
      "fracture-zone": "Zona di Frattura",
      "war-zone": "Zona di Guerra",
      corruption: "Corruzione",
      influence: "Influenza",
      route: "Rotta",
      border: "Confine",
      "unknown-zone": "Zona Ignota",
      label: "Etichetta",
    };

    return labels[type] || type || "Elemento";
  }

  function labelStatus(status) {
    var labels = {
      open: "Aperta",
      unstable: "Instabile",
      expanding: "In espansione",
      active: "Attiva",
      inactive: "Inattiva",
      resolved: "Risolta",
      hidden: "Nascosta",
    };

    return labels[status] || status;
  }

  function getMarkerMinZoom(type, priority) {
    if (priority) {
      return MAP_MIN_TILE_ZOOM;
    }

    var thresholds = {
      enclave: -2,
      fracture: -2,
      mission: -1,
      war: -1,
      treasure: 0,
      mystery: 0,
      rumor: 0,
      location: 0,
    };

    return thresholds[type] != null ? thresholds[type] : 0;
  }

  function getLabelMinZoom(size) {
    var normalizedSize = Number(size) || 18;

    if (normalizedSize >= 36) {
      return MAP_MIN_TILE_ZOOM;
    }

    if (normalizedSize >= 28) {
      return -2;
    }

    if (normalizedSize >= 16) {
      return -1;
    }

    return 0;
  }

  function getOverlayMinZoom(type, targetMapId) {
    if (targetMapId) {
      return MAP_MIN_TILE_ZOOM;
    }

    var thresholds = {
      domain: -2,
      "fracture-zone": -2,
      corruption: -2,
      war: -1,
      "war-zone": -1,
      influence: -1,
      route: 0,
      border: 0,
      "unknown-zone": 0,
    };

    return thresholds[type] != null ? thresholds[type] : -1;
  }

  function bindZoomVisibility(map) {
    map.on("zoomend", function () {
      updateZoomVisibility(map);
    });
  }

  function updateZoomVisibility(map) {
    var zoom = map.getZoom();
    var inputs = document.querySelectorAll("[data-world-map-layer]");
    var enabledLayers = new Set();

    for (var i = 0; i < inputs.length; i += 1) {
      if (inputs[i].checked) {
        enabledLayers.add(inputs[i].getAttribute("data-world-map-layer"));
      }
    }

    if (!document.querySelector('[data-world-map-layer="label"]')) {
      enabledLayers.add("label");
    }

    for (var j = 0; j < zoomManagedLayers.length; j += 1) {
      var layer = zoomManagedLayers[j];
      var layerName = layer._worldMapLayerName || "location";
      var group = layerGroups[layerName];

      if (!group) {
        continue;
      }

      var shouldShow = enabledLayers.has(layerName) && zoom >= layer._worldMapMinZoom;
      var isShown = group.hasLayer(layer);

      if (shouldShow && !isShown) {
        group.addLayer(layer);
      }

      if (!shouldShow && isShown) {
        if (selectedLayer === layer) {
          clearSelection();
        }

        group.removeLayer(layer);
      }
    }

    updateLayerDockState(map);
    updateLabelScaling(map);
  }

  function bindLabelScaling(map) {
    map.on("zoomend", function () {
      updateLabelScaling(map);
    });
  }

  function updateLabelScaling(map) {
    var zoom = map.getZoom();
    var scale = getLabelScaleForZoom(zoom);

    for (var i = 0; i < labelLayers.length; i += 1) {
      applyLabelScale(labelLayers[i], scale);
    }
  }

  function getLabelScaleForZoom(zoom) {
    var scale = Math.pow(1.28, zoom);
    return clampNumber(scale, 0.48, 1.85);
  }

  function applyLabelScale(layer, scale) {
    if (!layer || !layer._icon) {
      return;
    }

    var label = layer._icon.querySelector(".world-map-label");
    if (!label) {
      return;
    }

    label.style.setProperty("--world-map-label-scale", String(scale));
  }

  async function reloadWorldMapData(map) {
    if (!map) {
      return;
    }

    clearSelection();
    clearWorldMapDataLayers();

    await Promise.all([loadMarkers(map), loadOverlays(map), loadLabels(map)]);

    updateZoomVisibility(map);
    updateLayerDockState(map);
  }

  function clearWorldMapDataLayers() {
    Object.keys(layerGroups).forEach(function (key) {
      if (layerGroups[key] && typeof layerGroups[key].clearLayers === "function") {
        layerGroups[key].clearLayers();
      }
    });

    zoomManagedLayers.length = 0;
    markersIndex.length = 0;
    mapSearchIndex.length = 0;
    labelLayers.length = 0;
  }

  function syncSelectedDockLayer(layer) {
    var controls = document.querySelectorAll(".world-map-layer-toggle");
    var selectedLayerName = layer ? layer._worldMapLayerName : "";

    for (var i = 0; i < controls.length; i += 1) {
      var input = controls[i].querySelector("[data-world-map-layer]");
      var layerName = input ? input.getAttribute("data-world-map-layer") : "";
      controls[i].classList.toggle("is-selected-layer", !!selectedLayerName && layerName === selectedLayerName);
    }
  }

  function updateLayerDockState(map) {
    var zoom = map.getZoom();
    var inputs = document.querySelectorAll("[data-world-map-layer]");

    for (var i = 0; i < inputs.length; i += 1) {
      var input = inputs[i];
      var layerName = input.getAttribute("data-world-map-layer") || "location";
      var control = input.closest(".world-map-layer-toggle") || input.closest("label");
      var minZoom = getLayerMinZoom(layerName);
      var isZoomHidden = input.checked && zoom < minZoom;

      if (!control) {
        continue;
      }

      control.classList.toggle("is-active", input.checked && !isZoomHidden);
      control.classList.toggle("is-disabled", !input.checked);
      control.classList.toggle("is-zoom-hidden", isZoomHidden);
      control.setAttribute("aria-pressed", String(input.checked));

      if (isZoomHidden) {
        control.title = labelType(layerName) + " — visibile zoomando";
      } else {
        control.title = labelType(layerName);
      }
    }
  }

  function getLayerMinZoom(layerName) {
    var minZoom = Infinity;

    for (var i = 0; i < zoomManagedLayers.length; i += 1) {
      var layer = zoomManagedLayers[i];

      if (layer._worldMapLayerName !== layerName) {
        continue;
      }

      minZoom = Math.min(minZoom, layer._worldMapMinZoom);
    }

    return minZoom === Infinity ? -2 : minZoom;
  }

  function getLayerName(type) {
    var map = {
      enclave: "enclave",
      mission: "mission",
      rumor: "rumor",
      fracture: "fracture",
      "fracture-zone": "fracture",
      corruption: "fracture",
      domain: "domain",
      influence: "domain",
      war: "war",
      "war-zone": "war",
      treasure: "treasure",
      mystery: "mystery",
      "unknown-zone": "mystery",
      location: "location",
      label: "label",
      route: "location",
      border: "location",
    };

    return map[type] || "location";
  }

  function getLayerGroup(map, layerName) {
    if (!layerGroups[layerName]) {
      layerGroups[layerName] = L.layerGroup().addTo(map);
    }

    return layerGroups[layerName];
  }

  function bindLayerFilters(map) {
    var inputs = document.querySelectorAll("[data-world-map-layer]");

    for (var i = 0; i < inputs.length; i += 1) {
      inputs[i].addEventListener("change", function onLayerToggle(event) {
        syncLayerVisibility(map, event.currentTarget);
      });
    }
  }

  function bindMapLegend() {
    var toggle = document.querySelector("[data-world-map-legend-toggle]");
    var panel = document.querySelector("[data-world-map-legend]");

    if (!toggle || !panel) {
      return;
    }

    toggle.addEventListener("click", function onLegendToggleClick(event) {
      event.stopPropagation();
      var isOpen = !panel.hidden;
      panel.hidden = isOpen;
      toggle.setAttribute("aria-expanded", String(!isOpen));
    });

    document.addEventListener("click", function onDocumentClick(event) {
      if (panel.hidden) {
        return;
      }

      var stage = document.querySelector(".world-map-stage");

      if (
        panel.contains(event.target) ||
        toggle.contains(event.target) ||
        (stage && stage.contains(event.target))
      ) {
        return;
      }

      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("keydown", function onLegendEscape(event) {
      if (event.key !== "Escape" || panel.hidden) {
        return;
      }

      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  function bindMapHeader() {
    var stage = document.querySelector(".world-map-stage");

    if (!stage || stage.querySelector("[data-world-map-header]")) {
      return;
    }

    var parentConfig = currentMapConfig.parentId ? readMapConfig(currentMapConfig.parentId) : null;
    var header = document.createElement("div");
    header.className = "world-map-current-header";
    header.setAttribute("data-world-map-header", "");

    header.classList.toggle("world-map-current-header--root", !parentConfig);

    header.innerHTML =
      (parentConfig
        ? '<button type="button" class="world-map-current-header__back" data-world-map-parent aria-label="Torna alla mappa precedente" title="Torna alla mappa precedente"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i></button>'
        : "") +
      '<div class="world-map-current-header__copy">' +
      '<strong class="world-map-current-header__title">' +
      escapeHtml(currentMapConfig.title || currentMapId) +
      "</strong>" +
      "</div>";

    stage.appendChild(header);

    var backButton = header.querySelector("[data-world-map-parent]");

    if (backButton && parentConfig) {
      backButton.addEventListener("click", function () {
        window.location.search = "?map=" + encodeURIComponent(parentConfig.id);
      });
    }
  }

  function bindMapFullscreenToggle(map) {
    var toggle = document.querySelector("[data-world-map-fullscreen-toggle]");
    var stage = document.querySelector(".world-map-stage");

    if (!toggle || !stage) {
      return;
    }

    toggle.addEventListener("click", function onFullscreenToggleClick() {
      var isExpanded = !stage.classList.contains("is-expanded");

      stage.classList.toggle("is-expanded", isExpanded);
      document.body.classList.toggle("world-map-expanded", isExpanded);
      toggle.setAttribute("aria-pressed", String(isExpanded));
      toggle.setAttribute("aria-label", isExpanded ? "Riduci mappa" : "Espandi mappa");
      toggle.title = isExpanded ? "Riduci mappa" : "Espandi mappa";
      toggle.innerHTML = isExpanded
        ? '<i class="fa-solid fa-compress" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-expand" aria-hidden="true"></i>';

      window.setTimeout(function () {
        map.invalidateSize();
        enforceMapBounds(map, imageBounds);
      }, 80);
    });

    document.addEventListener("keydown", function onFullscreenEscape(event) {
      if (event.key !== "Escape" || !stage.classList.contains("is-expanded")) {
        return;
      }

      stage.classList.remove("is-expanded");
      document.body.classList.remove("world-map-expanded");
      toggle.setAttribute("aria-pressed", "false");
      toggle.setAttribute("aria-label", "Espandi mappa");
      toggle.title = "Espandi mappa";
      toggle.innerHTML = '<i class="fa-solid fa-expand" aria-hidden="true"></i>';

      window.setTimeout(function () {
        map.invalidateSize();
        enforceMapBounds(map, imageBounds);
      }, 80);
    });
  }

  function bindMapViewActions(map, bounds) {
    var resetButton = document.querySelector("[data-world-map-reset-view]");

    if (!resetButton) {
      return;
    }

    resetButton.addEventListener("click", function onResetViewClick() {
      clearSelection();
      resetMapView(map, bounds, true);
    });
  }

  function bindLayerFilterActions(map) {
    var showAll = document.querySelector("[data-world-map-layers-show-all]");
    var hideAll = document.querySelector("[data-world-map-layers-hide-all]");

    if (showAll) {
      showAll.addEventListener("click", function onShowAllClick() {
        setAllLayerFilters(map, true);
      });
    }

    if (hideAll) {
      hideAll.addEventListener("click", function onHideAllClick() {
        setAllLayerFilters(map, false);
      });
    }
  }

  function setAllLayerFilters(map, isChecked) {
    var inputs = document.querySelectorAll("[data-world-map-layer]");

    for (var i = 0; i < inputs.length; i += 1) {
      inputs[i].checked = isChecked;
      syncLayerVisibility(map, inputs[i]);
    }

    if (!isChecked) {
      clearSelection();
    }

    updateLayerDockState(map);
  }

  function syncLayerVisibility(map, input) {
    var layerName = input.getAttribute("data-world-map-layer");
    var group = layerGroups[layerName];

    if (!input.checked && selectedLayer && selectedLayer._worldMapLayerName === layerName) {
      clearSelection();
    }

    if (group) {
      if (input.checked && !map.hasLayer(group)) {
        group.addTo(map);
      }

      if (!input.checked && map.hasLayer(group)) {
        map.removeLayer(group);
      }
    }

    updateZoomVisibility(map);
    updateLayerDockState(map);
  }

  function showMapError(message) {
    var mapElement = document.querySelector("#world-map");

    if (!mapElement) {
      return;
    }

    mapElement.innerHTML =
      '<div class="world-map-error">' +
      '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>' +
      "<span>" +
      escapeHtml(message) +
      "</span>" +
      "</div>";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function bindMapEditor(map) {
    var detailPanel = document.querySelector("#world-map-detail");
    var floatingPanel = document.querySelector("[data-world-map-marker-draft]");

    if (!detailPanel || !floatingPanel) {
      return;
    }

    detailPanel.addEventListener("click", function onDetailClick(event) {
      var editButton = event.target.closest("[data-world-map-edit-selected]");
      var copyButton = event.target.closest("[data-world-map-copy-selected-json]");
      var saveButton = event.target.closest("[data-world-map-save-selected]");
      var deleteButton = event.target.closest("[data-world-map-delete-selected]");
      var livePreviewTarget = event.target.closest("[data-world-map-live-preview]");
      var moveButton = event.target.closest("[data-world-map-move-selected]");
      var editVerticesButton = event.target.closest("[data-world-map-edit-vertices-selected]");


      if (!selectedLayer || !selectedLayer._worldMapData || !canManageMap()) {
        return;
      }

      if (editButton) {
        openSelectedEditor(floatingPanel, selectedLayer);
        return;
      }

      if (copyButton) {
        copySelectedLayerJson(copyButton, selectedLayer);
        return;
      }

      if (saveButton) {
        saveSelectedLayerToSupabase(saveButton, selectedLayer);
        return;
      }

      if (deleteButton) {
        softDeleteSelectedLayer(deleteButton, selectedLayer);
        return;
      }

      if (moveButton) {
        startMoveMode(selectedLayer);
        return;
      }

      if (editVerticesButton) {
        startVertexEditMode(selectedLayer);
      }
    });

    floatingPanel.addEventListener("submit", function onEditorSubmit(event) {
      var form = event.target.closest("[data-world-map-editor-form]");

      if (!form || !selectedLayer || !canManageMap()) {
        return;
      }

      event.preventDefault();
      applyEditorForm(map, floatingPanel, selectedLayer, form);
    });

    floatingPanel.addEventListener("click", function onEditorPanelClick(event) {
      var typeChoice = event.target.closest("[data-world-map-editor-type-choice]");
      var geometryToggle = event.target.closest("[data-world-map-geometry-toggle]");
      var visibilityToggle = event.target.closest("[data-world-map-visibility-toggle]");
      var tagPill = event.target.closest("[data-world-map-tag-pill]");
      var saveButton = event.target.closest("[data-world-map-save-selected]");
      var deleteButton = event.target.closest("[data-world-map-delete-selected]");

      if (typeChoice) {
        event.preventDefault();
        selectEditorType(typeChoice);
        return;
      }

      if (geometryToggle) {
        event.preventDefault();
        toggleGeometryMode(geometryToggle);
        previewEditorForm(map, floatingPanel, selectedLayer);
        return;
      }

      if (visibilityToggle) {
        event.preventDefault();
        toggleVisibilityMode(visibilityToggle);
        previewEditorForm(map, floatingPanel, selectedLayer);
        return;
      }

      if (tagPill) {
        event.preventDefault();
        removeTagPill(tagPill);
        previewEditorForm(map, floatingPanel, selectedLayer);
        return;
      }

      if (!selectedLayer || !selectedLayer._worldMapData || !canManageMap()) {
        return;
      }

      if (saveButton) {
        event.preventDefault();
        var form = saveButton.closest("[data-world-map-editor-form]");

        if (form) {
          applyEditorForm(map, floatingPanel, selectedLayer, form, {
            keepEditorOpen: true,
          });
        }

        saveSelectedLayerToSupabase(saveButton, selectedLayer);
        return;
      }

      if (deleteButton) {
        event.preventDefault();
        softDeleteSelectedLayer(deleteButton, selectedLayer);
      }
    });

    floatingPanel.addEventListener("keydown", function onEditorPanelKeydown(event) {
      var tagsInput = event.target.closest("[data-world-map-tags-input]");

      if (!tagsInput) {
        return;
      }

      if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        commitTagsInput(tagsInput);
        previewEditorForm(map, floatingPanel, selectedLayer);
      }
    });

    floatingPanel.addEventListener("input", function onEditorPanelInput(event) {
      var tagsInput = event.target.closest("[data-world-map-tags-input]");
      if (tagsInput && tagsInput.value.indexOf(",") !== -1) {
        commitTagsInput(tagsInput);
        previewEditorForm(map, floatingPanel, selectedLayer);
        return;
      }

      if (!event.target.closest("[data-world-map-live-preview]")) {
        return;
      }

      previewEditorForm(map, floatingPanel, selectedLayer);
    });

    floatingPanel.addEventListener("change", function onEditorPanelChange(event) {
      if (!event.target.closest("[data-world-map-live-preview]")) {
        return;
      }

      previewEditorForm(map, floatingPanel, selectedLayer);
    });
  }

  function selectEditorType(button) {
    var wrap = button.closest("[data-world-map-editor-type]");

    if (!wrap) {
      return;
    }

    var input = wrap.querySelector("[data-world-map-editor-type-value]");
    var buttons = wrap.querySelectorAll("[data-world-map-editor-type-choice]");
    var value = button.getAttribute("data-world-map-editor-type-choice") || "location";

    if (input) {
      input.value = value;
    }

    for (var i = 0; i < buttons.length; i += 1) {
      var isActive = buttons[i] === button;
      buttons[i].classList.toggle("is-active", isActive);
      buttons[i].setAttribute("aria-pressed", String(isActive));
    }

    syncConditionalEditorFields(wrap.closest("[data-world-map-editor-form]"), value);
  }

  function syncConditionalEditorFields(form, type) {
    var mount = form ? form.querySelector("[data-world-map-conditional-fields]") : null;

    if (!mount) {
      return;
    }

    var data = selectedLayer && selectedLayer._worldMapData ? selectedLayer._worldMapData : {};
    mount.innerHTML = buildConditionalEditorFields(type, data);
  }

  function toggleGeometryMode(button) {
    var form = button.closest("[data-world-map-editor-form]");
    var wrap = button.closest("[data-world-map-geometry-switch]");
    var input = wrap ? wrap.querySelector("[data-world-map-geometry-value]") : null;

    if (!form || !input) {
      return;
    }

    var nextMode = input.value === "svg" ? "poly" : "svg";
    input.value = nextMode;
    button.setAttribute("aria-pressed", String(nextMode === "svg"));
    syncGeometryPanels(form, nextMode);
  }

  function syncGeometryPanels(form, mode) {
    var panels = form.querySelectorAll("[data-world-map-geometry-panel]");

    for (var i = 0; i < panels.length; i += 1) {
      panels[i].hidden = panels[i].getAttribute("data-world-map-geometry-panel") !== mode;
    }
  }

  function toggleVisibilityMode(button) {
    var wrap = button.closest("[data-world-map-visibility-switch]");
    var input = wrap ? wrap.querySelector("[data-world-map-visibility-value]") : null;

    if (!input) {
      return;
    }

    var isPublic = input.value === "public";
    input.value = isPublic ? "hidden" : "public";
    button.setAttribute("aria-pressed", String(!isPublic));
  }

  function commitTagsInput(input) {
    var editor = input.closest("[data-world-map-tags-editor]");
    var valueInput = editor ? editor.querySelector("[data-world-map-tags-value]") : null;
    var pills = editor ? editor.querySelector("[data-world-map-tags-pills]") : null;

    if (!editor || !valueInput || !pills) {
      return;
    }

    var existing = parseTags(valueInput.value);
    var incoming = parseTags(input.value);
    var merged = existing.slice();

    incoming.forEach(function (tag) {
      if (merged.indexOf(tag) === -1) {
        merged.push(tag);
      }
    });

    valueInput.value = merged.join(", ");
    pills.innerHTML = merged.map(buildTagPillMarkup).join("");
    input.value = "";
  }

  function removeTagPill(button) {
    var editor = button.closest("[data-world-map-tags-editor]");
    var valueInput = editor ? editor.querySelector("[data-world-map-tags-value]") : null;
    var pills = editor ? editor.querySelector("[data-world-map-tags-pills]") : null;
    var tag = button.getAttribute("data-world-map-tag-pill") || "";

    if (!editor || !valueInput || !pills) {
      return;
    }

    var tags = parseTags(valueInput.value).filter(function (item) {
      return item !== tag;
    });

    valueInput.value = tags.join(", ");
    pills.innerHTML = tags.map(buildTagPillMarkup).join("");
  }

  function initFloatingPanelInteractions(panel) {
    if (panel._worldMapFloatingPanelReady) {
      return;
    }

    panel._worldMapFloatingPanelReady = true;

    panel.addEventListener("pointerdown", function onFloatingPanelPointerDown(event) {
      var dragHandle = event.target.closest("[data-world-map-editor-drag-handle]");
      var resizeHandle = event.target.closest("[data-world-map-editor-resize-handle]");

      if (resizeHandle) {
        startFloatingPanelResize(panel, event);
        return;
      }

      if (dragHandle && !event.target.closest("button, input, textarea, select, label")) {
        startFloatingPanelDrag(panel, event);
      }
    });
  }

  function startFloatingPanelDrag(panel, event) {
    var rect = panel.getBoundingClientRect();
    floatingPanelState.isDragging = true;
    floatingPanelState.dragOffsetX = event.clientX - rect.left;
    floatingPanelState.dragOffsetY = event.clientY - rect.top;
    panel.classList.add("is-dragging");
    panel.setPointerCapture(event.pointerId);

    panel.addEventListener("pointermove", onFloatingPanelDragMove);
    panel.addEventListener("pointerup", onFloatingPanelDragEnd, { once: true });
    panel.addEventListener("pointercancel", onFloatingPanelDragEnd, { once: true });

    event.preventDefault();
  }

  function onFloatingPanelDragMove(event) {
    var panel = event.currentTarget;

    if (!floatingPanelState.isDragging) {
      return;
    }

    var rect = panel.getBoundingClientRect();
    var left = clampNumber(event.clientX - floatingPanelState.dragOffsetX, 12, window.innerWidth - rect.width - 12);
    var top = clampNumber(event.clientY - floatingPanelState.dragOffsetY, 12, window.innerHeight - rect.height - 12);

    panel.style.left = left + "px";
    panel.style.top = top + "px";
    panel.dataset.screenX = String(left);
    panel.dataset.screenY = String(top);
  }

  function onFloatingPanelDragEnd(event) {
    var panel = event.currentTarget;
    floatingPanelState.isDragging = false;
    panel.classList.remove("is-dragging");
    panel.removeEventListener("pointermove", onFloatingPanelDragMove);
  }

  function startFloatingPanelResize(panel, event) {
    var rect = panel.getBoundingClientRect();
    floatingPanelState.isResizing = true;
    floatingPanelState.startX = event.clientX;
    floatingPanelState.startY = event.clientY;
    floatingPanelState.width = rect.width;
    floatingPanelState.height = rect.height;
    panel.classList.add("is-resizing");
    panel.setPointerCapture(event.pointerId);

    panel.addEventListener("pointermove", onFloatingPanelResizeMove);
    panel.addEventListener("pointerup", onFloatingPanelResizeEnd, { once: true });
    panel.addEventListener("pointercancel", onFloatingPanelResizeEnd, { once: true });

    event.preventDefault();
  }

  function onFloatingPanelResizeMove(event) {
    var panel = event.currentTarget;

    if (!floatingPanelState.isResizing) {
      return;
    }

    var width = clampNumber(floatingPanelState.width + event.clientX - floatingPanelState.startX, 280, Math.min(720, window.innerWidth - 24));
    var height = clampNumber(floatingPanelState.height + event.clientY - floatingPanelState.startY, 260, Math.min(820, window.innerHeight - 24));

    panel.style.width = width + "px";
    panel.style.height = height + "px";
  }

  function onFloatingPanelResizeEnd(event) {
    var panel = event.currentTarget;
    floatingPanelState.isResizing = false;
    panel.classList.remove("is-resizing");
    panel.removeEventListener("pointermove", onFloatingPanelResizeMove);
  }

  function openSelectedEditor(panel, layer, screenPoint) {
    if (!canManageMap()) {
      return;
    }

    var data = layer._worldMapData || {};
    var kind = layer._worldMapKind || "marker";
    var json = buildLayerJson(data, kind);
    var point = screenPoint || {
      x: window.innerWidth - 380,
      y: 90,
    };

    panel.hidden = false;
    panel.style.position = "fixed";
    panel.style.left = "0px";
    panel.style.top = "0px";
    panel.style.zIndex = "9999";
    panel.dataset.draftJson = json;
    panel.innerHTML = buildEditorMarkup(data, kind);

    positionFloatingPanel(panel, point);
    initFloatingPanelInteractions(panel);
  }

  function buildEditorMarkup(data, kind) {
    var isOverlay = kind === "overlay";
    var isLabel = kind === "label";
    var tags = Array.isArray(data.tags) ? data.tags.join(", ") : "";

    return (
      '<article class="world-map-marker-draft__card world-map-editor-card">' +
      '<div class="world-map-editor-card__drag" data-world-map-editor-drag-handle>' +
      '<p class="world-map-marker-draft__eyebrow">Editor ' +
      escapeHtml(isLabel ? "label" : isOverlay ? "overlay" : "marker") +
      "</p>" +
      '<button type="button" class="world-map-marker-draft__close" data-world-map-draft-close aria-label="Chiudi"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
      "</div>" +
      '<form class="world-map-editor-form" data-world-map-editor-form>' +
      buildEditorField("id", "ID", data.id || "") +
      (isLabel ? "" : buildEditorTypeToggle(isOverlay, data.type || "location")) +
      buildEditorField("title", isLabel ? "Testo" : "Titolo", data.title || "") +
      (isOverlay ? buildGeometryModeSwitch(getOverlayGeometryMode(data)) : "") +
      (isLabel
        ? '<div class="world-map-editor-form__row world-map-editor-form__row--xy">' +
          buildEditorField("x", "X", String(data.x || 0)) +
          buildEditorField("y", "Y", String(data.y || 0)) +
          "</div>" +
          buildEditorField("size", "Dimensione", String(data.size || 18)) +
          buildEditorField("angle", "Angolo", String(data.angle || 0)) +
          buildEditorSelect("color", "Colore", data.color || "black", getLabelColorOptions())
        : isOverlay
        ? buildEditorColorField("color", "Colore", data.color || "#7b3ff2") +
          buildEditorField("opacity", "Opacità", data.opacity != null ? String(data.opacity) : "0.24") +
          buildEditorSelect("targetMapId", "Mappa collegata", data.targetMapId || "", getMapLinkOptions()) +
          '<div data-world-map-geometry-panel="svg"' +
          (getOverlayGeometryMode(data) === "svg" ? "" : " hidden") +
          ">" +
          buildEditorField("svgViewBox", "SVG ViewBox", data.svgViewBox || "0 0 " + MAP_WIDTH + " " + MAP_HEIGHT, "data-world-map-live-preview") +
          '<div class="world-map-editor-form__row world-map-editor-form__row--xy">' +
          buildEditorField("svgX", "SVG X", String(data.svgX || 0), "data-world-map-live-preview") +
          buildEditorField("svgY", "SVG Y", String(data.svgY || 0), "data-world-map-live-preview") +
          "</div>" +
          '<div class="world-map-editor-form__row world-map-editor-form__row--xy">' +
          buildEditorField("svgWidth", "SVG Width", String(data.svgWidth || MAP_WIDTH), "data-world-map-live-preview") +
          buildEditorField("svgHeight", "SVG Height", String(data.svgHeight || MAP_HEIGHT), "data-world-map-live-preview") +
          "</div>" +
          buildEditorTextarea("svgPath", "SVG Path", data.svgPath || "", "data-world-map-live-preview") +
          "</div>" +
          '<div data-world-map-geometry-panel="poly"' +
          (getOverlayGeometryMode(data) === "poly" ? "" : " hidden") +
          ">" +
          buildEditorTextarea("points", "Punti", JSON.stringify(data.points || [], null, 2)) +
          "</div>"
        : '<div class="world-map-editor-form__row world-map-editor-form__row--xy">' +
          buildEditorField("x", "X", String(data.x || 0)) +
          buildEditorField("y", "Y", String(data.y || 0)) +
          "</div>" +
          '<div data-world-map-conditional-fields>' +
          buildConditionalEditorFields(data.type || "location", data) +
          "</div>" +
          buildEditorCheckbox("priority", "Prioritario", !!data.priority)) +
      buildVisibilitySwitch(data.visibility || "public") +
      (isLabel ? "" : buildEditorTextarea("description", "Descrizione", data.description || "")) +
      (isLabel ? "" : buildTagsEditor(tags)) +
      '<div class="world-map-marker-draft__actions world-map-marker-draft__actions--editor">' +
      '<button type="button" class="world-map-context-action world-map-context-action--primary world-map-context-action--icon" data-world-map-save-selected aria-label="Salva" title="Salva" data-tooltip="Salva"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i></button>' +
      '<button type="button" class="world-map-context-action world-map-context-action--icon" data-world-map-copy-draft-json aria-label="Copia JSON" title="Copia JSON" data-tooltip="Copia JSON"><i class="fa-solid fa-copy" aria-hidden="true"></i></button>' +
      '<button type="button" class="world-map-context-action world-map-context-action--danger world-map-context-action--icon" data-world-map-delete-selected aria-label="Elimina" title="Elimina" data-tooltip="Elimina"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>' +
      "</div>" +
      "</form>" +
      '<span class="world-map-editor-card__resize" data-world-map-editor-resize-handle aria-hidden="true"></span>' +
      "</article>"
    );
  }

  function buildEditorTypeToggle(isOverlay, value) {
    var options = getEditorTypeOptions(isOverlay);

    return (
      '<fieldset class="world-map-editor-type" data-world-map-editor-type>' +
      '<legend>Tipo</legend>' +
      '<input type="hidden" name="type" value="' +
      escapeHtml(value) +
      '" data-world-map-editor-type-value />' +
      '<div class="world-map-editor-type__grid">' +
      options
        .map(function (option) {
          var optionValue = option[0];
          var optionLabel = option[1];
          var iconClass = getEditorTypeIcon(optionValue);

          return (
            '<button type="button" class="world-map-editor-type__button' +
            (optionValue === value ? " is-active" : "") +
            '" data-world-map-editor-type-choice="' +
            escapeHtml(optionValue) +
            '" aria-pressed="' +
            String(optionValue === value) +
            '" title="' +
            escapeHtml(optionLabel) +
            '" data-tooltip="' +
            escapeHtml(optionLabel) +
            '">' +
            '<i class="fa-solid ' +
            iconClass +
            '" aria-hidden="true"></i>' +

            "</button>"
          );
        })
        .join("") +
      "</div>" +
      "</fieldset>"
    );
  }

  function getEditorTypeIcon(type) {
    var iconMap = {
      enclave: "fa-shield-halved",
      mission: "fa-crosshairs",
      rumor: "fa-comment-dots",
      fracture: "fa-burst",
      treasure: "fa-gem",
      war: "fa-khanda",
      mystery: "fa-eye",
      location: "fa-location-dot",
      domain: "fa-vector-square",
      "fracture-zone": "fa-burst",
      "war-zone": "fa-khanda",
      corruption: "fa-skull-crossbones",
      influence: "fa-circle-nodes",
      route: "fa-route",
      border: "fa-draw-polygon",
      "unknown-zone": "fa-question",
    };

    return iconMap[type] || "fa-location-dot";
  }

  function buildConditionalEditorFields(type, data) {
    var html = "";

    if (type === "mission" || type === "rumor") {
      html += buildEditorField("urgency", "Urgenza", data.urgency != null ? String(data.urgency) : "");
    }

    if (type === "fracture") {
      html += buildEditorSelect("status", "Stato", data.status || "", getEditorStatusOptions());
    }

    if (type === "location") {
      html += buildEditorField("risk", "Rischio", data.risk || "");
    }

    return html;
  }

  function getEditorTypeOptions(isOverlay) {
    if (isOverlay) {
      return [
        ["domain", "Dominio"],
        ["fracture-zone", "Zona di Frattura"],
        ["war-zone", "Zona di Guerra"],
        ["corruption", "Corruzione"],
        ["influence", "Influenza"],
        ["route", "Rotta"],
        ["border", "Confine"],
        ["unknown-zone", "Zona Ignota"],
      ];
    }

    return [
      ["enclave", "Enclave"],
      ["mission", "Missione"],
      ["rumor", "Rumor"],
      ["fracture", "Frattura"],
      ["treasure", "Tesoro"],
      ["war", "Guerra"],
      ["mystery", "Mistero"],
      ["location", "Luogo"],
    ];
  }

  function getOverlayGeometryMode(data) {
    return data && data.geometryMode === "svg" ? "svg" : "poly";
  }

  function buildGeometryModeSwitch(value) {
    var mode = value === "svg" ? "svg" : "poly";

    return (
      '<fieldset class="world-map-geometry-switch" data-world-map-geometry-switch>' +
      '<legend>Geometria</legend>' +
      '<input type="hidden" name="geometryMode" value="' +
      escapeHtml(mode) +
      '" data-world-map-geometry-value />' +
      '<button type="button" class="world-map-geometry-switch__control" data-world-map-geometry-toggle aria-pressed="' +
      String(mode === "svg") +
      '">' +
      '<span class="world-map-geometry-switch__label">Poly</span>' +
      '<span class="world-map-geometry-switch__track"><span class="world-map-geometry-switch__thumb"></span></span>' +
      '<span class="world-map-geometry-switch__label">SVG</span>' +
      '</button>' +
      "</fieldset>"
    );
  }

  function getMapLinkOptions() {
    var options = [["", "Nessuna"]];

    Object.keys(WORLD_MAPS).forEach(function (id) {
      if (id !== currentMapId) {
        options.push([id, WORLD_MAPS[id].title || id]);
      }
    });

    return options;
  }

  function buildVisibilitySwitch(value) {
    var isPublic = value !== "hidden" && value !== "dm-only";

    return (
      '<fieldset class="world-map-visibility-switch" data-world-map-visibility-switch>' +
      '<legend>Visibilità</legend>' +
      '<input type="hidden" name="visibility" value="' +
      escapeHtml(isPublic ? "public" : "hidden") +
      '" data-world-map-visibility-value />' +
      '<button type="button" class="world-map-visibility-switch__control" data-world-map-visibility-toggle aria-pressed="' +
      String(isPublic) +
      '" title="Visibilità">' +
      '<i class="fa-solid fa-eye" aria-hidden="true"></i>' +
      '<span class="world-map-visibility-switch__track"><span class="world-map-visibility-switch__thumb"></span></span>' +
      '<i class="fa-solid fa-eye-slash" aria-hidden="true"></i>' +
      '</button>' +
      '</fieldset>'
    );
  }

  function buildTagsEditor(value) {
    var tags = parseTags(value);

    return (
      '<label class="world-map-editor-form__field world-map-tags-field">' +
      '<span>Tag</span>' +
      '<div class="world-map-tags-editor" data-world-map-tags-editor>' +
      '<div class="world-map-tags-editor__pills" data-world-map-tags-pills>' +
      tags.map(buildTagPillMarkup).join("") +
      '</div>' +
      '<input type="text" data-world-map-tags-input placeholder="Aggiungi tag..." />' +
      '<input type="hidden" name="tags" value="' + escapeHtml(tags.join(", ")) + '" data-world-map-tags-value />' +
      '</div>' +
      '</label>'
    );
  }

  function buildTagPillMarkup(tag) {
    return (
      '<button type="button" class="world-map-tags-editor__pill" data-world-map-tag-pill="' +
      escapeHtml(tag) +
      '" title="Rimuovi tag">' +
      '<span>' + escapeHtml(tag) + '</span>' +
      '<i class="fa-solid fa-xmark" aria-hidden="true"></i>' +
      '</button>'
    );
  }

  function getEditorStatusOptions() {
    return [
      ["", "Nessuno"],
      ["open", "Aperta"],
      ["active", "Attiva"],
      ["inactive", "Inattiva"],
      ["unstable", "Instabile"],
      ["expanding", "In espansione"],
      ["resolved", "Risolta"],
      ["hidden", "Nascosta"],
    ];
  }

  function getLabelColorOptions() {
    return [
      ["black", "Nero"],
      ["water", "Acque"],
      ["forest", "Boschi"],
      ["mountain", "Montagne"],
      ["hill", "Colline"],
    ];
  }

  function getEditorVisibilityOptions() {
    return [
      ["public", "Pubblica"],
      ["discovered", "Scoperta"],
      ["hidden", "Nascosta"],
      ["dm-only", "Solo DM"],
    ];
  }

  function buildEditorSelect(name, label, value, options) {
    return (
      '<label class="world-map-editor-form__field">' +
      '<span>' +
      escapeHtml(label) +
      "</span>" +
      '<select name="' +
      escapeHtml(name) +
      '">' +
      options
        .map(function (option) {
          var optionValue = option[0];
          var optionLabel = option[1];

          return (
            '<option value="' +
            escapeHtml(optionValue) +
            '"' +
            (optionValue === value ? " selected" : "") +
            ">" +
            escapeHtml(optionLabel) +
            "</option>"
          );
        })
        .join("") +
      "</select>" +
      "</label>"
    );
  }

  function buildEditorColorField(name, label, value) {
    return (
      '<label class="world-map-editor-form__field world-map-editor-form__field--color">' +
      '<span>' +
      escapeHtml(label) +
      "</span>" +
      '<input type="color" name="' +
      escapeHtml(name) +
      '" value="' +
      escapeHtml(value) +
      '" />' +
      "</label>"
    );
  }

  function buildEditorCheckbox(name, label, checked) {
    return (
      '<label class="world-map-editor-form__checkbox">' +
      '<input type="checkbox" name="' +
      escapeHtml(name) +
      '"' +
      (checked ? " checked" : "") +
      ' />' +
      '<span>' +
      escapeHtml(label) +
      "</span>" +
      "</label>"
    );
  }

  function buildEditorField(name, label, value, attrs) {
    return (
      '<label class="world-map-editor-form__field">' +
      '<span>' +
      escapeHtml(label) +
      "</span>" +
      '<input name="' +
      escapeHtml(name) +
      '" value="' +
      escapeHtml(value) +
      '" ' +
      (attrs || "") +
      " />" +
      "</label>"
    );
  }

  function buildEditorTextarea(name, label, value, attrs) {
    return (
      '<label class="world-map-editor-form__field">' +
      '<span>' +
      escapeHtml(label) +
      "</span>" +
      '<textarea name="' +
      escapeHtml(name) +
      '" rows="4" ' +
      (attrs || "") +
      ">" +
      escapeHtml(value) +
      "</textarea>" +
      "</label>"
    );
  }

  function previewEditorForm(map, panel, layer) {
    var form = panel ? panel.querySelector("[data-world-map-editor-form]") : null;

    if (!form || !layer || !layer._worldMapData || !canManageMap()) {
      return;
    }

    applyEditorForm(map, panel, layer, form, {
      keepEditorOpen: true,
      silent: true,
    });
  }

  function applyEditorForm(map, panel, layer, form, options) {
    options = options || {};
    var data = layer._worldMapData || {};
    var kind = layer._worldMapKind || "marker";
    var formData = new FormData(form);

    data.id = readFormString(formData, "id", data.id || "");
    data.map_id = data.map_id || currentMapId;
    data.type = readFormString(formData, "type", data.type || "location");
    data.title = readFormString(formData, "title", data.title || "Senza titolo");
    data.visibility = readFormString(formData, "visibility", data.visibility || "public");

    if (kind !== "label") {
      data.status = readNullableFormString(formData, "status");
      data.risk = readNullableFormString(formData, "risk");
      data.priority = formData.get("priority") === "on";
      data.description = readFormString(formData, "description", "");
      data.tags = parseTags(readFormString(formData, "tags", ""));
    }

    if (kind === "label") {
      data.x = Number(readFormString(formData, "x", String(data.x || 0))) || 0;
      data.y = Number(readFormString(formData, "y", String(data.y || 0))) || 0;
      data.size = Number(readFormString(formData, "size", String(data.size || 18))) || 18;
      data.angle = Number(readFormString(formData, "angle", String(data.angle || 0))) || 0;
      data.color = readFormString(formData, "color", data.color || "black");
      updateLabelLayer(layer, data);
      layer._worldMapMinZoom = getLabelMinZoom(data.size);
    } else if (kind === "overlay") {
      data.color = readFormString(formData, "color", data.color || "#7b3ff2");
      data.opacity = readFormNumber(formData, "opacity", data.opacity != null ? data.opacity : 0.24);
      data.geometryMode = readFormString(formData, "geometryMode", getOverlayGeometryMode(data));
      data.targetMapId = readNullableFormString(formData, "targetMapId");

      if (data.geometryMode === "svg") {
        data.svgViewBox = readFormString(formData, "svgViewBox", "0 0 " + MAP_WIDTH + " " + MAP_HEIGHT);
        data.svgX = Number(readFormString(formData, "svgX", String(data.svgX || 0))) || 0;
        data.svgY = Number(readFormString(formData, "svgY", String(data.svgY || 0))) || 0;
        data.svgWidth = Number(readFormString(formData, "svgWidth", String(data.svgWidth || MAP_WIDTH))) || MAP_WIDTH;
        data.svgHeight = Number(readFormString(formData, "svgHeight", String(data.svgHeight || MAP_HEIGHT))) || MAP_HEIGHT;
        data.svgPath = readNullableFormString(formData, "svgPath");
        data.points = [];
      } else {
        data.svgPath = null;
        data.svgViewBox = null;
        data.svgX = null;
        data.svgY = null;
        data.svgWidth = null;
        data.svgHeight = null;
        data.points = parsePoints(readFormString(formData, "points", "[]"));
      }
      layer = ensureOverlayLayerGeometry(map, layer, data);
      updateOverlayLayer(layer, data);
    } else {
      data.x = Number(readFormString(formData, "x", String(data.x || 0))) || 0;
      data.y = Number(readFormString(formData, "y", String(data.y || 0))) || 0;
      data.urgency = readNullableNumber(formData, "urgency");
      updateMarkerLayer(layer, data);
      layer._worldMapMinZoom = getMarkerMinZoom(data.type, data.priority);
    }

    layer._worldMapData = data;
    layer._worldMapType = data.type;
    layer._worldMapLayerName = getLayerName(data.type);
    if (!options.silent) {
      showDetail(data);
    }

    panel.dataset.draftJson = buildLayerJson(data, kind);

    if (!options.keepEditorOpen) {
      openSelectedEditor(panel, layer);
    }
  }

  function updateLabelLayer(layer, data) {
    layer.setLatLng(toMapLatLng(data.x, data.y));
    layer.setIcon(createLabelIcon(data));
    layer._worldMapMinZoom = getLabelMinZoom(data.size);

    if (window.__worldMapInstance) {
      applyLabelScale(layer, getLabelScaleForZoom(window.__worldMapInstance.getZoom()));
    }

  }

  function updateMarkerLayer(layer, data) {
    layer.setLatLng(toMapLatLng(data.x, data.y));
    layer.setIcon(createMarkerIcon(data.type, data.priority));
    layer.bindTooltip(data.title || "Segnalino", {
      direction: "top",
      opacity: 0.95,
    });
  }

  function ensureOverlayLayerGeometry(map, layer, data) {
    if (!layer || layer._worldMapKind !== "overlay") {
      return layer;
    }

    var wantsSvg = data.geometryMode === "svg" && !!data.svgPath;
    var isSvg = !!layer._worldMapSvgPath;

    if (wantsSvg === isSvg) {
      return layer;
    }

    var groupName = getLayerName(data.type);
    var group = getLayerGroup(map, groupName);
    var oldLayer = layer;
    var style = getOverlayStyle(data);
    var nextLayer;

    if (wantsSvg) {
      nextLayer = createSvgPathOverlayLayer(map, data, style);
    } else {
      var points = (data.points || []).map(function (point) {
        return toMapLatLng(point[0], point[1]);
      });
      nextLayer = L.polygon(points, style).addTo(group);
    }

    nextLayer._worldMapData = data;
    nextLayer._worldMapKind = "overlay";
    nextLayer._worldMapBaseStyle = style;
    nextLayer._worldMapType = data.type;
    nextLayer._worldMapLayerName = groupName;
    nextLayer._worldMapMinZoom = getOverlayMinZoom(data.type, data.targetMapId);
    nextLayer._worldMapIsDraft = oldLayer._worldMapIsDraft;

    if (!wantsSvg) {
      nextLayer.bindTooltip(data.title || "Regione", {
        sticky: true,
        opacity: 0.95,
      });

      nextLayer.on("click", function (e) {
        L.DomEvent.stopPropagation(e);

        if (data.targetMapId && WORLD_MAPS[data.targetMapId]) {
          window.location.search = "?map=" + encodeURIComponent(data.targetMapId);
          return;
        }

        selectLayer(nextLayer);
        showDetail(data);

        map.flyToBounds(nextLayer.getBounds(), {
          padding: [60, 60],
          maxZoom: 0,
          animate: true,
          duration: 0.45,
        });
      });

      nextLayer.on("contextmenu", function (e) {
        openElementContextMenu(e, nextLayer);
      });
    }

    removeWorldMapLayer(oldLayer);
    zoomManagedLayers.push(nextLayer);
    mapSearchIndex.push({ layer: nextLayer, data: data, kind: "overlay" });
    selectedLayer = nextLayer;

    return nextLayer;
  }

  function updateOverlayLayer(layer, data) {
    var style = getOverlayStyle(data);

    layer._worldMapBaseStyle = style;

    if (layer._worldMapSvgPath) {
      if (layer._worldMapSvg && data.svgViewBox) {
        layer._worldMapSvg.setAttribute("viewBox", normalizeSvgViewBox(data.svgViewBox));
      }

      if (layer.setBounds) {
        layer.setBounds(getSvgOverlayBounds(data));
      }

      if (data.svgPath) {
        layer._worldMapSvgPath.setAttribute("d", data.svgPath);
      }
      applySvgPathStyle(layer._worldMapSvgPath, style);
      return;
    }

    var points = (data.points || []).map(function (point) {
      return toMapLatLng(point[0], point[1]);
    });

    layer.setLatLngs(points);
    layer.setStyle(style);
    layer.bindTooltip(data.title || "Regione", {
      sticky: true,
      opacity: 0.95,
    });
  }

  function buildLayerJson(data, kind) {
    var payload = Object.assign({}, data);

    if (kind === "marker") {
      delete payload.color;
      delete payload.opacity;
      delete payload.points;
      delete payload.svgPath;
      delete payload.svgViewBox;
      delete payload.svgX;
      delete payload.svgY;
      delete payload.svgWidth;
      delete payload.svgHeight;
      delete payload.geometryMode;
      delete payload.targetMapId;
      delete payload.size;
    }

    if (kind === "label") {
      delete payload.color;
      delete payload.opacity;
      delete payload.points;
      delete payload.svgPath;
      delete payload.svgViewBox;
      delete payload.svgX;
      delete payload.svgY;
      delete payload.svgWidth;
      delete payload.svgHeight;
      delete payload.geometryMode;
      delete payload.targetMapId;
      delete payload.status;
      delete payload.urgency;
      delete payload.description;
      delete payload.tags;
      delete payload.risk;
      delete payload.priority;
    }

    return JSON.stringify(payload, null, 2);
  }

  async function softDeleteSelectedLayer(button, layer) {
    var originalLabel = button.getAttribute("aria-label") || button.title || "Elimina";

    if (!canManageMap()) {
      setActionButtonFeedback(button, "Permesso negato", 1300, originalLabel);
      return;
    }

    if (!layer || !layer._worldMapData) {
      return;
    }

    var confirmed = window.confirm("Nascondere questo elemento dalla mappa pubblica?");

    if (!confirmed) {
      return;
    }

    layer._worldMapData.visibility = "hidden";
    await saveSelectedLayerToSupabase(button, layer, {
      successLabel: "Eliminato",
      closeEditorAfterSave: true,
      removeLayerAfterSave: true,
    });
  }

  async function saveSelectedLayerToSupabase(button, layer, options) {
    options = options || {};
    var originalLabel = button.getAttribute("aria-label") || button.title || "Salva";

    if (!canManageMap()) {
      setActionButtonFeedback(button, "Permesso negato", 1300, originalLabel);
      return;
    }

    if (!layer || !layer._worldMapData) {
      return;
    }

    var profile = readWorldMapProfileState();
    var playerCode = profile.code || "";

    if (!playerCode) {
      setActionButtonFeedback(button, "Codice mancante", 1300, originalLabel);
      return;
    }

    setActionButtonLoading(button, true, "Salvataggio...");

    try {
      var payload = await postWorldMapItem(playerCode, layer._worldMapKind || "marker", layer._worldMapData);

      if (!payload || payload.success !== true) {
        throw new Error(readString(payload && payload.error, "Salvataggio non riuscito."));
      }

      layer._worldMapIsDraft = false;

      if (options.removeLayerAfterSave) {
        removeWorldMapLayer(layer);
      }

      if (options.reloadAfterSave) {
        await reloadWorldMapData(window.__worldMapInstance);
      }

      if (options.closeEditorAfterSave) {
        hideDraftPanelBySelector();
      }

      setActionButtonLoading(button, false, originalLabel);
      setActionButtonFeedback(button, options.successLabel || "Salvato", 900, originalLabel);
    } catch (error) {
      console.warn("Errore salvataggio mappa:", error);
      setActionButtonLoading(button, false, originalLabel);
      setActionButtonFeedback(button, "Errore", 1400, originalLabel);
    }
  }

  function removeWorldMapLayer(layer) {
    if (!layer) {
      return;
    }

    var map = window.__worldMapInstance;
    var group = layerGroups[layer._worldMapLayerName || "location"];

    if (group && group.hasLayer && group.hasLayer(layer)) {
      group.removeLayer(layer);
    }

    if (map && map.hasLayer && map.hasLayer(layer)) {
      map.removeLayer(layer);
    }

    removeLayerFromArray(zoomManagedLayers, layer);
    removeLayerFromArray(labelLayers, layer);
    removeLayerEntries(markersIndex, layer);
    removeLayerEntries(mapSearchIndex, layer);

    if (selectedLayer === layer) {
      selectedLayer = null;
      showEmptyDetail();
      syncSelectedDockLayer(null);
    }
  }

  function removeLayerFromArray(array, layer) {
    for (var i = array.length - 1; i >= 0; i -= 1) {
      if (array[i] === layer) {
        array.splice(i, 1);
      }
    }
  }

  function removeLayerEntries(array, layer) {
    for (var i = array.length - 1; i >= 0; i -= 1) {
      if (array[i] && array[i].layer === layer) {
        array.splice(i, 1);
      }
    }
  }

  function setActionButtonLoading(button, isLoading, label) {
    if (!button) {
      return;
    }

    button.disabled = !!isLoading;
    button.classList.toggle("is-loading", !!isLoading);

    if (label) {
      button.setAttribute("aria-label", label);
      button.title = label;
    }
  }

  function setActionButtonFeedback(button, label, duration, restoreLabel) {
    if (!button) {
      return;
    }

    button.setAttribute("aria-label", label);
    button.title = label;

    window.setTimeout(function () {
      button.setAttribute("aria-label", restoreLabel);
      button.title = restoreLabel;
    }, duration || 1000);
  }

  async function postWorldMapItem(playerCode, kind, item) {
    var response = await fetch(SAVE_WORLD_MAP_ITEM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        player_code: playerCode,
        kind: kind,
        item: normalizePayloadForSave(kind, item),
      }),
    });

    var payload = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(readString(payload && payload.error, "Richiesta non riuscita."));
    }

    return payload;
  }

  function normalizePayloadForSave(kind, item) {
    var payload = Object.assign({}, item, {
      map_id: item.map_id || currentMapId,
    });

    if (kind === "overlay") {
      payload.svg_path = item.svgPath || item.svg_path || null;
      payload.svg_view_box = item.svgViewBox || item.svg_view_box || null;
      payload.svg_x = item.svgX ?? item.svg_x ?? null;
      payload.svg_y = item.svgY ?? item.svg_y ?? null;
      payload.svg_width = item.svgWidth ?? item.svg_width ?? null;
      payload.svg_height = item.svgHeight ?? item.svg_height ?? null;
      payload.geometry_mode = item.geometryMode || item.geometry_mode || "poly";
      payload.target_map_id = item.targetMapId || item.target_map_id || null;
    }

    return payload;
  }

  function readWorldMapProfileState() {
    if (window.EnclaveLayout && typeof window.EnclaveLayout.getProfileState === "function") {
      return window.EnclaveLayout.getProfileState() || {};
    }

    return {};
  }

  function canManageMap() {
    var profile = readWorldMapProfileState();
    var code = readString(profile.code, "");
    var player = profile.player || {};
    var role = readString(player.role, "").toLowerCase();

    return (
      MAP_ADMIN_CODES.indexOf(code) !== -1 ||
      role === "admin" ||
      isTruthyPermission(player.can_manage_map) ||
      isTruthyPermission(player.can_manage_admin) ||
      isTruthyPermission(player.can_manage) ||
      isTruthyPermission(player.is_admin)
    );
  }

  function isTruthyPermission(value) {
    if (value === true || value === 1) {
      return true;
    }

    if (typeof value === "string") {
      var normalized = value.trim().toLowerCase();
      return normalized === "true" || normalized === "1" || normalized === "yes";
    }

    return false;
  }

  function bindMapPermissionState() {
    syncMapPermissionState();

    document.addEventListener("enclave:player-resolved", function () {
      syncMapPermissionState();
      if (selectedLayer && selectedLayer._worldMapData) {
        showDetail(selectedLayer._worldMapData);
      }
    });

    document.addEventListener("enclave:player-cleared", function () {
      hideDraftPanelBySelector();
      syncMapPermissionState();
      if (selectedLayer && selectedLayer._worldMapData) {
        showDetail(selectedLayer._worldMapData);
      }
    });
  }

  function syncMapPermissionState() {
    document.documentElement.classList.toggle("can-manage-map", canManageMap());
    document.documentElement.classList.toggle("cannot-manage-map", !canManageMap());
  }

  function hideDraftPanelBySelector() {
    var panel = document.querySelector("[data-world-map-marker-draft]");
    if (panel) {
      hideDraftPanel(panel);
    }
  }

  async function parseJsonResponse(response) {
    var text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (_error) {
      return null;
    }
  }

  function readString(value, fallback) {
    return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
  }

  async function copySelectedLayerJson(button, layer) {
    try {
      await navigator.clipboard.writeText(buildLayerJson(layer._worldMapData || {}, layer._worldMapKind || "marker"));
      button.textContent = "Copiato";
      window.setTimeout(function () {
        button.textContent = "Copia JSON";
      }, 1000);
    } catch (_error) {
      button.textContent = "Copia fallita";
    }
  }

  function readFormString(formData, key, fallback) {
    var value = formData.get(key);
    return typeof value === "string" ? value.trim() : fallback;
  }

  function readNullableFormString(formData, key) {
    var value = readFormString(formData, key, "");
    return value || null;
  }

  function readNullableNumber(formData, key) {
    var value = readFormString(formData, key, "");
    return value ? Number(value) || null : null;
  }

  function readFormNumber(formData, key, fallback) {
    var value = readFormString(formData, key, "");

    if (value === "") {
      return Number(fallback);
    }

    var number = Number(value);
    return Number.isFinite(number) ? number : Number(fallback);
  }

  function parseTags(value) {
    return String(value || "")
      .split(",")
      .map(function (tag) {
        return tag.trim();
      })
      .filter(Boolean);
  }

  function parsePoints(value) {
    try {
      var parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function bindMapDraftTools(map) {
    var panel = document.querySelector("[data-world-map-marker-draft]");
    var overlayDraft = {
      active: false,
      points: [],
      layer: null,
    };

    if (!panel) {
      return;
    }

    document.addEventListener(
      "contextmenu",
      function onDocumentMapContextMenu(event) {
        var container = map.getContainer();

        if (!container || !container.contains(event.target)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (shouldSuppressDraftPanelFromRightDrag()) {
          hideDraftPanel(panel);
          return;
        }

        if (isWorldMapElementEventTarget(event.target)) {
          var handledLayer = findLayerFromDomTarget(event.target);

          if (handledLayer) {
            openElementContextMenu(event, handledLayer);
          }

          return;
        }

        var containerPoint = map.mouseEventToContainerPoint(event);
        var latlng = map.containerPointToLatLng(containerPoint);
        var coords = toImagePoint(latlng);

        if (!isPointInsideImage(coords)) {
          hideDraftPanel(panel);
          return;
        }

        if (overlayDraft.active) {
          finishOverlayDraft(panel, overlayDraft, {
            x: event.clientX,
            y: event.clientY,
          });
          return;
        }

        showDraftChoicePanel(panel, coords, {
          x: event.clientX,
          y: event.clientY,
        });
      },
      true
    );

    map.on("click", function onMapDraftClick(event) {
      if (!canManageMap()) {
        return;
      }

      if (!overlayDraft.active) {
        return;
      }

      if (Date.now() < overlayDraftClickLockUntil) {
        return;
      }

      L.DomEvent.stopPropagation(event);
      var coords = toImagePoint(event.latlng);

      if (!isPointInsideImage(coords)) {
        return;
      }

      addOverlayDraftPoint(map, panel, overlayDraft, coords);
    });

    map.on("dblclick", function onMapDraftDoubleClick(event) {
      if (!canManageMap()) {
        return;
      }

      if (!overlayDraft.active) {
        return;
      }

      L.DomEvent.stopPropagation(event);
      L.DomEvent.preventDefault(event);
      overlayDraftClickLockUntil = Date.now() + 350;
      removeLastOverlayDraftPoint(map, panel, overlayDraft);
      finishOverlayDraft(panel, overlayDraft, {
        x: event.originalEvent.clientX,
        y: event.originalEvent.clientY,
      });
    });

    document.addEventListener("pointerdown", function onDocumentPointerDown(event) {
      if (panel.hidden) {
        return;
      }

      if (panel.contains(event.target)) {
        return;
      }

      if (overlayDraft.active) {
        return;
      }

      if (isEditorPanelOpen(panel)) {
        return;
      }

      hideDraftPanel(panel);
    });

    panel.addEventListener("click", function onPanelClick(event) {
      var contextEditButton = event.target.closest("[data-world-map-context-edit]");
      var contextMoveButton = event.target.closest("[data-world-map-context-move]");
      var contextDeleteButton = event.target.closest("[data-world-map-context-delete]");
      var contextVerticesButton = event.target.closest("[data-world-map-context-vertices]");
      var markerButton = event.target.closest("[data-world-map-draft-marker]");
      var overlayButton = event.target.closest("[data-world-map-draft-overlay]");
      var labelButton = event.target.closest("[data-world-map-draft-label]");
      var copyButton = event.target.closest("[data-world-map-copy-draft-json]");
      var copyCoordsButton = event.target.closest("[data-world-map-copy-coordinates]");
      var closeButton = event.target.closest("[data-world-map-draft-close]");
      var travelEditorButton = event.target.closest("[data-world-map-open-travel-editor]");
      var travelCalculatorButton = event.target.closest("[data-world-map-open-travel-calculator]");

      if (closeButton) {
        cancelOverlayDraft(map, overlayDraft);
        hideDraftPanel(panel);
        return;
      }

      if (travelEditorButton) {
        openTravelEditorPanel();
        hideDraftPanel(panel);
        return;
      }

      if (travelCalculatorButton) {
        openTravelCalculatorPanel();
        hideDraftPanel(panel);
        return;
      }

      if (contextEditButton && panel._worldMapContextLayer) {
        openSelectedEditor(panel, panel._worldMapContextLayer, readDraftScreenPoint(panel));
        return;
      }

      if (contextMoveButton && panel._worldMapContextLayer) {
        startMoveMode(panel._worldMapContextLayer);
        hideDraftPanel(panel);
        return;
      }

      if (contextDeleteButton && panel._worldMapContextLayer) {
        softDeleteSelectedLayer(contextDeleteButton, panel._worldMapContextLayer);
        return;
      }

      if (contextVerticesButton && panel._worldMapContextLayer) {
        startVertexEditMode(panel._worldMapContextLayer);
        hideDraftPanel(panel);
        return;
      }

      if (copyCoordsButton) {
        copyDraftCoordinates(panel, copyCoordsButton);
        return;
      }

      if (markerButton) {
        if (!canManageMap()) {
          return;
        }

        showMarkerDraftPanel(panel, readDraftCoords(panel), readDraftScreenPoint(panel));
        return;
      }

      if (overlayButton) {
        if (!canManageMap()) {
          return;
        }

        startOverlayDraft(map, panel, overlayDraft, readDraftCoords(panel), readDraftScreenPoint(panel));
        return;
      }

      if (labelButton) {
        if (!canManageMap()) {
          return;
        }

        showLabelDraftPanel(panel, readDraftCoords(panel), readDraftScreenPoint(panel));
        return;
      }

      if (copyButton) {
        copyDraftJson(panel, copyButton);
      }
    });

    document.addEventListener("keydown", function onDraftEscape(event) {
      if (event.key !== "Escape") {
        return;
      }

      cancelMoveMode();
      stopVertexEditMode();
      cancelOverlayDraft(map, overlayDraft);
      hideDraftPanel(panel);
    });
  }

  function isWorldMapElementEventTarget(target) {
    if (!target || typeof target.closest !== "function") {
      return false;
    }

    return !!target.closest(".leaflet-marker-icon, .leaflet-interactive, .world-map-svg-overlay__path");
  }

  function findLayerFromDomTarget(target) {
    if (!target || typeof target.closest !== "function") {
      return null;
    }

    for (var i = 0; i < zoomManagedLayers.length; i += 1) {
      var layer = zoomManagedLayers[i];

      if (!layer) {
        continue;
      }

      if (layer._icon && layer._icon.contains(target)) {
        return layer;
      }

      if (layer._path && layer._path.contains(target)) {
        return layer;
      }

      if (layer._worldMapSvgPath && layer._worldMapSvgPath.contains(target)) {
        return layer;
      }
    }

    return null;
  }

  function openElementContextMenu(event, layer) {
    if (!canManageMap() || !layer || !layer._worldMapData) {
      return;
    }

    if (event) {
      if (event.originalEvent) {
        L.DomEvent.stopPropagation(event);
        L.DomEvent.preventDefault(event);
      } else {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    selectLayer(layer);
    showDetail(layer._worldMapData);

    var panel = document.querySelector("[data-world-map-marker-draft]");
    var point = readEventScreenPoint(event);

    if (!panel) {
      return;
    }

    showElementContextPanel(panel, layer, point);
  }

  function readEventScreenPoint(event) {
    if (!event) {
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }

    if (event.originalEvent) {
      return {
        x: event.originalEvent.clientX,
        y: event.originalEvent.clientY,
      };
    }

    if (typeof event.clientX === "number" && typeof event.clientY === "number") {
      return {
        x: event.clientX,
        y: event.clientY,
      };
    }

    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  function startMoveMode(layer) {
    if (!layer || !layer._worldMapData || !canManageMap()) {
      return;
    }

    activeMoveMode = {
      layer: layer,
      originalData: cloneMapItemData(layer._worldMapData),
    };

    setMoveCursor(true);
    hideDraftPanelBySelector();
    selectLayer(layer);
    showDetail(layer._worldMapData);
  }

  function previewMoveMode(latlng) {
    if (!activeMoveMode) {
      return;
    }

    var coords = toImagePoint(latlng);

    if (!isPointInsideImage(coords)) {
      return;
    }

    moveLayerTo(activeMoveMode.layer, coords, false);
  }

  function commitMoveMode(latlng) {
    if (!activeMoveMode) {
      return;
    }

    var coords = toImagePoint(latlng);
    var layer = activeMoveMode.layer;

    if (!isPointInsideImage(coords)) {
      cancelMoveMode();
      return;
    }

    moveLayerTo(layer, coords, true);
    activeMoveMode = null;
    setMoveCursor(false);
    saveLayerSilently(layer);
  }

  function moveLayerTo(layer, coords, commit) {
    var data = layer._worldMapData || {};
    var kind = layer._worldMapKind || "marker";

    if (kind === "overlay") {
      var currentCenter = getOverlayCenterPoint(data);
      var dx = coords.x - currentCenter.x;
      var dy = coords.y - currentCenter.y;
      data.points = (data.points || []).map(function (point) {
        return [Math.round(point[0] + dx), Math.round(point[1] + dy)];
      });
      updateOverlayLayer(layer, data);
    } else {
      data.x = coords.x;
      data.y = coords.y;

      if (kind === "label") {
        updateLabelLayer(layer, data);
      } else {
        updateMarkerLayer(layer, data);
      }
    }

    if (commit) {
      layer._worldMapData = data;
    }

    showDetail(data);
  }

  function applyMovePreview(layer, data) {
    if (!layer || !data) {
      return;
    }

    layer._worldMapData = cloneMapItemData(data);

    if (layer._worldMapKind === "overlay") {
      updateOverlayLayer(layer, layer._worldMapData);
    } else if (layer._worldMapKind === "label") {
      updateLabelLayer(layer, layer._worldMapData);
    } else {
      updateMarkerLayer(layer, layer._worldMapData);
    }

    showDetail(layer._worldMapData);
  }

  function getOverlayCenterPoint(data) {
    var points = data.points || [];
    var totalX = 0;
    var totalY = 0;

    if (!points.length) {
      return { x: 0, y: 0 };
    }

    for (var i = 0; i < points.length; i += 1) {
      totalX += Number(points[i][0]) || 0;
      totalY += Number(points[i][1]) || 0;
    }

    return {
      x: Math.round(totalX / points.length),
      y: Math.round(totalY / points.length),
    };
  }

  function cloneMapItemData(data) {
    return JSON.parse(JSON.stringify(data || {}));
  }

  function saveLayerSilently(layer) {
    if (!layer || !layer._worldMapData || !canManageMap()) {
      return;
    }

    var profile = readWorldMapProfileState();
    var playerCode = profile.code || "";

    if (!playerCode) {
      return;
    }

    postWorldMapItem(playerCode, layer._worldMapKind || "marker", layer._worldMapData).catch(function (error) {
      console.warn("Errore salvataggio silenzioso mappa:", error);
    });
  }

  function startVertexEditMode(layer) {
    var map = window.__worldMapInstance;

    if (!map || !layer || layer._worldMapKind !== "overlay" || !canManageMap()) {
      return;
    }

    stopVertexEditMode();
    selectLayer(layer);

    activeVertexEdit = {
      layer: layer,
      handles: L.layerGroup().addTo(map),
    };

    setVertexEditCursor(true);
    renderVertexEditHandles();
  }

  function stopVertexEditMode() {
    var map = window.__worldMapInstance;

    if (activeVertexEdit && activeVertexEdit.handles && map) {
      map.removeLayer(activeVertexEdit.handles);
    }

    activeVertexEdit = null;
    setVertexEditCursor(false);
  }

  function setVertexEditCursor(isActive) {
    var stage = document.querySelector(".world-map-stage");

    if (stage) {
      stage.classList.toggle("is-editing-vertices", !!isActive);
    }
  }

  function renderVertexEditHandles() {
    var map = window.__worldMapInstance;

    if (!activeVertexEdit || !map) {
      return;
    }

    var data = activeVertexEdit.layer._worldMapData || {};
    var points = Array.isArray(data.points) ? data.points : [];

    activeVertexEdit.handles.clearLayers();

    for (var i = 0; i < points.length; i += 1) {
      activeVertexEdit.handles.addLayer(createVertexHandle(i, points[i]));
    }

    for (var j = 0; j < points.length; j += 1) {
      var nextIndex = (j + 1) % points.length;
      activeVertexEdit.handles.addLayer(createVertexInsertHandle(j, nextIndex, points[j], points[nextIndex]));
    }

    if (points.length) {
      activeVertexEdit.handles.addLayer(createVertexSaveHandle(data));
    }
  }

  function createVertexHandle(index, point) {
    var marker = L.marker(toMapLatLng(point[0], point[1]), {
      draggable: true,
      icon: L.divIcon({
        className: "",
        html: '<span class="world-map-vertex-handle" title="Muovi vertice"></span>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
    });

    marker.on("drag", function (event) {
      updateOverlayVertex(index, toImagePoint(event.target.getLatLng()), false);
    });

    marker.on("dragend", function (event) {
      updateOverlayVertex(index, toImagePoint(event.target.getLatLng()), true);
    });

    return marker;
  }

  function createVertexInsertHandle(leftIndex, rightIndex, leftPoint, rightPoint) {
    var mid = {
      x: Math.round((Number(leftPoint[0]) + Number(rightPoint[0])) / 2),
      y: Math.round((Number(leftPoint[1]) + Number(rightPoint[1])) / 2),
    };

    var marker = L.marker(toMapLatLng(mid.x, mid.y), {
      icon: L.divIcon({
        className: "",
        html: '<button type="button" class="world-map-vertex-insert" title="Aggiungi vertice"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    });

    marker.on("click", function (event) {
      L.DomEvent.stopPropagation(event);
      insertOverlayVertex(rightIndex, [mid.x, mid.y]);
    });

    return marker;
  }

  function createVertexSaveHandle(data) {
    var center = getOverlayCenterPoint(data);
    var marker = L.marker(toMapLatLng(center.x, center.y), {
      icon: L.divIcon({
        className: "",
        html: '<button type="button" class="world-map-vertex-save" title="Salva vertici"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i></button>',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      }),
    });

    marker.on("click", function (event) {
      L.DomEvent.stopPropagation(event);
      saveVertexEditMode();
    });

    return marker;
  }

  function saveVertexEditMode() {
    if (!activeVertexEdit || !activeVertexEdit.layer) {
      return;
    }

    var layer = activeVertexEdit.layer;
    saveLayerSilently(layer);
    stopVertexEditMode();
    selectLayer(layer);
    showDetail(layer._worldMapData || {});
  }

  function updateOverlayVertex(index, coords, shouldSave) {
    if (!activeVertexEdit || !isPointInsideImage(coords)) {
      return;
    }

    var layer = activeVertexEdit.layer;
    var data = layer._worldMapData || {};

    if (!Array.isArray(data.points) || !data.points[index]) {
      return;
    }

    data.points[index] = [coords.x, coords.y];
    layer._worldMapData = data;
    updateOverlayLayer(layer, data);
    showDetail(data);

    if (shouldSave) {
      renderVertexEditHandles();
    }
  }

  function insertOverlayVertex(index, point) {
    if (!activeVertexEdit) {
      return;
    }

    var layer = activeVertexEdit.layer;
    var data = layer._worldMapData || {};

    if (!Array.isArray(data.points)) {
      data.points = [];
    }

    data.points.splice(index, 0, point);
    layer._worldMapData = data;
    updateOverlayLayer(layer, data);
    showDetail(data);
    renderVertexEditHandles();
  }

  function showElementContextPanel(panel, layer, screenPoint) {
    var data = layer._worldMapData || {};
    var kind = layer._worldMapKind || "elemento";
    var label = labelType(data.type || kind).toLowerCase();

    panel.hidden = false;
    panel.style.position = "fixed";
    panel.style.left = "0px";
    panel.style.top = "0px";
    panel.style.zIndex = "9999";
    panel.dataset.draftJson = "";
    panel.innerHTML =
      '<article class="world-map-marker-draft__card">' +
      '<button type="button" class="world-map-marker-draft__close" data-world-map-draft-close aria-label="Chiudi"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
      '<p class="world-map-marker-draft__eyebrow">' +
      escapeHtml(labelType(data.type || kind)) +
      "</p>" +
      '<p class="world-map-marker-draft__coords">' +
      escapeHtml(data.title || "Senza titolo") +
      "</p>" +
      '<div class="world-map-marker-draft__actions">' +
      '<button type="button" class="world-map-context-action" data-world-map-context-edit><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i><span>Modifica ' +
      escapeHtml(label) +
      "</span></button>" +
      '<button type="button" class="world-map-context-action" data-world-map-context-move><i class="fa-solid fa-arrows-up-down-left-right" aria-hidden="true"></i><span>Muovi ' +
      escapeHtml(label) +
      "</span></button>" +
      (kind === "overlay"
        ? '<button type="button" class="world-map-context-action" data-world-map-context-vertices><i class="fa-solid fa-bezier-curve" aria-hidden="true"></i><span>Modifica vertici</span></button>'
        : "") +
      '<button type="button" class="world-map-context-action world-map-context-action--danger" data-world-map-context-delete><i class="fa-solid fa-trash" aria-hidden="true"></i><span>Cancella ' +
      escapeHtml(label) +
      "</span></button>" +
      "</div>" +
      "</article>";

    panel._worldMapContextLayer = layer;
    positionFloatingPanel(panel, screenPoint);
  }

  function showDraftChoicePanel(panel, coords, screenPoint) {
    if (shouldSuppressDraftPanelFromRightDrag()) {
      hideDraftPanel(panel);
      return;
    }

    panel.hidden = false;
    panel.style.position = "fixed";
    panel.style.left = "0px";
    panel.style.top = "0px";
    panel.style.zIndex = "9999";
    panel.dataset.coordsX = String(coords.x);
    panel.dataset.coordsY = String(coords.y);
    panel.dataset.screenX = String(screenPoint.x);
    panel.dataset.screenY = String(screenPoint.y);
    panel.dataset.draftJson = "";
    panel._worldMapContextLayer = null;
    panel.innerHTML =
      '<article class="world-map-marker-draft__card">' +
      '<button type="button" class="world-map-marker-draft__close" data-world-map-draft-close aria-label="Chiudi"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
      '<p class="world-map-marker-draft__eyebrow">Mappa</p>' +
      '<p class="world-map-marker-draft__coords">X ' +
      coords.x +
      " / Y " +
      coords.y +
      "</p>" +
      '<div class="world-map-marker-draft__actions">' +
      '<button type="button" class="world-map-context-action" data-world-map-copy-coordinates>' +
      '<i class="fa-solid fa-location-crosshairs" aria-hidden="true"></i>' +
      '<span>Copia coordinate</span>' +
      '</button>' +
      (canManageMap()
        ? '<button type="button" class="world-map-context-action world-map-context-action--admin" data-world-map-draft-marker>' +
          '<i class="fa-solid fa-location-dot" aria-hidden="true"></i>' +
          '<span>Nuovo marker</span>' +
          '</button>' +
          '<button type="button" class="world-map-context-action world-map-context-action--admin" data-world-map-draft-overlay>' +
          '<i class="fa-solid fa-draw-polygon" aria-hidden="true"></i>' +
          '<span>Nuovo overlay</span>' +
          '</button>' +
          '<button type="button" class="world-map-context-action world-map-context-action--admin" data-world-map-draft-label>' +
          '<i class="fa-solid fa-font" aria-hidden="true"></i>' +
          '<span>Nuova label</span>' +
          '</button>' +
          '<button type="button" class="world-map-context-action world-map-context-action--admin" data-world-map-open-travel-editor>' +
          '<i class="fa-solid fa-brush" aria-hidden="true"></i>' +
          '<span>Map editor</span>' +
          '</button>' +
          '<button type="button" class="world-map-context-action world-map-context-action--admin" data-world-map-open-travel-calculator>' +
          '<i class="fa-solid fa-route" aria-hidden="true"></i>' +
          '<span>Travel calculator</span>' +
          '</button>'
        : "") +
      "</div>" +
      "</article>";

    positionFloatingPanel(panel, screenPoint);
  }

  function openTravelEditorPanel() {
    var detailPanel = document.querySelector("#world-map-detail");

    if (!detailPanel || !window.EnclaveTravel) {
      return;
    }

    clearSelection();
    detailPanel.classList.remove("world-map-detail");
    detailPanel.classList.add("world-map-editor");

    if (typeof window.EnclaveTravel.openEditorInPanel === "function") {
      window.EnclaveTravel.openEditorInPanel(detailPanel);
      return;
    }

    if (typeof window.EnclaveTravel.toggleEditor === "function") {
      window.EnclaveTravel.toggleEditor();
    }
  }

  function openTravelCalculatorPanel() {
    var detailPanel = document.querySelector("#world-map-detail");

    if (!detailPanel || !window.EnclaveTravel) {
      return;
    }

    clearSelection();
    detailPanel.classList.remove("world-map-detail");
    detailPanel.classList.add("world-map-editor");

    if (typeof window.EnclaveTravel.openCalculatorInPanel === "function") {
      window.EnclaveTravel.openCalculatorInPanel(detailPanel);
    }
  }

  function restoreWorldMapDetailPanel() {
    var detailPanel = document.querySelector("#world-map-detail");

    if (!detailPanel) {
      return;
    }

    detailPanel.classList.remove("world-map-editor");
    detailPanel.classList.add("world-map-detail");
    showEmptyDetail();
  }

  function showMarkerDraftPanel(panel, coords, screenPoint) {
    var map = window.__worldMapInstance;

    if (!map || !canManageMap()) {
      return;
    }

    var data = buildMarkerDraftData(coords);
    var marker = createDraftMarkerLayer(map, data);

    selectLayer(marker);
    showDetail(data);
    openSelectedEditor(panel, marker, screenPoint);
  }

  function showLabelDraftPanel(panel, coords, screenPoint) {
    var map = window.__worldMapInstance;

    if (!map || !canManageMap()) {
      return;
    }

    var data = buildLabelDraftData(coords);
    var layer = createDraftLabelLayer(map, data);

    selectLayer(layer);
    showDetail(data);
    openSelectedEditor(panel, layer, screenPoint);
  }

  function createDraftLabelLayer(map, data) {
    var layer = createLabelLayer(map, data).addTo(getLayerGroup(map, getLayerName("label")));
    layer._worldMapIsDraft = true;
    return layer;
  }

  function createDraftMarkerLayer(map, data) {
    var marker = L.marker(toMapLatLng(data.x, data.y), {
      icon: createMarkerIcon(data.type, data.priority),
    }).addTo(getLayerGroup(map, getLayerName(data.type)));

    marker._worldMapData = data;
    marker._worldMapKind = "marker";
    marker._worldMapType = data.type;
    marker._worldMapLayerName = getLayerName(data.type);
    marker._worldMapMinZoom = getMarkerMinZoom(data.type, data.priority);
    marker._worldMapIsDraft = true;
    zoomManagedLayers.push(marker);
    markersIndex.push({ layer: marker, data: data });
    mapSearchIndex.push({ layer: marker, data: data, kind: "marker" });

    marker.bindTooltip(data.title || "Segnalino", {
      direction: "top",
      opacity: 0.95,
    });

    marker.on("click", function (e) {
      L.DomEvent.stopPropagation(e);
      selectLayer(marker);
      showDetail(data);
    });

    return marker;
  }

  function startOverlayDraft(map, panel, overlayDraft, coords, screenPoint) {
    cancelOverlayDraft(map, overlayDraft);
    overlayDraft.active = true;
    overlayDraft.points = [];
    overlayDraft.layer = L.polygon([], {
      color: "#7b3ff2",
      fillColor: "#7b3ff2",
      fillOpacity: 0.18,
      weight: 3,
      opacity: 0.95,
      dashArray: "6 5",
    }).addTo(map);

    addOverlayDraftPoint(map, panel, overlayDraft, coords);
    showOverlayDraftPanel(panel, overlayDraft, screenPoint, false);
  }

  function addOverlayDraftPoint(map, panel, overlayDraft, coords) {
    overlayDraft.points.push([coords.x, coords.y]);
    updateOverlayDraftLayer(overlayDraft);
    showOverlayDraftPanel(panel, overlayDraft, readDraftScreenPoint(panel), false);
  }

  function removeLastOverlayDraftPoint(map, panel, overlayDraft) {
    if (!overlayDraft.active || !overlayDraft.points.length) {
      return;
    }

    overlayDraft.points.pop();
    updateOverlayDraftLayer(overlayDraft);
    showOverlayDraftPanel(panel, overlayDraft, readDraftScreenPoint(panel), false);
  }

  function updateOverlayDraftLayer(overlayDraft) {
    if (!overlayDraft.layer) {
      return;
    }

    overlayDraft.layer.setLatLngs(
      overlayDraft.points.map(function (point) {
        return toMapLatLng(point[0], point[1]);
      })
    );
  }

  function finishOverlayDraft(panel, overlayDraft, screenPoint) {
    if (!overlayDraft.active || overlayDraft.points.length < 3) {
      showOverlayDraftPanel(panel, overlayDraft, screenPoint, true);
      return;
    }

    var map = window.__worldMapInstance;
    var data = buildOverlayDraftData(overlayDraft.points);
    var layer = createDraftOverlayLayer(map, data);

    cancelOverlayDraft(map, overlayDraft);
    selectLayer(layer);
    showDetail(data);
    openSelectedEditor(panel, layer, screenPoint);
  }

  function showOverlayDraftPanel(panel, overlayDraft, screenPoint, showError) {
    panel.hidden = false;
    panel.dataset.draftJson = "";
    panel.innerHTML =
      '<article class="world-map-marker-draft__card">' +
      '<button type="button" class="world-map-marker-draft__close" data-world-map-draft-close aria-label="Chiudi"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
      '<p class="world-map-marker-draft__eyebrow">Disegna overlay</p>' +
      '<p class="world-map-marker-draft__coords">Punti: ' +
      overlayDraft.points.length +
      "</p>" +
      '<p class="world-map-marker-draft__hint">Click sinistro: aggiungi punto. Doppio click o click destro: chiudi.</p>' +
      (showError ? '<p class="world-map-marker-draft__error">Servono almeno 3 punti.</p>' : "") +
      "</article>";

    positionFloatingPanel(panel, screenPoint);
  }

  function cancelOverlayDraft(map, overlayDraft) {
    overlayDraft.active = false;
    overlayDraft.points = [];

    if (overlayDraft.layer) {
      map.removeLayer(overlayDraft.layer);
      overlayDraft.layer = null;
    }
  }

  function isEditorPanelOpen(panel) {
    return !!(panel && panel.querySelector("[data-world-map-editor-form]"));
  }

  function hideDraftPanel(panel) {
    panel.hidden = true;
    panel.innerHTML = "";
    panel.dataset.draftJson = "";
    panel._worldMapContextLayer = null;
  }

  function buildMarkerDraftData(coords) {
    return {
      id: createDraftId("marker"),
      map_id: currentMapId,
      type: "location",
      title: "Nuovo segnalino",
      x: coords.x,
      y: coords.y,
      status: "open",
      visibility: "public",
      description: "Descrizione del segnalino.",
      tags: ["Luogo"],
      priority: false,
    };
  }

  function buildLabelDraftData(coords) {
    return {
      id: createDraftId("label"),
      map_id: currentMapId,
      type: "label",
      title: "Nuova label",
      x: coords.x,
      y: coords.y,
      size: 18,
      angle: 0,
      color: "black",
      visibility: "public",
    };
  }

  function buildOverlayDraftData(points) {
    return {
      id: createDraftId("overlay"),
      map_id: currentMapId,
      type: "domain",
      title: "Nuova area",
      color: "#7b3ff2",
      opacity: 0.24,
      status: "active",
      visibility: "public",
      description: "Descrizione dell'area.",
      points: points,
      tags: ["Dominio"],
    };
  }

  function createDraftOverlayLayer(map, data) {
    var points = data.points.map(function (point) {
      return toMapLatLng(point[0], point[1]);
    });
    var style = getOverlayStyle(data);
    var layer = L.polygon(points, style).addTo(getLayerGroup(map, getLayerName(data.type)));

    layer._worldMapData = data;
    layer._worldMapKind = "overlay";
    layer._worldMapBaseStyle = style;
    layer._worldMapType = data.type;
    layer._worldMapLayerName = getLayerName(data.type);
    layer._worldMapMinZoom = getOverlayMinZoom(data.type, data.targetMapId);
    layer._worldMapIsDraft = true;
    zoomManagedLayers.push(layer);
    mapSearchIndex.push({ layer: layer, data: data, kind: "overlay" });

    layer.bindTooltip(data.title || "Regione", {
      sticky: true,
      opacity: 0.95,
    });

    layer.on("click", function (e) {
      L.DomEvent.stopPropagation(e);
      selectLayer(layer);
      showDetail(data);
    });

    return layer;
  }

  function createDraftId(prefix) {
    return prefix + "-" + Date.now().toString(36);
  }

  async function copyDraftCoordinates(panel, button) {
    var coords = readDraftCoords(panel);
    var originalText = button.textContent;
    var text = "X " + coords.x + " / Y " + coords.y;

    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copiate";
      window.setTimeout(function () {
        button.textContent = originalText;
      }, 1100);
    } catch (_error) {
      button.textContent = "Copia fallita";
      window.setTimeout(function () {
        button.textContent = originalText;
      }, 1400);
    }
  }

  async function copyDraftJson(panel, button) {
    var json = panel.dataset.draftJson || "";

    if (!json) {
      return;
    }

    try {
      await navigator.clipboard.writeText(json);
      button.textContent = "Copiato";
      window.setTimeout(function () {
        button.textContent = "Copia JSON";
      }, 1100);
    } catch (_error) {
      button.textContent = "Copia fallita";
      window.setTimeout(function () {
        button.textContent = "Copia JSON";
      }, 1400);
    }
  }

  function readDraftCoords(panel) {
    return {
      x: Number(panel.dataset.coordsX) || 0,
      y: Number(panel.dataset.coordsY) || 0,
    };
  }

  function readDraftScreenPoint(panel) {
    return {
      x: Number(panel.dataset.screenX) || window.innerWidth / 2,
      y: Number(panel.dataset.screenY) || window.innerHeight / 2,
    };
  }

  function positionFloatingPanel(panel, screenPoint) {
    var gap = 12;
    var margin = 12;
    var point = screenPoint || {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };

    panel.style.position = "fixed";
    panel.style.left = "0px";
    panel.style.top = "0px";
    panel.style.zIndex = "9999";

    var rect = panel.getBoundingClientRect();
    var left = point.x + gap;
    var top = point.y + gap;

    if (left + rect.width > window.innerWidth - margin) {
      left = point.x - rect.width - gap;
    }

    if (top + rect.height > window.innerHeight - margin) {
      top = point.y - rect.height - gap;
    }

    left = clampNumber(left, margin, window.innerWidth - rect.width - margin);
    top = clampNumber(top, margin, window.innerHeight - rect.height - margin);

    panel.style.left = left + "px";
    panel.style.top = top + "px";
  }

  function bindCoordinateReadout(map) {
    var readout = document.querySelector("[data-world-map-coordinates]");

    if (!readout) {
      return;
    }

    map.on("mousemove", function onMapMouseMove(event) {
      var coords = toImagePoint(event.latlng);

      if (!isPointInsideImage(coords)) {
        readout.textContent = "X — / Y —";
        readout.classList.add("is-outside");
        return;
      }

      readout.classList.remove("is-outside");
      readout.textContent = "X " + coords.x + " / Y " + coords.y;
    });

    map.on("mouseout", function onMapMouseOut() {
      readout.textContent = "X — / Y —";
      readout.classList.add("is-outside");
    });
  }

  function toImagePoint(latlng) {
    return {
      x: Math.round(latlng.lng),
      y: Math.round(-latlng.lat),
    };
  }

  function isPointInsideImage(point) {
    return point.x >= 0 && point.y >= 0 && point.x <= MAP_WIDTH && point.y <= MAP_HEIGHT;
  }

  function bindMapSearch(map) {
    var input = document.querySelector("[data-world-map-search]");
    var results = document.querySelector("[data-world-map-search-results]");

    if (!input) return;

    input.addEventListener("input", function () {
      var query = (input.value || "").toLowerCase().trim();

      if (!results) {
        focusFirstSearchMatch(map, query);
        return;
      }

      renderSearchResults(map, query, results);
    });

    input.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") {
        return;
      }

      input.value = "";
      if (results) {
        results.hidden = true;
        results.innerHTML = "";
      }
    });

    document.addEventListener("click", function (event) {
      if (!results || results.hidden) {
        return;
      }

      var searchWrap = input.closest(".world-map-search");
      if (searchWrap && searchWrap.contains(event.target)) {
        return;
      }

      results.hidden = true;
    });
  }

  function focusFirstSearchMatch(map, query) {
    if (!query) {
      return;
    }

    var match = findSearchMatches(query)[0];
    if (match) {
      focusSearchMatch(map, match);
    }
  }

  function renderSearchResults(map, query, results) {
    results.innerHTML = "";

    if (!query) {
      results.hidden = true;
      return;
    }

    var matches = findSearchMatches(query).slice(0, 8);

    if (!matches.length) {
      results.hidden = false;
      results.innerHTML = '<p class="world-map-search__empty">Nessun risultato.</p>';
      return;
    }

    var fragment = document.createDocumentFragment();

    for (var i = 0; i < matches.length; i += 1) {
      fragment.appendChild(buildSearchResultButton(map, matches[i], results));
    }

    results.appendChild(fragment);
    results.hidden = false;
  }

  function findSearchMatches(query) {
    var matches = [];

    for (var i = 0; i < mapSearchIndex.length; i += 1) {
      var entry = mapSearchIndex[i];
      var data = entry.data || {};
      var haystack = [data.title, data.type, data.status, data.description, (data.tags || []).join(" ")]
        .join(" ")
        .toLowerCase();

      if (haystack.indexOf(query) !== -1) {
        matches.push(entry);
      }
    }

    return matches;
  }

  function buildSearchResultButton(map, entry, results) {
    var data = entry.data || {};
    var type = data.type || entry.kind || "location";
    var button = document.createElement("button");
    button.type = "button";
    button.className = "world-map-search__result world-map-search__result--" + sanitizeClassName(type);
    button.innerHTML =
      '<span class="world-map-search__result-icon" aria-hidden="true">' +
      '<i class="fa-solid ' +
      getEditorTypeIcon(type) +
      '"></i>' +
      "</span>" +
      '<span class="world-map-search__result-copy">' +
      '<span class="world-map-search__result-type">' +
      escapeHtml(labelType(type)) +
      "</span>" +
      '<span class="world-map-search__result-title">' +
      escapeHtml(data.title || "Senza titolo") +
      "</span>" +
      "</span>";

    button.addEventListener("click", function () {
      focusSearchMatch(map, entry);
      results.hidden = true;
    });

    return button;
  }

  function sanitizeClassName(value) {
    return String(value || "location")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-");
  }

  function focusSearchMatch(map, entry) {
    var m = entry.data;

    selectLayer(entry.layer);
    showDetail(m);

    if (entry.kind === "overlay" && entry.layer && entry.layer.getBounds) {
      if (entry.layer._worldMapSvgPath) {
        resetMapView(map, imageBounds, true);
        return;
      }

      map.flyToBounds(entry.layer.getBounds(), {
        padding: [60, 60],
        maxZoom: 0,
        animate: true,
        duration: 0.4,
      });
      return;
    }

    map.flyTo(toMapLatLng(m.x, m.y), Math.max(map.getZoom(), 0), {
      animate: true,
      duration: 0.4,
    });
  }

  function bindLayerDockScroll() {
    var dock = document.querySelector(".world-map-layer-dock");
    if (!dock) return;

    dock.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        dock.scrollLeft += e.deltaY;
      }
    });

    var isDown = false;
    var startX;
    var scrollLeft;

    dock.addEventListener("mousedown", function (e) {
      isDown = true;
      dock.classList.add("is-dragging");
      startX = e.pageX - dock.offsetLeft;
      scrollLeft = dock.scrollLeft;
    });

    dock.addEventListener("mouseleave", function () {
      isDown = false;
      dock.classList.remove("is-dragging");
    });

    dock.addEventListener("mouseup", function () {
      isDown = false;
      dock.classList.remove("is-dragging");
    });

    dock.addEventListener("mousemove", function (e) {
      if (!isDown) return;
      e.preventDefault();
      var x = e.pageX - dock.offsetLeft;
      var walk = (x - startX) * 1.2;
      dock.scrollLeft = scrollLeft - walk;
    });
  }

})();
