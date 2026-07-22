/**
 * MCP 冒烟：stdio 拉起网关 → listTools → create → run → pause/resume → templates → kill
 * 依赖本地 f2b-sandbox（默认 :13287）。
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { TOOL_NAMES } from "../src/tools.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.F2B_SANDBOX_URL ?? "http://127.0.0.1:13287";

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
  const hz = await fetch(`${baseUrl}/healthz`).catch(() => null);
  if (!hz?.ok) {
    throw new Error(`f2b-sandbox unreachable at ${baseUrl}`);
  }

  const tunnelUrl = (
    process.env.F2B_TUNNEL_URL ||
    process.env.TUNNEL_URL ||
    "http://127.0.0.1:8790"
  ).replace(/\/$/, "");

  const transport = new StdioClientTransport({
    command: "pnpm",
    args: ["exec", "tsx", "src/index.ts"],
    cwd: root,
    env: {
      ...process.env,
      F2B_SANDBOX_URL: baseUrl,
      F2B_TUNNEL_URL: tunnelUrl,
      F2B_TUNNEL_PATH_PREFIX: process.env.F2B_TUNNEL_PATH_PREFIX || "/v1",
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
    arguments: {
      name: "mcp-smoke",
      template: "base",
      timeoutMs: 600_000,
      metadata: { smoke: "1", owner: "mcp" },
    },
  });
  if (created.isError) throw new Error(textOf(created as never));
  const createdJson = JSON.parse(textOf(created as never)) as {
    sandbox: { id: string; metadata?: Record<string, string>; timeoutMs?: number | null };
  };
  const id = createdJson.sandbox.id;
  if (createdJson.sandbox.metadata?.smoke !== "1") {
    throw new Error(
      `create metadata missing smoke=1: ${JSON.stringify(createdJson.sandbox.metadata)}`,
    );
  }
  console.log("created", id, "meta", createdJson.sandbox.metadata);

  const updated = await client.callTool({
    name: "sandbox_update",
    arguments: {
      sandboxId: id,
      timeoutMs: 900_000,
      metadata: { smoke: "2", phase: "update" },
    },
  });
  if (updated.isError) throw new Error(textOf(updated as never));
  const updatedJson = JSON.parse(textOf(updated as never)) as {
    sandbox: {
      timeoutMs: number | null;
      metadata: Record<string, string>;
    };
  };
  if (updatedJson.sandbox.timeoutMs !== 900_000) {
    throw new Error(
      `expected timeoutMs 900000, got ${updatedJson.sandbox.timeoutMs}`,
    );
  }
  if (
    updatedJson.sandbox.metadata?.smoke !== "2" ||
    updatedJson.sandbox.metadata?.owner !== "mcp" ||
    updatedJson.sandbox.metadata?.phase !== "update"
  ) {
    throw new Error(
      `update metadata merge failed: ${JSON.stringify(updatedJson.sandbox.metadata)}`,
    );
  }
  console.log("update ok", updatedJson.sandbox.metadata);

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

  const ranOpts = await client.callTool({
    name: "sandbox_run",
    arguments: {
      sandboxId: id,
      cmd: "pwd",
      cwd: "/tmp",
      env: { MCP_ENV: "1" },
    },
  });
  if (ranOpts.isError) throw new Error(textOf(ranOpts as never));
  const optsText = textOf(ranOpts as never);
  if (!optsText.includes("/tmp")) {
    throw new Error(`cwd not applied: ${optsText}`);
  }
  const envRun = await client.callTool({
    name: "sandbox_run",
    arguments: {
      sandboxId: id,
      cmd: "printenv MCP_ENV",
      env: { MCP_ENV: "ok" },
    },
  });
  if (envRun.isError) throw new Error(textOf(envRun as never));
  if (!textOf(envRun as never).includes("ok")) {
    throw new Error(`env not applied: ${textOf(envRun as never)}`);
  }
  console.log("run cwd/env ok");

  const paused = await client.callTool({
    name: "sandbox_pause",
    arguments: { sandboxId: id },
  });
  if (paused.isError) throw new Error(textOf(paused as never));
  const pauseJson = JSON.parse(textOf(paused as never)) as {
    sandbox: { status: string };
  };
  if (pauseJson.sandbox.status !== "paused") {
    throw new Error(`expected paused, got ${pauseJson.sandbox.status}`);
  }

  const resumed = await client.callTool({
    name: "sandbox_resume",
    arguments: { sandboxId: id },
  });
  if (resumed.isError) throw new Error(textOf(resumed as never));
  const resumeJson = JSON.parse(textOf(resumed as never)) as {
    sandbox: { status: string };
  };
  if (resumeJson.sandbox.status !== "running") {
    throw new Error(`expected running, got ${resumeJson.sandbox.status}`);
  }

  const templates = await client.callTool({
    name: "sandbox_templates",
    arguments: {},
  });
  if (templates.isError) throw new Error(textOf(templates as never));
  const tplText = textOf(templates as never);
  if (!tplText.includes("base")) {
    throw new Error(`templates missing base: ${tplText}`);
  }

  const usage = await client.callTool({
    name: "sandbox_usage",
    arguments: { days: 7 },
  });
  if (usage.isError) throw new Error(textOf(usage as never));

  // base64 写读
  const raw = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const b64 = raw.toString("base64");
  const wrote = await client.callTool({
    name: "sandbox_write_file",
    arguments: {
      sandboxId: id,
      path: "/home/user/mcp.bin",
      content: b64,
      encoding: "base64",
    },
  });
  if (wrote.isError) throw new Error(textOf(wrote as never));
  const readB64 = await client.callTool({
    name: "sandbox_read_file",
    arguments: {
      sandboxId: id,
      path: "/home/user/mcp.bin",
      encoding: "base64",
    },
  });
  if (readB64.isError) throw new Error(textOf(readB64 as never));
  const readJson = JSON.parse(textOf(readB64 as never)) as {
    content: string;
    encoding?: string;
  };
  if (readJson.encoding !== "base64") {
    throw new Error(`expected base64 encoding, got ${readJson.encoding}`);
  }
  if (Buffer.from(readJson.content, "base64").compare(raw) !== 0) {
    throw new Error(
      `base64 roundtrip mismatch: ${readJson.content} vs ${b64}`,
    );
  }
  console.log("files base64 ok");

  // 可选：隧道（需 F2B_TUNNEL_URL 可达）
  const tunnelHz = await fetch(`${tunnelUrl}/healthz`).catch(() => null);
  if (tunnelHz?.ok) {
    const http = await import("node:http");
    const marker = "mcp-tunnel-ok";
    const upstream = http.createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, marker }));
    });
    await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
    const addr = upstream.address();
    if (!addr || typeof addr === "string") {
      throw new Error("failed to bind upstream");
    }
    const port = addr.port;
    try {
      const createdTun = await client.callTool({
        name: "tunnel_create",
        arguments: {
          sandboxId: id,
          port,
          name: "mcp-smoke-tun",
          targetUrl: `http://127.0.0.1:${port}`,
        },
      });
      if (createdTun.isError) throw new Error(textOf(createdTun as never));
      const tunJson = JSON.parse(textOf(createdTun as never)) as {
        tunnel: { id: string; publicUrl: string; status: string };
      };
      const publicUrl = tunJson.tunnel.publicUrl;
      if (!publicUrl) throw new Error("tunnel missing publicUrl");
      const proxied = await fetch(
        publicUrl.endsWith("/") ? `${publicUrl}hello` : `${publicUrl}/hello`,
      );
      const body = await proxied.text();
      if (!body.includes(marker)) {
        throw new Error(`tunnel proxy failed: ${proxied.status} ${body}`);
      }
      const listed = await client.callTool({
        name: "tunnel_list",
        arguments: { sandboxId: id },
      });
      if (listed.isError) throw new Error(textOf(listed as never));
      if (!textOf(listed as never).includes(tunJson.tunnel.id)) {
        throw new Error("tunnel_list missing created id");
      }
      const got = await client.callTool({
        name: "tunnel_get",
        arguments: { tunnelId: tunJson.tunnel.id },
      });
      if (got.isError) throw new Error(textOf(got as never));
      const closed = await client.callTool({
        name: "tunnel_close",
        arguments: { tunnelId: tunJson.tunnel.id },
      });
      if (closed.isError) throw new Error(textOf(closed as never));
      const closedJson = JSON.parse(textOf(closed as never)) as {
        tunnel: { status: string };
      };
      if (closedJson.tunnel.status !== "closed") {
        throw new Error(`expected closed, got ${closedJson.tunnel.status}`);
      }
      console.log("tunnel ok", tunJson.tunnel.id);
    } finally {
      await new Promise<void>((resolve, reject) =>
        upstream.close((err) => (err ? reject(err) : resolve())),
      );
    }
  } else {
    console.log("tunnel skip (no healthz at", tunnelUrl + ")");
  }

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
