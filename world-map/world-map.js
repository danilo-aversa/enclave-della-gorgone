(function () {
  "use strict";

  var MAP_WIDTH = 9888;
  var MAP_HEIGHT = 6278;

  var MAP_BASE_MODE = "tiles"; // "tiles" oppure "image"
  var MAP_IMAGE = "assets/map-placeholder.webp";
  var MAP_TILE_URL = "tiles/faerun/{z}/{x}/{y}.webp";
  var MAP_TILE_SIZE = 512;
  var MAP_MIN_TILE_ZOOM = -4;
  var MAP_MAX_TILE_ZOOM = 0;

  var layerGroups = {};
  var zoomManagedLayers = [];
  var markersIndex = [];
  var mapSearchIndex = [];
  var selectedLayer = null;
  var imageBounds = null;

  document.addEventListener("DOMContentLoaded", initWorldMap);

  async function initWorldMap() {
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

    var baseLayer = createMapBaseLayer(bounds);
    baseLayer.addTo(map);
    lockMapToImageBounds(map, bounds);

    map.on("click", function () {
      clearSelection();
    });

    await Promise.all([loadMarkers(map), loadOverlays(map)]);

    bindLayerFilters(map);
    bindLayerFilterActions(map);
    bindMapViewActions(map, bounds);
    bindMapLegend();
    bindLayerDockScroll();
    bindMapSearch(map);
    bindCoordinateReadout(map);
    bindMapDraftTools(map);
    bindMapEditor(map);
    bindZoomVisibility(map);
    updateZoomVisibility(map);
    updateLayerDockState(map);
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
      var right = Math.min(((x + 1) * MAP_TILE_SIZE) / scale, MAP_WIDTH);
      var top = (y * MAP_TILE_SIZE) / scale;
      var bottom = Math.min(((y + 1) * MAP_TILE_SIZE) / scale, MAP_HEIGHT);

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
  }

  function updateMapMinZoom(map, bounds) {
    var minZoom = getCoverZoom(map, bounds);
    map.setMinZoom(minZoom);
  }

  function enforceMapBounds(map, bounds) {
    var minZoom = getCoverZoom(map, bounds);

    if (map.getZoom() < minZoom) {
      map.setZoom(minZoom, { animate: false });
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
      type: m.type || "location",
      title: m.title || "Senza titolo",
      x: Number(m.x) || 0,
      y: Number(m.y) || 0,
      status: m.status || null,
      urgency: m.urgency || null,
      visibility: m.visibility || "public",
      description: m.description || "",
      tags: Array.isArray(m.tags) ? m.tags : [],
      lastUpdate: m.lastUpdate || null,
      missionLink: m.missionLink || null,
      assignedGroup: m.assignedGroup || null,
      reward: m.reward || null,
      risk: m.risk || null,
    };
  }

  async function loadMarkers(map) {
    try {
      var res = await fetch("data/world-map-markers.json");
      var data = await res.json();

      data.forEach(function (raw) {
        var m = normalizeMarker(raw);
        if (m.visibility && m.visibility !== "public") {
          return;
        }

        var marker = L.marker(toMapLatLng(m.x, m.y), {
          icon: createMarkerIcon(m.type),
        }).addTo(getLayerGroup(map, getLayerName(m.type)));

        marker._worldMapData = m;
        marker._worldMapKind = "marker";
        marker._worldMapType = m.type;
        marker._worldMapLayerName = getLayerName(m.type);
        marker._worldMapMinZoom = getMarkerMinZoom(m.type);
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
      });
    } catch (err) {
      console.warn("Errore marker:", err);
    }
  }

  function normalizeOverlay(o) {
    return {
      id: o.id || "",
      type: o.type || "domain",
      title: o.title || "Senza titolo",
      color: o.color || "#7b3ff2",
      opacity: o.opacity != null ? Number(o.opacity) : 0.25,
      status: o.status || null,
      visibility: o.visibility || "public",
      description: o.description || "",
      tags: Array.isArray(o.tags) ? o.tags : [],
      points: Array.isArray(o.points) ? o.points : [],
    };
  }

  async function loadOverlays(map) {
    try {
      var res = await fetch("data/world-map-overlays.json");
      var data = await res.json();

      data.forEach(function (raw) {
        var o = normalizeOverlay(raw);
        if (o.visibility && o.visibility !== "public") {
          return;
        }

        if (!Array.isArray(o.points) || !o.points.length) {
          return;
        }

        var points = o.points.map(function (point) {
          return toMapLatLng(point[0], point[1]);
        });

        var layer;
        var style;

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

        layer._worldMapData = o;
        layer._worldMapKind = "overlay";
        layer._worldMapBaseStyle = style;
        layer._worldMapType = o.type;
        layer._worldMapLayerName = getLayerName(o.type);
        layer._worldMapMinZoom = getOverlayMinZoom(o.type);
        zoomManagedLayers.push(layer);
        layer.addTo(getLayerGroup(map, getLayerName(o.type)));

        mapSearchIndex.push({ layer: layer, data: o, kind: "overlay" });

        layer.bindTooltip(o.title || "Regione", {
          sticky: true,
          opacity: 0.95,
        });

        layer.on("click", function (e) {
          L.DomEvent.stopPropagation(e);
          selectLayer(layer);
          showDetail(o);

          map.flyToBounds(layer.getBounds(), {
            padding: [60, 60],
            maxZoom: 0,
            animate: true,
            duration: 0.45,
          });
        });
      });
    } catch (err) {
      console.warn("Errore overlay:", err);
    }
  }

  function getOverlayStyle(o) {
    var color = o.color || "#7b3ff2";

    var base = {
      color: color,
      fillColor: color,
      fillOpacity: o.opacity != null ? Number(o.opacity) : 0.25,
      weight: 2,
      opacity: 0.9,
    };

    if (o.type === "fracture-zone" || o.type === "corruption") {
      base.weight = 3;
      base.dashArray = "6 5";
      base.fillOpacity = o.opacity != null ? Number(o.opacity) : 0.18;
    }

    if (o.type === "war-zone") {
      base.weight = 3;
      base.dashArray = "10 6";
      base.fillOpacity = o.opacity != null ? Number(o.opacity) : 0.16;
    }

    if (o.type === "domain" || o.type === "influence") {
      base.weight = 2;
      base.fillOpacity = o.opacity != null ? Number(o.opacity) : 0.26;
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
    if (layer.setStyle) {
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
    if (layer.setStyle) {
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

    panel.innerHTML =
      '<article class="world-map-detail-card">' +
      '<p class="world-map-detail__eyebrow">' +
      escapeHtml(labelType(item.type)) +
      "</p>" +
      '<h2 class="world-map-detail__title">' +
      escapeHtml(item.title || "Senza titolo") +
      "</h2>" +
      (item.status || item.urgency || item.risk
        ? '<div class="world-map-detail__meta">' +
          (item.status
            ? "<span>Stato: " + escapeHtml(labelStatus(item.status)) + "</span>"
            : "") +
          (item.urgency
            ? "<span>Urgenza: " + escapeHtml(String(item.urgency)) + "</span>"
            : "") +
          (item.risk
            ? "<span>Rischio: " + escapeHtml(item.risk) + "</span>"
            : "") +
          "</div>"
        : "") +
      (item.description
        ? '<p class="world-map-detail__desc">' +
          escapeHtml(item.description) +
          "</p>"
        : "") +
      (item.tags && item.tags.length
        ? '<div class="world-map-detail__tags">' +
          item.tags
            .map(function (tag) {
              return "<span>" + escapeHtml(tag) + "</span>";
            })
            .join("") +
          "</div>"
        : "") +
      (item.lastUpdate
        ? '<p class="world-map-detail__small">Aggiornato: ' +
          escapeHtml(item.lastUpdate) +
          "</p>"
        : "") +
      (item.missionLink
        ? '<a class="world-map-detail__link" href="' +
          escapeHtml(item.missionLink) +
          '">Apri missione</a>'
        : "") +
      '<div class="world-map-detail__actions">' +
      '<button type="button" class="world-map-detail__btn" data-world-map-edit-selected>Modifica</button>' +
      '<button type="button" class="world-map-detail__btn" data-world-map-copy-selected-json>Copia JSON</button>' +
      "</div>" +
      "</article>";
  }

  function createMarkerIcon(type) {
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

  function getMarkerMinZoom(type) {
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

  function getOverlayMinZoom(type) {
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

    if (!group) {
      return;
    }

    if (input.checked) {
      group.addTo(map);
      updateZoomVisibility(map);
      updateLayerDockState(map);
      return;
    }

    if (selectedLayer && group.hasLayer && group.hasLayer(selectedLayer)) {
      clearSelection();
    }

    group.removeFrom(map);
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

      if (!selectedLayer || !selectedLayer._worldMapData) {
        return;
      }

      if (editButton) {
        openSelectedEditor(floatingPanel, selectedLayer);
        return;
      }

      if (copyButton) {
        copySelectedLayerJson(copyButton, selectedLayer);
      }
    });

    floatingPanel.addEventListener("submit", function onEditorSubmit(event) {
      var form = event.target.closest("[data-world-map-editor-form]");

      if (!form || !selectedLayer) {
        return;
      }

      event.preventDefault();
      applyEditorForm(map, floatingPanel, selectedLayer, form);
    });
  }

  function openSelectedEditor(panel, layer) {
    var data = layer._worldMapData || {};
    var kind = layer._worldMapKind || "marker";
    var json = buildLayerJson(data, kind);

    panel.hidden = false;
    panel.style.position = "fixed";
    panel.style.left = "0px";
    panel.style.top = "0px";
    panel.style.zIndex = "9999";
    panel.dataset.draftJson = json;
    panel.innerHTML = buildEditorMarkup(data, kind);

    positionFloatingPanel(panel, {
      x: window.innerWidth - 380,
      y: 90,
    });
  }

  function buildEditorMarkup(data, kind) {
    var isOverlay = kind === "overlay";
    var tags = Array.isArray(data.tags) ? data.tags.join(", ") : "";

    return (
      '<article class="world-map-marker-draft__card world-map-editor-card">' +
      '<button type="button" class="world-map-marker-draft__close" data-world-map-draft-close aria-label="Chiudi">×</button>' +
      '<p class="world-map-marker-draft__eyebrow">Editor ' +
      escapeHtml(isOverlay ? "overlay" : "marker") +
      "</p>" +
      '<form class="world-map-editor-form" data-world-map-editor-form>' +
      buildEditorField("id", "ID", data.id || "") +
      buildEditorField("type", "Tipo", data.type || "location") +
      buildEditorField("title", "Titolo", data.title || "") +
      (isOverlay
        ? buildEditorField("color", "Colore", data.color || "#7b3ff2") +
          buildEditorField("opacity", "Opacità", data.opacity != null ? String(data.opacity) : "0.24") +
          buildEditorTextarea("points", "Punti", JSON.stringify(data.points || [], null, 2))
        : buildEditorField("x", "X", String(data.x || 0)) +
          buildEditorField("y", "Y", String(data.y || 0)) +
          buildEditorField("urgency", "Urgenza", data.urgency != null ? String(data.urgency) : "")) +
      buildEditorField("status", "Stato", data.status || "") +
      buildEditorField("risk", "Rischio", data.risk || "") +
      buildEditorTextarea("description", "Descrizione", data.description || "") +
      buildEditorField("tags", "Tag", tags) +
      '<div class="world-map-marker-draft__actions">' +
      '<button type="submit" class="world-map-marker-draft__copy">Applica</button>' +
      '<button type="button" class="world-map-marker-draft__copy" data-world-map-copy-draft-json>Copia JSON</button>' +
      "</div>" +
      "</form>" +
      "</article>"
    );
  }

  function buildEditorField(name, label, value) {
    return (
      '<label class="world-map-editor-form__field">' +
      '<span>' +
      escapeHtml(label) +
      "</span>" +
      '<input name="' +
      escapeHtml(name) +
      '" value="' +
      escapeHtml(value) +
      '" />' +
      "</label>"
    );
  }

  function buildEditorTextarea(name, label, value) {
    return (
      '<label class="world-map-editor-form__field">' +
      '<span>' +
      escapeHtml(label) +
      "</span>" +
      '<textarea name="' +
      escapeHtml(name) +
      '" rows="4">' +
      escapeHtml(value) +
      "</textarea>" +
      "</label>"
    );
  }

  function applyEditorForm(map, panel, layer, form) {
    var data = layer._worldMapData || {};
    var kind = layer._worldMapKind || "marker";
    var formData = new FormData(form);

    data.id = readFormString(formData, "id", data.id || "");
    data.type = readFormString(formData, "type", data.type || "location");
    data.title = readFormString(formData, "title", data.title || "Senza titolo");
    data.status = readNullableFormString(formData, "status");
    data.risk = readNullableFormString(formData, "risk");
    data.description = readFormString(formData, "description", "");
    data.tags = parseTags(readFormString(formData, "tags", ""));

    if (kind === "overlay") {
      data.color = readFormString(formData, "color", data.color || "#7b3ff2");
      data.opacity = Number(readFormString(formData, "opacity", String(data.opacity || 0.24))) || 0.24;
      data.points = parsePoints(readFormString(formData, "points", "[]"));
      updateOverlayLayer(layer, data);
    } else {
      data.x = Number(readFormString(formData, "x", String(data.x || 0))) || 0;
      data.y = Number(readFormString(formData, "y", String(data.y || 0))) || 0;
      data.urgency = readNullableNumber(formData, "urgency");
      updateMarkerLayer(layer, data);
    }

    layer._worldMapData = data;
    layer._worldMapType = data.type;
    layer._worldMapLayerName = getLayerName(data.type);
    showDetail(data);
    panel.dataset.draftJson = buildLayerJson(data, kind);
    openSelectedEditor(panel, layer);
  }

  function updateMarkerLayer(layer, data) {
    layer.setLatLng(toMapLatLng(data.x, data.y));
    layer.setIcon(createMarkerIcon(data.type));
    layer.bindTooltip(data.title || "Segnalino", {
      direction: "top",
      opacity: 0.95,
    });
  }

  function updateOverlayLayer(layer, data) {
    var points = (data.points || []).map(function (point) {
      return toMapLatLng(point[0], point[1]);
    });
    var style = getOverlayStyle(data);

    layer.setLatLngs(points);
    layer._worldMapBaseStyle = style;
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
    }

    return JSON.stringify(payload, null, 2);
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

    map.getContainer().addEventListener("contextmenu", function onMapContextMenu(event) {
      event.preventDefault();

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
    });

    map.on("click", function onMapDraftClick(event) {
      if (!overlayDraft.active) {
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
      if (!overlayDraft.active) {
        return;
      }

      L.DomEvent.stopPropagation(event);
      finishOverlayDraft(panel, overlayDraft, {
        x: event.originalEvent.clientX,
        y: event.originalEvent.clientY,
      });
    });

    panel.addEventListener("click", function onPanelClick(event) {
      var markerButton = event.target.closest("[data-world-map-draft-marker]");
      var overlayButton = event.target.closest("[data-world-map-draft-overlay]");
      var copyButton = event.target.closest("[data-world-map-copy-draft-json]");
      var closeButton = event.target.closest("[data-world-map-draft-close]");

      if (closeButton) {
        cancelOverlayDraft(map, overlayDraft);
        hideDraftPanel(panel);
        return;
      }

      if (markerButton) {
        showMarkerDraftPanel(panel, readDraftCoords(panel), readDraftScreenPoint(panel));
        return;
      }

      if (overlayButton) {
        startOverlayDraft(map, panel, overlayDraft, readDraftCoords(panel), readDraftScreenPoint(panel));
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

      cancelOverlayDraft(map, overlayDraft);
      hideDraftPanel(panel);
    });
  }

  function showDraftChoicePanel(panel, coords, screenPoint) {
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
    panel.innerHTML =
      '<article class="world-map-marker-draft__card">' +
      '<button type="button" class="world-map-marker-draft__close" data-world-map-draft-close aria-label="Chiudi">×</button>' +
      '<p class="world-map-marker-draft__eyebrow">Nuovo elemento</p>' +
      '<p class="world-map-marker-draft__coords">X ' +
      coords.x +
      " / Y " +
      coords.y +
      "</p>" +
      '<div class="world-map-marker-draft__actions">' +
      '<button type="button" class="world-map-marker-draft__copy" data-world-map-draft-marker>Marker</button>' +
      '<button type="button" class="world-map-marker-draft__copy" data-world-map-draft-overlay>Overlay</button>' +
      "</div>" +
      "</article>";

    positionFloatingPanel(panel, screenPoint);
  }

  function showMarkerDraftPanel(panel, coords, screenPoint) {
    var json = buildMarkerDraftJson(coords);

    panel.hidden = false;
    panel.style.position = "fixed";
    panel.style.left = "0px";
    panel.style.top = "0px";
    panel.style.zIndex = "9999";
    panel.dataset.draftJson = json;
    panel.innerHTML =
      '<article class="world-map-marker-draft__card">' +
      '<button type="button" class="world-map-marker-draft__close" data-world-map-draft-close aria-label="Chiudi">×</button>' +
      '<p class="world-map-marker-draft__eyebrow">Nuovo marker</p>' +
      '<p class="world-map-marker-draft__coords">X ' +
      coords.x +
      " / Y " +
      coords.y +
      "</p>" +
      '<pre class="world-map-marker-draft__code">' +
      escapeHtml(json) +
      "</pre>" +
      '<button type="button" class="world-map-marker-draft__copy" data-world-map-copy-draft-json>Copia JSON</button>' +
      "</article>";

    positionFloatingPanel(panel, screenPoint);
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

    if (overlayDraft.layer) {
      overlayDraft.layer.setLatLngs(
        overlayDraft.points.map(function (point) {
          return toMapLatLng(point[0], point[1]);
        })
      );
    }

    showOverlayDraftPanel(panel, overlayDraft, readDraftScreenPoint(panel), false);
  }

  function finishOverlayDraft(panel, overlayDraft, screenPoint) {
    if (!overlayDraft.active || overlayDraft.points.length < 3) {
      showOverlayDraftPanel(panel, overlayDraft, screenPoint, true);
      return;
    }

    var json = buildOverlayDraftJson(overlayDraft.points);
    panel.dataset.draftJson = json;
    panel.hidden = false;
    panel.innerHTML =
      '<article class="world-map-marker-draft__card">' +
      '<button type="button" class="world-map-marker-draft__close" data-world-map-draft-close aria-label="Chiudi">×</button>' +
      '<p class="world-map-marker-draft__eyebrow">Nuovo overlay</p>' +
      '<p class="world-map-marker-draft__coords">Punti: ' +
      overlayDraft.points.length +
      "</p>" +
      '<pre class="world-map-marker-draft__code">' +
      escapeHtml(json) +
      "</pre>" +
      '<button type="button" class="world-map-marker-draft__copy" data-world-map-copy-draft-json>Copia JSON</button>' +
      "</article>";

    positionFloatingPanel(panel, screenPoint);
  }

  function showOverlayDraftPanel(panel, overlayDraft, screenPoint, showError) {
    panel.hidden = false;
    panel.dataset.draftJson = "";
    panel.innerHTML =
      '<article class="world-map-marker-draft__card">' +
      '<button type="button" class="world-map-marker-draft__close" data-world-map-draft-close aria-label="Chiudi">×</button>' +
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

  function hideDraftPanel(panel) {
    panel.hidden = true;
    panel.innerHTML = "";
    panel.dataset.draftJson = "";
  }

  function buildMarkerDraftJson(coords) {
    return JSON.stringify(
      {
        id: "marker-new",
        type: "location",
        title: "Nuovo segnalino",
        x: coords.x,
        y: coords.y,
        status: "open",
        visibility: "public",
        description: "Descrizione del segnalino.",
        tags: ["Luogo"],
      },
      null,
      2
    );
  }

  function buildOverlayDraftJson(points) {
    return JSON.stringify(
      {
        id: "overlay-new",
        type: "domain",
        title: "Nuova area",
        color: "#7b3ff2",
        opacity: 0.24,
        status: "active",
        visibility: "public",
        description: "Descrizione dell'area.",
        points: points,
        tags: ["Dominio"],
      },
      null,
      2
    );
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
    var button = document.createElement("button");
    button.type = "button";
    button.className = "world-map-search__result";
    button.innerHTML =
      '<span class="world-map-search__result-type">' +
      escapeHtml(labelType(data.type)) +
      "</span>" +
      '<span class="world-map-search__result-title">' +
      escapeHtml(data.title || "Senza titolo") +
      "</span>";

    button.addEventListener("click", function () {
      focusSearchMatch(map, entry);
      results.hidden = true;
    });

    return button;
  }

  function focusSearchMatch(map, entry) {
    var m = entry.data;

    selectLayer(entry.layer);
    showDetail(m);

    if (entry.kind === "overlay" && entry.layer && entry.layer.getBounds) {
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