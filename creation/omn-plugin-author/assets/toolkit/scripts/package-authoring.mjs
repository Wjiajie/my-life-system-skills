import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { closeSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";
import { validateTemplateManifestV3, validatePluginManifestV4, validateJsonSchemaDefinition } from "../packages/schemas/src/vnext.mjs";

const limits = { files: 512, fileBytes: 8 * 1024 * 1024, expandedBytes: 16 * 1024 * 1024, manifestBytes: 256 * 1024 };
const failure = (code, path = "") => ({ ok: false, code, path });
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const compare = (a, b) => a.localeCompare(b, "en-US");
const inside = (root, candidate) => {
  const path = relative(root, candidate);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`));
};

function readBounded(path, maxBytes) {
  const before = lstatSync(path);
  if (before.isSymbolicLink() || !before.isFile()) throw failure("package.source_symlink");
  const descriptor = openSync(path, "r");
  try {
    const actual = fstatSync(descriptor);
    if (actual.ino !== before.ino || actual.dev !== before.dev) throw failure("package.source_changed");
    if (actual.size > maxBytes) throw failure("package.file_too_large");
    const bytes = readFileSync(descriptor);
    if (bytes.length > maxBytes) throw failure("package.file_too_large");
    return bytes;
  } finally { closeSync(descriptor); }
}

function parseJson(bytes, path) {
  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    // Inspect key tokens before JSON.parse can discard duplicate key identities.
    // Grammar is still checked by JSON.parse; this scanner never executes package code.
    const stack = [];
    for (let index = 0; index < source.length; index++) {
      const character = source[index];
      if (character === '"') {
        const start = index++;
        while (index < source.length && source[index] !== '"') {
          if (source[index] === "\\") index++;
          index++;
        }
        const frame = stack.at(-1);
        if (frame?.keyExpected) {
          const key = JSON.parse(source.slice(start, index + 1));
          if (frame.keys.has(key)) return failure("package.json_invalid", path);
          frame.keys.add(key);
          frame.keyExpected = false;
        }
      } else if (character === "{" || character === "[") {
        if (stack.length > 64) return failure("json_schema.depth_limit", path);
        stack.push({ keys: new Set(), object: character === "{", keyExpected: character === "{" });
      } else if (character === "}" || character === "]") stack.pop();
      else if (character === "," && stack.at(-1)?.object) stack.at(-1).keyExpected = true;
    }
    return { ok: true, value: JSON.parse(source) };
  }
  catch { return failure("package.json_invalid", path); }
}

/** Inspect a local authoring directory. This does not install or trust an external archive. */
export async function inspectSource({ kind, sourceDir }) {
  if (!["template", "plugin"].includes(kind)) return failure("package.kind_invalid", "kind");
  if (typeof sourceDir !== "string" || !sourceDir.trim()) return failure("package.source_invalid");
  const sourceManifest = `${kind}.source.json`;
  try {
    const root = resolve(sourceDir);
    const rootStat = lstatSync(root);
    if (rootStat.isSymbolicLink()) return failure("package.source_symlink");
    if (!rootStat.isDirectory()) return failure("package.source_invalid");
    const realRoot = realpathSync(root);
    const files = [];
    let totalBytes = 0;
    let source;
    const directories = [root];
    let visited = 0;
    while (directories.length) {
      const directory = directories.pop();
      if (!inside(realRoot, realpathSync(directory))) return failure("package.source_symlink", relative(root, directory).split(sep).join("/"));
      for (const name of readdirSync(directory).sort(compare)) {
        const absolutePath = join(directory, name);
        const path = relative(root, absolutePath).split(sep).join("/");
        const stat = lstatSync(absolutePath);
        if (++visited > limits.files * 2) return failure("package.too_many_files", path);
        if (stat.isSymbolicLink()) return failure("package.source_symlink", path);
        if (stat.isDirectory()) { directories.push(absolutePath); continue; }
        if (!stat.isFile()) return failure("package.source_not_regular", path);
        if (!inside(realRoot, realpathSync(absolutePath))) return failure("package.source_symlink", path);
        let bytes;
        try { bytes = readBounded(absolutePath, path === sourceManifest ? limits.manifestBytes : limits.fileBytes); }
        catch (error) { return failure(error.code ?? "package.source_unreadable", path); }
        totalBytes += bytes.length;
        if (totalBytes > limits.expandedBytes) return failure("package.expanded_too_large", path);
        if (path === sourceManifest) {
          const parsed = parseJson(bytes, path);
          if (!parsed.ok) return parsed;
          source = parsed.value;
        } else {
          if (["template.json", "plugin.json", "template.source.json", "plugin.source.json"].includes(path)) return failure("package.manifest_ambiguous", path);
          files.push({ path, bytes });
          if (files.length >= limits.files) return failure("package.resource_limit", "files");
        }
      }
    }
    if (!source || typeof source !== "object" || Array.isArray(source)) return failure("package.source_manifest_invalid", sourceManifest);
    if (Object.hasOwn(source, "files")) return failure("package.source_files_forbidden", "files");
    files.sort((a, b) => compare(a.path, b.path));
    const manifest = { ...source, files: files.map(({ path, bytes }) => ({ path, size: bytes.length, sha256: hash(bytes) })) };
    const validated = kind === "template" ? validateTemplateManifestV3(manifest) : validatePluginManifestV4(manifest);
    if (!validated.ok) return validated;
    const schemaPaths = kind === "template" ? [manifest.initialization.schemaPath] : [
      manifest.contributions.after?.result.schemaPath,
      manifest.configuration?.schemaPath,
      ...(manifest.actions ?? []).map((action) => action.inputSchemaPath),
    ].filter(Boolean);
    const byPath = new Map(files.map((file) => [file.path, file.bytes]));
    for (const path of new Set(schemaPaths)) {
      const parsed = parseJson(byPath.get(path), path);
      if (!parsed.ok) return parsed;
      const checked = validateJsonSchemaDefinition(parsed.value);
      if (!checked.ok) return failure(checked.code, `${path}#${checked.path ?? ""}`);
    }
    return { ok: true, manifest, files };
  } catch (error) {
    return failure(error.ok === false ? error.code : "package.source_unreadable", error.ok === false ? error.path : "");
  }
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
function u16(value) { const bytes = Buffer.alloc(2); bytes.writeUInt16LE(value); return bytes; }
function u32(value) { const bytes = Buffer.alloc(4); bytes.writeUInt32LE(value >>> 0); return bytes; }

