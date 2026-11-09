// Portable protocol implementation: no host, filesystem, or plugin identity dependencies.
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const join = (path, key) => path ? `${path}.${key}` : String(key);
const fail = (code, path = "") => ({ ok: false, code, path });
const success = (value) => ({ ok: true, value });
function guarded(check, code) {
  try { return check(); } catch { return fail(code); }
}
const text = (value) => typeof value === "string" && value.trim().length > 0;
const token = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(value) && !value.includes("..");
const identifier = (value) => token(value) && !["__proto__", "constructor", "prototype"].includes(value);
const safePath = (value) => typeof value === "string" && value.length <= 512
  && value.split("/").every((part) => /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/u.test(part) && !part.endsWith("."));

// Inspect descriptors, not property values: caller-provided accessors must never execute.
// Iterative traversal also bounds enum members and otherwise unconstrained instance data.
function jsonBoundary(value, invalidCode) {
  const stack = [{ value, path: "", depth: 0 }];
  const ancestors = new Set();
  let nodes = 0;
  let characters = 0;
  try {
    while (stack.length) {
      const frame = stack.pop();
      if (frame.leave) { ancestors.delete(frame.value); continue; }
      if (frame.depth > 64) return fail("json_schema.depth_limit", frame.path);
      if (++nodes > 10000) return fail("json_schema.resource_limit", frame.path);
      const current = frame.value;
      if (current === null || typeof current === "boolean") continue;
      if (typeof current === "number") {
        if (!Number.isFinite(current)) return fail(invalidCode, frame.path);
        continue;
      }
      if (typeof current === "string") {
        characters += current.length;
        if (characters > 2 * 1024 * 1024) return fail("json_schema.resource_limit", frame.path);
        continue;
      }
      if (typeof current !== "object" || ancestors.has(current)) return fail(invalidCode, frame.path);
      const array = Array.isArray(current);
      const prototype = Object.getPrototypeOf(current);
      if (array ? prototype !== Array.prototype : prototype !== null && prototype !== Object.prototype) return fail(invalidCode, frame.path);
      const descriptors = Object.getOwnPropertyDescriptors(current);
      const children = [];
      const names = Reflect.ownKeys(descriptors);
      for (const name of names) {
        if (typeof name !== "string") return fail(invalidCode, frame.path);
        if (array && name === "length") continue;
        const path = join(frame.path, name);
        const descriptor = descriptors[name];
        if (!descriptor.enumerable || !own(descriptor, "value")) return fail(invalidCode, path);
        if (array && !/^(?:0|[1-9][0-9]*)$/u.test(name)) return fail(invalidCode, path);
        characters += name.length;
        if (characters > 2 * 1024 * 1024) return fail("json_schema.resource_limit", path);
        children.push({ value: descriptor.value, path, depth: frame.depth + 1 });
      }
      if (array && children.length !== descriptors.length.value) return fail(invalidCode, frame.path);
      ancestors.add(current);
      stack.push({ value: current, leave: true });
      for (let index = children.length - 1; index >= 0; index--) stack.push(children[index]);
    }
    return null;
  } catch { return fail(invalidCode); }
}

function keys(value, allowed, required, path, code) {
  if (!object(value)) return fail(code, path);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) return fail(code, join(path, key));
  for (const key of required) if (!own(value, key)) return fail(code, join(path, key));
  return null;
}

