/** 网关运行配置：只读 env，不向 MCP 客户端回显密钥 */

export type GatewayConfig = {
  /** f2b-sandbox 根 URL，默认 http://127.0.0.1:13287 */
  sandboxBaseUrl: string;
  /** API 路径前缀，默认 /v1 */
  pathPrefix: string;
  /** 用户 API Key（F2B_AUTH_MODE=api_key 时需要） */
  apiKey?: string;
  /**
   * 隧道服务根 URL。
   * - 直连 f2b-tunnel：http://127.0.0.1:8790
   * - 经 BFF：与 sandbox 同 host，配合 tunnelPathPrefix=/api
   * - 缺省：与 sandboxBaseUrl 相同（适合 BFF 一体）
   */
  tunnelBaseUrl: string;
  /**
   * 隧道 API 前缀。
   * - 默认 `/v1`（直连 f2b-tunnel）
   * - BFF：`/api`（→ `/api/tunnels`）
   */
  tunnelPathPrefix: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const sandboxBaseUrl = (
    env.F2B_SANDBOX_URL ||
    env.SANDBOX_URL ||
    "http://127.0.0.1:13287"
  ).replace(/\/$/, "");
  return {
    sandboxBaseUrl,
    pathPrefix: env.F2B_PATH_PREFIX || "/v1",
    apiKey: env.F2B_API_KEY || undefined,
    tunnelBaseUrl: (
      env.F2B_TUNNEL_URL ||
      env.TUNNEL_URL ||
      sandboxBaseUrl
    ).replace(/\/$/, ""),
    tunnelPathPrefix: env.F2B_TUNNEL_PATH_PREFIX || "/v1",
  };
}
