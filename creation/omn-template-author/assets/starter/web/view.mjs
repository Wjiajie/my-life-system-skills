import { connectTemplate } from "./omn-template.mjs";
const { document } = globalThis;
const status = document.querySelector("#status");
try {
  const client = connectTemplate({
    onRender(data) {
      document.documentElement.dataset.theme = data.theme?.mode === "night" ? "night" : "day";
      const title = document.querySelector("#story-title"), excerpt = document.querySelector("#excerpt");
      if (title) title.textContent = data.story?.title ?? "潮汐观测站";
      if (excerpt) excerpt.textContent = data.turn ? data.turn.prose.slice(0,100) : "第一页仍待书写。";
    },
    onError() { if (status) status.textContent = "模板连接暂时不可用，请返回应用重试。"; }
  });
  document.querySelector("#activate")?.addEventListener("click", () => {
    void client.activate().catch(() => { if (status) status.textContent = "暂时无法打开详情，请使用应用下方按钮。"; });
  });
} catch { if (status) status.textContent = "请在OMN或显式本地预览中打开此模板。"; }
