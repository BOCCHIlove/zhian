/**
 * 检测工具集：Agent 可调用的工具 + 无 API Key 时的规则引擎。
 * - searchScams：骗局知识库检索（关键词 + 字符二元组相似度的混合检索）
 * - analyzeUrl：链接风险分析（仿冒域名、可疑后缀、短链、IP 直连 + RDAP 注册时间查询）
 * - analyzePhone：号码风险分析（境外号码、虚拟运营商号段等）
 * - ruleReport：规则引擎，生成与大模型同结构的检测报告，作为兜底
 */
import { SCAM_CASES, RED_FLAG_TERMS, type Audience } from "@/data/scams";

/* ---------------- 类型 ---------------- */

export type RiskLevel = "high" | "medium" | "low";

export interface ScamMatch {
  id: string;
  name: string;
  score: number;
  matched: string[];
  summary: string;
  script: string;
  howTo: string[];
}

export interface Flag {
  level: "high" | "medium" | "info" | "good";
  text: string;
}

export interface UrlReport {
  url: string;
  host: string;
  domain: string;
  risk: number;
  flags: Flag[];
  domainAgeDays?: number;
}

export interface PhoneReport {
  raw: string;
  number: string;
  kind: string;
  risk: number;
  flags: Flag[];
}

export interface Evidence {
  quote: string;
  reason: string;
}

export interface Report {
  riskScore: number;
  riskLevel: RiskLevel;
  scamType: string;
  summary: string;
  evidence: Evidence[];
  advice: string[];
  reply?: string;
  matchedCases: { id: string; name: string; score: number }[];
  source: "ai" | "rules";
}

/* ---------------- 知识库检索 ---------------- */

