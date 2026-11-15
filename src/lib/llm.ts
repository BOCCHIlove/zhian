/**
 * 大模型接入（所有功能共用）
 * - 读取环境变量里的接口地址、模型和 API Key（Key 只在服务端，永远不会发到浏览器）
 * - 智谱模型默认开启深度思考，响应慢且会占用输出长度；这里统一关闭
 * - 免费模型高峰期常返回 429「访问量过大」：自动退避重试，文本请求还会切换到备用的免费模型
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function getAiConfig() {
  const baseURL = process.env.AI_BASE_URL || "https://open.bigmodel.cn/api/paas/v4";
  const model = process.env.AI_MODEL || "glm-4.7-flash";
  return {
    apiKey: process.env.AI_API_KEY,
    baseURL,
    model,
    visionModel: process.env.AI_VISION_MODEL || "glm-4.6v-flash",
    /** 主模型繁忙时依次尝试的备用模型（逗号分隔），默认用同样免费、支持工具调用的视觉模型 */
    fallbackModels: (process.env.AI_FALLBACK_MODELS ?? "glm-4.6v-flash")
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m && m !== model),
    isZhipu: baseURL.includes("bigmodel.cn"),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** 单次请求等待响应开始的上限；免费模型偶尔卡住一两分钟才回，不如直接重试 */
const FIRST_BYTE_MS = 20_000;
/** 一次完整的 Agent 流程最多用多久，超时就交给规则引擎（部署平台的函数上限是 60 秒） */
export const LIVE_BUDGET_MS = 45_000;
const retryable = (status: number) => status === 429 || status >= 500;

/** 包一层 fetch：遇到 429 / 5xx 时退避重试，文本模型繁忙时换备用模型 */
function resilientFetch(textModel: string, fallbacks: string[]): typeof fetch {
  return async (input, init) => {
    let body: Record<string, unknown> | undefined;
    try {
      body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    } catch {
      body = undefined;
    }
    // 只有文本模型的请求才切换模型；视觉请求换成纯文本模型会看不了图
    // 同一个请求最多试 5 次（约 5 秒退避），调用处把 SDK 自带的重试关掉，避免两层重试叠加
    const models = body?.model === textModel ? [textModel, ...fallbacks] : [body?.model];
    const chain = Array.from({ length: 5 }, (_, i) => models[i % models.length]);

    let res: Response | undefined;
    for (let i = 0; i < chain.length; i++) {
      const payload = body ? JSON.stringify({ ...body, model: chain[i] }) : init?.body;
      const t0 = Date.now();
      const ctrl = new AbortController();
      init?.signal?.addEventListener("abort", () => ctrl.abort(init.signal?.reason), { once: true });
      const timer = setTimeout(() => ctrl.abort(new Error("模型响应超时")), FIRST_BYTE_MS);
      try {
        res = await fetch(input, { ...init, body: payload, signal: ctrl.signal });
      } catch (e) {
        if (init?.signal?.aborted || i === chain.length - 1) throw e;
        if (process.env.AI_DEBUG) console.log(`[llm] ${chain[i]} → 超时 ${Date.now() - t0}ms`);
        continue;
      } finally {
        clearTimeout(timer);
      }
      if (process.env.AI_DEBUG) console.log(`[llm] ${chain[i]} → ${res.status} ${Date.now() - t0}ms`);
      if (!retryable(res.status) || i === chain.length - 1 || init?.signal?.aborted) return res;
      await res.body?.cancel().catch(() => {});
      await sleep(400 + 300 * i);
    }
    return res!;
  };
}

/** 取一个模型实例：kind=text 用于对话和工具调用，kind=vision 用于识别截图 */
export function chatModel(kind: "text" | "vision" = "text") {
  const cfg = getAiConfig();
  const provider = createOpenAICompatible({
    name: "llm",
    baseURL: cfg.baseURL,
    apiKey: cfg.apiKey,
    fetch: resilientFetch(cfg.model, cfg.fallbackModels),
    transformRequestBody: (args) => (cfg.isZhipu ? { ...args, thinking: { type: "disabled" } } : args),
  });
  return provider.chatModel(kind === "vision" ? cfg.visionModel : cfg.model);
}

/** 模型偶尔会把思考过程、工具调用的自言自语或 Markdown 混进回复里，展示前清理掉 */
export function cleanModelText(raw: string): string {
  let t = raw;
  const end = t.lastIndexOf("</think>");
  if (end >= 0) t = t.slice(end + "</think>".length);
  return t
    .replace(/<\/?think>/g, "")
    .split("\n")
    .filter((l) => !/调用|函数|submit_|search_scam|analyze_(url|phone)|工具/.test(l))
    .join("\n")
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s*(#+|[-*•]|\d+[.、])\s*/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * 修复免费模型偶尔写坏的工具参数 JSON：
 * 字符串值漏了开头的引号（"message":姐姐…），或输出被截断、括号没闭合。
 * 修不好返回 undefined，交给规则引擎兜底。
 */
export function repairJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    /* 继续尝试修复 */
  }
  let s = raw.trim().replace(/^```(json)?|```$/g, "");
  // 值没有加引号：给它补上，直到下一个 "key": 或结尾
  s = s.replace(/("[\w]+"\s*:\s*)(?![\s"{[\d\-tfn])([\s\S]*?)(?=,\s*"[\w]+"\s*:|\s*}\s*$|$)/g, (_, k: string, v: string) => `${k}${JSON.stringify(v.replace(/"?\s*$/, ""))}`);
  // 补齐被截断的字符串和括号
  const stack: string[] = [];
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === "\\") i++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{" || c === "[") stack.push(c === "{" ? "}" : "]");
    else if (c === "}" || c === "]") stack.pop();
  }
  if (inStr) s += '"';
  s = s.replace(/,\s*$/, "") + stack.reverse().join("");
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/** 交给 streamText 的 repairToolCall：参数 JSON 写坏时尝试修复一次 */
export async function repairToolCall<T extends { input: string }>({ toolCall }: { toolCall: T }): Promise<T | null> {
  const fixed = repairJson(toolCall.input);
  return fixed === undefined ? null : { ...toolCall, input: JSON.stringify(fixed) };
}
