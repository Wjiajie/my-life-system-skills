import { createPreviewSession } from "./session.mjs";

const { document, fetch } = globalThis;
const view = document.querySelector("#view"), theme = document.querySelector("#theme");
const surface = document.querySelector("#surface"), status = document.querySelector("#status"), candidate = document.querySelector("#candidate");
let session, frame, generation = 0;
try {
  const response = await fetch("/__omn_preview__/config.json");
  if (!response.ok) throw new Error();
  const config = await response.json();
  const documents = {};
  if (config.kind === "plugin" && config.manifest.view) {
    for (const mode of ["day", "night"]) {
      const result = await fetch(`/__omn_preview__/result-${mode}.html`);
      if (!result.ok) throw new Error();
      documents[mode] = await result.text();
    }
  }
  const projection = () => ({ ...config.data, theme: { mode: theme.value } });
  const notice = (code) => {
    const labels = { "view.ready": "模板已连接", "view.activate": "模板请求打开详情（仅预览）", "view.close": "模板已关闭", "initialization.candidate": "候选已通过结构校验；未创建故事" };
    status.textContent = labels[code] ?? `预览消息未接受：${code}`;
  };
  function show() {
    generation++; const current = generation;
    session?.close(); session = undefined; frame?.remove(); frame = undefined;
    candidate.textContent = "";
    document.querySelector("#candidate-section").hidden = config.kind !== "template" || view.value !== "initialization";
    if (config.kind === "plugin" && !config.manifest.view) { status.textContent = "这个插件没有自定义视图；提示词与Agent运行不在页面预览范围内。"; return; }
    frame = document.createElement("iframe");
    frame.title = `${config.manifest.title ?? config.manifest.name} · ${view.selectedOptions[0].textContent}`;
    frame.referrerPolicy = "no-referrer";
    if (config.kind === "plugin") {
      frame.setAttribute("sandbox", ""); frame.srcdoc = documents[theme.value]; surface.replaceChildren(frame);
      status.textContent = "插件样例结果已呈现；未调用模型"; return;
    }
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
    surface.replaceChildren(frame);
    const source = frame.contentWindow;
    session = createPreviewSession({
      sessionId: config.sessionId, packageOrigin: config.packageOrigin, source, view: view.value, schema: config.schema,
      send: (data) => { if (current === generation) source.postMessage(data, config.packageOrigin); },
      onCandidate: (value) => { if (current === generation) candidate.textContent = JSON.stringify(value, null, 2); },
      onStatus: (code) => { if (current !== generation) return; notice(code); if (code === "view.ready") void session.render(projection()); },
    });
    frame.src = `${config.packageOrigin}/${config.manifest.views[view.value].entry}`;
    status.textContent = "正在等待模板连接…";
  }
  globalThis.addEventListener("message", (event) => {
    if (event.source === frame?.contentWindow && event.origin === config.packageOrigin) void session?.receive(event);
  });
  globalThis.addEventListener("pagehide", () => { generation++; session?.close(); });
  view.addEventListener("change", show);
  theme.addEventListener("change", () => {
    document.documentElement.dataset.theme = theme.value;
    if (config.kind === "template") void session?.render(projection()); else show();
  });
  show();
} catch { status.textContent = "预览暂时无法启动，请检查源码、样例数据和工具版本。"; }
