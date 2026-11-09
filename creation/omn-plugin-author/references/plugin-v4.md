# 插件 v4：贡献、设置与结果

先阅读 `package-vnext.md`。插件是独立业务能力；输入结构、处理方法与结果由Prompt/Skill定义，能够装载到任意模板。无需对模板id、人物字段或其他插件建依赖。

```json
{
  "schemaVersion":4,"id":"org.example.plugin.evidence-map","version":"1.0.0",
  "name":"线索整理","description":"梳理本轮证据与待核实的推测。",
  "contributions":{
    "before":{"systemPromptPath":"prompts/before.md","skillPath":"skill/before.md"},
    "after":{"systemPromptPath":"prompts/after.md","skillPath":"skill/SKILL.md",
      "result":{"kind":"structured","schemaPath":"schemas/result.schema.json"}}
  },
  "capabilities":[],"storageQuotaBytes":0,
  "configuration":{"promptTargets":[
    {"id":"guidance","target":"after","label":"自定义线索整理要求","editable":true}
  ]},
  "view":{"entry":"web/result.html","stylesheet":"web/style.css"},
  "actions":[{"id":"recheck","label":"重新梳理线索","inputSchemaPath":"schemas/recheck.input.json","systemPromptPath":"prompts/recheck.md"}]
}
```

按实际需要选择before、after或两者，至少一个。configuration/view/actions可省略；无自定义view时宿主展示安全文本。before只有systemPromptPath/skillPath；after另声明result，支持 `{"kind":"markdown"}` 或上例structured。不要加入inputSchema/dependencies/builtin/locked等未知清单字段。

## 两种参与时机

- 创作开始前（before）：有效系统提示词与Skill注入正文Agent的实际请求，没有独立插件Agent。适合影响本轮写法、提醒已有公开信息；不能在这里读取插件私有存储或发布独立结果。
- 正文完成后（after）：对话Agent阅读插件说明后选择JSON输入，并安排独立插件Agent。所有已启用after插件每轮均参与；相关性不能成为静默跳过理由。Agent决定输入和执行次序，包不要求宿主写业务校验分支。

系统提示词应具体说明“希望获得什么信息、如何消费、缺失/不确定如何表达、公开输出内容、自身状态如何更新”。不假定收到完整故事或任意兄弟私有数据。没有变化也应执行并合法发布，不把沉默当成功。

后置工具：`read_private({})`读取自身本次快照；`publish_result({output,state})` 原子发布完整公开结果与状态决策。state为 `{"kind":"keep"}` 或 `{"kind":"replace","value":...}`，不是任意文件写入。公开结果与私有状态分别有界（JSON至多48KiB）；输出必须符合result约定，私密实现细节不要无意公开。成功调用publish_result才表示完成，最终自然语言不能替代提交。`read_reference`用法见公共规范。

## 提示词编辑与用户操作

promptTargets独立于before/after时机。每个target只能指向本包声明过的before或after，各时机至多一个目标，id唯一；editable决定是否开放编辑。用户保存不调用模型、不改包文件/历史，从下一轮生效；进行中轮次和失败重试用原快照。只需开放系统提示词编辑时，不新增Slot或Action。

Action最多16个，id安全且唯一，label非空≤256UTF-8字节，inputSchemaPath/systemPromptPath引用真实文件。宿主在可信外壳展示表单并明确确认后，启动该插件独立Agent；不重跑正文/兄弟插件。推荐带after的插件使用Action，以同一结果Schema和Skill发布。view里不放按钮或脚本，不伪造支付、网络、文件等额外权限。

当前capabilities必须空数组，storageQuotaBytes必须0：它们不开放任意工具或文件存储，`read_private`/`publish_result`通用状态仍可用。

## 自定义结果呈现

有view时阅读 `plugin-view.md`，使用声明式HTML/CSS，不运行JS，不共享模板DOM/CSS。提供符合真实result Schema的 `examples/result.json`，方便本地编译与预览。日夜主题与长列表均需检查；用户查看结果不自动调用Agent。
