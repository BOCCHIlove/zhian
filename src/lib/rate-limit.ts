/**
 * 接口限流（按访问者 IP）
 * - 短时限流：同一个 IP 每分钟最多请求若干次（聊天护航每收到一条对方消息就研判一次，所以给得多些），超出返回 429 和友好提示，防止被脚本刷接口
 * - 每日 AI 额度：每个 IP、全站每天调用大模型的次数有上限，用完后自动改用规则引擎，功能照常可用
 *
 * 计数保存在服务端内存里，不需要额外的数据库。部署到 Serverless 平台时每个实例各自计数、
 * 冷启动会清零，作为比赛演示的基础防护足够；正式上线可以把 store 换成 Redis（如 Upstash）。
 */

type Counter = { count: number; reset: number };
const store = new Map<string, Counter>();

const MINUTE = 60_000;
const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d);

/** 每分钟每个 IP 的请求上限（演练场一局要来回很多句，给得宽一些） */
const PER_MINUTE = {
  detect: num(process.env.RATE_LIMIT_DETECT_PER_MIN, 8),
  guard: num(process.env.RATE_LIMIT_GUARD_PER_MIN, 20),
  drill: num(process.env.RATE_LIMIT_DRILL_PER_MIN, 30),
} as const;
export type LimitedRoute = keyof typeof PER_MINUTE;

/** 每天调用大模型的上限：单个 IP / 全站 */
const DAILY_PER_IP = num(process.env.AI_DAILY_LIMIT_PER_IP, 100);
const DAILY_TOTAL = num(process.env.AI_DAILY_LIMIT_TOTAL, 3000);

/** 访问者 IP。Vercel 等平台会在 x-forwarded-for 首位写入真实来源地址 */
export function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("x-real-ip") || "local";
}

/** 北京时间的日期，额度在每天 0 点重置 */
function today() {
  return new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
}

function nextMidnight() {
  const d = new Date(`${today()}T00:00:00+08:00`);
  return d.getTime() + 86_400_000;
}

function prune(now: number) {
  if (store.size < 5000) return;
  for (const [k, v] of store) if (v.reset <= now) store.delete(k);
}

function peek(key: string, now: number) {
  const c = store.get(key);
  return c && c.reset > now ? c : undefined;
}

function bump(key: string, reset: number, now: number) {
  const c = peek(key, now);
  if (c) c.count++;
  else store.set(key, { count: 1, reset });
}

/** 短时限流：超出时返回 429 响应，没超出返回 undefined */
export function rateLimit(req: Request, route: LimitedRoute): Response | undefined {
  const now = Date.now();
  prune(now);
  const key = `${route}:${clientIp(req)}`;
  const c = peek(key, now);
  if (c && c.count >= PER_MINUTE[route]) {
    const wait = Math.max(1, Math.ceil((c.reset - now) / 1000));
    return Response.json(
      { error: `操作有点太快啦，休息一下，${wait} 秒后再试试吧。` },
      { status: 429, headers: { "retry-after": String(wait) } },
    );
  }
  bump(key, now + MINUTE, now);
  return undefined;
}

/**
 * 每日 AI 额度：还有额度时记一次并返回 true；用完返回 false，调用方改用规则引擎。
 * 未配置 API Key 时本来就不调用模型，不消耗额度。
 */
export function takeAiQuota(req: Request): boolean {
  if (!process.env.AI_API_KEY) return true;
  const now = Date.now();
  const day = today();
  const ipKey = `ai:${day}:${clientIp(req)}`;
  const allKey = `ai:${day}:*`;
  if ((peek(ipKey, now)?.count ?? 0) >= DAILY_PER_IP || (peek(allKey, now)?.count ?? 0) >= DAILY_TOTAL) return false;
  const reset = nextMidnight();
  bump(ipKey, reset, now);
  bump(allKey, reset, now);
  return true;
}

/** 测试用：清空计数 */
export function resetRateLimits() {
  store.clear();
}
