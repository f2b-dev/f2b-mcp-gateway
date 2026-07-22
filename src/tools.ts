/**
 * MCP tool 名称与 f2b-sandbox 能力映射。
 * 网关经 @f2b/sdk 调 Control/数据面 HTTP，浏览器与 MCP 客户端均不持有 Cube 管理密钥。
 */
import { F2bClient, type CreateSandboxInput } from "@f2b/sdk";
import type { GatewayConfig } from "./config.js";

export function createClient(cfg: GatewayConfig): F2bClient {
  return new F2bClient({
    baseUrl: cfg.sandboxBaseUrl,
    pathPrefix: cfg.pathPrefix,
    apiKey: cfg.apiKey,
  });
}

function textResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text:
          typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}

export type ToolHandlers = ReturnType<typeof createToolHandlers>;

export function createToolHandlers(client: F2bClient) {
  return {
    async sandbox_create(input: {
      name?: string;
      template?: string;
      timeoutMs?: number;
      allowInternetAccess?: boolean;
      projectId?: string;
      /** 用户标签 string→string；控制面持久化 */
      metadata?: Record<string, string>;
    }) {
      try {
        const body: Partial<CreateSandboxInput> = {
          name: input.name,
          template: input.template ?? "base",
          timeoutMs: input.timeoutMs,
          allowInternetAccess: input.allowInternetAccess,
          projectId: input.projectId,
          metadata: input.metadata,
        };
        const sb = await client.createSandbox(body);
        return textResult({ sandbox: sb.data });
      } catch (err) {
        return errorResult(err);
      }
    },

    async sandbox_list(input: { projectId?: string; status?: string }) {
      try {
        const sandboxes = await client.listSandboxes({
          projectId: input.projectId,
          status: input.status,
        });
        return textResult({ sandboxes });
      } catch (err) {
        return errorResult(err);
      }
    },

    async sandbox_get(input: { sandboxId: string }) {
      try {
        const sb = await client.getSandbox(input.sandboxId);
        return textResult({ sandbox: sb.data });
      } catch (err) {
        return errorResult(err);
      }
    },

    /** 延期 timeoutMs 和/或浅合并 metadata（仅活动沙箱） */
    async sandbox_update(input: {
      sandboxId: string;
      timeoutMs?: number | null;
      metadata?: Record<string, string>;
    }) {
      try {
        if (input.timeoutMs === undefined && input.metadata === undefined) {
          return errorResult(
            new Error("at least one of timeoutMs, metadata required"),
          );
        }
        const sb = await client.updateSandbox(input.sandboxId, {
          ...(input.timeoutMs !== undefined
            ? { timeoutMs: input.timeoutMs }
            : {}),
          ...(input.metadata !== undefined
            ? { metadata: input.metadata }
            : {}),
        });
        return textResult({ sandbox: sb.data });
      } catch (err) {
        return errorResult(err);
      }
    },

    async sandbox_run(input: {
      sandboxId: string;
      cmd: string;
      cwd?: string;
      timeoutMs?: number;
    }) {
      try {
        const sb = await client.getSandbox(input.sandboxId);
        const result = await sb.run(input.cmd, {
          cwd: input.cwd,
          timeoutMs: input.timeoutMs,
        });
        return textResult({ result });
      } catch (err) {
        return errorResult(err);
      }
    },

    async sandbox_write_file(input: {
      sandboxId: string;
      path: string;
      content: string;
    }) {
      try {
        const sb = await client.getSandbox(input.sandboxId);
        await sb.write(input.path, input.content);
        return textResult({ ok: true, path: input.path });
      } catch (err) {
        return errorResult(err);
      }
    },

    async sandbox_read_file(input: { sandboxId: string; path: string }) {
      try {
        const sb = await client.getSandbox(input.sandboxId);
        const content = await sb.read(input.path);
        return textResult({ path: input.path, content });
      } catch (err) {
        return errorResult(err);
      }
    },

    async sandbox_list_files(input: {
      sandboxId: string;
      path?: string;
    }) {
      try {
        const sb = await client.getSandbox(input.sandboxId);
        const entries = await sb.listFiles(input.path ?? "/home/user");
        return textResult({ entries });
      } catch (err) {
        return errorResult(err);
      }
    },

    async sandbox_delete_file(input: {
      sandboxId: string;
      path: string;
      recursive?: boolean;
    }) {
      try {
        const sb = await client.getSandbox(input.sandboxId);
        await sb.deleteFile(input.path, { recursive: input.recursive });
        return textResult({ ok: true, path: input.path });
      } catch (err) {
        return errorResult(err);
      }
    },

    async sandbox_pause(input: { sandboxId: string }) {
      try {
        const sb = await client.getSandbox(input.sandboxId);
        const record = await sb.pause();
        return textResult({ sandbox: record });
      } catch (err) {
        return errorResult(err);
      }
    },

    async sandbox_resume(input: { sandboxId: string }) {
      try {
        const sb = await client.getSandbox(input.sandboxId);
        const record = await sb.resume();
        return textResult({ sandbox: record });
      } catch (err) {
        return errorResult(err);
      }
    },

    async sandbox_templates() {
      try {
        const templates = await client.listTemplates();
        return textResult({ templates });
      } catch (err) {
        return errorResult(err);
      }
    },

    async sandbox_usage(input: { days?: number }) {
      try {
        const usage = await client.getUsage(input.days ?? 7);
        return textResult({ usage });
      } catch (err) {
        return errorResult(err);
      }
    },

    async sandbox_kill(input: { sandboxId: string }) {
      try {
        const sb = await client.getSandbox(input.sandboxId);
        const record = await sb.kill();
        return textResult({ sandbox: record });
      } catch (err) {
        return errorResult(err);
      }
    },
  };
}

/** 工具清单（文档 / smoke 断言用） */
export const TOOL_NAMES = [
  "sandbox_create",
  "sandbox_list",
  "sandbox_get",
  "sandbox_update",
  "sandbox_run",
  "sandbox_write_file",
  "sandbox_read_file",
  "sandbox_list_files",
  "sandbox_delete_file",
  "sandbox_pause",
  "sandbox_resume",
  "sandbox_templates",
  "sandbox_usage",
  "sandbox_kill",
] as const;