function manifest(value, kind) {
  const code = `${kind}.manifest_invalid`;
  const boundary = jsonBoundary(value, code);
  if (boundary) return boundary;
  if (!object(value)) return fail(code);
  if (value.schemaVersion !== (kind === "template" ? 3 : 4)) return fail(`${kind}.schema_version_unsupported`, "schemaVersion");
  const template = kind === "template";
  const required = template
    ? ["schemaVersion", "id", "version", "title", "description", "category", "systemPromptPath", "skillPath", "initialization", "views", "files"]
    : ["schemaVersion", "id", "version", "name", "description", "contributions", "capabilities", "storageQuotaBytes", "files"];
  let error = keys(value, [...required, ...(template ? [] : ["configuration", "view", "actions"])], required, "", code);
  if (error) return error;
  for (const key of ["id", "version", template ? "title" : "name", "description", ...(template ? ["category"] : [])]) {
    if (!text(value[key])) return fail(code, key);
  }
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u.test(value.id)) return fail(code, "id");
  if (!token(value.version)) return fail(code, "version");
  if (!Array.isArray(value.files)) return fail(code, "files");
  if (value.files.length > 511) return fail("package.resource_limit", "files");
  const files = new Set();
  for (const [index, file] of value.files.entries()) {
    const path = `files.${index}`;
    error = keys(file, ["path", "size", "sha256"], ["path", "size", "sha256"], path, code);
    if (error) return error;
    if (!safePath(file.path)) return fail("package.path_unsafe", `${path}.path`);
    const folded = file.path.toLowerCase();
    if (files.has(folded)) return fail("package.path_duplicate", `${path}.path`);
    files.add(folded);
    if (!Number.isSafeInteger(file.size) || file.size < 0) return fail(code, `${path}.size`);
    if (typeof file.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(file.sha256)) return fail(code, `${path}.sha256`);
  }
  const declared = new Set(value.files.map((file) => file.path));
  const reference = (resource, path) => !safePath(resource) ? fail("package.path_unsafe", path)
    : !declared.has(resource) ? fail("package.file_missing", path) : null;
  const refs = (section, names, path) => {
    for (const name of names) if (own(section, name)) {
      const result = reference(section[name], join(path, name));
      if (result) return result;
    }
    return null;
  };
  const view = (section, path) => keys(section, ["entry", "stylesheet"], ["entry"], path, code)
    ?? refs(section, ["entry", "stylesheet"], path);
  if (template) {
    error = refs(value, ["systemPromptPath", "skillPath"], "")
      ?? keys(value.initialization, ["schemaPath", "titlePath"], ["schemaPath"], "initialization", code);
    if (error) return error;
    error = refs(value.initialization, ["schemaPath"], "initialization");
    if (error) return error;
    if (own(value.initialization, "titlePath") && !text(value.initialization.titlePath)) return fail(code, "initialization.titlePath");
    error = keys(value.views, ["initialization", "card", "detail", "storyBackground", "storyContent"], ["initialization"], "views", code);
    if (error) return error;
    for (const [name, section] of Object.entries(value.views)) {
      error = view(section, `views.${name}`);
      if (error) return error;
    }
  } else {
    if (!Array.isArray(value.capabilities) || value.capabilities.length !== 0) return fail(code, "capabilities");
    if (value.storageQuotaBytes !== 0) return fail(code, "storageQuotaBytes");
    error = keys(value.contributions, ["before", "after"], [], "contributions", code);
    if (error) return error;
    if (Object.keys(value.contributions).length === 0) return fail(code, "contributions");
    for (const [timing, section] of Object.entries(value.contributions)) {
      const path = `contributions.${timing}`;
      const required = ["systemPromptPath", "skillPath", ...(timing === "after" ? ["result"] : [])];
      error = keys(section, required, required, path, code) ?? refs(section, ["systemPromptPath", "skillPath"], path);
      if (error) return error;
      if (timing === "after") {
        const resultPath = `${path}.result`;
        if (!object(section.result) || !["markdown", "structured"].includes(section.result.kind)) return fail(code, resultPath);
        const fields = section.result.kind === "structured" ? ["kind", "schemaPath"] : ["kind"];
        error = keys(section.result, fields, fields, resultPath, code) ?? refs(section.result, ["schemaPath"], resultPath);
        if (error) return error;
      }
    }
    if (own(value, "configuration")) {
      error = keys(value.configuration, ["promptTargets", "schemaPath"], ["promptTargets"], "configuration", code)
        ?? refs(value.configuration, ["schemaPath"], "configuration");
      if (error) return error;
      if (!Array.isArray(value.configuration.promptTargets)) return fail(code, "configuration.promptTargets");
      const ids = new Set();
      const targets = new Set();
      for (const [index, target] of value.configuration.promptTargets.entries()) {
        const path = `configuration.promptTargets.${index}`;
        error = keys(target, ["id", "target", "label", "description", "editable"], ["id", "target", "label", "editable"], path, code);
        if (error) return error;
        for (const key of ["id", "label", ...(own(target, "description") ? ["description"] : [])]) if (!text(target[key])) return fail(code, `${path}.${key}`);
        if (!["before", "after"].includes(target.target) || !own(value.contributions, target.target) || targets.has(target.target)) return fail(code, `${path}.target`);
        if (!identifier(target.id) || ids.has(target.id)) return fail(code, `${path}.id`);
        if (typeof target.editable !== "boolean") return fail(code, `${path}.editable`);
        ids.add(target.id);
        targets.add(target.target);
      }
    }
    if (own(value, "view")) {
      error = view(value.view, "view");
      if (error) return error;
    }
    if (own(value, "actions")) {
      if (!Array.isArray(value.actions)) return fail(code, "actions");
      if (value.actions.length > 16) return fail("package.resource_limit", "actions");
      const ids = new Set();
      for (const [index, action] of value.actions.entries()) {
        const path = `actions.${index}`;
        const fields = ["id", "label", "inputSchemaPath", "systemPromptPath"];
        error = keys(action, fields, fields, path, code) ?? refs(action, ["inputSchemaPath", "systemPromptPath"], path);
        if (error) return error;
        if (!identifier(action.id) || ids.has(action.id)) return fail(code, `${path}.id`);
        if (!text(action.label) || new globalThis.TextEncoder().encode(action.label).length > 256) return fail(code, `${path}.label`);
        ids.add(action.id);
      }
    }
  }
  return success(value);
}

