---
name: omn-plugin-author
description: 为 OMN 创建或升级可自由装载到任意模板的 v4 插件包，定义前置指引、后置 Agent 处理、可编辑提示词、结果视图与用户 Action，并校验、打包和预览。不是 Codex 插件生成器。
---

# OMN 插件作者

生成由Prompt/Skill驱动的普通插件，不修改宿主、不绑定模板。随附规范固定为2026-09-06的插件v4/模板v3；离线工具仅需Node >=22.19，适用于其他能读Markdown与操作文件的Agent工具。

## 开始

先完整阅读 [公共包规范](references/package-vnext.md)、[插件规范](references/plugin-v4.md) 和 [验证与交付](references/validation.md)。需要自定义结果视图时，再完整阅读 [声明式视图文法](references/plugin-view.md)。工具路径从本Skill目录解析，无需找到OMN源码。

把用户目标写成具体用途：需要什么信息、如何处理、什么算未知/无变化、公开什么、自己保存什么。信息足够则执行。`assets/starter` 是故事记忆的普通插件示例；复制到新的作者目录后改成用户题材，结果字段与视觉不受该示例限制。已有插件只改相关内容，保持无关工作。

## 创作

1. 选择“创作开始前”、 “正文完成后”或两者。前置只注入正文Agent，后置由对话Agent选择输入并编排独立插件Agent；全部已启用后置插件每轮参与。不要引入模板id依赖、builtin/locked或固定兄弟依赖。
2. 写系统提示词与Skill：明确希望收到的信息、消费方式、缺失信息处理、真实read_reference/read_private读取及publish_result提交。输入由对话Agent决定，业务语义不要求宿主新增校验分支。
3. 选择Markdown或自己的structured结果Schema，提供真实有效的 `examples/result.json`。需要自定义呈现时用允许的HTML绑定和CSS，不写JS、按钮或跨模板DOM。用户操作通过可选Action声明交给可信宿主确认执行。
4. 需要用户编辑系统提示词时声明promptTargets；这不是运行Slot，也不需要额外Action。只开放用户需要的目标，保存从下一轮生效，重试保留原快照。
5. 按验证文档实际运行样例Schema校验、validate、日夜preview和pack。工具位于 `assets/toolkit`；遵循同版校验器与compiler，改正内容而不是放宽技术边界。

## 完成

交付源码、`.omn-plugin`、sha256与validation报告，说明参与时机、可编辑设置、结果与可选操作，以及真实执行的检查。没有自定义view时不把提示词预览伪称插件Agent运行；没有真实Provider/Android时明确未验，保持 `runtimeVerified:false`。

普通记忆、环境、NPC、规划与新题材能力遵循同一装载/停用/移除规则。生成不自动装载、不付费调用、不发布、不清数据，也不修改全局Agent配置。
