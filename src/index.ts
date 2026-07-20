#!/usr/bin/env node
/**
 * stdio MCP 入口：供 Claude Desktop / Cursor 等本地拉起。
 * 日志只写 stderr，避免污染 MCP JSON-RPC stdout。
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createClient } from "./tools.js";
import { createMcpServer } from "./server.js";

async function main() {
  const cfg = loadConfig();
  const client = createClient(cfg);
  const server = createMcpServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `f2b-mcp-gateway ready sandbox=${cfg.sandboxBaseUrl} prefix=${cfg.pathPrefix}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
