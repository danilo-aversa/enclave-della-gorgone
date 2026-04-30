// v0.5 2026-04-30T21:55:00.000Z
(function () {
  "use strict";

  var DEFAULT_CHUNK_SIZE = 128;
  var DEFAULT_STORAGE_PREFIX = "enclave.travelGridStore";
  var DEFAULT_MAX_LOADED_CHUNKS = 96;

  var state = {
    mapId: "faerun",
    mapWidth: 0,
    mapHeight: 0,
    hexSize: 10,
    milesPerHex: 1,
    defaultTerrain: "plain",
    chunkSize: DEFAULT_CHUNK_SIZE,
    staticBasePath: "",
    storagePrefix: DEFAULT_STORAGE_PREFIX,
    chunks: new Map(),
    pendingLoads: new Map(),
    dirtyChunks: new Set(),
    chunkAccessOrder: [],
    maxLoadedChunks: DEFAULT_MAX_LOADED_CHUNKS,
    loadedStaticIndex: false,
    useLocalOverride: true,
    hasAvailableChunkIndex: false,
    availableChunkKeys: new Set(),
    missingStaticChunkKeys: new Set(),
  };

  window.EnclaveTravelGridStore = {
    init: init,
    configure: configure,
    reset: reset,
    getConfig: getConfig,
    getCell: getCell,
    getTerrain: getTerrain,
    setCell: setCell,
    patchCell: patchCell,
    deleteCell: deleteCell,
    hasCell: hasCell,
    getVisibleCells: getVisibleCells,
    getCellsInBounds: getCellsInBounds,
    loadChunksForBounds: loadChunksForBounds,
    loadChunk: loadChunk,
    ensureChunk: ensureChunk,
    markChunkDirty: markChunkDirty,
    getDirtyChunkKeys: getDirtyChunkKeys,
    flushDirtyChunksToLocalStorage: flushDirtyChunksToLocalStorage,
    clearLocalOverride: clearLocalOverride,
    importUnifiedPayload: importUnifiedPayload,
    exportUnifiedPayload: exportUnifiedPayload,
    exportChunkPayload: exportChunkPayload,
    importChunkPayload: importChunkPayload,
    getChunkKeyForHex: getChunkKeyForHex,
    getLoadedChunkKeys: getLoadedChunkKeys,
    forEachLoadedCell: forEachLoadedCell,
    compact: compact,
    evictColdChunks: evictColdChunks,
  };

  function init(options) {
    reset();
    configure(options || {});

    if (options && options.initialPayload) {
      importUnifiedPayload(options.initialPayload, { markDirty: false });
    }

    loadLocalOverrideIndex();
    return window.EnclaveTravelGridStore;
  }

  function configure(options) {
    options = options || {};

    state.mapId = options.mapId || state.mapId;
    state.mapWidth = Number(options.mapWidth) || state.mapWidth;
    state.mapHeight = Number(options.mapHeight) || state.mapHeight;
    state.hexSize = Number(options.hexSize) || state.hexSize;
    state.milesPerHex = Number(options.milesPerHex) || state.milesPerHex;
    state.defaultTerrain = options.defaultTerrain || state.defaultTerrain;
    state.chunkSize = Number(options.chunkSize) || state.chunkSize || DEFAULT_CHUNK_SIZE;
    state.staticBasePath = options.staticBasePath || state.staticBasePath;
    state.storagePrefix = options.storagePrefix || state.storagePrefix || DEFAULT_STORAGE_PREFIX;
    state.useLocalOverride = options.useLocalOverride !== false;
    state.maxLoadedChunks = Number(options.maxLoadedChunks) || state.maxLoadedChunks || DEFAULT_MAX_LOADED_CHUNKS;

    if (Array.isArray(options.availableChunkKeys)) {
      state.hasAvailableChunkIndex = true;
      state.availableChunkKeys = new Set(options.availableChunkKeys.map(normalizeChunkKey).filter(Boolean));
    }
  }

  function reset() {
    state.chunks = new Map();
    state.pendingLoads = new Map();
    state.dirtyChunks = new Set();
    state.chunkAccessOrder = [];
    state.loadedStaticIndex = false;
    state.hasAvailableChunkIndex = false;
    state.availableChunkKeys = new Set();
    state.missingStaticChunkKeys = new Set();
  }

  function getConfig() {
    return {
      mapId: state.mapId,
      mapWidth: state.mapWidth,
      mapHeight: state.mapHeight,
      hexSize: state.hexSize,
      milesPerHex: state.milesPerHex,
      defaultTerrain: state.defaultTerrain,
      chunkSize: state.chunkSize,
      staticBasePath: state.staticBasePath,
      useLocalOverride: state.useLocalOverride,
      maxLoadedChunks: state.maxLoadedChunks,
      hasAvailableChunkIndex: state.hasAvailableChunkIndex,
      availableChunkKeys: Array.from(state.availableChunkKeys.values()).sort(),
      missingStaticChunkKeys: Array.from(state.missingStaticChunkKeys.values()).sort(),
    };
  }

  function getCell(q, r) {
    var chunk = getChunkForHex(q, r, false);

    if (!chunk) {
      return null;
    }

    touchChunk(chunk.key);
    return chunk.cells.get(hexKey(q, r)) || null;
  }

  function getTerrain(q, r) {
    var cell = getCell(q, r);
    return cell && cell.terrain ? cell.terrain : state.defaultTerrain;
  }

  function hasCell(q, r) {
    return !!getCell(q, r);
  }

  function setCell(q, r, cell, options) {
    options = options || {};

    if (!isFiniteHex(q, r)) {
      return null;
    }

    var chunk = getChunkForHex(q, r, true);
    var key = hexKey(q, r);
    var next = normalizeCell(cell || {}, q, r);

    if (isDefaultCell(next)) {
      chunk.cells.delete(key);
    } else {
      chunk.cells.set(key, next);
    }

    touchChunk(chunk.key);

    if (options.markDirty !== false) {
      markChunkDirty(chunk.key);
    }

    return next;
  }

  function patchCell(q, r, patch, options) {
    var existing = getCell(q, r) || { q: Number(q), r: Number(r), terrain: state.defaultTerrain };
    return setCell(q, r, Object.assign({}, existing, patch || {}), options);
  }

  function deleteCell(q, r, options) {
    options = options || {};

    var chunk = getChunkForHex(q, r, false);

    if (!chunk) {
      return false;
    }

    var removed = chunk.cells.delete(hexKey(q, r));

    if (removed && options.markDirty !== false) {
      markChunkDirty(chunk.key);
    }

    return removed;
  }

  function getVisibleCells(bounds) {
    return getCellsInBounds(bounds);
  }

  function getCellsInBounds(bounds) {
    var range = normalizeHexBounds(bounds);
    var result = [];
    var chunkKeys = getChunkKeysForHexBounds(range);

    chunkKeys.forEach(function (chunkKey) {
      var chunk = state.chunks.get(chunkKey);

      if (!chunk) {
        return;
      }

      chunk.cells.forEach(function (cell) {
        if (cell.q < range.minQ || cell.q > range.maxQ || cell.r < range.minR || cell.r > range.maxR) {
          return;
        }

        result.push(cloneCell(cell));
      });
    });

    return result;
  }

  function loadChunksForBounds(bounds) {
    var range = normalizeHexBounds(bounds);
    var chunkKeys = getChunkKeysForHexBounds(range);
    return Promise.all(chunkKeys.map(loadChunk)).then(function () {
      evictColdChunks(chunkKeys.filter(function (chunkKey) {
        return state.chunks.has(chunkKey);
      }));
      return getKnownChunkKeys().filter(function (chunkKey) {
        return chunkKeys.indexOf(chunkKey) !== -1;
      });
    });
  }

  function loadChunk(chunkKey) {
    if (state.chunks.has(chunkKey)) {
      touchChunk(chunkKey);
      return Promise.resolve(state.chunks.get(chunkKey));
    }

    if (state.pendingLoads.has(chunkKey)) {
      return state.pendingLoads.get(chunkKey);
    }

    var promise = Promise.resolve()
      .then(function () {
        var localPayload = state.useLocalOverride ? loadLocalChunk(chunkKey) : null;

        if (localPayload) {
          return importChunkPayload(localPayload, { markDirty: false });
        }

        if (!state.staticBasePath || !canFetchStaticChunk(chunkKey)) {
          markStaticChunkMissing(chunkKey);
          return null;
        }

        return fetchChunkPayload(chunkKey).then(function (payload) {
          if (!payload) {
            markStaticChunkMissing(chunkKey);
            return null;
          }

          return importChunkPayload(payload, { markDirty: false });
        });
      })
      .finally(function () {
        state.pendingLoads.delete(chunkKey);
      });

    state.pendingLoads.set(chunkKey, promise);
    return promise;
  }

  function ensureChunk(chunkKey) {
    var parsed = parseChunkKey(chunkKey);

    if (!parsed) {
      return null;
    }

    if (!state.chunks.has(chunkKey)) {
      state.chunks.set(chunkKey, createChunk(parsed.chunkQ, parsed.chunkR));
    }

    touchChunk(chunkKey);
    return state.chunks.get(chunkKey);
  }

  function markChunkDirty(chunkKey) {
    if (chunkKey) {
      state.dirtyChunks.add(chunkKey);
    }
  }

  function getDirtyChunkKeys() {
    return Array.from(state.dirtyChunks.values()).sort();
  }

  function flushDirtyChunksToLocalStorage() {
    var dirtyKeys = getDirtyChunkKeys();

    dirtyKeys.forEach(function (chunkKey) {
      var payload = exportChunkPayload(chunkKey);

      if (!payload) {
        return;
      }

      window.localStorage.setItem(getLocalChunkKey(chunkKey), JSON.stringify(payload));
    });

    saveLocalOverrideIndex();
    state.dirtyChunks.clear();
    return dirtyKeys;
  }

  function clearLocalOverride() {
    var prefix = getLocalPrefix();
    var keys = [];

    for (var i = 0; i < window.localStorage.length; i += 1) {
      var key = window.localStorage.key(i);

      if (key && key.indexOf(prefix) === 0) {
        keys.push(key);
      }
    }

    keys.forEach(function (key) {
      window.localStorage.removeItem(key);
    });

    state.dirtyChunks.clear();
    return keys.length;
  }

  function importUnifiedPayload(payload, options) {
    options = options || {};

    if (!payload || typeof payload !== "object") {
      throw new Error("Missing grid payload.");
    }

    if (payload.mapId && payload.mapId !== state.mapId) {
      throw new Error("Grid mapId mismatch: " + payload.mapId + " !== " + state.mapId);
    }

    configure({
      mapId: payload.mapId || state.mapId,
      mapWidth: payload.mapWidth || state.mapWidth,
      mapHeight: payload.mapHeight || state.mapHeight,
      hexSize: payload.hexSize || state.hexSize,
      milesPerHex: payload.milesPerHex || state.milesPerHex,
      defaultTerrain: payload.defaultTerrain || state.defaultTerrain,
    });

    importTerrainRle(payload.terrain || {}, options);
    importFeatureRuns(payload.roads || [], "road", options);
    importFeatureRuns(payload.bridges || [], "bridge", options);
    importFeatureRuns(payload.tunnels || [], "tunnel", options);
    importFeatureRuns(payload.blocked || [], "blocked", options);
    importKeyedCellValues(payload.waterTypes || {}, "waterType", options);
    importKeyedCellValues(payload.risks || {}, "risk", options);

    if (payload.tags && typeof payload.tags === "object") {
      importTags(payload.tags, options);
    }

    return window.EnclaveTravelGridStore;
  }

  function exportUnifiedPayload() {
    var terrain = {};
    var roads = [];
    var bridges = [];
    var tunnels = [];
    var waterTypes = {};
    var blocked = [];
    var risks = {};
    var tags = {};

    forEachLoadedCell(function (cell) {
      if (cell.terrain && cell.terrain !== state.defaultTerrain) {
        if (!terrain[cell.terrain]) {
          terrain[cell.terrain] = [];
        }

        terrain[cell.terrain].push([cell.q, cell.r, 1]);
      }

      if (cell.road) roads.push([cell.q, cell.r, 1]);
      if (cell.bridge) bridges.push([cell.q, cell.r, 1]);
      if (cell.tunnel) tunnels.push([cell.q, cell.r, 1]);
      if (cell.blocked) blocked.push([cell.q, cell.r, 1]);
      if (cell.waterType) waterTypes[hexKey(cell.q, cell.r)] = cell.waterType;
      if (Number.isFinite(Number(cell.risk))) risks[hexKey(cell.q, cell.r)] = Number(cell.risk);
      if (cell.tags && Object.keys(cell.tags).length) tags[hexKey(cell.q, cell.r)] = cell.tags;
    });

    Object.keys(terrain).forEach(function (terrainKey) {
      terrain[terrainKey] = compactRuns(terrain[terrainKey]);
    });

    return {
      version: 3,
      format: "rle",
      storage: "unified",
      mapId: state.mapId,
      mapWidth: state.mapWidth,
      mapHeight: state.mapHeight,
      hexSize: state.hexSize,
      milesPerHex: state.milesPerHex,
      defaultTerrain: state.defaultTerrain,
      chunkSize: state.chunkSize,
      terrain: terrain,
      roads: compactRuns(roads),
      bridges: compactRuns(bridges),
      tunnels: compactRuns(tunnels),
      blocked: compactRuns(blocked),
      waterTypes: waterTypes,
      risks: risks,
      tags: tags,
    };
  }

  function exportChunkPayload(chunkKey) {
    var chunk = state.chunks.get(chunkKey);

    if (!chunk) {
      return null;
    }

    var terrain = {};
    var roads = [];
    var bridges = [];
    var tunnels = [];
    var waterTypes = {};
    var blocked = [];
    var risks = {};
    var tags = {};

    chunk.cells.forEach(function (cell) {
      if (cell.terrain && cell.terrain !== state.defaultTerrain) {
        if (!terrain[cell.terrain]) {
          terrain[cell.terrain] = [];
        }

        terrain[cell.terrain].push([cell.q, cell.r, 1]);
      }

      if (cell.road) roads.push([cell.q, cell.r, 1]);
      if (cell.bridge) bridges.push([cell.q, cell.r, 1]);
      if (cell.tunnel) tunnels.push([cell.q, cell.r, 1]);
      if (cell.blocked) blocked.push([cell.q, cell.r, 1]);
      if (cell.waterType) waterTypes[hexKey(cell.q, cell.r)] = cell.waterType;
      if (Number.isFinite(Number(cell.risk))) risks[hexKey(cell.q, cell.r)] = Number(cell.risk);
      if (cell.tags && Object.keys(cell.tags).length) tags[hexKey(cell.q, cell.r)] = cell.tags;
    });

    Object.keys(terrain).forEach(function (terrainKey) {
      terrain[terrainKey] = compactRuns(terrain[terrainKey]);
    });

    return {
      version: 1,
      format: "rle",
      storage: "chunk",
      mapId: state.mapId,
      mapWidth: state.mapWidth,
      mapHeight: state.mapHeight,
      hexSize: state.hexSize,
      milesPerHex: state.milesPerHex,
      defaultTerrain: state.defaultTerrain,
      chunkSize: state.chunkSize,
      chunkQ: chunk.chunkQ,
      chunkR: chunk.chunkR,
      terrain: terrain,
      roads: compactRuns(roads),
      bridges: compactRuns(bridges),
      tunnels: compactRuns(tunnels),
      blocked: compactRuns(blocked),
      waterTypes: waterTypes,
      risks: risks,
      tags: tags,
    };
  }

  function importChunkPayload(payload, options) {
    options = options || {};

    if (!payload || typeof payload !== "object") {
      throw new Error("Missing chunk payload.");
    }

    if (payload.mapId && payload.mapId !== state.mapId) {
      throw new Error("Chunk mapId mismatch: " + payload.mapId + " !== " + state.mapId);
    }

    var chunkQ = Number(payload.chunkQ);
    var chunkR = Number(payload.chunkR);

    if (!Number.isFinite(chunkQ) || !Number.isFinite(chunkR)) {
      throw new Error("Invalid chunk coordinates.");
    }

    configure({
      hexSize: payload.hexSize || state.hexSize,
      milesPerHex: payload.milesPerHex || state.milesPerHex,
      defaultTerrain: payload.defaultTerrain || state.defaultTerrain,
      chunkSize: payload.chunkSize || state.chunkSize,
    });

    var chunk = createChunk(chunkQ, chunkR);
    state.chunks.set(chunk.key, chunk);
    state.missingStaticChunkKeys.delete(chunk.key);

    if (payload.cells && typeof payload.cells === "object") {
      importDirectCells(payload.cells, Object.assign({}, options, {
        allowedChunkKey: chunk.key,
        chunkQ: chunkQ,
        chunkR: chunkR,
        cellsAreGlobalHexKeys: payload.cellsAreGlobalHexKeys === true,
      }));
    }

    importTerrainRle(payload.terrain || {}, Object.assign({}, options, { allowedChunkKey: chunk.key }));
    importFeatureRuns(payload.roads || [], "road", Object.assign({}, options, { allowedChunkKey: chunk.key }));
    importFeatureRuns(payload.bridges || [], "bridge", Object.assign({}, options, { allowedChunkKey: chunk.key }));
    importFeatureRuns(payload.tunnels || [], "tunnel", Object.assign({}, options, { allowedChunkKey: chunk.key }));
    importFeatureRuns(payload.blocked || [], "blocked", Object.assign({}, options, { allowedChunkKey: chunk.key }));
    importKeyedCellValues(payload.waterTypes || {}, "waterType", Object.assign({}, options, { allowedChunkKey: chunk.key }));
    importKeyedCellValues(payload.risks || {}, "risk", Object.assign({}, options, { allowedChunkKey: chunk.key }));

    if (payload.tags && typeof payload.tags === "object") {
      importTags(payload.tags, Object.assign({}, options, { allowedChunkKey: chunk.key }));
    }

    return chunk;
  }

  function getChunkKeyForHex(q, r) {
    var chunkQ = Math.floor(Number(q) / state.chunkSize);
    var chunkR = Math.floor(Number(r) / state.chunkSize);
    return chunkKey(chunkQ, chunkR);
  }

  function getLoadedChunkKeys() {
    return Array.from(state.chunks.keys()).sort();
  }

  function getKnownChunkKeys() {
    return Array.from(new Set(getLoadedChunkKeys().concat(Array.from(state.missingStaticChunkKeys.values())))).sort();
  }

  function forEachLoadedCell(callback) {
    state.chunks.forEach(function (chunk) {
      chunk.cells.forEach(function (cell) {
        callback(cell, chunk);
      });
    });
  }

  function compact() {
    var removedChunks = [];

    state.chunks.forEach(function (chunk, key) {
      if (chunk.cells.size === 0 && !state.dirtyChunks.has(key)) {
        state.chunks.delete(key);
        removedChunks.push(key);
      }
    });

    return removedChunks;
  }

  function importDirectCells(cells, options) {
    Object.keys(cells || {}).forEach(function (key) {
      var cell = cells[key];
      var coords = resolveDirectCellCoords(key, cell, options);

      if (!coords || !isFiniteHex(coords.q, coords.r) || !isAllowedChunk(coords.q, coords.r, options)) {
        return;
      }

      setCell(coords.q, coords.r, cell || {}, options);
    });
  }

  function resolveDirectCellCoords(key, cell, options) {
    var parsed = parseHexKey(key);

    if (parsed) {
      if (options && options.cellsAreGlobalHexKeys) {
        return parsed;
      }

      return {
        q: (Number(options && options.chunkQ) || 0) * state.chunkSize + parsed.q,
        r: (Number(options && options.chunkR) || 0) * state.chunkSize + parsed.r,
      };
    }

    if (cell && isFiniteHex(cell.q, cell.r)) {
      return {
        q: Number(cell.q),
        r: Number(cell.r),
      };
    }

    return null;
  }

  function parseHexKey(key) {
    var match = String(key || "").match(/^(-?[0-9]+),(-?[0-9]+)$/);

    if (!match) {
      return null;
    }

    return {
      q: Number(match[1]),
      r: Number(match[2]),
    };
  }

  function importTerrainRle(terrainMap, options) {
    Object.keys(terrainMap || {}).forEach(function (terrain) {
      expandRuns(terrainMap[terrain]).forEach(function (cell) {
        if (!isAllowedChunk(cell.q, cell.r, options)) {
          return;
        }

        patchCell(cell.q, cell.r, { terrain: terrain }, options);
      });
    });
  }

  function importFeatureRuns(runs, feature, options) {
    expandRuns(runs).forEach(function (cell) {
      if (!isAllowedChunk(cell.q, cell.r, options)) {
        return;
      }

      var patch = {};
      patch[feature] = true;
      patchCell(cell.q, cell.r, patch, options);
    });
  }

  function importKeyedCellValues(values, field, options) {
    Object.keys(values || {}).forEach(function (key) {
      var parts = key.split(",");
      var q = Number(parts[0]);
      var r = Number(parts[1]);

      if (!isFiniteHex(q, r) || !isAllowedChunk(q, r, options)) {
        return;
      }

      var patch = {};
      patch[field] = values[key];
      patchCell(q, r, patch, options);
    });
  }

  function importTags(tags, options) {
    Object.keys(tags || {}).forEach(function (key) {
      var parts = key.split(",");
      var q = Number(parts[0]);
      var r = Number(parts[1]);

      if (!isFiniteHex(q, r) || !isAllowedChunk(q, r, options)) {
        return;
      }

      patchCell(q, r, { tags: Object.assign({}, tags[key] || {}) }, options);
    });
  }

  function isAllowedChunk(q, r, options) {
    if (!options || !options.allowedChunkKey) {
      return true;
    }

    return getChunkKeyForHex(q, r) === options.allowedChunkKey;
  }

  function expandRuns(runs) {
    var result = [];

    (runs || []).forEach(function (run) {
      var q = Number(run[0]);
      var r = Number(run[1]);
      var len = Math.max(1, Number(run[2]) || 1);

      for (var i = 0; i < len; i += 1) {
        result.push({ q: q + i, r: r });
      }
    });

    return result;
  }

  function compactRuns(cells) {
    var sorted = (cells || []).slice().sort(function (a, b) {
      if (a[1] !== b[1]) return a[1] - b[1];
      return a[0] - b[0];
    });
    var result = [];

    sorted.forEach(function (cell) {
      var q = Number(cell[0]);
      var r = Number(cell[1]);
      var last = result[result.length - 1];

      if (last && last[1] === r && last[0] + last[2] === q) {
        last[2] += 1;
        return;
      }

      result.push([q, r, 1]);
    });

    return result;
  }

  function normalizeHexBounds(bounds) {
    bounds = bounds || {};

    return {
      minQ: Math.floor(Number(bounds.minQ != null ? bounds.minQ : bounds.qMin != null ? bounds.qMin : 0)),
      maxQ: Math.ceil(Number(bounds.maxQ != null ? bounds.maxQ : bounds.qMax != null ? bounds.qMax : 0)),
      minR: Math.floor(Number(bounds.minR != null ? bounds.minR : bounds.rMin != null ? bounds.rMin : 0)),
      maxR: Math.ceil(Number(bounds.maxR != null ? bounds.maxR : bounds.rMax != null ? bounds.rMax : 0)),
    };
  }

  function getChunkKeysForHexBounds(bounds) {
    var minChunkQ = Math.floor(bounds.minQ / state.chunkSize);
    var maxChunkQ = Math.floor(bounds.maxQ / state.chunkSize);
    var minChunkR = Math.floor(bounds.minR / state.chunkSize);
    var maxChunkR = Math.floor(bounds.maxR / state.chunkSize);
    var keys = [];

    for (var chunkQ = minChunkQ; chunkQ <= maxChunkQ; chunkQ += 1) {
      for (var chunkR = minChunkR; chunkR <= maxChunkR; chunkR += 1) {
        keys.push(chunkKey(chunkQ, chunkR));
      }
    }

    return keys;
  }

  function getChunkForHex(q, r, create) {
    if (!isFiniteHex(q, r)) {
      return null;
    }

    var key = getChunkKeyForHex(q, r);

    if (!state.chunks.has(key) && create) {
      ensureChunk(key);
    }

    return state.chunks.get(key) || null;
  }

  function createChunk(chunkQ, chunkR) {
    return {
      key: chunkKey(chunkQ, chunkR),
      chunkQ: Number(chunkQ),
      chunkR: Number(chunkR),
      cells: new Map(),
    };
  }

  function parseChunkKey(key) {
    var match = String(key || "").match(/^(-?\d+)_(-?\d+)$/);

    if (!match) {
      return null;
    }

    return {
      chunkQ: Number(match[1]),
      chunkR: Number(match[2]),
    };
  }

  function chunkKey(chunkQ, chunkR) {
    return Number(chunkQ) + "_" + Number(chunkR);
  }

  function hexKey(q, r) {
    return Number(q) + "," + Number(r);
  }

  function normalizeCell(cell, q, r) {
    var next = Object.assign({}, cell || {});

    next.q = Number(q);
    next.r = Number(r);
    next.terrain = next.terrain || state.defaultTerrain;
    next.road = !!next.road;
    next.bridge = !!next.bridge;
    next.tunnel = !!next.tunnel;
    next.blocked = !!next.blocked;
    next.waterType = typeof next.waterType === "string" ? next.waterType : "";
    next.risk = Number.isFinite(Number(next.risk)) ? Number(next.risk) : null;
    next.tags = normalizeTags(next.tags);

    return next;
  }

  function normalizeTags(tags) {
    if (Array.isArray(tags)) {
      return tags.reduce(function (acc, tag) {
        acc[String(tag)] = true;
        return acc;
      }, {});
    }

    if (tags && typeof tags === "object") {
      return Object.assign({}, tags);
    }

    return {};
  }

  function touchChunk(chunkKey) {
    var index = state.chunkAccessOrder.indexOf(chunkKey);

    if (index !== -1) {
      state.chunkAccessOrder.splice(index, 1);
    }

    state.chunkAccessOrder.push(chunkKey);
  }

  function evictColdChunks(protectedKeys) {
    protectedKeys = new Set(protectedKeys || []);

    while (state.chunks.size > state.maxLoadedChunks && state.chunkAccessOrder.length) {
      var chunkKey = state.chunkAccessOrder.shift();

      if (protectedKeys.has(chunkKey) || state.dirtyChunks.has(chunkKey)) {
        touchChunk(chunkKey);
        break;
      }

      state.chunks.delete(chunkKey);
    }
  }

  function cloneCell(cell) {
    return cell ? JSON.parse(JSON.stringify(cell)) : null;
  }

  function isDefaultCell(cell) {
    return (
      (!cell.terrain || cell.terrain === state.defaultTerrain) &&
      !cell.road &&
      !cell.bridge &&
      !cell.tunnel &&
      !cell.blocked &&
      !cell.waterType &&
      !Number.isFinite(Number(cell.risk)) &&
      (!cell.tags || !Object.keys(cell.tags).length)
    );
  }

  function isFiniteHex(q, r) {
    return Number.isFinite(Number(q)) && Number.isFinite(Number(r));
  }

  function markStaticChunkMissing(chunkKey) {
    var normalized = normalizeChunkKey(chunkKey);

    if (normalized) {
      state.missingStaticChunkKeys.add(normalized);
    }
  }

  function canFetchStaticChunk(chunkKey) {
    if (!state.hasAvailableChunkIndex) {
      return true;
    }

    return state.availableChunkKeys.has(normalizeChunkKey(chunkKey));
  }

  function normalizeChunkKey(value) {
    var parsed = parseChunkKey(value);
    return parsed ? chunkKey(parsed.chunkQ, parsed.chunkR) : "";
  }

  function fetchChunkPayload(chunkKey) {
    var parsed = parseChunkKey(chunkKey);

    if (!parsed || !state.staticBasePath) {
      return Promise.resolve(null);
    }

    var url = state.staticBasePath.replace(/\/$/, "") + "/" + chunkKey + ".json";

    return fetch(url)
      .then(function (response) {
        if (!response.ok) {
          return null;
        }

        return response.json();
      })
      .catch(function () {
        return null;
      });
  }

  function loadLocalOverrideIndex() {
    if (!state.useLocalOverride) {
      return;
    }

    try {
      var raw = window.localStorage.getItem(getLocalIndexKey());
      var payload = raw ? JSON.parse(raw) : null;
      var keys = payload && Array.isArray(payload.chunkKeys) ? payload.chunkKeys : [];

      keys.forEach(function (chunkKey) {
        var chunk = loadLocalChunk(chunkKey);

        if (chunk) {
          importChunkPayload(chunk, { markDirty: false });
        }
      });
    } catch (error) {
      console.warn("GridStore local override load failed:", error);
    }
  }

  function saveLocalOverrideIndex() {
    if (!state.useLocalOverride) {
      return;
    }

    var chunkKeys = getLoadedChunkKeys().filter(function (chunkKey) {
      return !!window.localStorage.getItem(getLocalChunkKey(chunkKey));
    });

    window.localStorage.setItem(getLocalIndexKey(), JSON.stringify({
      version: 1,
      mapId: state.mapId,
      chunkKeys: chunkKeys,
    }));
  }

  function loadLocalChunk(chunkKey) {
    try {
      var raw = window.localStorage.getItem(getLocalChunkKey(chunkKey));
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function getLocalPrefix() {
    return state.storagePrefix + "." + state.mapId + ".";
  }

  function getLocalIndexKey() {
    return getLocalPrefix() + "index";
  }

  function getLocalChunkKey(chunkKey) {
    return getLocalPrefix() + "chunk." + chunkKey;
  }
})();
