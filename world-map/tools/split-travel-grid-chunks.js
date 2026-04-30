#!/usr/bin/env node
// v0.1 2026-04-30T12:55:00.000Z
/*
  Split a unified Enclave travel-grid JSON into static chunk files.

  Usage:
    node scripts/split-travel-grid-chunks.js \
      --input data/travel/faerun-travel-grid.json \
      --output data/travel/faerun/chunks \
      --chunk-size 128

  Optional:
    --map-id faerun
    --dry-run
    --clean

  Output:
    data/travel/<mapId>/chunks/<chunkQ>_<chunkR>.json
*/

const fs = require("fs");
const path = require("path");

const DEFAULT_CHUNK_SIZE = 128;
const DEFAULT_TERRAIN = "plain";

main();

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.input || !args.output) {
    printUsageAndExit();
  }

  const inputPath = path.resolve(args.input);
  const outputDir = path.resolve(args.output);
  const chunkSize = toPositiveInt(args["chunk-size"], DEFAULT_CHUNK_SIZE);
  const dryRun = !!args["dry-run"];
  const clean = !!args.clean;

  const payload = readJson(inputPath);
  const mapId = args["map-id"] || payload.mapId || inferMapIdFromInput(inputPath);
  const normalized = normalizeUnifiedPayload(payload, {
    mapId,
    chunkSize,
  });
  const chunks = splitCellsIntoChunks(normalized.cells, {
    mapId,
    mapWidth: normalized.mapWidth,
    mapHeight: normalized.mapHeight,
    hexSize: normalized.hexSize,
    milesPerHex: normalized.milesPerHex,
    defaultTerrain: normalized.defaultTerrain,
    chunkSize,
  });

  const chunkList = Array.from(chunks.values()).sort(compareChunkPayloads);

  if (!dryRun) {
    if (clean && fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }

    fs.mkdirSync(outputDir, { recursive: true });

    chunkList.forEach((chunk) => {
      const filePath = path.join(outputDir, `${chunk.chunkQ}_${chunk.chunkR}.json`);
      fs.writeFileSync(filePath, serializeGridPayload(chunk), "utf8");
    });

    const index = buildChunkIndex(chunkList, normalized, { mapId, chunkSize });
    fs.writeFileSync(path.join(outputDir, "index.json"), serializeGridPayload(index), "utf8");
  }

  console.log(
    [
      dryRun ? "Dry run complete." : "Chunk export complete.",
      `Input: ${inputPath}`,
      `Output: ${outputDir}`,
      `Map: ${mapId}`,
      `Hex size: ${normalized.hexSize}`,
      `Chunk size: ${chunkSize}`,
      `Cells: ${Object.keys(normalized.cells).length}`,
      `Chunks: ${chunkList.length}`,
    ].join("\n")
  );
}

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];

    if (!raw.startsWith("--")) {
      continue;
    }

    const key = raw.slice(2);
    const next = argv[i + 1];

    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }

  return args;
}

