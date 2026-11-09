import { connectTemplate } from "./omn-template.mjs";
const { document, FormData } = globalThis;
const form = document.querySelector("#station-form"), status = document.querySelector("#status"), button = form.querySelector("button");
let client;
try { client = connectTemplate({onRender(data) { document.documentElement.dataset.theme = data.theme?.mode === "night" ? "night" : "day"; },onError() { status.textContent = "观测档案连接暂时不可用。"; }}); }
catch { button.disabled = true; status.textContent = "请在OMN或显式本地预览中打开此模板。"; }
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client || !form.reportValidity()) return;
  const fields = new FormData(form);
  const value = {station:{name:fields.get("station"),coast:fields.get("coast")},observer:fields.get("observer"),tide:fields.get("tide"),mission:fields.get("mission")};
  button.disabled = true;
  try { await client.submitInitialization(value); status.textContent = "档案已提交，请在应用确认框中创建故事。"; }
  catch { status.textContent = "提交失败，请检查内容后重试。"; }
  finally { button.disabled = false; }
});