// STORE avoids compressor-version drift; all metadata is fixed, with no absolute source paths.
function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { path, bytes } of entries) {
    const name = Buffer.from(path, "utf8");
    const crc = crc32(bytes);
    const common = [u16(20), u16(0x0800), u16(0), u16(0), u16(33), u32(crc), u32(bytes.length), u32(bytes.length), u16(name.length)];
    const local = Buffer.concat([u32(0x04034b50), ...common, u16(0), name, bytes]);
    const central = Buffer.concat([u32(0x02014b50), u16(20), ...common, u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const directory = Buffer.concat(centrals);
  return Buffer.concat([...locals, directory, u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(directory.length), u32(offset), u16(0)]);
}

export async function packSource({ kind, sourceDir, outputPath }) {
  const inspected = await inspectSource({ kind, sourceDir });
  if (!inspected.ok) return inspected;
  if (typeof outputPath !== "string" || !outputPath.endsWith(`.omn-${kind}`)) return failure("package.output_invalid", "outputPath");
  const archivePath = resolve(outputPath);
  if (inside(resolve(sourceDir), archivePath)) return failure("package.output_inside_source", "outputPath");
  const manifestBytes = Buffer.from(json(inspected.manifest));
  if (manifestBytes.length > limits.manifestBytes) return failure("package.manifest_too_large");
  const bytes = zip([{ path: `${kind}.json`, bytes: manifestBytes }, ...inspected.files]);
  const sha256 = hash(bytes);
  const report = { ok: true, kind, sha256, manifest: inspected.manifest, checks: ["manifest", "resource-hashes", "schema-definitions"], runtimeVerified: false };
  const outputs = [
    [archivePath, bytes],
    [`${archivePath}.sha256`, `${sha256}  ${basename(archivePath)}\n`],
    [`${archivePath}.validation.json`, json(report)],
  ];
  const created = [];
  try {
    mkdirSync(dirname(archivePath), { recursive: true });
    if (inside(realpathSync(sourceDir), realpathSync(dirname(archivePath)))) return failure("package.output_inside_source", "outputPath");
    for (const [path, content] of outputs) {
      const descriptor = openSync(path, "wx");
      created.push(path);
      try { writeFileSync(descriptor, content); } finally { closeSync(descriptor); }
    }
  } catch {
    for (const path of created.reverse()) {
      try { unlinkSync(path); } catch { return failure("package.output_cleanup_pending", path); }
    }
    return failure("package.output_unwritable", "outputPath");
  }
  return { ok: true, archivePath, sha256, manifest: inspected.manifest };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, kind, sourceDir, outputPath, ...extra] = process.argv.slice(2);
  let result;
  if (extra.length || !["validate", "pack"].includes(command)) result = failure("package.usage", "node package-authoring.mjs validate|pack template|plugin SOURCE [OUTPUT]");
  else result = command === "pack" ? await packSource({ kind, sourceDir, outputPath }) : await inspectSource({ kind, sourceDir });
  process.stdout.write(json(result.ok && command === "validate" ? { ok: true, kind, manifest: result.manifest, runtimeVerified: false } : result));
  process.exitCode = result.ok ? 0 : 1;
}
