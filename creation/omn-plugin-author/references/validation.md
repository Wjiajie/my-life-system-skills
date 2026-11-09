# 生成后的验证与交付

工具只依赖Node >=22.19。以下 `<skill>` 是当前Skill完整目录，`<source>`是独立的作者源码目录，`<out>`是源码目录之外的全新输出路径；Agent将占位替换为真实绝对路径，不能把示例路径原样执行。路径有空格时整体加引号。无需npm install。

```text
node "<skill>/assets/toolkit/scripts/package-authoring.mjs" validate template "<source>"
node "<skill>/assets/toolkit/scripts/package-authoring.mjs" pack template "<source>" "<out>.omn-template"
node "<skill>/assets/toolkit/scripts/package-preview.mjs" template "<source>"
```

插件将template替换为plugin、扩展名改为 `.omn-plugin`。preview最后可追加JSON数据文件路径；模板文件是公开render投影（不是初始化表单值），插件文件是结果data。插件自定义视图默认使用源码 `examples/result.json`；没有view的插件只显示能力说明，不伪造Agent输出。浏览器打开命令输出的localhost URL；Ctrl+C结束预览。服务启动时冻结资源，修改源码后应结束并重新启动。

## 分层检查

1. **结构**：validate exit0，真实Schema校验样例。工具只校验清单/闭包/Schema定义，不把它当UI/Agent验证。可在临时Node脚本中导入随附`vnext.mjs`的`validateJsonSchema(schema,data)`验证具体初始化/结果；返回ok才算通过。
2. **呈现**：模板实际操作表单并看到可信页完整候选，测试错误后改正、空/长输入、320px、明暗、键盘和声明的视图。插件由真实compilePluginView编译样例，查看日夜/长列表；不支持的CSS要修改内容。
3. **归档**：pack成功产生归档、`.sha256`、`.validation.json`三个文件。输出不可覆盖；内容改动后用新路径重新打包。校验报告保持 `runtimeVerified:false`，代表未验证Android/模型。
4. **应用与模型（另需对应环境/授权）**：在OMN导入、零插件模板创作、跨模板装载插件、启停/移除、自定义提示词下一轮生效、失败保留正文。真实模型请求检查prompt/Skill注入和reference工具往返，不能用文件存在、模拟流或模型自称已读替代。

本地预览仅服务已审阅且由作者控制的源码，不是运行恶意第三方JS的沙箱；它显式模拟宿主桥，不提供安装、故事写入、Provider或原生能力。不要修改安全策略、SDK/校验器或给包添加凭证以“修好”预览。

最终交付源码路径、包与两份报告路径、主题/结构摘要、实际执行命令与结果、尚未验证项。没有模型/设备时明确写未验证，但仍交付已校验的作者包。不要自动同步Skill到全局、安装应用、清数据或commit/push。