export const validateTemplateManifestV3 = (value) => guarded(() => manifest(value, "template"), "template.manifest_invalid");
export const validatePluginManifestV4 = (value) => guarded(() => manifest(value, "plugin"), "plugin.manifest_invalid");

const keywords = ["type", "properties", "required", "additionalProperties", "items", "enum", "minLength", "maxLength", "minimum", "maximum", "minItems", "maxItems", "title", "description"];
function schemaContract(schema, path = "", depth = 0, ancestors = new Set()) {
  if (depth > 64 || !object(schema) || ancestors.has(schema)) return fail("json_schema.schema_invalid", path);
  ancestors.add(schema);
  const original = schema;
  // Read only own, previously checked fields; missing keywords cannot invoke inherited getters.
  schema = Object.assign(Object.create(null), schema);
  for (const key of Object.keys(schema)) {
    if (key === "$ref" && typeof schema[key] === "string" && !schema[key].startsWith("#")) return fail("json_schema.remote_ref_unsupported", join(path, key));
    if (!keywords.includes(key)) return fail("json_schema.keyword_unsupported", join(path, key));
  }
  if (! ["object", "array", "string", "number", "integer", "boolean", "null"].includes(schema.type)) return fail("json_schema.schema_invalid", join(path, "type"));
  const typeKeywords = {
    object: ["properties", "required", "additionalProperties"],
    array: ["items", "minItems", "maxItems"],
    string: ["minLength", "maxLength"],
    number: ["minimum", "maximum"],
    integer: ["minimum", "maximum"],
    boolean: [], null: [],
  };
  for (const key of Object.keys(schema)) {
    if (!["type", "enum", "title", "description", ...typeKeywords[schema.type]].includes(key)) return fail("json_schema.schema_invalid", join(path, key));
  }
  for (const key of ["title", "description"]) if (own(schema, key) && typeof schema[key] !== "string") return fail("json_schema.schema_invalid", join(path, key));
  for (const key of ["minLength", "maxLength", "minItems", "maxItems"]) if (own(schema, key) && (!Number.isSafeInteger(schema[key]) || schema[key] < 0)) return fail("json_schema.schema_invalid", join(path, key));
  for (const key of ["minimum", "maximum"]) if (own(schema, key) && (typeof schema[key] !== "number" || !Number.isFinite(schema[key]))) return fail("json_schema.schema_invalid", join(path, key));
  if (own(schema, "additionalProperties") && typeof schema.additionalProperties !== "boolean") return fail("json_schema.schema_invalid", join(path, "additionalProperties"));
  if (own(schema, "required") && (!Array.isArray(schema.required) || schema.required.some((key) => typeof key !== "string") || new Set(schema.required).size !== schema.required.length)) return fail("json_schema.schema_invalid", join(path, "required"));
  if (own(schema, "enum") && (!Array.isArray(schema.enum) || schema.enum.length === 0)) return fail("json_schema.schema_invalid", join(path, "enum"));
  if (own(schema, "properties")) {
    if (!object(schema.properties)) return fail("json_schema.schema_invalid", join(path, "properties"));
    for (const [key, child] of Object.entries(schema.properties)) {
      const error = schemaContract(child, join(join(path, "properties"), key), depth + 1, ancestors);
      if (error) return error;
    }
  }
  if (own(schema, "items")) {
    const error = schemaContract(schema.items, join(path, "items"), depth + 1, ancestors);
    if (error) return error;
  }
  ancestors.delete(original);
  return null;
}