function printUsageAndExit() {
  console.error(
    [
      "Missing required arguments.",
      "",
      "Usage:",
      "  node scripts/split-travel-grid-chunks.js --input data/travel/faerun-travel-grid.json --output data/travel/faerun/chunks --chunk-size 128",
    ].join("\n")
  );
  process.exit(1);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file not found: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function inferMapIdFromInput(inputPath) {
  const base = path.basename(inputPath).replace(/\.json$/i, "");
  return base.replace(/-travel-grid$/i, "") || "faerun";
}

function toPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function normalizeUnifiedPayload(payload, options) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload.");
  }

  const cells = {};
  const mapId = options.mapId || payload.mapId || "faerun";
  const defaultTerrain = payload.defaultTerrain || DEFAULT_TERRAIN;

  if (payload.format === "chunk-bundle" && Array.isArray(payload.chunks)) {
    payload.chunks.forEach((chunk) => {
      const chunkCells = normalizeUnifiedPayload(chunk, {
        mapId,
        chunkSize: options.chunkSize,
      }).cells;
      Object.assign(cells, chunkCells);
    });
  } else if (payload.format === "cells" || payload.cells) {
    Object.keys(payload.cells || {}).forEach((key) => {
      const parsed = parseHexKey(key);
      const cell = normalizeCell(payload.cells[key], defaultTerrain);

      if (!isDefaultCell(cell, defaultTerrain)) {
        cells[hexKey(parsed.q, parsed.r)] = cell;
      }
    });
  } else {
    expandTerrainGroups(payload.terrain || {}, cells, defaultTerrain);
    expandFeatureRuns(payload.roads || [], cells, defaultTerrain, "road", true);
    expandFeatureRuns(payload.bridges || [], cells, defaultTerrain, "bridge", true);
    expandFeatureRuns(payload.tunnels || [], cells, defaultTerrain, "tunnel", true);
    expandFeatureRuns(payload.blocked || [], cells, defaultTerrain, "blocked", true);
    expandGroupedOrKeyedValues(payload.waterTypes || {}, cells, defaultTerrain, "waterType");
    expandGroupedOrKeyedValues(payload.risks || {}, cells, defaultTerrain, "risk");
    expandGroupedTags(payload.tags || {}, cells, defaultTerrain);
  }

  return {
    mapId,
    mapWidth: Number(payload.mapWidth) || 0,
    mapHeight: Number(payload.mapHeight) || 0,
    hexSize: Number(payload.hexSize) || 10,
    milesPerHex: Number(payload.milesPerHex) || 1,
    defaultTerrain,
    cells,
  };
}

function expandTerrainGroups(terrainGroups, cells, defaultTerrain) {
  Object.keys(terrainGroups || {}).forEach((terrain) => {
    expandRuns(terrainGroups[terrain]).forEach(({ q, r }) => {
      const key = hexKey(q, r);
      const existing = cells[key] || createDefaultCell(defaultTerrain);
      existing.terrain = terrain || defaultTerrain;
      cells[key] = existing;
    });
  });
}

function expandFeatureRuns(runs, cells, defaultTerrain, field, value) {
  expandRuns(runs).forEach(({ q, r }) => {
    const key = hexKey(q, r);
    const existing = cells[key] || createDefaultCell(defaultTerrain);
    existing[field] = value;
    cells[key] = existing;
  });
}

function expandGroupedOrKeyedValues(values, cells, defaultTerrain, field) {
  Object.keys(values || {}).forEach((groupOrKey) => {
    const value = values[groupOrKey];

    if (isHexKey(groupOrKey)) {
      const parsed = parseHexKey(groupOrKey);
      const key = hexKey(parsed.q, parsed.r);
      const existing = cells[key] || createDefaultCell(defaultTerrain);
      existing[field] = field === "risk" ? Number(value) : String(value || "");
      cells[key] = existing;
      return;
    }

    expandRuns(value).forEach(({ q, r }) => {
      const key = hexKey(q, r);
      const existing = cells[key] || createDefaultCell(defaultTerrain);
      existing[field] = field === "risk" ? Number(groupOrKey) : groupOrKey;
      cells[key] = existing;
    });
  });
}

function expandGroupedTags(tags, cells, defaultTerrain) {
  Object.keys(tags || {}).forEach((groupOrKey) => {
    const value = tags[groupOrKey];

    if (isHexKey(groupOrKey) && value && typeof value === "object" && !Array.isArray(value)) {
      const parsed = parseHexKey(groupOrKey);
      const key = hexKey(parsed.q, parsed.r);
      const existing = cells[key] || createDefaultCell(defaultTerrain);
      existing.tags = normalizeTags(value);
      cells[key] = existing;
      return;
    }

    expandRuns(value).forEach(({ q, r }) => {
      const key = hexKey(q, r);
      const existing = cells[key] || createDefaultCell(defaultTerrain);
      existing.tags = existing.tags || {};
      existing.tags[String(groupOrKey)] = true;
      cells[key] = existing;
    });
  });
}

