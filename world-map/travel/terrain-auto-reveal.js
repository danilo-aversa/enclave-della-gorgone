// v0.12 2026-04-30T18:40:00.000Z
(function () {
  "use strict";

  var DEFAULT_PALETTE = {
    plain: ["#D1DAB7"],
    forest: ["#659E7F"],
    mountain: ["#A7A7A7"],
    hill: ["#FDF2B9"],
    water: ["#83BBCE"],
    swamp: ["#D0E5D2"],
    desert: ["#E6D08F"],
    arctic: ["#E8F2F4"],
  };

  var TERRAIN_LABELS = {
    plain: "Pianura",
    forest: "Foresta",
    mountain: "Montagna",
    hill: "Collina",
    water: "Acqua",
    swamp: "Palude",
    desert: "Deserto",
    arctic: "Artico",
  };

  var TERRAIN_ICONS = {
    plain: "fa-seedling",
    forest: "fa-tree",
    mountain: "fa-mountain",
    hill: "fa-mound",
    water: "fa-droplet",
    swamp: "fa-water",
    desert: "fa-sun",
    arctic: "fa-snowflake",
  };

  var DEFAULT_OPTIONS = {
    confidenceThreshold: 0.58,
    sampleRadiusFactor: 0.58,
    samplesPerHex: 9,
    smoothingPasses: 3,
    isolatedCellThreshold: 4,
    minClusterSize: 12,
    clusterAbsorbNeighborThreshold: 3,
    ignoreScoreThreshold: 0.78,
  };

  var state = {
    world: null,
    travel: null,
    applyCells: null,
    gridStore: null,
    autoRevealScope: "full",
    chunkSize: 128,
    palette: clonePalette(DEFAULT_PALETTE),
    ignoredColors: [],
    enabledTerrains: Object.keys(DEFAULT_PALETTE).reduce(function (acc, terrain) {
      acc[terrain] = true;
      return acc;
    }, {}),
    options: Object.assign({}, DEFAULT_OPTIONS),
    previewCells: {},
    previewStats: null,
    previewChunks: {},
    isAnalyzing: false,
    raster: null,
    modal: null,
    picker: null,
    isPickingColor: false,
    pickTargetLabel: "",
    estimatedHexCount: 0,
  };

  window.EnclaveTerrainAutoReveal = {
    init: init,
    openModal: openModal,
    closeModal: closeModal,
    analyze: analyze,
    applyPreview: applyPreview,
    discardPreview: discardPreview,
    exportPreviewChunks: exportPreviewChunks,
    setPalette: setPalette,
    setIgnoredColors: setIgnoredColors,
    setEnabledTerrains: setEnabledTerrains,
    getPalette: function () {
      return clonePalette(state.palette);
    },
    getIgnoredColors: function () {
      return state.ignoredColors.slice();
    },
    getEnabledTerrains: function () {
      return Object.assign({}, state.enabledTerrains);
    },
    getPreview: function () {
      return {
        cells: Object.assign({}, state.previewCells),
        stats: state.previewStats ? Object.assign({}, state.previewStats) : null,
      };
    },
  };

  function openModal(context) {
    init(context || {});
    injectStyles();

    if (!state.world || !state.travel) {
      window.alert("Terrain Auto Reveal requires EnclaveWorldMap and EnclaveTravel.");
      return;
    }

    closeModal();
    state.estimatedHexCount = estimateAnalyzableHexCount();

    var modal = document.createElement("section");
    modal.className = "terrain-auto-reveal-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = buildModalMarkup();
    document.body.appendChild(modal);
    state.modal = modal;

    bindModalEvents(modal);
    renderPaletteRows();
    renderIgnoredColors();
    renderStats(null);
  }

  function closeModal() {
    stopPicker();

    if (state.modal) {
      state.modal.remove();
      state.modal = null;
    }
  }

  function init(context) {
    context = context || {};
    state.world = context.world || window.EnclaveWorldMap || null;
    state.travel = context.travel || window.EnclaveTravel || null;
    state.applyCells = typeof context.applyCells === "function" ? context.applyCells : null;
    state.gridStore = context.gridStore || null;
    state.autoRevealScope = context.scope === "visible" ? "visible" : "full";
    state.chunkSize = Number(context.chunkSize) || 128;

    return !!(state.world && state.travel);
  }

  function setPalette(nextPalette) {
    state.palette = normalizePalette(nextPalette || DEFAULT_PALETTE);
  }

  function setIgnoredColors(colors) {
    state.ignoredColors = (colors || []).filter(isHexColor).slice(0, 10);
  }

  function setEnabledTerrains(nextEnabled) {
    Object.keys(DEFAULT_PALETTE).forEach(function (terrain) {
      state.enabledTerrains[terrain] = !nextEnabled || nextEnabled[terrain] !== false;
    });
  }

  async function analyze(options) {
    if (!state.world || !state.travel) {
      init({});
    }

    if (!state.world || !state.travel) {
      throw new Error("Terrain Auto Reveal requires EnclaveWorldMap and EnclaveTravel.");
    }

    state.options = Object.assign({}, DEFAULT_OPTIONS, options || {});
    state.isAnalyzing = true;

    try {
      var raster = await getRasterReader();
      var classified = classifyAllHexes(raster);
      var smoothed = smoothClassifiedCells(classified.cells);
      smoothed = absorbSmallTerrainClusters(smoothed);

      state.previewCells = smoothed;
      state.previewChunks = buildPreviewChunks(smoothed);
      state.previewStats = buildStats(smoothed, classified.stats);
      return {
        cells: smoothed,
        stats: state.previewStats,
      };
    } finally {
      state.isAnalyzing = false;
    }
  }

  function applyPreview() {
    if (!state.travel || !state.previewCells || !Object.keys(state.previewCells).length) {
      return false;
    }

    var chunks = Object.keys(state.previewChunks || {}).length ? state.previewChunks : buildPreviewChunks(state.previewCells);
    var chunkKeys = Object.keys(chunks).sort();

    if (typeof state.applyCells === "function") {
      applyPreviewChunks(chunkKeys, chunks, state.applyCells);
      return true;
    }

    if (typeof state.travel.applyAutoRevealCells === "function") {
      applyPreviewChunks(chunkKeys, chunks, state.travel.applyAutoRevealCells.bind(state.travel));
      return true;
    }

    return false;
  }

  function applyPreviewChunks(chunkKeys, chunks, applyFn) {
    if (!chunkKeys.length) {
      return;
    }

    chunkKeys.forEach(function (chunkKey, index) {
      applyFn(chunks[chunkKey], {
        scope: "full",
        chunkKeys: [chunkKey],
        autosave: index === chunkKeys.length - 1,
      });
    });
  }

  async function runExportPreviewChunks(button) {
    var original = button ? button.innerHTML : "";

    if (button) {
      button.disabled = true;
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Exporting</span>';
    }

    try {
      var result = await exportPreviewChunks();

      if (button) {
        button.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i><span>' + escapeHtml(result.label || "Exported") + '</span>';
        window.setTimeout(function () {
          button.innerHTML = original;
          button.disabled = !state.previewCells || !Object.keys(state.previewCells).length;
        }, 1400);
      }
    } catch (error) {
      console.error("Auto Reveal chunk export failed:", error);
      window.alert(error && error.message ? error.message : "Chunk export failed.");

      if (button) {
        button.innerHTML = original;
        button.disabled = !state.previewCells || !Object.keys(state.previewCells).length;
      }
    }
  }

  async function exportPreviewChunks() {
    if (!state.previewCells || !Object.keys(state.previewCells).length) {
      throw new Error("No Auto Reveal preview to export.");
    }

    var chunks = Object.keys(state.previewChunks || {}).length ? state.previewChunks : buildPreviewChunks(state.previewCells);
    var payload = buildChunkExportPayload(chunks);

    if (window.showDirectoryPicker) {
      await exportChunksToDirectory(payload);
      return {
        label: "Files exported",
        mode: "directory",
        payload: payload,
      };
    }

    downloadJsonFile(payload.bundleFileName, payload.bundle);
    return {
      label: "Bundle downloaded",
      mode: "bundle",
      payload: payload,
    };
  }

  function buildChunkExportPayload(chunks) {
    var mapId = readMapId();
    var chunkKeys = Object.keys(chunks || {}).sort(compareChunkKeys);
    var now = new Date().toISOString();
    var chunkPayloads = {};
    var stats = state.previewStats ? Object.assign({}, state.previewStats) : null;
    var warnings = getChunkExportWarnings();

    chunkKeys.forEach(function (chunkKey) {
      chunkPayloads[chunkKey] = buildStaticChunkPayload(mapId, chunkKey, chunks[chunkKey], now);
    });

    var index = {
      format: "chunk-index",
      version: 1,
      mapId: mapId,
      chunkSize: Number(state.chunkSize) || 128,
      generatedAt: now,
      source: "terrain-auto-reveal",
      exportMode: "detected-cells-only",
      cellsAreGlobalHexKeys: true,
      warnings: warnings,
      stats: stats,
      chunks: chunkKeys.map(function (chunkKey) {
        var parsed = parseChunkKey(chunkKey);
        var chunkStats = buildChunkCellStats(chunks[chunkKey]);

        return {
          key: chunkKey,
          chunkQ: parsed.chunkQ,
          chunkR: parsed.chunkR,
          file: chunkKey + ".json",
          cellCount: chunkStats.cellCount,
          bounds: chunkStats.bounds,
          terrainCounts: chunkStats.terrainCounts,
        };
      }),
    };

    var readme = buildExportReadme(mapId, chunkKeys, index, stats, warnings);

    return {
      mapId: mapId,
      chunkKeys: chunkKeys,
      index: index,
      chunks: chunkPayloads,
      readme: readme,
      bundleFileName: mapId + "-auto-reveal-chunks.json",
      bundle: {
        format: "travel-grid-chunks-bundle",
        version: 1,
        mapId: mapId,
        generatedAt: now,
        exportMode: "detected-cells-only",
        cellsAreGlobalHexKeys: true,
        warnings: warnings,
        stats: stats,
        index: index,
        chunks: chunkPayloads,
        readme: readme,
      },
    };
  }

  function buildStaticChunkPayload(mapId, chunkKey, cells, generatedAt) {
    var parsed = parseChunkKey(chunkKey);
    var chunkStats = buildChunkCellStats(cells);

    return {
      format: "travel-grid-chunk",
      version: 1,
      mapId: mapId,
      chunkKey: chunkKey,
      chunkQ: parsed.chunkQ,
      chunkR: parsed.chunkR,
      chunkSize: Number(state.chunkSize) || 128,
      generatedAt: generatedAt,
      source: "terrain-auto-reveal",
      exportMode: "detected-cells-only",
      cellsAreGlobalHexKeys: true,
      cellCount: chunkStats.cellCount,
      bounds: chunkStats.bounds,
      terrainCounts: chunkStats.terrainCounts,
      warnings: getChunkExportWarnings(),
      cells: cells || {},
    };
  }

  function buildChunkCellStats(cells) {
    var keys = Object.keys(cells || {});
    var terrainCounts = {};
    var bounds = null;

    keys.forEach(function (key) {
      var cell = cells[key] || {};
      var parsed = parseHexKey(key);
      var terrain = cell.terrain || "unknown";

      terrainCounts[terrain] = (terrainCounts[terrain] || 0) + 1;

      if (!bounds) {
        bounds = {
          minQ: parsed.q,
          maxQ: parsed.q,
          minR: parsed.r,
          maxR: parsed.r,
        };
        return;
      }

      bounds.minQ = Math.min(bounds.minQ, parsed.q);
      bounds.maxQ = Math.max(bounds.maxQ, parsed.q);
      bounds.minR = Math.min(bounds.minR, parsed.r);
      bounds.maxR = Math.max(bounds.maxR, parsed.r);
    });

    return {
      cellCount: keys.length,
      terrainCounts: terrainCounts,
      bounds: bounds,
    };
  }

  async function exportChunksToDirectory(payload) {
    var directory = await window.showDirectoryPicker({ mode: "readwrite" });

    await writeJsonFileToDirectory(directory, "index.json", payload.index);
    await writeTextFileToDirectory(directory, "README-auto-reveal.txt", payload.readme);

    for (var i = 0; i < payload.chunkKeys.length; i += 1) {
      var chunkKey = payload.chunkKeys[i];
      await writeJsonFileToDirectory(directory, chunkKey + ".json", payload.chunks[chunkKey]);
    }
  }

  async function writeJsonFileToDirectory(directory, fileName, payload) {
    return writeTextFileToDirectory(directory, fileName, JSON.stringify(payload, null, 2));
  }

  async function writeTextFileToDirectory(directory, fileName, content) {
    var fileHandle = await directory.getFileHandle(fileName, { create: true });
    var writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  function getChunkExportWarnings() {
    return [
      "This export contains only cells detected by Terrain Auto Reveal.",
      "Default terrain cells are omitted to keep chunks small.",
      "Replacing existing chunk files with this export may remove manually authored data not present in the preview.",
      "Use this as an initial terrain grid export, or merge it carefully with existing travel-grid chunks.",
    ];
  }

  function buildExportReadme(mapId, chunkKeys, index, stats, warnings) {
    var lines = [];

    lines.push("Terrain Auto Reveal chunk export");
    lines.push("================================");
    lines.push("");
    lines.push("Map: " + mapId);
    lines.push("Generated: " + (index.generatedAt || ""));
    lines.push("Chunk size: " + index.chunkSize);
    lines.push("Chunk files: " + chunkKeys.length);
    lines.push("Detected cells: " + (stats && stats.painted ? stats.painted : 0));
    lines.push("");
    lines.push("Files:");
    lines.push("- index.json");
    lines.push("- <chunkKey>.json");
    lines.push("");
    lines.push("Important:");
    warnings.forEach(function (warning) {
      lines.push("- " + warning);
    });
    lines.push("");
    lines.push("Recommended destination:");
    lines.push("world-map/data/travel/chunks/" + mapId + "/");
    lines.push("");
    lines.push("Suggested check after copying:");
    lines.push("- Hard refresh the page.");
    lines.push("- Run EnclaveTravel.getGridStore().getConfig() in the console.");
    lines.push("- Confirm availableChunkKeys matches the exported index.json.");
    lines.push("");

    return lines.join("");
  }

  function downloadJsonFile(fileName, payload) {
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 800);
  }

  function readMapId() {
    if (state.world && state.world.mapId) {
      return String(state.world.mapId);
    }

    if (state.world && state.world.mapConfig && state.world.mapConfig.id) {
      return String(state.world.mapConfig.id);
    }

    return "world-map";
  }

  function parseChunkKey(chunkKey) {
    var parts = String(chunkKey || "0_0").split("_");
    return {
      chunkQ: Number(parts[0]) || 0,
      chunkR: Number(parts[1]) || 0,
    };
  }

  function compareChunkKeys(a, b) {
    var pa = parseChunkKey(a);
    var pb = parseChunkKey(b);

    if (pa.chunkQ !== pb.chunkQ) {
      return pa.chunkQ - pb.chunkQ;
    }

    return pa.chunkR - pb.chunkR;
  }

  function buildPreviewChunks(cells) {
    var chunks = {};

    Object.keys(cells || {}).forEach(function (key) {
      var parsed = parseHexKey(key);
      var chunkKey = getCellChunkKey(parsed.q, parsed.r);

      if (!chunks[chunkKey]) {
        chunks[chunkKey] = {};
      }

      chunks[chunkKey][key] = cells[key];
    });

    return chunks;
  }

  function getCellChunkKey(q, r) {
    var chunkSize = Number(state.chunkSize) || 128;
    return Math.floor(Number(q) / chunkSize) + "_" + Math.floor(Number(r) / chunkSize);
  }

  function discardPreview() {
    state.previewCells = {};
    state.previewChunks = {};
    state.previewStats = null;
  }

  async function getRasterReader() {
    if (state.raster) {
      return state.raster;
    }

    state.raster = await buildRasterReader();
    return state.raster;
  }

  async function buildRasterReader() {
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    var width = Number(state.world.width) || 0;
    var height = Number(state.world.height) || 0;

    if (!width || !height) {
      throw new Error("Invalid map size.");
    }

    canvas.width = width;
    canvas.height = height;

    if (state.world.mapConfig && state.world.mapConfig.baseMode === "image") {
      await drawImageMap(ctx, state.world.mapConfig.image, width, height);
      return createCanvasRasterReader(ctx, width, height);
    }

    await drawTileMap(ctx, state.world.mapConfig || {}, width, height);
    return createCanvasRasterReader(ctx, width, height);
  }

  function drawImageMap(ctx, src, width, height) {
    return loadImage(src).then(function (image) {
      ctx.drawImage(image, 0, 0, width, height);
    });
  }

  async function drawTileMap(ctx, config, width, height) {
    var tileUrl = config.tileUrl;
    var tileSize = Number(config.tileSize) || 512;
    var zoom = Number(config.maxTileZoom || 0);
    var scale = Math.pow(2, zoom);
    var cols = Math.ceil((width * scale) / tileSize);
    var rows = Math.ceil((height * scale) / tileSize);

    if (!tileUrl) {
      throw new Error("Missing tileUrl for tiled map.");
    }

    for (var y = 0; y < rows; y += 1) {
      for (var x = 0; x < cols; x += 1) {
        var url = tileUrl
          .replace("{z}", String(zoom))
          .replace("{x}", String(x))
          .replace("{y}", String(y));

        try {
          var image = await loadImage(url);
          var left = (x * tileSize) / scale;
          var top = (y * tileSize) / scale;
          var drawSize = tileSize / scale;
          ctx.drawImage(image, left, top, drawSize, drawSize);
        } catch (error) {
          console.warn("Auto reveal tile skipped:", url, error);
        }
      }
    }
  }

  function createCanvasRasterReader(ctx, width, height) {
    var imageData;

    try {
      imageData = ctx.getImageData(0, 0, width, height);
    } catch (error) {
      throw new Error("Cannot read map pixels. Check CORS/same-origin for map tiles.");
    }

    return {
      width: width,
      height: height,
      getPixel: function (x, y) {
        var px = Math.max(0, Math.min(width - 1, Math.round(x)));
        var py = Math.max(0, Math.min(height - 1, Math.round(y)));
        var index = (py * width + px) * 4;

        return {
          r: imageData.data[index],
          g: imageData.data[index + 1],
          b: imageData.data[index + 2],
          a: imageData.data[index + 3],
        };
      },
    };
  }

  function estimateAnalyzableHexCount() {
    var travelConfig = readTravelConfig();
    var width = Number(state.world.width) || 0;
    var height = Number(state.world.height) || 0;
    var hexSize = Number(travelConfig.hexSize) || 10;
    var count = 0;
    var bounds = estimateHexBounds(width, height, hexSize);

    for (var q = bounds.qMin; q <= bounds.qMax; q += 1) {
      for (var r = bounds.rMin; r <= bounds.rMax; r += 1) {
        var center = hexToPixel(q, r, hexSize);

        if (isPointInside(center.x, center.y, width, height)) {
          count += 1;
        }
      }
    }

    return count;
  }

  function classifyAllHexes(raster) {
    var travelConfig = readTravelConfig();
    var hexSize = travelConfig.hexSize;
    var cells = {};
    var stats = {
      total: 0,
      assigned: 0,
      ambiguous: 0,
    };
    var bounds = estimateHexBounds(raster.width, raster.height, hexSize);

    for (var q = bounds.qMin; q <= bounds.qMax; q += 1) {
      for (var r = bounds.rMin; r <= bounds.rMax; r += 1) {
        var center = hexToPixel(q, r, hexSize);

        if (!isPointInside(center.x, center.y, raster.width, raster.height)) {
          continue;
        }

        stats.total += 1;
        var result = classifyHex(raster, center, hexSize);

        if (!result || result.confidence < state.options.confidenceThreshold) {
          stats.ambiguous += 1;
          continue;
        }

        if (result.terrain && result.terrain !== travelConfig.defaultTerrain) {
          cells[q + "," + r] = {
            terrain: result.terrain,
            road: false,
            bridge: false,
            tunnel: false,
            waterType: "",
            risk: getTerrainRisk(result.terrain),
            blocked: result.terrain === "blocked",
            tags: [],
            confidence: roundTo(result.confidence, 3),
          };
        }

        stats.assigned += 1;
      }
    }

    return {
      cells: cells,
      stats: stats,
    };
  }

  function classifyHex(raster, center, hexSize) {
    var samples = sampleHexColors(raster, center, hexSize);
    var votes = {};
    var scoreTotals = {};

    samples.forEach(function (sample) {
      var match = matchColorToTerrain(sample);

      if (!match) {
        return;
      }

      votes[match.terrain] = (votes[match.terrain] || 0) + 1;
      scoreTotals[match.terrain] = (scoreTotals[match.terrain] || 0) + match.score;
    });

    var best = null;

    Object.keys(votes).forEach(function (terrain) {
      var confidence = votes[terrain] / Math.max(1, samples.length);
      var avgScore = scoreTotals[terrain] / Math.max(1, votes[terrain]);
      var combined = confidence * 0.72 + avgScore * 0.28;

      if (!best || combined > best.combined) {
        best = {
          terrain: terrain,
          confidence: confidence,
          score: avgScore,
          combined: combined,
        };
      }
    });

    return best;
  }

  function sampleHexColors(raster, center, hexSize) {
    var radius = hexSize * state.options.sampleRadiusFactor;
    var points = [
      [0, 0],
      [0.45, 0],
      [-0.45, 0],
      [0, 0.45],
      [0, -0.45],
      [0.32, 0.32],
      [-0.32, 0.32],
      [0.32, -0.32],
      [-0.32, -0.32],
    ];

    return points.map(function (point) {
      return raster.getPixel(center.x + point[0] * radius, center.y + point[1] * radius);
    }).filter(function (color) {
      return color && color.a > 10;
    });
  }

  function matchColorToTerrain(color) {
    if (isIgnoredColor(color)) {
      return null;
    }

    var lab = rgbToLab(color.r, color.g, color.b);
    var best = null;

    Object.keys(state.palette).forEach(function (terrain) {
      if (state.enabledTerrains[terrain] === false) {
        return;
      }

      state.palette[terrain].forEach(function (hex) {
        var target = hexToLab(hex);
        var distance = deltaE(lab, target);
        var score = Math.max(0, 1 - distance / 72);

        if (!best || score > best.score) {
          best = {
            terrain: terrain,
            score: score,
            distance: distance,
          };
        }
      });
    });

    return best;
  }

  function isIgnoredColor(color) {
    if (!state.ignoredColors.length) {
      return false;
    }

    var lab = rgbToLab(color.r, color.g, color.b);

    return state.ignoredColors.some(function (hex) {
      var target = hexToLab(hex);
      var distance = deltaE(lab, target);
      var score = Math.max(0, 1 - distance / 72);
      return score >= state.options.ignoreScoreThreshold;
    });
  }

  function smoothClassifiedCells(cells) {
    var next = cloneCells(cells);

    for (var pass = 0; pass < state.options.smoothingPasses; pass += 1) {
      next = smoothPass(next);
    }

    Object.keys(next).forEach(function (key) {
      delete next[key].confidence;
    });

    return next;
  }

  function absorbSmallTerrainClusters(cells) {
    var next = cloneCells(cells);
    var clusters = detectTerrainClusters(next);

    clusters.forEach(function (cluster) {
      if (cluster.cells.length >= state.options.minClusterSize) {
        return;
      }

      var dominant = getDominantTerrain(getClusterBorderTerrainCounts(next, cluster));

      if (!dominant || dominant.count < state.options.clusterAbsorbNeighborThreshold) {
        cluster.cells.forEach(function (cell) {
          delete next[cell.key];
        });
        return;
      }

      cluster.cells.forEach(function (cell) {
        next[cell.key] = createCell(dominant.terrain);
      });
    });

    for (var pass = 0; pass < 2; pass += 1) {
      next = smoothPass(next);
    }

    return next;
  }

  function detectTerrainClusters(cells) {
    var visited = new Set();
    var clusters = [];

    Object.keys(cells).forEach(function (key) {
      if (visited.has(key)) {
        return;
      }

      var start = parseHexKey(key);
      var terrain = cells[key].terrain;
      var queue = [{ q: start.q, r: start.r, key: key }];
      var cluster = {
        terrain: terrain,
        cells: [],
      };

      visited.add(key);

      while (queue.length) {
        var current = queue.shift();
        cluster.cells.push(current);

        getNeighbors(current.q, current.r).forEach(function (neighbor) {
          var neighborKey = neighbor.q + "," + neighbor.r;
          var neighborCell = cells[neighborKey];

          if (visited.has(neighborKey) || !neighborCell || neighborCell.terrain !== terrain) {
            return;
          }

          visited.add(neighborKey);
          queue.push({ q: neighbor.q, r: neighbor.r, key: neighborKey });
        });
      }

      clusters.push(cluster);
    });

    return clusters;
  }

  function getClusterBorderTerrainCounts(cells, cluster) {
    var counts = {};
    var own = new Set(cluster.cells.map(function (cell) {
      return cell.key;
    }));

    cluster.cells.forEach(function (cell) {
      getNeighbors(cell.q, cell.r).forEach(function (neighbor) {
        var key = neighbor.q + "," + neighbor.r;
        var neighborCell = cells[key];

        if (!neighborCell || own.has(key) || neighborCell.terrain === cluster.terrain) {
          return;
        }

        counts[neighborCell.terrain] = (counts[neighborCell.terrain] || 0) + 1;
      });
    });

    return counts;
  }

  function smoothPass(cells) {
    var next = cloneCells(cells);
    var allKeys = new Set(Object.keys(cells));

    Object.keys(cells).forEach(function (key) {
      var parsed = parseHexKey(key);
      getNeighbors(parsed.q, parsed.r).forEach(function (neighbor) {
        allKeys.add(neighbor.q + "," + neighbor.r);
      });
    });

    allKeys.forEach(function (key) {
      var parsed = parseHexKey(key);
      var current = cells[key] || null;
      var neighborCounts = countNeighborTerrains(cells, parsed.q, parsed.r);
      var dominant = getDominantTerrain(neighborCounts);

      if (!dominant) {
        return;
      }

      if (!current && dominant.count >= state.options.isolatedCellThreshold + 1) {
        next[key] = createCell(dominant.terrain);
        return;
      }

      if (current && dominant.terrain !== current.terrain && dominant.count >= state.options.isolatedCellThreshold) {
        next[key] = createCell(dominant.terrain);
      }
    });

    return next;
  }

  function countNeighborTerrains(cells, q, r) {
    var counts = {};

    getNeighbors(q, r).forEach(function (neighbor) {
      var cell = cells[neighbor.q + "," + neighbor.r];

      if (!cell || !cell.terrain) {
        return;
      }

      counts[cell.terrain] = (counts[cell.terrain] || 0) + 1;
    });

    return counts;
  }

  function getDominantTerrain(counts) {
    var best = null;

    Object.keys(counts).forEach(function (terrain) {
      if (!best || counts[terrain] > best.count) {
        best = {
          terrain: terrain,
          count: counts[terrain],
        };
      }
    });

    return best;
  }

  function createCell(terrain) {
    return {
      terrain: terrain,
      road: false,
      bridge: false,
      tunnel: false,
      waterType: "",
      risk: getTerrainRisk(terrain),
      blocked: terrain === "blocked",
      tags: [],
    };
  }

  function buildModalMarkup() {
    return (
      '<div class="terrain-auto-reveal-modal__backdrop" data-auto-reveal-close></div>' +
      '<article class="terrain-auto-reveal-modal__card">' +
      '<header class="terrain-auto-reveal-modal__header">' +
      '<div>' +
      '<p class="terrain-auto-reveal-modal__eyebrow">Travel Grid</p>' +
      '<h2>Auto Reveal Terrain</h2>' +
      '</div>' +
      '<button type="button" class="terrain-auto-reveal-modal__icon" data-auto-reveal-close aria-label="Chiudi"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
      '</header>' +
      '<section class="terrain-auto-reveal-modal__stats" data-auto-reveal-stats></section>' +
      '<section class="terrain-auto-reveal-modal__body">' +
      '<div class="terrain-auto-reveal-modal__section-head"><span>Terreni</span><small>spunta solo quelli da rilevare · fino a 5 colori per terreno</small></div>' +
      '<div class="terrain-auto-reveal-palette" data-auto-reveal-palette></div>' +
      '<div class="terrain-auto-reveal-modal__section-head"><span>Colori ignorati</span><small>etichette, linee, bordi, rumore</small></div>' +
      '<div class="terrain-auto-reveal-ignore">' +
      '<div class="terrain-auto-reveal-ignore__chips" data-auto-reveal-ignore></div>' +
      '<button type="button" class="terrain-auto-reveal-button terrain-auto-reveal-button--ghost" data-auto-reveal-pick-ignore><i class="fa-solid fa-eye-dropper" aria-hidden="true"></i><span>Pick ignore color</span></button>' +
      '</div>' +
      '</section>' +
      '<footer class="terrain-auto-reveal-modal__footer">' +
      '<button type="button" class="terrain-auto-reveal-button terrain-auto-reveal-button--ghost" data-auto-reveal-discard>Discard</button>' +
      '<button type="button" class="terrain-auto-reveal-button terrain-auto-reveal-button--ghost" data-auto-reveal-export disabled><i class="fa-solid fa-file-export" aria-hidden="true"></i><span>Export chunks</span></button>' +
      '<button type="button" class="terrain-auto-reveal-button" data-auto-reveal-analyze><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i><span>Analyze</span></button>' +
      '<button type="button" class="terrain-auto-reveal-button terrain-auto-reveal-button--primary" data-auto-reveal-apply disabled><i class="fa-solid fa-check" aria-hidden="true"></i><span>Apply</span></button>' +
      '</footer>' +
      '</article>'
    );
  }

  function bindModalEvents(modal) {
    modal.addEventListener("click", function (event) {
      var close = event.target.closest("[data-auto-reveal-close]");
      var analyzeButton = event.target.closest("[data-auto-reveal-analyze]");
      var applyButton = event.target.closest("[data-auto-reveal-apply]");
      var exportButton = event.target.closest("[data-auto-reveal-export]");
      var discardButton = event.target.closest("[data-auto-reveal-discard]");
      var pickTerrain = event.target.closest("[data-auto-reveal-pick-terrain]");
      var pickIgnore = event.target.closest("[data-auto-reveal-pick-ignore]");
      var removeColor = event.target.closest("[data-auto-reveal-remove-color]");
      var removeIgnore = event.target.closest("[data-auto-reveal-remove-ignore]");
      var terrainToggle = event.target.closest("[data-auto-reveal-terrain-toggle]");

      if (close) {
        closeModal();
        return;
      }

      if (terrainToggle) {
        toggleTerrainEnabled(terrainToggle.getAttribute("data-auto-reveal-terrain-toggle"));
        return;
      }

      if (pickTerrain) {
        startPicker({ type: "terrain", terrain: pickTerrain.getAttribute("data-auto-reveal-pick-terrain") });
        return;
      }

      if (pickIgnore) {
        startPicker({ type: "ignore" });
        return;
      }

      if (removeColor) {
        removeTerrainColor(removeColor.getAttribute("data-terrain"), Number(removeColor.getAttribute("data-index")));
        return;
      }

      if (removeIgnore) {
        state.ignoredColors.splice(Number(removeIgnore.getAttribute("data-index")), 1);
        renderIgnoredColors();
        return;
      }

      if (analyzeButton) {
        runModalAnalyze(analyzeButton);
        return;
      }

      if (applyButton) {
        if (applyPreview()) {
          closeModal();
        }
        return;
      }

      if (exportButton) {
        runExportPreviewChunks(exportButton);
        return;
      }

      if (discardButton) {
        discardPreview();
        renderStats(null);
        setApplyEnabled(false);
        setExportEnabled(false);
      }
    });

    modal.addEventListener("change", function (event) {
      var input = event.target.closest("[data-auto-reveal-color-input]");

      if (!input || !isHexColor(input.value)) {
        return;
      }

      addTerrainColor(input.getAttribute("data-auto-reveal-color-input"), input.value);
      input.value = "#000000";
    });
  }

  function renderPaletteRows() {
    var mount = state.modal ? state.modal.querySelector("[data-auto-reveal-palette]") : null;

    if (!mount) {
      return;
    }

    mount.innerHTML = Object.keys(DEFAULT_PALETTE).map(function (terrain) {
      var colors = state.palette[terrain] || [];
      var chips = colors.map(function (color, index) {
        return (
          '<button type="button" class="terrain-auto-reveal-chip" data-auto-reveal-remove-color data-terrain="' + terrain + '" data-index="' + index + '" title="Remove ' + color + '">' +
          '<span style="background:' + color + '"></span><code>' + color + '</code>' +
          '</button>'
        );
      }).join("");
      var disabled = colors.length >= 5 ? " disabled" : "";
      var checked = state.enabledTerrains[terrain] !== false ? " checked" : "";
      var isDisabled = state.enabledTerrains[terrain] === false ? " is-disabled" : "";

      return (
        '<div class="terrain-auto-reveal-row' + isDisabled + '">' +
        '<label class="terrain-auto-reveal-row__terrain">' +
        '<input type="checkbox" data-auto-reveal-terrain-toggle="' + terrain + '"' + checked + ' />' +
        '<strong>' + escapeHtml(TERRAIN_LABELS[terrain] || terrain) + '</strong>' +
        '</label>' +
        '<div class="terrain-auto-reveal-row__colors">' + chips + '</div>' +
        '<div class="terrain-auto-reveal-row__actions">' +
        '<label class="terrain-auto-reveal-modal__icon" title="Add color manually">' +
        '<input type="color" data-auto-reveal-color-input="' + terrain + '"' + disabled + ' />' +
        '<i class="fa-solid fa-palette" aria-hidden="true"></i>' +
        '</label>' +
        '<button type="button" class="terrain-auto-reveal-modal__icon" data-auto-reveal-pick-terrain="' + terrain + '"' + disabled + ' title="Pick from map"><i class="fa-solid fa-eye-dropper" aria-hidden="true"></i></button>' +
        '</div>' +
        '</div>'
      );
    }).join("");
  }

  function toggleTerrainEnabled(terrain) {
    if (!Object.prototype.hasOwnProperty.call(state.enabledTerrains, terrain)) {
      return;
    }

    state.enabledTerrains[terrain] = !state.enabledTerrains[terrain];
    renderPaletteRows();
  }

  function renderIgnoredColors() {
    var mount = state.modal ? state.modal.querySelector("[data-auto-reveal-ignore]") : null;

    if (!mount) {
      return;
    }

    if (!state.ignoredColors.length) {
      mount.innerHTML = '<p class="terrain-auto-reveal-empty">Nessun colore ignorato.</p>';
      return;
    }

    mount.innerHTML = state.ignoredColors.map(function (color, index) {
      return (
        '<button type="button" class="terrain-auto-reveal-chip" data-auto-reveal-remove-ignore data-index="' + index + '" title="Remove ' + color + '">' +
        '<span style="background:' + color + '"></span><code>' + color + '</code>' +
        '</button>'
      );
    }).join("");
  }

  function renderStats(stats) {
    var mount = state.modal ? state.modal.querySelector("[data-auto-reveal-stats]") : null;

    if (!mount) {
      return;
    }

    var terrainSummary = stats && stats.byTerrain
      ? Object.keys(stats.byTerrain).map(function (terrain) {
          return buildTerrainSummaryBadge(terrain, stats.byTerrain[terrain]);
        }).join("")
      : '<span class="terrain-auto-reveal-summary-empty">In attesa di analisi.</span>';

    mount.innerHTML =
      '<div><small>Hex da analizzare</small><strong>' + state.estimatedHexCount + '</strong></div>' +
      '<div><small>Ambito</small><strong>Mappa intera</strong></div>' +
      '<div><small>Hex colorati</small><strong>' + (stats && stats.painted ? stats.painted : '—') + '</strong></div>' +
      '<div><small>Chunk coinvolti</small><strong>' + (stats && stats.chunkCount ? stats.chunkCount : '—') + '</strong></div>' +
      '<div class="terrain-auto-reveal-modal__terrain-summary">' + terrainSummary + '</div>';
  }

  function renderAnalyzingState() {
    var mount = state.modal ? state.modal.querySelector("[data-auto-reveal-stats]") : null;

    if (!mount) {
      return;
    }

    mount.innerHTML =
      '<div><small>Hex da analizzare</small><strong>' + state.estimatedHexCount + '</strong></div>' +
      '<div><small>Ambito</small><strong>Mappa intera</strong></div>' +
      '<div><small>Stato</small><strong><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Analisi</strong></div>' +
      '<div class="terrain-auto-reveal-modal__terrain-summary terrain-auto-reveal-modal__terrain-summary--loading">' +
      '<span class="terrain-auto-reveal-loading"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Calcolo terreni in corso…</span></span>' +
      '</div>';
  }

  function buildTerrainSummaryBadge(terrain, count) {
    var label = TERRAIN_LABELS[terrain] || terrain;
    var icon = TERRAIN_ICONS[terrain] || "fa-hexagon";
    var color = getTerrainColor(terrain);

    return (
      '<span class="terrain-auto-reveal-summary-badge" title="' + escapeHtml(label + ': ' + count) + '">' +
      '<span class="terrain-auto-reveal-summary-badge__icon" style="--terrain-color:' + escapeHtml(color) + '"><i class="fa-solid ' + escapeHtml(icon) + '" aria-hidden="true"></i></span>' +
      '<strong>' + count + '</strong>' +
      '</span>'
    );
  }

  function getTerrainColor(terrain) {
    var firstColor = state.palette[terrain] && state.palette[terrain][0];
    return firstColor || "#8CA0A8";
  }

  function setApplyEnabled(enabled) {
    var button = state.modal ? state.modal.querySelector("[data-auto-reveal-apply]") : null;

    if (button) {
      button.disabled = !enabled;
    }
  }

  function setExportEnabled(enabled) {
    var button = state.modal ? state.modal.querySelector("[data-auto-reveal-export]") : null;

    if (button) {
      button.disabled = !enabled;
    }
  }

  function runModalAnalyze(button) {
    var original = button ? button.innerHTML : "";

    if (button) {
      button.disabled = true;
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Analyzing</span>';
    }

    setApplyEnabled(false);
    setExportEnabled(false);
    renderAnalyzingState();

    waitForPaint().then(function () {
      return analyze();
    }).then(function (result) {
      renderStats(result.stats);
      setApplyEnabled(true);
      setExportEnabled(true);
    }).catch(function (error) {
      console.error("Auto Reveal failed:", error);
      window.alert(error && error.message ? error.message : "Auto Reveal failed.");
      renderStats(null);
      setApplyEnabled(false);
      setExportEnabled(false);
    }).finally(function () {
      if (button) {
        button.disabled = false;
        button.innerHTML = original;
      }
    });
  }

  function waitForPaint() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(resolve);
      });
    });
  }

  function startPicker(picker) {
    stopPicker();
    state.picker = picker;
    state.pickTargetLabel = picker.type === "ignore"
      ? "colore ignorato"
      : (TERRAIN_LABELS[picker.terrain] || picker.terrain || "terreno");

    document.body.classList.add("terrain-auto-reveal-picking");

    if (state.modal) {
      state.modal.classList.add("is-picking");
      state.modal.setAttribute("data-picking-label", state.pickTargetLabel);
    }

    var map = getLeafletMap();
    var container = map ? map.getContainer() : null;

    if (!container) {
      window.alert("Map picker unavailable.");
      stopPicker();
      return;
    }

    container.addEventListener("pointerdown", handleMapPickPointerDown, true);
    window.addEventListener("keydown", handlePickerKeydown, true);
  }

  function stopPicker() {
    var map = getLeafletMap();
    var container = map ? map.getContainer() : null;

    if (container) {
      container.removeEventListener("pointerdown", handleMapPickPointerDown, true);
    }

    window.removeEventListener("keydown", handlePickerKeydown, true);

    if (state.modal) {
      state.modal.classList.remove("is-picking");
      state.modal.removeAttribute("data-picking-label");
    }

    state.picker = null;
    state.isPickingColor = false;
    state.pickTargetLabel = "";
    document.body.classList.remove("terrain-auto-reveal-picking");
  }

  function handlePickerKeydown(event) {
    if (event.key === "Escape") {
      stopPicker();
    }
  }

  async function handleMapPickPointerDown(event) {
    var picker = state.picker;

    if (!picker || state.isPickingColor) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    state.isPickingColor = true;
    event.preventDefault();
    event.stopPropagation();

    if (event.stopImmediatePropagation) {
      event.stopImmediatePropagation();
    }

    try {
      var map = getLeafletMap();
      var container = map.getContainer();
      var rect = container.getBoundingClientRect();
      var point = L.point(event.clientX - rect.left, event.clientY - rect.top);
      var latlng = map.containerPointToLatLng(point);
      var imagePoint = state.world.toImagePoint(latlng);
      var raster = await getRasterReader();
      var color = raster.getPixel(imagePoint.x, imagePoint.y);
      var hex = rgbToHex(color.r, color.g, color.b);

      if (picker.type === "ignore") {
        addIgnoredColor(hex);
      } else {
        addTerrainColor(picker.terrain, hex);
      }
    } catch (error) {
      console.error("Color picker failed:", error);
      window.alert(error && error.message ? error.message : "Color picker failed.");
    } finally {
      state.isPickingColor = false;
      stopPicker();
    }
  }

  function addTerrainColor(terrain, color) {
    if (!terrain || !state.palette[terrain] || !isHexColor(color)) {
      return;
    }

    var normalized = color.toUpperCase();

    if (state.palette[terrain].indexOf(normalized) === -1 && state.palette[terrain].length < 5) {
      state.palette[terrain].push(normalized);
    }

    renderPaletteRows();
  }

  function removeTerrainColor(terrain, index) {
    if (!state.palette[terrain]) {
      return;
    }

    state.palette[terrain].splice(index, 1);

    if (!state.palette[terrain].length && DEFAULT_PALETTE[terrain]) {
      state.palette[terrain] = DEFAULT_PALETTE[terrain].slice();
    }

    renderPaletteRows();
  }

  function addIgnoredColor(color) {
    var normalized = String(color || "").toUpperCase();

    if (isHexColor(normalized) && state.ignoredColors.indexOf(normalized) === -1 && state.ignoredColors.length < 10) {
      state.ignoredColors.push(normalized);
    }

    renderIgnoredColors();
  }

  function getLeafletMap() {
    if (state.travel && typeof state.travel.getState === "function") {
      return state.travel.getState().map || null;
    }

    return null;
  }

  function buildStats(cells, rawStats) {
    var counts = {};
    var chunkCounts = {};

    Object.keys(cells).forEach(function (key) {
      var terrain = cells[key].terrain;
      var parsed = parseHexKey(key);
      var chunkKey = getCellChunkKey(parsed.q, parsed.r);

      counts[terrain] = (counts[terrain] || 0) + 1;
      chunkCounts[chunkKey] = (chunkCounts[chunkKey] || 0) + 1;
    });

    return Object.assign({}, rawStats || {}, {
      painted: Object.keys(cells).length,
      byTerrain: counts,
      byChunk: chunkCounts,
      chunkCount: Object.keys(chunkCounts).length,
    });
  }

  function readTravelConfig() {
    if (state.travel && typeof state.travel.getConfig === "function") {
      return state.travel.getConfig();
    }

    return {
      hexSize: 10,
      defaultTerrain: "plain",
    };
  }

  function estimateHexBounds(width, height, size) {
    var corners = [
      pixelToHex(0, 0, size),
      pixelToHex(width, 0, size),
      pixelToHex(0, height, size),
      pixelToHex(width, height, size),
    ];

    return {
      qMin: Math.min.apply(null, corners.map(function (h) { return h.q; })) - 4,
      qMax: Math.max.apply(null, corners.map(function (h) { return h.q; })) + 4,
      rMin: Math.min.apply(null, corners.map(function (h) { return h.r; })) - 4,
      rMax: Math.max.apply(null, corners.map(function (h) { return h.r; })) + 4,
    };
  }

  function hexToPixel(q, r, size) {
    return {
      x: size * Math.sqrt(3) * (q + r / 2),
      y: size * 1.5 * r,
    };
  }

  function pixelToHex(x, y, size) {
    var q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / size;
    var r = ((2 / 3) * y) / size;
    return roundAxial(q, r);
  }

  function roundAxial(q, r) {
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

  function getNeighbors(q, r) {
    return [
      { q: q + 1, r: r },
      { q: q + 1, r: r - 1 },
      { q: q, r: r - 1 },
      { q: q - 1, r: r },
      { q: q - 1, r: r + 1 },
      { q: q, r: r + 1 },
    ];
  }

  function parseHexKey(key) {
    var parts = String(key).split(",");
    return {
      q: Number(parts[0]) || 0,
      r: Number(parts[1]) || 0,
    };
  }

  function isPointInside(x, y, width, height) {
    return x >= 0 && y >= 0 && x <= width && y <= height;
  }

  function getTerrainRisk(terrain) {
    var risks = {
      plain: 0,
      forest: 1,
      hill: 1,
      mountain: 2,
      swamp: 2,
      water: 1,
      desert: 2,
      arctic: 2,
      blocked: 5,
    };

    return risks[terrain] || 0;
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = function () {
        resolve(image);
      };
      image.onerror = reject;
      image.src = src;
    });
  }

  function normalizePalette(palette) {
    var normalized = {};

    Object.keys(palette || {}).forEach(function (terrain) {
      normalized[terrain] = (palette[terrain] || []).filter(isHexColor);
    });

    return normalized;
  }

  function clonePalette(palette) {
    var clone = {};

    Object.keys(palette || {}).forEach(function (terrain) {
      clone[terrain] = palette[terrain].slice();
    });

    return clone;
  }

  function cloneCells(cells) {
    var clone = {};

    Object.keys(cells || {}).forEach(function (key) {
      clone[key] = Object.assign({}, cells[key]);
    });

    return clone;
  }

  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(function (value) {
      return Math.max(0, Math.min(255, Number(value) || 0)).toString(16).padStart(2, "0");
    }).join("").toUpperCase();
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function injectStyles() {
    if (document.getElementById("terrain-auto-reveal-styles")) {
      return;
    }

    var style = document.createElement("style");
    style.id = "terrain-auto-reveal-styles";
    style.textContent = "\
.terrain-auto-reveal-modal{position:fixed;inset:0;z-index:14000;display:grid;place-items:center;padding:1rem;pointer-events:none;}\
.terrain-auto-reveal-modal__backdrop{position:absolute;inset:0;background:rgba(4,8,10,.68);backdrop-filter:blur(4px);pointer-events:auto;}\
.terrain-auto-reveal-modal__card{position:relative;z-index:1;width:min(760px,calc(100vw - 2rem));max-height:min(820px,calc(100vh - 2rem));display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;border:1px solid rgba(80,120,130,.54);border-radius:14px;background:rgba(13,22,27,.98);color:var(--text,#e7edef);box-shadow:0 24px 70px rgba(0,0,0,.72);overflow:hidden;pointer-events:auto;transition:transform .18s ease,opacity .18s ease,width .18s ease;}\
.terrain-auto-reveal-modal__header,.terrain-auto-reveal-modal__footer{display:flex;align-items:center;justify-content:space-between;gap:.65rem;padding:.8rem .95rem;border-bottom:1px solid rgba(83,126,142,.32);}\
.terrain-auto-reveal-modal__footer{justify-content:flex-end;border-top:1px solid rgba(83,126,142,.32);border-bottom:0;}\
.terrain-auto-reveal-modal__eyebrow{margin:0;color:var(--text-dim,#9fb0b6);font-size:.68rem;text-transform:uppercase;letter-spacing:.1em;}\
.terrain-auto-reveal-modal h2{margin:.12rem 0 0;font-size:1rem;}\
.terrain-auto-reveal-modal__body{min-height:0;display:grid;gap:.8rem;padding:.85rem .95rem;overflow:auto;}\
.terrain-auto-reveal-modal__stats{display:grid;grid-template-columns:repeat(2, minmax(0,1fr));gap:.5rem;padding:.75rem .95rem;border-bottom:1px solid rgba(83,126,142,.32);}\
.terrain-auto-reveal-modal__stats div{padding:.48rem .55rem;border:1px solid rgba(80,120,130,.32);border-radius:8px;background:rgba(20,32,38,.58);}\
.terrain-auto-reveal-modal__stats small{display:block;color:var(--text-dim,#9fb0b6);font-size:.64rem;text-transform:uppercase;letter-spacing:.08em;}\
.terrain-auto-reveal-modal__stats strong{font-size:.95rem;}\
.terrain-auto-reveal-modal__terrain-summary{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:.35rem;}\
.terrain-auto-reveal-summary-empty{font-size:.72rem;color:var(--text-dim,#9fb0b6);}.terrain-auto-reveal-loading{display:inline-flex;align-items:center;gap:.42rem;color:var(--accent-strong,#71ddca);font-size:.78rem;font-weight:700;}.terrain-auto-reveal-summary-badge{min-height:30px;display:inline-flex;align-items:center;gap:.32rem;padding:.16rem .38rem;border:1px solid rgba(80,120,130,.36);border-radius:999px;background:rgba(14,23,28,.68);color:var(--text,#e7edef);}.terrain-auto-reveal-summary-badge__icon{width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:var(--terrain-color);color:rgba(255,255,255,.92);}.terrain-auto-reveal-summary-badge__icon i{font-size:.72rem;filter:drop-shadow(0 1px 2px rgba(0,0,0,.62));}.terrain-auto-reveal-summary-badge strong{font-size:.78rem;}\
.terrain-auto-reveal-modal__section-head{display:flex;justify-content:space-between;gap:.75rem;color:var(--text-dim,#9fb0b6);font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;}\
.terrain-auto-reveal-modal__section-head small{text-transform:none;letter-spacing:0;opacity:.72;}\
.terrain-auto-reveal-palette{display:grid;gap:.38rem;}\
.terrain-auto-reveal-row{display:grid;grid-template-columns:130px minmax(0,1fr) auto;align-items:center;gap:.55rem;padding:.42rem;border:1px solid rgba(80,120,130,.28);border-radius:8px;background:rgba(20,32,38,.45);}.terrain-auto-reveal-row.is-disabled{opacity:.48;}\
.terrain-auto-reveal-row strong{font-size:.78rem;}.terrain-auto-reveal-row__terrain{display:flex;align-items:center;gap:.42rem;cursor:pointer;}.terrain-auto-reveal-row__terrain input{accent-color:var(--accent-strong,#71ddca);}\
.terrain-auto-reveal-row__colors,.terrain-auto-reveal-ignore__chips{display:flex;flex-wrap:wrap;gap:.3rem;}\
.terrain-auto-reveal-row__actions{display:flex;gap:.3rem;}\
.terrain-auto-reveal-chip{display:inline-flex;align-items:center;gap:.25rem;min-height:26px;padding:.16rem .32rem;border:1px solid rgba(80,120,130,.36);border-radius:999px;background:rgba(14,23,28,.74);color:var(--text-dim,#9fb0b6);cursor:pointer;}\
.terrain-auto-reveal-chip span{width:16px;height:16px;border-radius:999px;border:1px solid rgba(255,255,255,.28);}\
.terrain-auto-reveal-chip code{font-size:.68rem;}\
.terrain-auto-reveal-modal__icon{width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(80,120,130,.42);border-radius:8px;background:rgba(20,32,38,.72);color:var(--text-dim,#9fb0b6);cursor:pointer;padding:0;}\
.terrain-auto-reveal-modal__icon input{position:absolute;opacity:0;pointer-events:none;}\
.terrain-auto-reveal-modal__icon:hover,.terrain-auto-reveal-button:hover{border-color:rgba(113,221,202,.68);color:var(--accent-strong,#71ddca);background:rgba(24,44,48,.95);}\
.terrain-auto-reveal-ignore{display:grid;gap:.45rem;}\
.terrain-auto-reveal-empty{margin:0;color:var(--text-dim,#9fb0b6);font-size:.76rem;}\
.terrain-auto-reveal-button{min-height:34px;display:inline-flex;align-items:center;justify-content:center;gap:.4rem;border:1px solid rgba(80,120,130,.42);border-radius:8px;background:rgba(20,32,38,.72);color:var(--text,#e7edef);cursor:pointer;font:inherit;font-size:.8rem;padding:.35rem .65rem;}\
.terrain-auto-reveal-button--primary{border-color:rgba(113,221,202,.62);color:var(--accent-strong,#71ddca);}\
.terrain-auto-reveal-button--ghost{color:var(--text-dim,#9fb0b6);}\
.terrain-auto-reveal-button:disabled,.terrain-auto-reveal-modal__icon:disabled{opacity:.45;cursor:default;}\
.terrain-auto-reveal-modal.is-picking{place-items:start end;padding:1rem;pointer-events:none;}\
.terrain-auto-reveal-modal.is-picking .terrain-auto-reveal-modal__backdrop{display:none;}\
.terrain-auto-reveal-modal.is-picking .terrain-auto-reveal-modal__card{width:320px;max-height:96px;grid-template-rows:auto;opacity:.92;pointer-events:auto;}\
.terrain-auto-reveal-modal.is-picking .terrain-auto-reveal-modal__stats,.terrain-auto-reveal-modal.is-picking .terrain-auto-reveal-modal__body,.terrain-auto-reveal-modal.is-picking .terrain-auto-reveal-modal__footer{display:none;}\
.terrain-auto-reveal-modal.is-picking .terrain-auto-reveal-modal__header{border-bottom:0;}\
.terrain-auto-reveal-modal.is-picking .terrain-auto-reveal-modal__header h2{font-size:.86rem;}\
.terrain-auto-reveal-modal.is-picking .terrain-auto-reveal-modal__header h2::after{content:'Pick: ' attr(data-picking-label);display:block;margin-top:.18rem;color:var(--accent-strong,#71ddca);font-size:.72rem;font-weight:700;}\
body.terrain-auto-reveal-picking .leaflet-container{cursor:crosshair!important;}\
";
    document.head.appendChild(style);
  }

  function isHexColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || ""));
  }

  function hexToRgb(hex) {
    var value = String(hex || "").replace("#", "");
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }

  function hexToLab(hex) {
    var rgb = hexToRgb(hex);
    return rgbToLab(rgb.r, rgb.g, rgb.b);
  }

  function rgbToLab(r, g, b) {
    var xyz = rgbToXyz(r, g, b);
    return xyzToLab(xyz.x, xyz.y, xyz.z);
  }

  function rgbToXyz(r, g, b) {
    r = pivotRgb(r / 255);
    g = pivotRgb(g / 255);
    b = pivotRgb(b / 255);

    return {
      x: (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047,
      y: (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0,
      z: (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883,
    };
  }

  function pivotRgb(value) {
    return value > 0.04045 ? Math.pow((value + 0.055) / 1.055, 2.4) : value / 12.92;
  }

  function xyzToLab(x, y, z) {
    x = pivotXyz(x);
    y = pivotXyz(y);
    z = pivotXyz(z);

    return {
      l: 116 * y - 16,
      a: 500 * (x - y),
      b: 200 * (y - z),
    };
  }

  function pivotXyz(value) {
    return value > 0.008856 ? Math.pow(value, 1 / 3) : 7.787 * value + 16 / 116;
  }

  function deltaE(a, b) {
    var dl = a.l - b.l;
    var da = a.a - b.a;
    var db = a.b - b.b;
    return Math.sqrt(dl * dl + da * da + db * db);
  }

  function roundTo(value, digits) {
    var factor = Math.pow(10, digits || 2);
    return Math.round(value * factor) / factor;
  }
})();
