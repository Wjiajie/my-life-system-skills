# 模板 v3：数据、视图与创作方法

先阅读同目录 `package-vnext.md`。最小清单字段全部列在下面；`views` 只强制 initialization，其余可按设计提供，未声明时宿主使用通用展示。starter展示完整五视图，但不限制新模板的题材、字段或风格。

```json
{
  "schemaVersion": 3,
  "id": "org.example.template.orbit-garden",
  "version": "1.0.0",
  "title": "轨道温室",
  "description": "在失重温室中照料植物并调查异常。",
  "category": "太空生态",
  "systemPromptPath": "prompts/system.md",
  "skillPath": "skill/SKILL.md",
  "initialization": {"schemaPath":"schemas/initialization.schema.json","titlePath":"garden.name"},
  "views": {
    "initialization":{"entry":"web/index.html","stylesheet":"web/style.css"},
    "card":{"entry":"web/card.html","stylesheet":"web/style.css"},
    "detail":{"entry":"web/detail.html","stylesheet":"web/style.css"},
    "storyBackground":{"entry":"web/background.html","stylesheet":"web/style.css"},
    "storyContent":{"entry":"web/content.html","stylesheet":"web/style.css"}
  }
}
```

`titlePath`可选，是初始化数据中的点分路径，用于建议标题；创建时最终标题仍在可信宿主确认。各视图 entry 必需、stylesheet 可选。HTML自行引用外部CSS与module脚本；仅在清单写stylesheet不会替代HTML的link。

## 模板自己负责什么

初始化字段、默认值、随机资料算法、撤销、动画、布局、内容、字体选择和主题样式均在包内实现。以自己的Schema设计新结构，不套用人生/人物/环境固定字段。模板无需插件也能创作；Prompt描述创作原则，不要求宿主新增业务命令。

HTML使用本地资源、外部module脚本与外部stylesheet，不使用内联脚本、事件属性、远程CDN或凭证。示例CSP与资源路径保留技术边界；引用同包图片/字体时检查其体积与来源。表单监听submit并 `preventDefault()`，通过SDK交付数据；保留 `form-action 'none'`，不提交到服务器。

## SDK

把同版 `assets/toolkit/packages/template-sdk/omn-template.mjs` 和 `protocol.mjs` 原样复制到同一包资源目录。包页面直接导入相对路径：

```js
import { connectTemplate } from "./omn-template.mjs";
const client = connectTemplate({
  onRender(data) {
    document.documentElement.dataset.theme = data.theme?.mode === "night" ? "night" : "day";
    // 只读取该视图实际收到的公开字段；文本用textContent。
  },
  onError(code) { /* 在模板中呈现可恢复提示。 */ }
});
// 初始化表单校验成功：
await client.submitInitialization(initialization);
// 仅卡片允许请求宿主打开详情：await client.activate();
// 关闭：await client.close();
```

提交Promise成功只表示发送完成，不是Schema接受或故事创建。宿主展示候选并要求用户确认后才创建。保持表单可修正/再次提交，不因一次业务拒绝永久锁定。

SDK管理ready、session、序号、SHA、分块和节流；不改写它、不手写宿主命令、原生桥或localhost授权fallback。独立浏览器预览由随附preview工具显式注入适配，直接双击HTML不等价于应用运行。

阅读视图公开投影为 `{story:{title},turn:{id,prose,status}|null,theme:{mode}}`。不得期待读取初始化私密字段、流式未提交草稿、插件状态、Provider或宿主全局配置；无turn时渲染空状态。其他视图容忍未知/缺字段，只使用声明的公开数据。初始化逻辑载荷（含包装）≤2MiB，render≤4MiB，单wire≤64KiB由SDK自动处理。

## 可见验收

提供 `examples/initialization.json` 并通过实际Schema校验。初始化UI产出同构值，必填/错误/重试、随机与撤销（如提供）都真实操作验证。320px外层可能只有约256–273px iframe内容宽度；根和grid子项可收缩、无横溢，控件高度至少44px。主题依宿主 `theme.mode`，不能只靠操作系统媒体查询；尊重减少动态效果。正文、空状态与长文本均可读；背景视图不要拦截可信宿主操作。