function equal(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, index) => equal(item, b[index]));
  return object(a) && object(b) && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((key) => own(b, key) && equal(a[key], b[key]));
}

function dataContract(schema, value, path = "", depth = 0) {
  if (depth > 64) return fail("json_schema.depth_limit", path);
  schema = Object.assign(Object.create(null), schema);
  const matches = schema.type === "null" ? value === null : schema.type === "object" ? object(value)
    : schema.type === "array" ? Array.isArray(value) : schema.type === "integer" ? Number.isSafeInteger(value)
      : schema.type === "number" ? typeof value === "number" && Number.isFinite(value) : typeof value === schema.type;
  if (!matches) return fail("json_schema.type", path);
  if (schema.enum && !schema.enum.some((item) => equal(item, value))) return fail("json_schema.enum", path);
  if (schema.type === "object") {
    for (const key of schema.required ?? []) if (!own(value, key)) return fail("json_schema.required", join(path, key));
    for (const key of Object.keys(value)) {
      if (schema.properties && own(schema.properties, key)) {
        const error = dataContract(schema.properties[key], value[key], join(path, key), depth + 1);
        if (error) return error;
      } else if (schema.additionalProperties === false) return fail("json_schema.additional_property", join(path, key));
    }
  }
  if (schema.type === "array") {
    if (value.length < (schema.minItems ?? 0)) return fail("json_schema.min_items", path);
    if (value.length > (schema.maxItems ?? Infinity)) return fail("json_schema.max_items", path);
    if (schema.items) for (const [index, item] of value.entries()) {
      const error = dataContract(schema.items, item, join(path, index), depth + 1);
      if (error) return error;
    }
  }
  if (schema.type === "string") {
    const length = [...value].length;
    if (length < (schema.minLength ?? 0)) return fail("json_schema.min_length", path);
    if (length > (schema.maxLength ?? Infinity)) return fail("json_schema.max_length", path);
  }
  if (schema.type === "integer" || schema.type === "number") {
    if (value < (schema.minimum ?? -Infinity)) return fail("json_schema.minimum", path);
    if (value > (schema.maximum ?? Infinity)) return fail("json_schema.maximum", path);
  }
  return null;
}

export function validateJsonSchema(schema, value) {
  const schemaFailure = guarded(() => jsonBoundary(schema, "json_schema.schema_invalid") ?? schemaContract(schema), "json_schema.schema_invalid");
  return schemaFailure ?? guarded(() => jsonBoundary(value, "json_schema.value_invalid")
    ?? dataContract(schema, value) ?? success(value), "json_schema.value_invalid");
}

export function validateJsonSchemaDefinition(schema) {
  return guarded(() => jsonBoundary(schema, "json_schema.schema_invalid") ?? schemaContract(schema) ?? success(schema), "json_schema.schema_invalid");
}