function splitCellsIntoChunks(cells, config) {
  const chunks = new Map();

  Object.keys(cells || {}).forEach((key) => {
    const parsed = parseHexKey(key);
    const cell = normalizeCell(cells[key], config.defaultTerrain);

    if (isDefaultCell(cell, config.defaultTerrain)) {
      return;
    }

    const chunkQ = Math.floor(parsed.q / config.chunkSize);
    const chunkR = Math.floor(parsed.r / config.chunkSize);
    const chunkKey = `${chunkQ}_${chunkR}`;

    if (!chunks.has(chunkKey)) {
      chunks.set(chunkKey, createChunkPayload(chunkQ, chunkR, config));
    }

    appendCellToChunk(chunks.get(chunkKey), parsed.q, parsed.r, cell, config.defaultTerrain);
  });

  chunks.forEach(compactChunkPayload);
  return chunks;
}

function createChunkPayload(chunkQ, chunkR, config) {
  return {
    version: 1,
    format: "rle",
    storage: "chunk",
    mapId: config.mapId,
    mapWidth: config.mapWidth,
    mapHeight: config.mapHeight,
    hexSize: config.hexSize,
    milesPerHex: config.milesPerHex,
    defaultTerrain: config.defaultTerrain,
    chunkSize: config.chunkSize,
    chunkQ,
    chunkR,
    terrain: {},
    roads: [],
    bridges: [],
    tunnels: [],
    blocked: [],
    waterTypes: {},
    risks: {},
    tags: {},
  };
}

function appendCellToChunk(chunk, q, r, cell, defaultTerrain) {
  if (cell.terrain && cell.terrain !== defaultTerrain) {
    if (!chunk.terrain[cell.terrain]) {
      chunk.terrain[cell.terrain] = [];
    }

    chunk.terrain[cell.terrain].push([q, r, 1]);
  }

  if (cell.road) chunk.roads.push([q, r, 1]);
  if (cell.bridge) chunk.bridges.push([q, r, 1]);
  if (cell.tunnel) chunk.tunnels.push([q, r, 1]);
  if (cell.blocked) chunk.blocked.push([q, r, 1]);
  if (cell.waterType) chunk.waterTypes[hexKey(q, r)] = cell.waterType;
  if (Number.isFinite(Number(cell.risk))) chunk.risks[hexKey(q, r)] = Number(cell.risk);

  const tags = normalizeTags(cell.tags);
  if (Object.keys(tags).length) {
    chunk.tags[hexKey(q, r)] = tags;
  }
}

function compactChunkPayload(chunk) {
  Object.keys(chunk.terrain || {}).forEach((terrain) => {
    chunk.terrain[terrain] = compactRuns(chunk.terrain[terrain]);
  });

  chunk.roads = compactRuns(chunk.roads);
  chunk.bridges = compactRuns(chunk.bridges);
  chunk.tunnels = compactRuns(chunk.tunnels);
  chunk.blocked = compactRuns(chunk.blocked);

  if (!Object.keys(chunk.terrain).length) delete chunk.terrain;
  if (!chunk.roads.length) delete chunk.roads;
  if (!chunk.bridges.length) delete chunk.bridges;
  if (!chunk.tunnels.length) delete chunk.tunnels;
  if (!chunk.blocked.length) delete chunk.blocked;
  if (!Object.keys(chunk.waterTypes).length) delete chunk.waterTypes;
  if (!Object.keys(chunk.risks).length) delete chunk.risks;
  if (!Object.keys(chunk.tags).length) delete chunk.tags;
}

