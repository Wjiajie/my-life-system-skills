# OMN 作者包规范 · 2026-09-06

对应模板清单 v3、插件清单 v4、模板消息协议 v1。本文描述当前工具接受的格式；不兼容旧包。不需要知道宿主代码、模板题材或插件身份。

## 源码与归档

源码根只有一个 `template.source.json` 或 `plugin.source.json` 清单。所有资源从该根使用区分大小写的相对路径引用。资源内容可中文；路径段使用 ASCII 字母、数字、`_ - .`，段首不用点、段尾不用点，不含空格、反斜线、空段、URL、`..`、编码路径或符号链接。避免仅大小写不同的路径。

清单的 `files` 由工具扫描生成，作者不填写。源码内不放 `template.json`、`plugin.json`、ZIP、输出包、校验报告、开发依赖或凭证。打包会包含源码目录内全部普通资源，因此只把运行所需与样例资料放进去。

包 id 使用小写字母/数字组成的段，以点或短横分隔，例如 `org.example.template.orbit-garden`。version 使用最多64个安全字母/数字/点/下划线/短横、无 `..` 的非空字符串，推荐 `1.0.0`。修改已发行内容时使用新version；宿主按 kind/id/version/checksum 精确绑定，不自动追随另一个同id包。

预算：最多511个资源，单资源8MiB，总源码16MiB，生成清单256KiB，目录扫描节点1024。提示词/Skill单文件宜小于64KiB，结果JSON至多48KiB。只提交必要内容；预算是技术保护，不是创作题材限制。

## JSON Schema 子集

每个Schema节点显式声明一种 `type`：object、array、string、number、integer、boolean、null。仅支持：

| 类型 | 关键字 |
| --- | --- |
| 所有类型 | type、enum、title、description |
| object | properties、required、additionalProperties（布尔） |
| array | items（一个Schema）、minItems、maxItems |
| string | minLength、maxLength（Unicode字符数） |
| number/integer | minimum、maximum |

不用 `$schema`、`$ref`、anyOf/oneOf、type数组、pattern、format、default 或未知关键字。初始化默认值由模板自己的UI定义。通常用 `additionalProperties:false` 明确结构，并限制字符串与列表大小。嵌套≤64、JSON节点≤10000；JSON必须有限数字、无循环、无重复key，不通过getter/toJSON产生数据。工具的纯实现位于 `assets/toolkit/packages/schemas/src/vnext.mjs`；它是执行判据，遇到错误先改生成内容，不修改校验器放行。

## Prompt、Skill 与参考资料

包内系统提示词说明目标、输入含义、缺失信息如何处理、输出/状态约定。Skill说明处理步骤与可读参考资料。二者是Agent读取的内容，不执行包内服务器代码。

参考资料用已加载Markdown中的相对链接，例如 `skill/SKILL.md` 链接 `[处理准则](references/method.md)`。Agent使用 `read_reference({scopeId,sourcePath,href})` 读取；scopeId来自实际请求中宿主提供的资源范围，sourcePath为已读文档包内路径，href与链接一致。不要硬编码别的实例id、绝对本机路径或远程参考。必要资料须明确要求实际读取；“包中存在文件”不证明Agent已读取它。

## 结构与权限

模板不声明必需/锁定插件。插件不声明模板依赖、内置身份或任意网络/文件执行权限。Agent负责业务理解和编排；宿主负责通用结构、身份、预算、状态版本和结果提交边界。每个包可独立导入；插件装载、启用和卸载由用户决定。

把文件导入应用、安装到设备、调用真实模型或发布归档是独立动作，不由“生成包”自动授权。
