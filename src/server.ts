import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { F2bClient } from "@f2b/sdk";
import { createToolHandlers } from "./tools.js";

/**
 * 构造已注册沙箱工具的 McpServer（不含 transport）。
 * 便于 stdio 入口与后续 Streamable HTTP 复用。
 */
export function createMcpServer(client: F2bClient): McpServer {
  const server = new McpServer({
    name: "f2b-mcp-gateway",
    version: "0.1.0",
  });
  const h = createToolHandlers(client);

  server.registerTool(
    "sandbox_create",
    {
      title: "创建沙箱",
      description:
        "在灵境云创建 AI 沙箱（用完即焚 Linux 环境）。返回 sandbox id 与状态。",
      inputSchema: {
        name: z.string().optional().describe("显示名"),
        template: z
          .string()
          .optional()
          .describe("模板，默认 base"),
        timeoutMs: z.number().int().positive().optional(),
        allowInternetAccess: z.boolean().optional(),
        projectId: z.string().optional(),
      },
    },
    async (args) => h.sandbox_create(args),
  );

  server.registerTool(
    "sandbox_list",
    {
      title: "列出沙箱",
      description: "列出当前可见的沙箱；可按 projectId 过滤。",
      inputSchema: {
        projectId: z.string().optional(),
      },
    },
    async (args) => h.sandbox_list(args),
  );

  server.registerTool(
    "sandbox_get",
    {
      title: "沙箱详情",
      description: "按 id 获取沙箱元数据与状态。",
      inputSchema: {
        sandboxId: z.string().describe("沙箱 id，如 sbx_…"),
      },
    },
    async (args) => h.sandbox_get(args),
  );

  server.registerTool(
    "sandbox_run",
    {
      title: "执行命令",
      description: "在指定沙箱中执行 shell 命令，返回 stdout/stderr/exitCode。",
      inputSchema: {
        sandboxId: z.string(),
        cmd: z.string().describe("要执行的命令"),
        cwd: z.string().optional(),
        timeoutMs: z.number().int().positive().optional(),
      },
    },
    async (args) => h.sandbox_run(args),
  );

  server.registerTool(
    "sandbox_write_file",
    {
      title: "写文件",
      description: "向沙箱写入 UTF-8 文本文件（绝对路径）。",
      inputSchema: {
        sandboxId: z.string(),
        path: z.string().describe("绝对路径，如 /home/user/a.txt"),
        content: z.string(),
      },
    },
    async (args) => h.sandbox_write_file(args),
  );

  server.registerTool(
    "sandbox_read_file",
    {
      title: "读文件",
      description: "读取沙箱内 UTF-8 文件内容。",
      inputSchema: {
        sandboxId: z.string(),
        path: z.string(),
      },
    },
    async (args) => h.sandbox_read_file(args),
  );

  server.registerTool(
    "sandbox_list_files",
    {
      title: "列目录",
      description: "列出沙箱目录条目。",
      inputSchema: {
        sandboxId: z.string(),
        path: z.string().optional().describe("默认 /home/user"),
      },
    },
    async (args) => h.sandbox_list_files(args),
  );

  server.registerTool(
    "sandbox_pause",
    {
      title: "暂停沙箱",
      description: "暂停运行中的沙箱；暂停后命令会返回 SANDBOX_NOT_RUNNING。",
      inputSchema: {
        sandboxId: z.string(),
      },
    },
    async (args) => h.sandbox_pause(args),
  );

  server.registerTool(
    "sandbox_resume",
    {
      title: "恢复沙箱",
      description: "将 paused 沙箱恢复为 running。",
      inputSchema: {
        sandboxId: z.string(),
      },
    },
    async (args) => h.sandbox_resume(args),
  );

  server.registerTool(
    "sandbox_templates",
    {
      title: "模板目录",
      description: "列出可用沙箱模板（id 即创建时的 template）。",
      inputSchema: {},
    },
    async () => h.sandbox_templates(),
  );

  server.registerTool(
    "sandbox_usage",
    {
      title: "用量摘要",
      description: "近 N 日用量聚合（默认 7，最大 90）。",
      inputSchema: {
        days: z.number().int().positive().optional(),
      },
    },
    async (args) => h.sandbox_usage(args),
  );

  server.registerTool(
    "sandbox_kill",
    {
      title: "销毁沙箱",
      description: "销毁沙箱并释放资源；已销毁则幂等返回。",
      inputSchema: {
        sandboxId: z.string(),
      },
    },
    async (args) => h.sandbox_kill(args),
  );

  return server;
}
