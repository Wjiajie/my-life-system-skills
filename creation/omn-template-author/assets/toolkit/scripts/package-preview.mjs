import { Buffer } from "node:buffer";
import { randomBytes } from "node:crypto";
import { open, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import process from "node:process";
import { URL, fileURLToPath } from "node:url";
import { inspectSource } from "./package-authoring.mjs";
import { compilePluginView } from "../packages/schemas/src/plugin-view.mjs";
import { snapshot } from "../packages/template-sdk/protocol.mjs";

const PREFIX = "/__omn_preview__/";
const packagePolicy = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; font-src 'self'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" };
const failure = (code) => ({ ok: false, code });
const escape = (text) => text.replace(/[&<>"']/gu, (value) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[value]);
const mime = (path) => ({ ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".md": "text/plain; charset=utf-8" })[extname(path)] ?? "application/octet-stream";
const resource = (path, bytes) => ({ bytes, mime: mime(path) });

async function listen(routes, policy) {
  let origin;
  const server = createServer((request, response) => {
    const send = (status, body, type = "text/plain; charset=utf-8") => {
      response.writeHead(status, { ...headers, "content-type": type, "content-security-policy": typeof policy === "function" ? policy() : policy });
      response.end(body);
    };
    if (!origin || request.headers.host !== new URL(origin).host) return send(403, "preview.host_denied");
    if (request.method !== "GET") return send(405, "preview.method_denied");
    const path = request.url;
    // No URL-to-filesystem conversion: accept exact, unencoded resource names only.
    if (typeof path !== "string" || !path.startsWith("/") || /[%\\?#]/u.test(path) || [...path].some((char) => char.charCodeAt(0) <= 32)
      || path.includes("//") || path.split("/").some((part) => part === "." || part === "..")) return send(400, "preview.path_denied");
    const found = routes.get(path);
    if (!found) return send(404, "preview.not_found");
    send(200, found.bytes, found.mime);
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  let closing;
  const close = () => closing ??= new Promise((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections();
  });
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    origin = `http://127.0.0.1:${server.address().port}`;
    return { origin, close };
  } catch { await close(); throw new Error("preview.listen_failed"); }
}

function shell(manifest, kind) {
  const names = { initialization: "初始化", card: "模板卡片", detail: "模板详情", storyBackground: "故事背景", storyContent: "模板内容" };
  const options = kind === "template" ? Object.keys(manifest.views).map((view) => `<option value="${view}">${names[view]}</option>`).join("") : '<option value="result">插件结果</option>';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OMN 作者预览</title><link rel="stylesheet" href="/scripts/preview/page.css"><script type="module" src="/scripts/preview/page.mjs"></script></head><body><header><h1>${escape(manifest.title ?? manifest.name)}</h1><p>作者预览：模拟宿主，未验证 Android 或模型运行</p><p>仅打开由你控制且审阅过的源码。</p></header><main><div class="controls"><label>视图<select id="view">${options}</select></label><label>显示模式<select id="theme"><option value="day">日间</option><option value="night">夜间</option></select></label></div><p id="status" role="status">正在准备预览…</p><div id="surface"></div><section id="candidate-section"><h2>初始化候选（未创建故事）</h2><pre id="candidate" aria-live="polite"></pre></section></main></body></html>`;
}

function shim(parentOrigin, sessionId) {
  return `import {createTemplateClient} from "${PREFIX}omn-template.mjs";
export {createTemplateClient};
export function connectTemplate(callbacks) {
  const origin = ${JSON.stringify(parentOrigin)};
  const bridge = {onmessage:null,postMessage(data){globalThis.parent.postMessage(data,origin);}};
  const receive = (event) => {if(event.source===globalThis.parent && event.origin===origin && typeof event.data==="string") bridge.onmessage?.({data:event.data});};
  globalThis.addEventListener("message",receive);
  const client = createTemplateClient({...callbacks,origin:"https://omn-template-${sessionId}.invalid",bridge});
  return {...client,async close(){globalThis.removeEventListener("message",receive);await client.close();}};
}
`;
}

/** Preview author-controlled source only. Neither this server nor its browser bridge installs a package. */
export async function startPackagePreview(input) {
  const opened = [];
  try {
    let kind, sourceDir, dataPath;
    try {
      if (!input || typeof input !== "object" || Array.isArray(input)) return failure("preview.input_invalid");
      const keys = Reflect.ownKeys(input);
      if (keys.length > 3 || !keys.every((key) => ["kind", "sourceDir", "dataPath"].includes(key))) return failure("preview.input_invalid");
      const fields = Object.create(null);
      for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (!descriptor || !Object.hasOwn(descriptor, "value")) return failure("preview.input_invalid");
        fields[key] = descriptor.value;
      }
      ({ kind, sourceDir, dataPath } = fields);
      if (!["template", "plugin"].includes(kind) || typeof sourceDir !== "string" || !sourceDir.trim()
        || (dataPath !== undefined && (typeof dataPath !== "string" || !dataPath.trim()))) return failure("preview.input_invalid");
    } catch { return failure("preview.input_invalid"); }
    const inspected = await inspectSource({ kind, sourceDir });
    if (!inspected.ok) return failure(inspected.code);
    const files = new Map(inspected.files.map(({ path, bytes }) => [`/${path}`, resource(path, Buffer.from(bytes))]));
    if ([...files.keys()].some((path) => path.startsWith(PREFIX))) return failure("preview.reserved_path");
    const sdk = await readFile(new URL("../packages/template-sdk/omn-template.mjs", import.meta.url));
    const protocol = await readFile(new URL("../packages/template-sdk/protocol.mjs", import.meta.url));
    const sdkPaths = [...files].filter(([, file]) => file.bytes.equals(sdk)).map(([path]) => path);
    if (kind === "template" && !sdkPaths.length) return failure("preview.sdk_missing");
    const decode = (path) => new globalThis.TextDecoder("utf-8", { fatal: true }).decode(files.get(`/${path}`)?.bytes);
    const parse = (text) => snapshot(JSON.parse(text), 4 * 1024 * 1024).value;
    let data;
    if (dataPath !== undefined) {
      const descriptor = await open(dataPath, "r");
      try {
        const stat = await descriptor.stat();
        if (!stat.isFile() || stat.size > 4 * 1024 * 1024) return failure("preview.data_invalid");
        const bytes = Buffer.alloc(4 * 1024 * 1024 + 1);
        const read = await descriptor.read(bytes, 0, bytes.length, 0);
        if (read.bytesRead > 4 * 1024 * 1024) return failure("preview.data_invalid");
        data = parse(new globalThis.TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, read.bytesRead)));
      } finally { await descriptor.close(); }
    }
    const manifest = inspected.manifest;
    let schema;
    const pages = new Map([["/", resource("index.html", shell(manifest, kind))]]);
    if (kind === "template") {
      schema = parse(decode(manifest.initialization.schemaPath));
      data ??= { story: { title: "预览故事" }, turn: { prose: "这是一段用于检查呈现的示例正文。" } };
    } else if (manifest.view) {
      data = dataPath === undefined ? parse(decode("examples/result.json")) : data;
      if (manifest.contributions.after?.result.kind === "structured") schema = parse(decode(manifest.contributions.after.result.schemaPath));
      for (const theme of ["day", "night"]) {
        const compiled = compilePluginView({ html: decode(manifest.view.entry), css: manifest.view.stylesheet ? decode(manifest.view.stylesheet) : "", data, schema, theme });
        if (!compiled.ok) return failure(compiled.code);
        pages.set(`${PREFIX}result-${theme}.html`, resource("result.html", compiled.document));
      }
    }
    files.set(`${PREFIX}omn-template.mjs`, resource("sdk.mjs", sdk));
    files.set(`${PREFIX}protocol.mjs`, resource("protocol.mjs", protocol));
    const child = await listen(files, packagePolicy); opened.push(child);
    for (const path of ["scripts/preview/page.mjs", "scripts/preview/page.css", "scripts/preview/session.mjs", "packages/schemas/src/vnext.mjs", "packages/template-sdk/protocol.mjs"]) {
      pages.set(`/${path}`, resource(path, await readFile(new URL(`../${path}`, import.meta.url))));
    }
    const parent = await listen(pages, packagePolicy.replace("frame-src 'none'", `frame-src ${child.origin}`).replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")); opened.push(parent);
    const sessionId = randomBytes(32).toString("hex");
    pages.set(`${PREFIX}config.json`, resource("config.json", JSON.stringify({ kind, manifest, schema, data, sessionId, packageOrigin: child.origin })));
    for (const path of sdkPaths) files.set(path, resource("shim.mjs", shim(parent.origin, sessionId)));
    return { ok: true, url: `${parent.origin}/`, packageOrigin: child.origin, close: async () => { await Promise.all(opened.map((server) => server.close())); } };
  } catch { await Promise.all(opened.map((server) => server.close())); return failure("preview.start_failed"); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [kind, sourceDir, dataPath, ...extra] = process.argv.slice(2);
  const result = extra.length ? failure("preview.usage") : await startPackagePreview({ kind, sourceDir, dataPath });
  if (!result.ok) { process.stderr.write(`${result.code}\n`); process.exitCode = 1; }
  else {
    process.stdout.write(`${result.url}\n作者预览：模拟宿主，未验证 Android 或模型运行。Ctrl+C 关闭。\n`);
    const stop = () => { void result.close(); };
    process.once("SIGINT", stop); process.once("SIGTERM", stop);
  }
}
