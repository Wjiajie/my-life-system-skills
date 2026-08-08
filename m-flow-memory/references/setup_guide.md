# M-flow 服务配置指南

## 系统要求

- Docker Desktop（已安装 v29.2.1）
- Ollama（已安装，运行中）
  - `gemma3:1b` — LLM 模型
  - `nomic-embed-text:latest` — Embedding 模型

## 服务启动

项目目录：`C:\Users\jiaji\Documents\github-project\researchs\m_flow`

```powershell
# 启动 backend + MCP server
cd C:\Users\jiaji\Documents\github-project\researchs\m_flow
docker compose --profile mcp up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f mflow-api
docker compose logs -f m_flow-mcp
```

## 端口说明

| 服务 | 容器端口 | 宿主机端口 | 说明 |
|------|---------|-----------|------|
| mflow-api | 8000 | 8000 | M-flow 后端 API |
| m_flow-mcp | 8000 | 8001 | MCP Server（SSE 模式）|

## 健康检查

```powershell
# 检查 backend 是否正常
Invoke-RestMethod -Uri "http://localhost:8000/health"

# 检查 MCP server 是否正常
Invoke-RestMethod -Uri "http://localhost:8001/health"
```

期望返回：`{"status": "ok"}`

## 停止服务

```powershell
cd C:\Users\jiaji\Documents\github-project\researchs\m_flow
docker compose --profile mcp down
```

## Ollama 配置说明

M-flow 通过 `http://host.docker.internal:11434` 访问宿主机 Ollama 服务。
`host.docker.internal` 在 Docker Desktop for Windows 中自动解析为宿主机 IP。

### 验证 Ollama 可达

```powershell
# 宿主机执行
Invoke-RestMethod -Uri "http://localhost:11434/api/tags"
```

### 如果想换更大的模型

```powershell
# 拉取 3B 模型（约 2GB，结构化输出更好）
ollama pull llama3.2:3b

# 然后修改 .env
# LLM_MODEL="ollama/llama3.2:3b"
# 重启服务
docker compose --profile mcp down
docker compose --profile mcp up -d
```

## 常见问题

### MCP 连接失败
1. 检查 Docker Desktop 是否运行：`docker ps`
2. 检查服务状态：`docker compose ps`
3. 查看错误日志：`docker compose logs m_flow-mcp`

### 知识图谱构建失败（memorize 失败）
- `gemma3:1b` 可能对复杂结构化提取力不从心
- 改用 `llama3.2:3b` 或更大的模型
- 查看日志：`docker compose logs mflow-api`

### Embedding 维度不匹配
- 确认 `.env` 中 `EMBEDDING_DIMENSIONS=768`（nomic-embed-text 的输出维度）
- 如果之前用过其他 embedding 模型，需要清空 vector DB：
  ```powershell
  # 通过 MCP 工具调用 prune（谨慎！会清除所有 vector 数据）
  # prune(vector=True, graph=False, metadata=False, cache=False)
  ```

## MCP 注册到 Antigravity

在 Antigravity 的 mcp_config.json 中添加：

```json
{
  "m_flow": {
    "url": "http://localhost:8001/sse",
    "transport": "sse"
  }
}
```
