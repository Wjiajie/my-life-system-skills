---
name: m-flow-memory
description: "跨会话持久化记忆系统,基于 M-flow 认知记忆引擎(图路由检索,优于 RAG). 通过 MCP 工具 memorize/search/query 写入和召回结构化知识. 触发:用户说\"记住...\"、\"帮我记一下\"、\"下次别忘了\";问\"我之前/上次/以前...\";重要决策/项目约定/架构设计需要持久化;要求管理/查看/删除已有记忆."
---

# M-flow 记忆系统使用指南

## 服务状态检查

**调用任何工具前，先确认 MCP server 处于运行状态。**
如连接失败，参见 [setup_guide.md](references/setup_guide.md)。

---

## 主动记忆判断协议

> **核心原则：不要默默丢失重要信息，但也不要过度打扰用户。**

### 什么信息值得主动提醒？

在对话过程中，若出现以下信息，**在正常回复末尾补充一句确认语**，询问用户是否需要保存：

| 信息类型 | 典型例子 | 重要性 |
|---------|---------|--------|
| 技术架构决策 | "我们决定用 React + Supabase" | ⭐⭐⭐ 高 |
| 项目配置/路径/地址 | "项目在 C:\Users\xxx\project" | ⭐⭐⭐ 高 |
| 重要 Bug 及修复方案 | "HUGGINGFACE_TOKENIZER 必须设置才能通过验证" | ⭐⭐⭐ 高 |
| 用户偏好/习惯 | "我喜欢用 TypeScript，不用 any" | ⭐⭐ 中 |
| 服务/账号/认证信息 | API 端点、token 格式 | ⭐⭐⭐ 高 |
| 一次性问答/临时信息 | "今天天气怎样"、调试日志片段 | ✗ 不保存 |

### 主动提醒流程

```
1. 对话中识别到潜在重要信息
2. 正常完成回答后，在末尾追加一句确认语（不打断主要回答）
3. 用户确认 → 执行写入协议（选择合适的工具和 dataset_name）
4. 用户拒绝 → 直接跳过，不再重复追问
```

### 确认语格式（简洁、非侵入）

- 「💾 检测到重要配置/决策，需要存入记忆库备用吗？」
- 「💾 这个方案以后可能用到，要帮你记住吗？」
- 「💾 这次的修复方案值得记录，保存一下吗？」

---

## 记忆写入协议

### Codex 手工摘要优先

**默认策略：由当前 Codex 先手工提炼，再写入 M-flow。**

M-flow 在本工作流中主要承担：

- 持久化保存
- 跨会话检索
- 数据集分区
- 结构化召回

不要默认让 M-flow 或它背后的模型承担“具体内容总结、判断、归纳”的职责。写入前先由 Codex 生成短、准、可复用的记忆文本，必要时给用户确认。

推荐写入格式：

```text
事实/决策：
适用范围：
证据/来源：
后续使用方式：
```

除非用户明确要求“深度图谱化”“长文档入库”“让 M-flow 学习这份资料”，否则不要调用 `memorize` 做异步深度构建。

### 场景判断

| 内容类型 | 推荐工具 | dataset_name |
|---------|---------|-------------|
| 单条快速记录（事实、偏好） | `ingest` | `personal` |
| 用户-Agent 对话摘要 | `save_interaction` | 自动 |
| 较长知识/文档（用户明确要求图谱构建） | `memorize` | 按主题命名 |
| 项目相关知识 | `ingest` | `project_<项目名>` |

### 写入流程

```
1. 判断内容类型 → 选工具和 dataset_name
2. 调用 ingest 或 save_interaction（同步）
3. 若用户明确要求深度图谱构建，额外调用 memorize（后台异步）
4. 可用 memorize_status 查看异步任务状态
```

### 记忆写入示例

```
# 快速记录（推荐，同步完成）
ingest(data="用户偏好深色主题，代码用 TypeScript", dataset_name="personal")

# 保存对话摘要
save_interaction(data="本次对话：讨论了 M-flow 接入方案，决定使用 MCP 桥接模式")

# 深度知识入库（仅在用户明确要求时使用；异步，需配合 memorize_status 查询）
memorize(data="<长文档内容>", dataset_name="research")
```

---

## 记忆召回协议

### 召回模式选择

| 用户意图 | 召回模式 | 说明 |
|---------|---------|------|
| "我之前/上次..." | `EPISODIC` | 情景记忆，按时间和事件检索 |
| "怎么做/步骤/流程" | `PROCEDURAL` | 程序性记忆，提取操作步骤 |
| "查一个具体事实" | `TRIPLET_COMPLETION` | 三元组补全，LLM 辅助回答 |
| "找含某关键词的内容" | `CHUNKS_LEXICAL` | 词法精确搜索 |

详细模式说明见 [recall_modes.md](references/recall_modes.md)。

### 召回流程

```
1. 理解用户意图 → 选择 recall_mode
2. 简洁查询 → 调用 search 或 query
3. 若结果为空，换另一种模式重试
4. 将结果整合到回答中，不要直接把原始 JSON 返回给用户
```

### 召回示例

```
# 问上次的事（情景记忆）
search(search_query="上次讨论的技术方案", recall_mode="EPISODIC", top_k=5)

# 查怎么做（程序性记忆）
query(question="如何配置 M-flow 的 Ollama 模式", mode="procedural")

# 简单问答（最常用）
query(question="用户喜欢什么代码风格", datasets=["personal"])
```

---

## 记忆管理

```
# 查看所有数据集
list_data()

# 查看某数据集详情
list_data(dataset_id="<uuid>")

# 从情景记忆中提炼程序性规则（学习）
learn(datasets=["research"])
```

---

## 注意事项

- `memorize` 是**异步**的，调用后用 `memorize_status` 轮询状态；默认不要用于普通摘要
- `ingest` 和 `save_interaction` 是**同步**的，完成即可用
- Ollama 本地模型（gemma3:1b）适合简单查询，复杂知识图谱构建效果有限
- 建议 dataset_name 按主题/项目分区，避免所有内容堆在 main_dataset
