import { validateJsonSchema } from "./vnext.mjs";

// This compiler deliberately implements a small language, not an HTML/CSS sanitizer.
// Both native presentation and the portable authoring tools consume this same source.
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const utf8 = new globalThis.TextEncoder();
const failureCodes = new WeakMap();
class ViewFailure extends Error {
  constructor(code) { super(code); failureCodes.set(this, code); }
}
const reject = (code) => { throw new ViewFailure(code); };
const demand = (condition, code) => { if (!condition) reject(code); };
const limit = (condition) => demand(condition, "plugin_view.resource_limit");
const htmlError = (condition) => demand(condition, "plugin_view.html_invalid");
const cssError = (condition) => demand(condition, "plugin_view.css_invalid");
const bindingError = (condition) => demand(condition, "plugin_view.binding_invalid");
const size = (text) => utf8.encode(text).length;
const escape = (text) => text.replace(/[&<>"']/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

// Read each external descriptor exactly once. JSON byte accounting is structural;
// JSON.stringify never sees an external object (or its toJSON/accessors).
function snapshot(value, maximum, code) {
  let bytes = 0;
  let nodes = 0;
  const ancestors = new Set();
  const charge = (count) => { bytes += count; limit(bytes <= maximum); };
  const visit = (source, depth) => {
    limit(depth <= 64 && ++nodes <= 10000);
    if (source === null || typeof source === "boolean" || typeof source === "string" || typeof source === "number") {
      demand(typeof source !== "number" || Number.isFinite(source), code);
      if (typeof source === "string") limit(source.length <= maximum);
      charge(size(JSON.stringify(source)));
      return source;
    }
    demand(typeof source === "object" && !ancestors.has(source), code);
    const array = Array.isArray(source);
    const prototype = Object.getPrototypeOf(source);
    demand(array ? prototype === Array.prototype : prototype === null || prototype === Object.prototype, code);
    const names = Reflect.ownKeys(source);
    limit(names.length <= 10000 - nodes + (array ? 1 : 0));
    demand(names.every((name) => typeof name === "string"), code);
    const result = array ? [] : Object.create(null);
    const children = names.filter((name) => !(array && name === "length"));
    if (array) {
      const descriptor = Object.getOwnPropertyDescriptor(source, "length");
      demand(descriptor && own(descriptor, "value") && children.length === descriptor.value, code);
    }
    ancestors.add(source);
    charge(2);
    for (let index = 0; index < children.length; index++) {
      const name = children[index];
      demand(typeof name === "string", code);
      if (array) demand(name === String(index), code);
      if (index > 0) charge(1);
      if (!array) { limit(name.length <= maximum); charge(size(JSON.stringify(name)) + 1); }
      const descriptor = Object.getOwnPropertyDescriptor(source, name);
      demand(descriptor && descriptor.enumerable && own(descriptor, "value"), code);
      // defineProperty does not invoke an inherited setter, even on arrays.
      Object.defineProperty(result, name, { value: visit(descriptor.value, depth + 1), enumerable: true });
    }
    ancestors.delete(source);
    return result;
  };
  return visit(value, 0);
}

const tags = new Set("section article header footer div span p h1 h2 h3 h4 h5 h6 ul ol li dl dt dd table caption thead tbody tfoot tr td th strong em small code pre blockquote br hr".split(" "));
const phrasing = new Set("span strong em small code br".split(" "));
const inlineParents = new Set("span p h1 h2 h3 h4 h5 h6 strong em small code pre".split(" "));
const childSets = {
  ul: new Set(["li"]), ol: new Set(["li"]), dl: new Set(["dt", "dd"]),
  table: new Set(["caption", "thead", "tbody", "tfoot"]),
  thead: new Set(["tr"]), tbody: new Set(["tr"]), tfoot: new Set(["tr"]), tr: new Set(["td", "th"]),
};
const requiredParents = { li: ["ul", "ol"], dt: ["dl"], dd: ["dl"], caption: ["table"],
  thead: ["table"], tbody: ["table"], tfoot: ["table"], tr: ["thead", "tbody", "tfoot"], td: ["tr"], th: ["tr"] };
const safeName = (name) => /^[A-Za-z][A-Za-z0-9_-]{0,63}$/u.test(name) && !/^omn-/iu.test(name);
function hasControls(text) {
  for (const character of text) {
    const code = character.charCodeAt(0);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) return true;
  }
  return false;
}
function entities(text) {
  htmlError(!hasControls(text));
  return text.replace(/&([^;\s<&]*);?|&/gu, (match) => {
    const named = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&nbsp;": "\u00a0" };
    if (own(named, match)) return named[match];
    const numeric = /^&#(x[0-9a-f]+|[0-9]+);$/iu.exec(match);
    htmlError(numeric !== null);
    const value = numeric[1][0].toLowerCase() === "x" ? Number.parseInt(numeric[1].slice(1), 16) : Number(numeric[1]);
    htmlError(Number.isSafeInteger(value) && value > 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff)
      && (value >= 32 || value === 9 || value === 10 || value === 13));
    return String.fromCodePoint(value);
  });
}
function pointer(text) {
  bindingError(text === "" || text.startsWith("/"));
  if (text === "") return [];
  return text.slice(1).split("/").map((part) => {
    bindingError(!/~(?![01])/u.test(part));
    return part.replace(/~1/gu, "/").replace(/~0/gu, "~");
  });
}
function parseHtml(source) {
  const root = { tag: "", children: [] };
  const stack = [root];
  let cursor = 0;
  let nodes = 0;
  const add = (node) => { limit(++nodes <= 2048); stack.at(-1).children.push(node); };
  while (cursor < source.length) {
    if (source[cursor] !== "<") {
      const end = source.indexOf("<", cursor);
      const text = entities(source.slice(cursor, end < 0 ? source.length : end));
      htmlError(!childSets[stack.at(-1).tag] || text.trim() === "");
      add({ text }); cursor = end < 0 ? source.length : end; continue;
    }
    const close = /^<\/([a-z][a-z0-9]*)\s*>/u.exec(source.slice(cursor));
    if (close) {
      htmlError(stack.length > 1 && stack.at(-1).tag === close[1]);
      stack.pop(); cursor += close[0].length; continue;
    }
    const open = /^<([a-z][a-z0-9]*)(?=[\s/>])/u.exec(source.slice(cursor));
    htmlError(open !== null && tags.has(open[1]));
    const tag = open[1];
    const parent = stack.at(-1).tag;
    htmlError(!inlineParents.has(parent) || phrasing.has(tag));
    htmlError(!childSets[parent] || childSets[parent].has(tag));
    htmlError(!requiredParents[tag] || requiredParents[tag].includes(parent));
    // Nested list items, headings, paragraphs and tables can otherwise trigger HTML5 repair.
    if (["li", "dt", "dd", "p", "table", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
      htmlError(!stack.slice(1).some((node) => node.tag === tag) || tag === "li" && ["ul", "ol"].includes(parent));
    }
    cursor += open[0].length;
    const attributes = [];
    const bindings = Object.create(null);
    const seen = new Set();
    while (!source.startsWith(">", cursor) && !source.startsWith("/>", cursor)) {
      const attribute = /^\s+([a-z][a-z0-9-]*)\s*=\s*(?:"([^"<]*)"|'([^'<]*)')/u.exec(source.slice(cursor));
      if (!attribute) {
        const space = /^\s+(?=\/?>)/u.exec(source.slice(cursor));
        htmlError(space !== null); cursor += space[0].length; break;
      }
      const name = attribute[1];
      const value = entities(attribute[2] ?? attribute[3]);
      htmlError(!seen.has(name)); seen.add(name);
      if (["data-omn-text", "data-omn-each", "data-omn-if"].includes(name)) bindings[name.slice(9)] = pointer(value);
      else {
        if (name === "class") htmlError(value.trim().split(/\s+/u).every(safeName));
        else if (name === "id") htmlError(safeName(value));
        else if (name === "aria-label") { /* text-only accessible label */ }
        else if (["aria-labelledby", "aria-describedby"].includes(name)) htmlError(value.trim().split(/\s+/u).every(safeName));
        else if (name === "aria-hidden") htmlError(["true", "false"].includes(value));
        else htmlError(false);
        attributes.push([name, value]);
      }
      cursor += attribute[0].length;
    }
    const isVoid = tag === "br" || tag === "hr";
    htmlError(source.startsWith(isVoid ? "/>" : ">", cursor));
    htmlError(!isVoid || !own(bindings, "text"));
    cursor += isVoid ? 2 : 1;
    limit(stack.length <= 32);
    const node = { tag, attributes, bindings, children: [], isVoid };
    add(node);
    if (!isVoid) stack.push(node);
  }
  htmlError(stack.length === 1);
  return root.children;
}

