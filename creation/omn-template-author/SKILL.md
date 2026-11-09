---
name: omn-template-author
description: 为 OMN 创建或升级可独立导入的 v3 模板包，自定义初始化数据、创作提示词和 HTML/CSS/JS 风格，并完成离线校验、打包和本地预览。适用于任意创作题材，不用于制作 Codex 应用插件。
---

# OMN 模板作者

生成用户指定题材的独立模板，不修改OMN宿主。随附规范固定为2026-09-06的模板v3/插件v4/SDK协议v1；工具仅需Node >=22.19，可在其他Agent工具中使用，无需OMN仓库或另一Skill。

## 开始

先完整阅读 [公共包规范](references/package-vnext.md)、[模板规范](references/template-v3.md) 和 [验证与交付](references/validation.md)。把本Skill目录作为工具定位根，所有路径相对它解析，不猜测用户机器上的OMN位置。

从用户要求确定题材、初始化信息、叙事原则和视觉风格。信息足够就执行；只有影响结果的缺失选择才提问。`assets/starter` 是一个海岸观测题材的完整可运行样例，先复制到新的作者工作目录，再按用户目标改写；它的字段、色彩、文案和布局不是规范要求。已存在源码则原地升级相关内容，保留无关文件。

## 创作

1. 设计自己的初始化Schema和有效样例，写入新id/version、说明、Prompt/Skill与相对参考链接。字段遵循题材，不继承starter不需要的业务结构。
2. 实现包自己的初始化UI与所需卡片/详情/背景/内容视图。HTML/CSS/JS和可选本地资源决定呈现；随机与撤销逻辑也属于包。使用同版SDK，不直接调用原生桥或宿主命令。主题读取宿主公开render，适配窄框和减少动态效果。
3. 检查Prompt能在零插件情况下正常创作；必读资料在Skill中明确要求通过read_reference读取。插件选择属于用户，不要求内置记忆、环境、NPC或规划能力。
4. 按验证文档实际执行样例Schema校验、validate、浏览器preview、pack。工具都在 `assets/toolkit`，SDK与protocol要同版复制到包资源中。只读原工具，修正生成内容中的规范错误。

## 完成

交付可编辑源码、`.omn-template`、sha256与validation报告，说明实际验证层级。至少表单与Schema一致、资源闭包完整、归档校验成功；浏览器不可用时明确UI未验，不虚称预览成功。真实模型/Android需另有环境与授权，`runtimeVerified:false`不改成true。

不自动安装、发布、清空数据、消耗模型费用或修改全局Agent配置。模板的可移植性来自同一包结构与SDK，不来自对某个Agent品牌或特定模板id的特殊处理。
