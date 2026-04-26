#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const PACK_ROOT =
  process.env.ITEMSADDER_PACK_ROOT ||
  "C:/Users/joshc/OneDrive/Desktop/MinecraftServer/plugins/ItemsAdder/contents/pack_migration";
const CONFIGS_DIR = path.join(PACK_ROOT, "configs");
const ASSETS_DIR = path.join(PACK_ROOT, "resourcepack", "assets");
const OUT_DIR = path.join(process.cwd(), "public", "itemsadder");
const OUT_FILE = path.join(OUT_DIR, "manifest.json");

function readDirRecursive(dirPath, predicate, out = []) {
  if (!fs.existsSync(dirPath)) return out;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const absolute = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      readDirRecursive(absolute, predicate, out);
    } else if (predicate(absolute)) {
      out.push(absolute);
    }
  }
  return out;
}

function parseItemsFromYaml(yamlText, namespaceFallback) {
  const lines = yamlText.split(/\r?\n/);
  let inItems = false;
  let namespace = namespaceFallback;
  let currentKey = null;
  let inResource = false;
  const items = [];
  const byKey = new Map();

  for (const raw of lines) {
    const line = raw.replace(/\t/g, "  ");
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    const indent = line.length - line.trimStart().length;

    if (trimmed.startsWith("namespace:")) {
      namespace = trimmed.slice("namespace:".length).trim() || namespace;
      continue;
    }
    if (trimmed === "items:") {
      inItems = true;
      currentKey = null;
      inResource = false;
      continue;
    }
    if (!inItems) continue;
    if (indent <= 1 && trimmed.endsWith(":")) {
      // Top-level section after items; stop items parsing.
      inItems = false;
      currentKey = null;
      inResource = false;
      continue;
    }
    if (indent === 2 && trimmed.endsWith(":")) {
      const key = trimmed.slice(0, -1).trim();
      currentKey = key;
      inResource = false;
      const entry = {
        key,
        namespace,
        displayName: key.replace(/_/g, " "),
        material: null,
        modelId: null,
        modelPath: null,
        source: "itemsadder",
      };
      items.push(entry);
      byKey.set(key, entry);
      continue;
    }
    if (!currentKey) continue;
    if (indent === 4 && trimmed === "resource:") {
      inResource = true;
      continue;
    }
    if (indent === 4 && trimmed.endsWith(":")) {
      inResource = false;
      continue;
    }
    const target = byKey.get(currentKey);
    if (!target) continue;
    if (indent === 4 && trimmed.startsWith("display_name:")) {
      target.displayName = trimmed.slice("display_name:".length).trim().replace(/^"|"$/g, "");
      continue;
    }
    if (inResource && indent >= 6) {
      if (trimmed.startsWith("material:")) {
        target.material = trimmed.slice("material:".length).trim().toUpperCase();
      } else if (trimmed.startsWith("model_id:")) {
        const parsed = Number(trimmed.slice("model_id:".length).trim());
        target.modelId = Number.isFinite(parsed) ? parsed : null;
      } else if (trimmed.startsWith("model_path:")) {
        target.modelPath = trimmed.slice("model_path:".length).trim().replace(/^"|"$/g, "");
      }
    }
  }

  return items.filter((item) => item.material && item.modelPath);
}

function parseModelRef(modelRef) {
  const clean = modelRef.replace(/^\/+/, "").replace(/\.json$/i, "");
  const split = clean.split(":");
  if (split.length === 2) {
    return { namespace: split[0], modelPath: split[1] };
  }
  return { namespace: "minecraft", modelPath: split[0] };
}

const modelCache = new Map();
function readModelJson(namespace, modelPath) {
  const key = `${namespace}:${modelPath}`;
  if (modelCache.has(key)) return modelCache.get(key);
  const modelFile = path.join(ASSETS_DIR, namespace, "models", `${modelPath}.json`);
  if (!fs.existsSync(modelFile)) {
    modelCache.set(key, null);
    return null;
  }
  try {
    const json = JSON.parse(fs.readFileSync(modelFile, "utf8"));
    modelCache.set(key, json);
    return json;
  } catch {
    modelCache.set(key, null);
    return null;
  }
}

function resolveTextureRef(namespace, modelPath, depth = 0) {
  if (depth > 8) return null;
  const model = readModelJson(namespace, modelPath);
  if (!model) return null;
  const textures = model.textures && typeof model.textures === "object" ? model.textures : null;
  if (textures) {
    for (const candidate of ["layer0", "0", "all", "particle"]) {
      const value = textures[candidate];
      if (typeof value === "string" && value.trim().length > 0) {
        const parsed = parseModelRef(value.trim());
        return `${parsed.namespace}:${parsed.modelPath}`;
      }
    }
    for (const value of Object.values(textures)) {
      if (typeof value === "string" && value.trim().length > 0) {
        const parsed = parseModelRef(value.trim());
        return `${parsed.namespace}:${parsed.modelPath}`;
      }
    }
  }
  if (typeof model.parent === "string" && model.parent.trim().length > 0) {
    const parent = parseModelRef(model.parent.trim());
    return resolveTextureRef(parent.namespace, parent.modelPath, depth + 1);
  }
  return null;
}

function textureRefToPublicPath(textureRef) {
  if (!textureRef) return null;
  const parsed = parseModelRef(textureRef);
  const pngPath = path.join(ASSETS_DIR, parsed.namespace, "textures", `${parsed.modelPath}.png`);
  if (!fs.existsSync(pngPath)) return null;
  const relative = path.relative(path.join(process.cwd(), "public"), pngPath).replace(/\\/g, "/");
  if (!relative || relative.startsWith("..")) return null;
  return `/${relative}`;
}

function main() {
  const yamlFiles = readDirRecursive(CONFIGS_DIR, (file) => file.toLowerCase().endsWith(".yml"));
  const items = [];
  for (const file of yamlFiles) {
    const namespaceFallback = path.basename(path.dirname(file)).toLowerCase();
    const parsed = parseItemsFromYaml(fs.readFileSync(file, "utf8"), namespaceFallback);
    items.push(...parsed);
  }

  const byMaterialModelData = {};
  const byModelPath = {};
  const byItemId = {};

  for (const item of items) {
    const namespace = item.namespace || "minecraft";
    const textureRef = resolveTextureRef(namespace, item.modelPath);
    const texturePath = textureRefToPublicPath(textureRef);
    const id = `${namespace}:${item.key}`;
    const row = {
      id,
      namespace,
      key: item.key,
      displayName: item.displayName,
      material: item.material,
      modelId: item.modelId,
      modelPath: `${namespace}:${item.modelPath}`,
      textureRef,
      texturePath,
    };
    byModelPath[row.modelPath] = row;
    byItemId[row.id] = row;
    if (item.material && Number.isFinite(item.modelId)) {
      byMaterialModelData[`${item.material}:${item.modelId}`] = row;
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    packRoot: PACK_ROOT,
    assetsRoot: ASSETS_DIR,
    itemCount: Object.keys(byModelPath).length,
    byMaterialModelData,
    byItemId,
    byModelPath,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), "utf8");
  console.log(`ItemsAdder manifest written to ${OUT_FILE}`);
  console.log(`Indexed items: ${output.itemCount}`);
}

main();