function bigrams(s: string): Map<string, number> {
  const t = s.toLowerCase().replace(/[\s，。！？、,.!?：:；;“”"'（）()【】\[\]]/g, "");
  const m = new Map<string, number>();
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [, v] of a) na += v * v;
  for (const [, v] of b) nb += v * v;
  for (const [k, v] of a) dot += v * (b.get(k) ?? 0);
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

const CASE_INDEX = SCAM_CASES.map((c) => ({
  c,
  doc: bigrams([c.name, c.summary, ...c.scripts, ...c.keywords].join(" ")),
  scripts: c.scripts.map((s) => ({ s, v: bigrams(s) })),
}));

/** 两段文字的字符二元组余弦相似度（0～1） */
export function similarity(a: string, b: string): number {
  return cosine(bigrams(a), bigrams(b));
}

export function searchScams(query: string, audience?: Audience, topK = 3): ScamMatch[] {
  const q = bigrams(query);
  const lower = query.toLowerCase();
  return CASE_INDEX.map(({ c, doc, scripts }) => {
    const matched = c.keywords.filter((k) => lower.includes(k.toLowerCase()));
    const kw = Math.min(1, matched.length / 3);
    const sim = cosine(q, doc);
    const best = scripts.reduce((acc, cur) => {
      const s = cosine(q, cur.v);
      return s > acc.score ? { s: cur.s, score: s } : acc;
    }, { s: c.scripts[0], score: -1 });
    let score = 0.65 * kw + 0.35 * Math.min(1, sim * 2.2);
    if (audience && c.audiences.includes(audience) && score > 0.1) score += 0.05;
    return {
      id: c.id,
      name: c.name,
      score: Math.min(1, Number(score.toFixed(2))),
      matched,
      summary: c.summary,
      script: best.s,
      howTo: c.howTo,
    };
  })
    .filter((m) => m.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/* ---------------- 链接分析 ---------------- */

const OFFICIAL_DOMAINS = [
  "taobao.com", "tmall.com", "alipay.com", "jd.com", "pinduoduo.com", "yangkeduo.com",
  "qq.com", "weixin.qq.com", "icbc.com.cn", "ccb.com", "abchina.com", "boc.cn",
  "bankcomm.com", "cmbchina.com", "psbc.com", "12306.cn", "gov.cn", "chsi.com.cn",
  "apple.com", "icloud.com", "steampowered.com", "steamcommunity.com", "mi.com",
  "huawei.com", "10086.cn", "189.cn", "10010.com", "unionpay.com", "meituan.com",
  "douyin.com", "bilibili.com", "baidu.com", "ctrip.com", "ceair.com", "csair.com",
  "airchina.com.cn", "mps.gov.cn", "court.gov.cn", "pbccrc.org.cn", "chinatax.gov.cn",
];

const BRAND_TOKENS = [
  "taobao", "tmall", "alipay", "zhifubao", "jd", "jingdong", "pdd", "weixin", "wechat",
  "icbc", "ccb", "abchina", "boc", "cmb", "12306", "etc", "chsi", "apple", "icloud",
  "steam", "gov", "yibao", "shebao", "unionpay", "10086", "bank", "kefu", "police",
];

const SUSPICIOUS_TLDS = [
  "top", "xyz", "cc", "vip", "icu", "shop", "club", "buzz", "live", "work", "site",
  "fun", "link", "click", "loan", "win", "bid", "rest", "cyou", "sbs",
];

const SHORTENERS = ["t.cn", "dwz.cn", "url.cn", "suo.im", "bit.ly", "tinyurl.com", "is.gd", "s.id", "w.url.cn"];

const SECOND_LEVEL = ["com.cn", "net.cn", "org.cn", "gov.cn", "edu.cn", "ac.cn", "com.hk"];

export function registeredDomain(host: string): string {
  const parts = host.split(".");
  if (parts.length <= 2) return host;
  const last2 = parts.slice(-2).join(".");
  if (SECOND_LEVEL.includes(last2)) return parts.slice(-3).join(".");
  return last2;
}

const URL_RE =
  /(https?:\/\/[^\s，。、"'<>）)】]+)|((?:[a-z0-9-]+\.)+(?:com|cn|net|org|top|xyz|cc|vip|icu|shop|club|me|io|info|live|work|site|fun|buzz|link|app|click|cyou|sbs)(?:\/[^\s，。、"'<>）)】]*)?)/gi;

export function extractUrls(text: string): string[] {
  const found = text.match(URL_RE) ?? [];
  return [...new Set(found.map((u) => u.replace(/[.,，。]+$/, "")))].slice(0, 3);
}

async function lookupDomainAge(domain: string): Promise<number | undefined> {
  try {
    const res = await fetch(`https://rdap.org/domain/${domain}`, {
      signal: AbortSignal.timeout(3500),
      headers: { accept: "application/rdap+json" },
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { events?: { eventAction: string; eventDate: string }[] };
    const reg = data.events?.find((e) => e.eventAction === "registration");
    if (!reg) return undefined;
    return Math.floor((Date.now() - Date.parse(reg.eventDate)) / 864e5);
  } catch {
    return undefined;
  }
}

/** 只做静态特征检查（不联网），前端也能即时调用 */
export function inspectUrl(input: string): UrlReport & { official: boolean; invalid?: boolean } {
  const raw = /^https?:\/\//i.test(input) ? input : `http://${input}`;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { url: input, host: input, domain: input, risk: 30, official: false, invalid: true, flags: [{ level: "medium", text: "链接格式异常，无法解析" }] };
  }
  const host = u.hostname.toLowerCase();
  const domain = registeredDomain(host);
  const flags: Flag[] = [];
  let risk = 10;

  const official = OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  if (official) {
    flags.push({ level: "good", text: `域名属于官方站点 ${domain}` });
    risk = 5;
  } else {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      flags.push({ level: "high", text: "直接使用 IP 地址访问，正规网站几乎不会这样做" });
      risk += 35;
    }
    if (host.includes("xn--")) {
      flags.push({ level: "high", text: "使用了国际化编码域名，可能在模仿正规网站的字形" });
      risk += 30;
    }
    const tld = host.split(".").pop() ?? "";
    if (SUSPICIOUS_TLDS.includes(tld)) {
      flags.push({ level: "medium", text: `使用 .${tld} 后缀，这类后缀注册便宜，常被诈骗网站使用` });
      risk += 20;
    }
    if (SHORTENERS.includes(host)) {
      flags.push({ level: "medium", text: "这是短链接，真实地址被隐藏了" });
      risk += 15;
    }
    const brand = BRAND_TOKENS.find((b) => host.replace(domain, "").includes(b) || domain.split(".")[0].includes(b));
    if (brand) {
      flags.push({ level: "high", text: `域名里含有「${brand}」，但并不是官方域名，疑似仿冒` });
      risk += 35;
    }
    if ((host.match(/-/g) ?? []).length >= 2) {
      flags.push({ level: "medium", text: "域名里有多个连字符，常见于仿冒网站" });
      risk += 10;
    }
    if (u.protocol === "http:" && /^https?:\/\//i.test(input)) {
      flags.push({ level: "medium", text: "没有使用 HTTPS 加密，输入的信息可能被窃取" });
      risk += 8;
    }
  }

  return { url: input, host, domain, risk: Math.min(99, risk), flags, official };
}

export async function analyzeUrl(input: string, opts: { lookup?: boolean } = {}): Promise<UrlReport> {
  const { official, invalid, ...base } = inspectUrl(input);
  if (invalid) return base;
  const { domain } = base;
  const flags = [...base.flags];
  let risk = base.risk;
  let domainAgeDays: number | undefined;
  if (opts.lookup && !official) {
    domainAgeDays = await lookupDomainAge(domain);
    if (domainAgeDays !== undefined) {
      if (domainAgeDays < 90) {
        flags.push({ level: "high", text: `域名注册仅 ${domainAgeDays} 天，新注册域名是诈骗网站的典型特征` });
        risk += 25;
      } else {
        flags.push({ level: "info", text: `域名已注册约 ${Math.round(domainAgeDays / 365 * 10) / 10} 年` });
      }
    } else {
      flags.push({ level: "info", text: "未能查到域名注册信息" });
    }
  }
  if (flags.length === 0) flags.push({ level: "info", text: "未发现明显异常，但仍不要在陌生页面输入密码和验证码" });
  return { ...base, flags, risk: Math.min(99, risk), domainAgeDays };
}

/* ---------------- 号码分析 ---------------- */

const PHONE_RE = /(?:\+|00)?\d[\d\s-]{3,16}\d/g;

export function extractPhones(text: string): string[] {
  const withoutUrls = text.replace(URL_RE, " ");
  const found = (withoutUrls.match(PHONE_RE) ?? [])
    .map((p) => p.trim())
    .filter((p) => {
      const d = p.replace(/\D/g, "");
      return d.length >= 5 && d.length <= 15 && !/^20\d{2}/.test(d);
    });
  return [...new Set(found)].slice(0, 3);
}

export function analyzePhone(raw: string): PhoneReport {
  const intl = /^(\+|00)/.test(raw.trim());
  let n = raw.replace(/\D/g, "");
  if (intl && n.startsWith("00")) n = n.slice(2);
  const flags: Flag[] = [];
  let risk = 10;
  let kind = "未知号码";

  if (n === "96110") {
    kind = "全国反诈专线";
    flags.push({ level: "good", text: "96110 是全国反诈预警劝阻专线，接到这个号码的来电请务必接听" });
    risk = 0;
  } else if (["110", "120", "119", "122"].includes(n)) {
    kind = "紧急服务号码";
    flags.push({ level: "info", text: "这是紧急服务号码。注意：真警察不会通过电话要求你转账" });
  } else if (intl && !n.startsWith("86")) {
    kind = "境外号码";
    flags.push({ level: "high", text: "这是境外号码，大量电信诈骗来自境外" });
    risk = 70;
  } else {
    if (n.startsWith("86") && n.length === 13) n = n.slice(2);
    if (/^1[3-9]\d{9}$/.test(n)) {
      kind = "手机号码";
      if (/^(170|171|162|165|167)/.test(n)) {
        kind = "虚拟运营商号码";
        flags.push({ level: "medium", text: "这是虚拟运营商号段，实名管理相对宽松，常被诈骗分子使用" });
        risk = 40;
      } else {
        flags.push({ level: "info", text: "普通手机号码。自称客服、警察却用个人手机号联系你，要提高警惕" });
        risk = 20;
      }
    } else if (/^95\d{3}$/.test(n)) {
      kind = "机构客服号码";
      flags.push({ level: "info", text: "95 开头是银行等机构的客服号段，但来电显示可以伪造，请挂断后自己回拨官方号码" });
      risk = 15;
    } else if (/^400\d{7}$/.test(n)) {
      kind = "企业服务号码";
      flags.push({ level: "info", text: "400 号码属于企业，但任何企业都可以申请，不代表就是官方客服" });
      risk = 20;
    } else if (/^0\d{9,11}$/.test(n)) {
      kind = "固定电话";
      flags.push({ level: "info", text: "固定电话号码，可通过官方渠道核实归属单位" });
      risk = 15;
    } else {
      flags.push({ level: "info", text: "无法识别号码类型" });
    }
  }
  return { raw, number: n, kind, risk, flags };
}

/* ---------------- 规则引擎（兜底 / 演示模式） ---------------- */

function sentences(text: string): string[] {
  return text
    .split(/(?<=[。！？!?\n])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 找出原文中命中危险信号的句子；同一句命中多个信号时合并理由，按危险程度排序 */
export function findRedFlags(text: string): Evidence[] {
  const bySentence = new Map<string, { reasons: string[]; weight: number }>();
  const ss = sentences(text);
  for (const f of RED_FLAG_TERMS) {
    if (!text.includes(f.term)) continue;
    const quote = ss.find((s) => s.includes(f.term)) ?? f.term;
    const entry = bySentence.get(quote) ?? { reasons: [], weight: 0 };
    if (!entry.reasons.includes(f.reason)) entry.reasons.push(f.reason);
    entry.weight += f.weight;
    bySentence.set(quote, entry);
  }
  return [...bySentence.entries()]
    .sort((a, b) => b[1].weight - a[1].weight)
    .map(([quote, e]) => ({
      quote: quote.length > 60 ? `${quote.slice(0, 58)}…` : quote,
      reason: e.reasons.slice(0, 2).join("；"),
    }));
}

export function flagWeight(text: string): number {
  return RED_FLAG_TERMS.filter((f) => text.includes(f.term)).reduce((s, f) => s + f.weight, 0);
}

export function levelOf(score: number): RiskLevel {
  return score >= 70 ? "high" : score >= 40 ? "medium" : "low";
}

export function ruleReport(
  text: string,
  matches: ScamMatch[],
  urls: UrlReport[],
  phones: PhoneReport[],
): Report {
  const top = matches[0];
  const urlRisk = Math.max(0, ...urls.map((u) => u.risk));
  const phoneRisk = Math.max(0, ...phones.map((p) => p.risk));
  const raw = Math.min(70, flagWeight(text)) + (top ? top.score * 40 : 0) + urlRisk * 0.4 + phoneRisk * 0.3;
  const riskScore = Math.max(3, Math.min(98, Math.round(raw)));
  const riskLevel = levelOf(riskScore);

  const evidence = findRedFlags(text).slice(0, 4);
  for (const u of urls) {
    const bad = u.flags.find((f) => f.level === "high" || f.level === "medium");
    if (bad) evidence.push({ quote: u.url, reason: bad.text });
  }
  for (const p of phones) {
    const bad = p.flags.find((f) => f.level === "high" || f.level === "medium");
    if (bad) evidence.push({ quote: p.raw, reason: bad.text });
  }

  const scamType = top && riskScore >= 35 ? top.name : riskLevel === "low" ? "暂未发现明显诈骗特征" : "可疑信息";
  const advice =
    riskLevel === "low"
      ? ["目前没有发现明显的诈骗特征，但仍要保持警惕", "涉及转账、验证码、密码时，一定先通过官方渠道核实", "拿不准的时候，可以拨打 96110 咨询"]
      : [...(top?.howTo ?? []), "拿不准的时候，拨打 96110 反诈专线咨询"].slice(0, 4);

  const summary =
    riskLevel === "high"
      ? `这很可能是「${scamType}」。先别转账、别点链接，也别把验证码告诉任何人，跟着我一步步处理就好。`
      : riskLevel === "medium"
        ? `这段内容有几处让我不太放心，和「${top?.name ?? "常见骗局"}」的套路有些像。先停一停，核实清楚再行动。`
        : "我仔细看了，暂时没发现明显的诈骗特征。不过只要涉及钱和验证码，还是要多留个心眼哦。";

  return {
    riskScore,
    riskLevel,
    scamType,
    summary,
    evidence: evidence.slice(0, 5),
    advice,
    reply:
      riskLevel === "low"
        ? undefined
        : "不好意思，这件事我会自己通过官方渠道核实，不需要你帮我处理了。",
    matchedCases: matches.map((m) => ({ id: m.id, name: m.name, score: m.score })),
    source: "rules",
  };
}
