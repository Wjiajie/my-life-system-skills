# M-flow 召回模式详解

## 五种模式对比

| 模式 | 关键词 | 工作原理 | 最佳场景 | 速度 |
|------|--------|---------|---------|------|
| `EPISODIC` | 事件/经历/上次/之前 | 图路由 Bundle Search，按 Episode 召回 | 跨会话记忆、事件回溯 | 中 |
| `PROCEDURAL` | 步骤/怎么做/流程/方法 | 从情景记忆提取操作规则 | 技能/工作流查询 | 中 |
| `TRIPLET_COMPLETION` | 问答/关系/是什么 | 三元组补全 + LLM 综合回答 | 通用知识查询 | 慢（需LLM） |
| `CHUNKS_LEXICAL` | 精确词/代码/名称 | BM25 词法搜索，不用向量 | 精确关键词匹配 | 快 |
| `CYPHER` | 图查询/关系网络 | 直接执行 Cypher 图查询 | 高级用户，复杂关系图 | 快 |

## 模式选择决策树

```
用户问题
├── 含"上次""之前""记得""曾经" → EPISODIC
├── 含"怎么""如何""步骤""方法" → PROCEDURAL
├── 精确搜索某个词/代码片段 → CHUNKS_LEXICAL
├── 复杂关系查询（谁和谁有什么关系）→ CYPHER
└── 通用问答（默认）→ TRIPLET_COMPLETION
```

## search vs query 的区别

| 特性 | `search` | `query` |
|------|---------|---------|
| 接口 | 底层，需要 `recall_mode` 大写 | 高层封装，`mode` 小写 |
| 控制粒度 | 高（支持 system_prompt、hybrid_search）| 低（简单易用）|
| 推荐使用 | 需要精细控制时 | 大多数场景 |

### search 的 recall_mode（大写）
- `TRIPLET_COMPLETION`
- `EPISODIC`
- `PROCEDURAL`
- `CHUNKS_LEXICAL`
- `CYPHER`

### query 的 mode（小写）
- `episodic`
- `procedural`
- `triplet`
- `chunks`
- `cypher`

## 常见查询模式示例

```python
# 1. 最常用：问一个问题，自动走情景记忆
query(question="我上次讨论了什么项目", mode="episodic", top_k=5)

# 2. 提炼操作步骤
query(question="如何启动 m_flow 服务", mode="procedural")

# 3. 精确词搜索（找代码、名称）
search(search_query="docker-compose mcp", recall_mode="CHUNKS_LEXICAL", top_k=10)

# 4. 限定数据集查询
query(question="用户的代码风格偏好", datasets=["personal"], mode="episodic")

# 5. 带自定义 system_prompt 的综合回答
search(
    search_query="M-flow 架构",
    recall_mode="TRIPLET_COMPLETION",
    system_prompt="你是一个技术顾问，简洁回答，使用中文",
    top_k=3
)
```
