/** 网关运行配置：只读 env，不向 MCP 客户端回显密钥 */

export type GatewayConfig = {
  /** f2b-sandbox 根 URL，默认 http://127.0.0.1:13287 */
  sandboxBaseUrl: string;
  /** API 路径前缀，默认 /v1 */
  pathPrefix: string;
  /** 用户 API Key（F2B_AUTH_MODE=api_key 时需要） */
  apiKey?: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  return {
    sandboxBaseUrl: (
      env.F2B_SANDBOX_URL ||
      env.SANDBOX_URL ||
      "http://127.0.0.1:13287"
    ).replace(/\/$/, ""),
    pathPrefix: env.F2B_PATH_PREFIX || "/v1",
    apiKey: env.F2B_API_KEY || undefined,
  };
}