const ROOT = "[data-omn-plugin-root]";
function selector(source) {
  const branches = source.split(",");
  limit(branches.length <= 16);
  return branches.map((branch) => {
    let text = branch.trim();
    let scope = ROOT;
    const theme = /^\[data-theme=["'](day|night)["']\]\s+/u.exec(text);
    if (theme) { scope += `[data-theme="${theme[1]}"]`; text = text.slice(theme[0].length); }
    const parts = [];
    let compounds = 0;
    while (text.length) {
      const compound = /^(?:[a-z][a-z0-9]*)?(?:[.#][A-Za-z][A-Za-z0-9_-]{0,63})*/u.exec(text)[0];
      cssError(compound.length > 0);
      limit(++compounds <= 8);
      const tag = /^[a-z][a-z0-9]*/u.exec(compound)?.[0];
      cssError(tag === undefined || tags.has(tag));
      for (const name of compound.matchAll(/[.#]([A-Za-z][A-Za-z0-9_-]*)/gu)) cssError(safeName(name[1]));
      parts.push(compound); text = text.slice(compound.length);
      if (!text.length) break;
      const separator = /^(?:\s*>\s*|\s+)/u.exec(text);
      cssError(separator !== null); text = text.slice(separator[0].length);
      cssError(text.length > 0);
      parts.push(separator[0].includes(">") ? " > " : " ");
    }
    cssError(compounds > 0);
    return `${scope} ${parts.join("")}`;
  }).join(", ");
}

// Tokens, including function children, are regenerated after validation. No raw
// declaration or selector slice can reach the document's style element.
function cssTokens(source) {
  let cursor = 0;
  let count = 0;
  const parse = (depth) => {
    cssError(depth <= 3);
    const result = [];
    while (cursor < source.length) {
      const space = /^\s+/u.exec(source.slice(cursor));
      if (space) { cursor += space[0].length; continue; }
      if (source[cursor] === ")") { cssError(depth > 0); cursor++; return result; }
      limit(++count <= 128);
      const rest = source.slice(cursor);
      const number = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?(?:px|rem|em|fr|%)?/u.exec(rest);
      const hex = /^#[0-9a-fA-F]+/u.exec(rest);
      const name = /^(?:--)?[A-Za-z][A-Za-z0-9-]*/u.exec(rest);
      if (number) {
        const unit = /(?:px|rem|em|fr|%)$/u.exec(number[0])?.[0] ?? "";
        const value = Number(unit ? number[0].slice(0, -unit.length) : number[0]);
        cssError(Number.isFinite(value)); result.push({ kind: "number", value, unit }); cursor += number[0].length;
      } else if (hex) { result.push({ kind: "hex", value: hex[0].toLowerCase() }); cursor += hex[0].length; }
      else if (name) {
        cursor += name[0].length;
        if (source[cursor] === "(") {
          cursor++; result.push({ kind: "function", name: name[0], children: parse(depth + 1) });
        } else result.push({ kind: "name", value: name[0] });
      } else if (source[cursor] === ",") { result.push({ kind: "comma" }); cursor++; }
      else cssError(false);
    }
    cssError(depth === 0);
    return result;
  };
  return parse(0);
}
const named = (token, options) => token?.kind === "name" && options.split(" ").includes(token.value);
const numeric = (token, min, max, integer = false) => token?.kind === "number" && token.unit === ""
  && token.value >= min && token.value <= max && (!integer || Number.isInteger(token.value));
const length = (token) => token?.kind === "number" && token.value >= 0
  && (token.unit === "" ? token.value === 0 : own({ px: 4096, rem: 256, em: 256, "%": 100 }, token.unit)
    && token.value <= { px: 4096, rem: 256, em: 256, "%": 100 }[token.unit]);
const colors = "black white red blue green gray transparent currentColor";
const publicTokens = "--omn-bg --omn-text --omn-muted --omn-accent --omn-border";
const color = (token) => named(token, colors) || token?.kind === "hex" && /^#(?:[a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/u.test(token.value)
  || token?.kind === "function" && token.name === "var" && token.children.length === 1 && named(token.children[0], publicTokens);
const borderStyle = (token) => named(token, "none solid dashed dotted double");
const fr = (token) => token?.kind === "number" && token.unit === "fr" && token.value > 0 && token.value <= 12;
const track = (token) => length(token) || named(token, "auto min-content max-content");
function grid(tokens, nested = false) {
  let tracks = 0;
  for (const token of tokens) {
    if (track(token) || fr(token)) { tracks++; continue; }
    if (token.kind !== "function") return false;
    const parts = token.children;
    if (token.name === "minmax") {
      if (parts.length !== 3 || parts[1].kind !== "comma" || !track(parts[0]) || !(track(parts[2]) || fr(parts[2]))) return false;
      tracks++;
    } else if (token.name === "repeat" && !nested) {
      if (!numeric(parts[0], 1, 12, true) || parts[1]?.kind !== "comma") return false;
      const inner = grid(parts.slice(2), true);
      if (!inner) return false;
      tracks += parts[0].value * inner;
    } else return false;
  }
  return tracks >= 1 && tracks <= 12 ? tracks : false;
}
const keywords = {
  "font-style": "normal italic", "text-align": "left right center start end", "white-space": "normal pre pre-wrap pre-line",
  "overflow-wrap": "normal break-word anywhere", "word-break": "normal break-all keep-all",
  display: "block inline inline-block flex grid none", "box-sizing": "border-box content-box",
  overflow: "visible hidden clip auto", "overflow-x": "visible hidden clip auto", "overflow-y": "visible hidden clip auto",
  "border-collapse": "collapse separate", "table-layout": "auto fixed", "list-style-type": "none disc decimal circle square",
  "flex-direction": "row column row-reverse column-reverse", "flex-wrap": "nowrap wrap wrap-reverse",
  "justify-content": "flex-start flex-end start end center space-between space-around space-evenly",
  "align-items": "start end flex-start flex-end center stretch baseline", "align-self": "start end flex-start flex-end center stretch baseline auto",
  "align-content": "start end flex-start flex-end center stretch space-between space-around space-evenly",
};
function cssValue(property, tokens) {
  const one = (check) => tokens.length === 1 && check(tokens[0]);
  const many = (check, maximum = 4) => tokens.length >= 1 && tokens.length <= maximum && tokens.every(check);
  if (own(keywords, property)) return one((token) => named(token, keywords[property]));
  if (/^(?:color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?-color)$/u.test(property)) return one(color);
  if (/^(?:(?:min|max)-)?(?:width|height)$/u.test(property)) return one((token) => length(token)
    || !/^(?:min|max)-/u.test(property) && named(token, "auto min-content max-content fit-content")
    || property.startsWith("max-") && named(token, "none"));
  if (/^(?:padding|margin)(?:-(?:top|right|bottom|left))?$/u.test(property)) return many((token) => length(token)
    || property.startsWith("margin") && named(token, "auto"), property.includes("-") ? 1 : 4);
  if (/^(?:gap|row-gap|column-gap|border-radius|border-width|font-size|border-(?:top|right|bottom|left)-width|border-(?:top|bottom)-(?:left|right)-radius)$/u.test(property))
    return many(length, ["border-radius", "border-width"].includes(property) ? 4 : property === "gap" ? 2 : 1);
  if (/^border(?:-(?:top|right|bottom|left))?-style$/u.test(property)) return many(borderStyle, property === "border-style" ? 4 : 1);
  if (/^border(?:-(?:top|right|bottom|left))?$/u.test(property)) {
    const categories = tokens.map((token) => length(token) ? "width" : borderStyle(token) ? "style" : color(token) ? "color" : "invalid");
    return tokens.length >= 1 && tokens.length <= 3 && !categories.includes("invalid") && new Set(categories).size === categories.length;
  }
  if (property === "font-family") return tokens.length > 0 && tokens.length % 2 === 1 && tokens.every((token, index) =>
    index % 2 ? token.kind === "comma" : named(token, "serif sans-serif monospace system-ui"));
  if (property === "font-weight") return one((token) => named(token, "normal bold") || numeric(token, 100, 900, true) && token.value % 100 === 0);
  if (property === "line-height") return one((token) => named(token, "normal") || numeric(token, 0, 10) || length(token));
  if (property === "letter-spacing") return one((token) => named(token, "normal") || token.kind === "number" && token.unit === "px" && token.value >= 0 && token.value <= 16);
  if (["flex-grow", "flex-shrink"].includes(property)) return one((token) => numeric(token, 0, 12));
  if (property === "flex-basis") return one((token) => length(token) || named(token, "auto"));
  if (property === "order") return one((token) => numeric(token, -32, 32, true));
  if (["grid-template-columns", "grid-template-rows"].includes(property)) return !!grid(tokens);
  return false;
}
function serializeTokens(tokens) {
  return tokens.map((token) => {
    if (token.kind === "number") return `${token.value}${token.unit}`;
    if (token.kind === "function") return `${token.name}(${serializeTokens(token.children)})`;
    if (token.kind === "comma") return ",";
    return token.value;
  }).join(" ");
}
function parseCss(source) {
  const rules = [];
  let cursor = 0;
  cssError(!/[\\@<]/u.test(source) && !hasControls(source) && !source.includes("/*"));
  while (cursor < source.length) {
    const space = /^\s+/u.exec(source.slice(cursor));
    if (space) { cursor += space[0].length; continue; }
    const start = source.indexOf("{", cursor);
    cssError(start >= 0);
    const end = source.indexOf("}", start + 1);
    cssError(end >= 0);
    limit(rules.length < 256);
    const scoped = selector(source.slice(cursor, start));
    const sourceDeclarations = source.slice(start + 1, end).split(";");
    if (sourceDeclarations.at(-1).trim() === "") sourceDeclarations.pop();
    limit(sourceDeclarations.length <= 32);
    const declarations = sourceDeclarations.map((declaration) => {
      const field = /^\s*([a-z][a-z-]*)\s*:\s*([^{}]+?)\s*$/u.exec(declaration);
      cssError(field !== null);
      const tokens = cssTokens(field[2]);
      cssError(cssValue(field[1], tokens));
      return `${field[1]}: ${serializeTokens(tokens)};`;
    });
    rules.push(`${scoped} { ${declarations.join(" ")} }`);
    cursor = end + 1;
  }
  return rules.join("\n");
}

const missing = Symbol("missing");
function render(nodes, data, append) {
  let steps = 0;
  let generated = 0;
  const step = () => limit(++steps <= 20000);
  const resolve = (value, parts) => {
    for (const part of parts) {
      step();
      if (value === missing) return missing;
      bindingError(value !== null && typeof value === "object");
      if (Array.isArray(value)) bindingError(/^(?:0|[1-9][0-9]*)$/u.test(part) && Number.isSafeInteger(Number(part)));
      value = own(value, part) ? value[part] : missing;
    }
    return value;
  };
  const visit = (node, scope, repeated = false) => {
    step();
    if (own(node, "text")) { limit(++generated <= 10000); append(escape(node.text)); return; }
    const binding = node.bindings;
    if (own(binding, "each") && !repeated) {
      const items = resolve(scope, binding.each);
      if (items === missing) return;
      bindingError(Array.isArray(items));
      for (const item of items) visit(node, item, true);
      return;
    }
    if (own(binding, "if")) {
      const show = resolve(scope, binding.if);
      bindingError(show === missing || typeof show === "boolean");
      if (show !== true) return;
    }
    limit(++generated <= 10000);
    const attributes = node.attributes.map(([name, value]) => ` ${name}="${escape(value)}"`).join("");
    append(`<${node.tag}${attributes}${node.isVoid ? "/>" : ">"}`);
    if (node.isVoid) return;
    if (own(binding, "text")) {
      const value = resolve(scope, binding.text);
      bindingError(value === missing || value === null || ["string", "number", "boolean"].includes(typeof value));
      limit(++generated <= 10000);
      append(value === missing ? "" : escape(String(value)));
    } else for (const child of node.children) visit(child, scope);
    append(`</${node.tag}>`);
  };
  for (const node of nodes) visit(node, data);
}

const csp = "default-src 'none'; script-src 'none'; connect-src 'none'; img-src 'none'; font-src 'none'; media-src 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; style-src 'unsafe-inline'";
export function compilePluginView(input) {
  let unexpected = "plugin_view.input_invalid";
  try {
    demand(input !== null && typeof input === "object" && !Array.isArray(input), unexpected);
    const prototype = Object.getPrototypeOf(input);
    demand(prototype === Object.prototype || prototype === null, unexpected);
    const names = Reflect.ownKeys(input);
    demand(names.length >= 4 && names.length <= 5 && names.every((name) => typeof name === "string"
      && ["html", "css", "data", "theme", "schema"].includes(name))
      && ["html", "css", "data", "theme"].every((name) => names.includes(name)), unexpected);
    const descriptors = Object.create(null);
    for (const name of names) {
      const descriptor = Object.getOwnPropertyDescriptor(input, name);
      demand(descriptor && descriptor.enumerable && own(descriptor, "value"), unexpected);
      descriptors[name] = descriptor;
    }
    const { html, css, theme } = Object.fromEntries(names.map((name) => [name, descriptors[name].value]));
    demand(typeof html === "string" && typeof css === "string", unexpected);
    demand(theme === "day" || theme === "night", "plugin_view.theme_invalid");
    limit(html.length <= 65536 && css.length <= 65536 && size(html) <= 65536 && size(css) <= 65536);
    unexpected = "plugin_view.data_invalid";
    const data = snapshot(descriptors.data.value, 48 * 1024, unexpected);
    if (own(descriptors, "schema")) {
      unexpected = "json_schema.schema_invalid";
      const schema = snapshot(descriptors.schema.value, 256 * 1024, unexpected);
      const result = validateJsonSchema(schema, data);
      if (!result.ok) reject(result.code);
    }
    unexpected = "plugin_view.html_invalid";
    const tree = parseHtml(html);
    unexpected = "plugin_view.css_invalid";
    const style = parseCss(css);
    let bytes = 0;
    const chunks = [];
    const append = (text) => { bytes += size(text); limit(bytes <= 512 * 1024); chunks.push(text); };
    const palette = theme === "day" ? ["#ffffff", "#182022", "#566365", "#176e65", "#b9c5c3"]
      : ["#161b1c", "#edf2f1", "#aebfbc", "#83d4bd", "#435954"];
    const tokens = ["bg", "text", "muted", "accent", "border"].map((name, index) => `--omn-${name}:${palette[index]};`).join("");
    append(`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${csp}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>`);
    append(`${ROOT}{${tokens}display:block;box-sizing:border-box;contain:content;overflow:auto;max-width:100%;min-width:0;color:var(--omn-text);background:var(--omn-bg);overflow-wrap:anywhere;}\n${style}`);
    append(`</style></head><body><main data-omn-plugin-root data-theme="${theme}">`);
    unexpected = "plugin_view.binding_invalid";
    render(tree, data, append);
    append("</main></body></html>");
    return { ok: true, document: chunks.join("") };
  } catch (error) {
    // WeakMap identity lookup never asks an external thrown Proxy for its prototype.
    return { ok: false, code: failureCodes.get(error) ?? unexpected };
  }
}
