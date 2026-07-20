/**
 * MCP 冒烟：stdio 拉起网关 → listTools → create → run → kill
 * 依赖本地 f2b-sandbox（默认 :8787）。
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { TOOL_NAMES } from "../src/tools.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.F2B_SANDBOX_URL ?? "http://127.0.0.1:8787";

function textOf(result: {
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
}): string {
  const parts = (result.content ?? [])
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text!);
  return parts.join("\n");
}

async function main() {
  // 先确认 sandbox 可达
  const hz = await fetch(`${baseUrl}/healthz`).catch(() => null);
  if (!hz?.ok) {
    throw new Error(`f2b-sandbox unreachable at ${baseUrl}`);
  }

  const transport = new StdioClientTransport({
    command: "pnpm",
    args: ["exec", "tsx", "src/index.ts"],
    cwd: root,
    env: {
      ...process.env,
      F2B_SANDBOX_URL: baseUrl,
    },
    stderr: "pipe",
  });

  const client = new Client({ name: "f2b-mcp-smoke", version: "0.1.0" });
  await client.connect(transport);

  const listed = await client.listTools();
  const names = new Set(listed.tools.map((t) => t.name));
  for (const n of TOOL_NAMES) {
    if (!names.has(n)) throw new Error(`missing tool: ${n}`);
  }
  console.log("tools", [...names].sort().join(", "));

  const created = await client.callTool({
    name: "sandbox_create",
    arguments: { name: "mcp-smoke", template: "base" },
  });
  if (created.isError) throw new Error(textOf(created as never));
  const createdJson = JSON.parse(textOf(created as never)) as {
    sandbox: { id: string };
  };
  const id = createdJson.sandbox.id;
  console.log("created", id);

  const ran = await client.callTool({
    name: "sandbox_run",
    arguments: { sandboxId: id, cmd: "echo mcp-gateway-ok" },
  });
  if (ran.isError) throw new Error(textOf(ran as never));
  const ranText = textOf(ran as never);
  if (!ranText.includes("mcp-gateway-ok")) {
    throw new Error(`stdout missing marker: ${ranText}`);
  }
  console.log("run ok");

  const killed = await client.callTool({
    name: "sandbox_kill",
    arguments: { sandboxId: id },
  });
  if (killed.isError) throw new Error(textOf(killed as never));
  const killJson = JSON.parse(textOf(killed as never)) as {
    sandbox: { status: string };
  };
  if (killJson.sandbox.status !== "killed") {
    throw new Error(`expected killed, got ${killJson.sandbox.status}`);
  }

  await client.close();
  console.log("MCP_SMOKE_OK", id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