function buildChunkIndex(chunks, normalized, options) {
  return {
    version: 1,
    format: "chunk-index",
    mapId: options.mapId,
    mapWidth: normalized.mapWidth,
    mapHeight: normalized.mapHeight,
    hexSize: normalized.hexSize,
    milesPerHex: normalized.milesPerHex,
    defaultTerrain: normalized.defaultTerrain,
    chunkSize: options.chunkSize,
    chunkCount: chunks.length,
    chunks: chunks.map((chunk) => ({
      key: `${chunk.chunkQ}_${chunk.chunkR}`,
      chunkQ: chunk.chunkQ,
      chunkR: chunk.chunkR,
    })),
  };
}

function expandRuns(runs) {
  const result = [];

  if (!Array.isArray(runs)) {
    return result;
  }

  runs.forEach((run) => {
    const q = Number(run[0]);
    const r = Number(run[1]);
    const length = Math.max(1, Number(run[2]) || 1);

    if (!Number.isFinite(q) || !Number.isFinite(r)) {
      return;
    }

    for (let offset = 0; offset < length; offset += 1) {
      result.push({ q: q + offset, r });
    }
  });

  return result;
}

function compactRuns(runs) {
  const sorted = (runs || [])
    .slice()
    .sort((a, b) => {
      if (Number(a[1]) !== Number(b[1])) return Number(a[1]) - Number(b[1]);
      return Number(a[0]) - Number(b[0]);
    });
  const result = [];

  sorted.forEach((run) => {
    const q = Number(run[0]);
    const r = Number(run[1]);
    const last = result[result.length - 1];

    if (!Number.isFinite(q) || !Number.isFinite(r)) {
      return;
    }

    if (last && last[1] === r && last[0] + last[2] === q) {
      last[2] += 1;
      return;
    }

    result.push([q, r, 1]);
  });

  return result;
}

function normalizeCell(cell, defaultTerrain) {
  const terrain = cell && cell.terrain ? String(cell.terrain) : defaultTerrain;

  return {
    terrain,
    road: !!(cell && cell.road),
    bridge: !!(cell && cell.bridge),
    tunnel: !!(cell && cell.tunnel),
    blocked: !!(cell && cell.blocked),
    waterType: cell && cell.waterType ? String(cell.waterType) : "",
    risk: Number.isFinite(Number(cell && cell.risk)) ? Number(cell.risk) : null,
    tags: normalizeTags(cell && cell.tags),
  };
}

function createDefaultCell(defaultTerrain) {
  return {
    terrain: defaultTerrain,
    road: false,
    bridge: false,
    tunnel: false,
    blocked: false,
    waterType: "",
    risk: null,
    tags: {},
  };
}

function isDefaultCell(cell, defaultTerrain) {
  return (
    (!cell.terrain || cell.terrain === defaultTerrain) &&
    !cell.road &&
    !cell.bridge &&
    !cell.tunnel &&
    !cell.blocked &&
    !cell.waterType &&
    !Number.isFinite(Number(cell.risk)) &&
    (!cell.tags || !Object.keys(cell.tags).length)
  );
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.reduce((acc, tag) => {
      acc[String(tag)] = true;
      return acc;
    }, {});
  }

  if (tags && typeof tags === "object") {
    return Object.assign({}, tags);
  }

  return {};
}

function parseHexKey(key) {
  const parts = String(key || "").split(",");
  return {
    q: Number(parts[0]) || 0,
    r: Number(parts[1]) || 0,
  };
}

function isHexKey(value) {
  return /^-?\d+,-?\d+$/.test(String(value || ""));
}

function hexKey(q, r) {
  return `${Number(q)},${Number(r)}`;
}

function compareChunkPayloads(a, b) {
  if (a.chunkQ !== b.chunkQ) return a.chunkQ - b.chunkQ;
  return a.chunkR - b.chunkR;
}

function serializeGridPayload(payload) {
  const runPattern = new RegExp("\\[\\n\\s+(-?\\d+),\\n\\s+(-?\\d+),\\n\\s+(-?\\d+)\\n\\s+\\]", "g");

  return JSON.stringify(payload, null, 2).replace(runPattern, (_match, q, r, length) => {
    return `[${q}, ${r}, ${length}]`;
  });
}