# f2b-mcp-gateway

灵境云 **MCP 网关**：把 AI 沙箱能力暴露为 [Model Context Protocol](https://modelcontextprotocol.io) tools，供 Claude Desktop、Cursor 等 MCP 客户端调用。

| 项 | 说明 |
|----|------|
| 传输 | **stdio**（V1）；Streamable HTTP 后置 |
| 上游 | [f2b-sandbox](https://github.com/f2b-dev/f2b-sandbox) `/v1`（经 [@f2b/sdk](https://github.com/f2b-dev/f2b-sdk-js)） |
| 密钥 | 仅进程 env：`F2B_API_KEY` / `F2B_SANDBOX_URL`；**不向客户端回显** |

## 工具映射

| MCP tool | 沙箱能力 |
|----------|----------|
| `sandbox_create` | `POST /v1/sandboxes`（可选 `metadata`） |
| `sandbox_list` | `GET /v1/sandboxes`（可选 `status`） |
| `sandbox_get` | `GET /v1/sandboxes/{id}` |
| `sandbox_update` | `PATCH /v1/sandboxes/{id}`（`timeoutMs` / `metadata`） |
| `sandbox_run` | `POST /v1/sandboxes/{id}/commands` |
| `sandbox_write_file` | `POST /v1/sandboxes/{id}/files` |
| `sandbox_delete_file` | `DELETE /v1/sandboxes/{id}/files?path=` |
| `sandbox_mkdir` | `POST .../files/mkdir` |
| `sandbox_rename` | `POST .../files/rename` |
| `sandbox_read_file` | `GET /v1/sandboxes/{id}/files?path=` |
| `sandbox_list_files` | `GET .../files?list=1` |
| `sandbox_pause` | `POST .../pause` |
| `sandbox_resume` | `POST .../resume` |
| `sandbox_templates` | `GET /v1/templates` |
| `sandbox_usage` | `GET /v1/usage` |
| `sandbox_kill` | `DELETE /v1/sandboxes/{id}` |

## 本地开发

前置：`f2b-sandbox` 在 `http://127.0.0.1:13287` 运行（`F2B_AUTH_MODE=off` 或提供 `F2B_API_KEY`）。

```bash
# 同级目录需有 f2b-sdk-js、f2b-spec（file: 依赖）
pnpm install
pnpm typecheck
pnpm smoke          # → MCP_SMOKE_OK
pnpm start          # stdio 服务（需 MCP 客户端拉起）
```

### 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `F2B_SANDBOX_URL` | `http://127.0.0.1:13287` | 沙箱服务根 URL |
| `F2B_PATH_PREFIX` | `/v1` | API 前缀 |
| `F2B_API_KEY` | （空） | 用户 API Key；鉴权关闭时可省略 |

### Claude Desktop 示例配置

```json
{
  "mcpServers": {
    "lingjing": {
      "command": "pnpm",
      "args": ["--dir", "/path/to/f2b-mcp-gateway", "exec", "tsx", "src/index.ts"],
      "env": {
        "F2B_SANDBOX_URL": "http://127.0.0.1:13287",
        "F2B_API_KEY": "f2b_sk_…"
      }
    }
  }
}
```

## 安全

- 网关**不**持有 / 转发 Cube 管理密钥；只持用户侧 `F2B_API_KEY` 调灵境云沙箱 HTTP。
- 日志写 **stderr**；stdout 专供 MCP JSON-RPC。
- 正式 npm 发布延后到产品 1.0；现阶段 `file:` / git 依赖。

## 相关仓

- 契约：[f2b-spec](https://github.com/f2b-dev/f2b-spec)
- 沙箱服务：[f2b-sandbox](https://github.com/f2b-dev/f2b-sandbox)
- TS SDK：[f2b-sdk-js](https://github.com/f2b-dev/f2b-sdk-js)
- 文档：[f2b-docs](https://github.com/f2b-dev/f2b-docs)

Apache-2.0
