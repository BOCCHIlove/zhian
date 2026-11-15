/**
 * 聊天护航核心逻辑（纯函数，前后端共用）
 * - analyzeConversation：逐条累计风险曲线、识别话术、判断骗局走到了哪一步、预测对方下一步
 * - checkDraft：用户回复发出前的把关（验证码、卡号、答应转账等当场拦下）
 * - ruleAdvice：规则版回复建议和念安点评（演示模式 / 大模型兜底）
 * 前端每来一条消息就即时计算一次，服务端会重新计算后再交给大模型，不信任前端结果。
 */
import {
  analyzePhone,
  extractPhones,
  extractUrls,
  flagWeight,
  inspectUrl,
  levelOf,
  searchScams,
  similarity,
  type RiskLevel,
} from "./analyze";
import { replyTag } from "./drill";
import { SCAM_CASES } from "@/data/scams";
import { DRILLS } from "@/data/drills";

/* ---------------- 类型 ---------------- */

export interface GuardMessage {
  role: "them" | "me";
  text: string;
}

export type TacticKind = "identity" | "isolate" | "bait" | "fear" | "urgent" | "secret" | "money" | "info" | "remote" | "link";

export interface TacticHit {
  kind: TacticKind;
  label: string;
  why: string;
  quote: string;
  terms: string[];
}

export interface TurnInsight {
  /** 在 messages 数组里的下标 */
  index: number;
  risk: number;
  delta: number;
  tactics: TacticHit[];
}

export interface GuardAnalysis {
  risk: number;
  level: RiskLevel;
  /** -1 表示还没发现任何骗局套路 */
  stage: number;
  curve: { index: number; risk: number }[];
  turns: TurnInsight[];
  tactics: { kind: TacticKind; label: string; count: number }[];
  scamType: string;
  caseId?: string;
  matches: { id: string; name: string; score: number }[];
  nextMove?: string;
  verify: string[];
  /** 风险第一次升到高危的那条消息 */
  highAt?: number;
  askedCode: boolean;
}

export interface Suggestion {
  tone: "追问" | "核实" | "拒绝" | "结束" | "正常回复";
  text: string;
}

export interface GuardAdvice {
  risk: number;
  ruleRisk: number;
  aiRisk?: number;
  level: RiskLevel;
  stage: number;
  scamType: string;
  nextMove?: string;
  suggestions: Suggestion[];
  source: "ai" | "rules";
}

export type GuardEvent =
  | { type: "mode"; mode: "live" | "demo"; model?: string }
  | { type: "step"; id: string; label: string; status: "running" | "done" | "error"; detail?: string }
  | { type: "text"; delta: string }
  | { type: "advice"; advice: GuardAdvice }
  | { type: "error"; message: string }
  | { type: "done" };

/* ---------------- 话术与阶段 ---------------- */

export const STAGES = [
  { label: "接近搭讪", desc: "亮出一个身份，主动找上门" },
  { label: "抛出诱饵", desc: "给你好处，或说你遇到了「问题」" },
  { label: "施压催促", desc: "吓唬、催促、要求保密，不给你思考时间" },
  { label: "索要钱财", desc: "要钱、要验证码、要你下载软件或共享屏幕" },
];

const TACTICS: Record<TacticKind, { label: string; act: string; why: string; stage: number; weight: number; re?: RegExp; weak?: boolean }> = {
  identity: {
    label: "自称身份",
    act: "用一个身份让你放下戒心",
    why: "身份是对方自己说的，聊天里没法证明。",
    stage: 0,
    weight: 4,
    re: /(我是|这里是|我们是)[^，。！？\n]{0,12}?(客服|警官|民警|警察|公安|检察|法院|领导|老师|辅导员|工作人员|经理|专员|主管|老板|[一-龥]总(?![结是共之体部]))|工号|警号|官方|新(的)?(微信|号码|号)|换(了)?(个)?(新)?(微信|号码|手机号)/g,
  },
  isolate: {
    label: "转移阵地",
    act: "把你引到别的联系方式上",
    why: "离开正规平台，你的聊天和交易就没有保障了。",
    stage: 1,
    weight: 8,
    re: /加(一下)?(我|我们)?[^，。！？\n]{0,8}(微信|QQ|qq|好友)|二维码|私聊|进群|换个平台/g,
  },
  bait: {
    label: "抛出诱饵",
    act: "用好处吸引你",
    why: "天上不会掉馅饼，好处越大越要当心。",
    stage: 1,
    weight: 6,
    re: /返利|返现|返你|佣金|日赚|高回报|稳赚|收益|中奖|奖品|理赔|赔偿|赔付|补贴|福利|内部消息|内幕|免费领|翻倍|双倍|兼职/g,
  },
  fear: {
    label: "恐吓施压",
    act: "用后果吓唬你",
    why: "先让你慌，你就顾不上判断真假了。",
    stage: 2,
    weight: 12,
    re: /涉嫌|洗钱|通缉|逮捕|拘留|冻结|征信|违法|犯罪|案件|后果自负|起诉|封号|坐牢|立案|传唤|负得起责任/g,
  },
  urgent: {
    label: "催促限时",
    act: "催你赶紧行动",
    why: "越催你，越说明对方怕你停下来想清楚。",
    stage: 2,
    weight: 5,
    weak: true,
    re: /马上(处理|操作|转|付|到账|办理|就)|立即|立刻|赶紧|尽快|抓紧|今天之内|今日内|今天必须|必须今天|\d+\s*(分钟|小时)内|半小时内|过期|逾期|来不及|最后一天|名额有限|就关闭|作废|给别人了/g,
  },
  secret: {
    label: "要求保密",
    act: "让你别告诉别人",
    why: "不让你说出去，是为了切断你找人核实的路。",
    stage: 2,
    weight: 14,
    re: /保密|别告诉|不要告诉|不能告诉|(别|不要|不能)(跟|和|让)[^，。！？\n]{0,10}(说|知道)|不要声张|一个人(去|来)|单独(去|来|处理)/g,
  },
  money: {
    label: "要你转钱",
    act: "开口要钱了",
    why: "只要涉及转账，就先停下来，用官方渠道核实。",
    stage: 3,
    weight: 12,
    re: /转账|转到|转给|转过去|汇款|打款|打过去|垫付|垫一下|先付|付款|充值|保证金|手续费|解冻|安全账户|备用金|借呗|花呗|网贷|刷流水|走流水/g,
  },
  info: {
    label: "索要信息",
    act: "套取你的验证码或账户信息",
    why: "验证码和密码是你账户的最后一把锁，谁要都不能给。",
    stage: 3,
    weight: 16,
    re: /验证码|密码|银行卡号|卡号|身份证|截图给我|截图发我|人脸|刷脸/g,
  },
  remote: {
    label: "下载软件",
    act: "让你下载软件或共享屏幕",
    why: "共享屏幕后，你输入的密码、收到的验证码，对方全都能看到。",
    stage: 3,
    weight: 16,
    re: /下载[^，。！？\n]{0,8}(App|APP|app|软件|应用)|安装[^，。！？\n]{0,8}(App|APP|app|软件|应用)|会议软件|会议号|共享屏幕|屏幕共享|远程(控制|协助)/g,
  },
  link: {
    label: "可疑链接",
    act: "引你点开一个可疑链接",
    why: "陌生链接可能是仿冒的钓鱼网站。",
    stage: 3,
    weight: 6,
  },
};

const ORDER: TacticKind[] = ["info", "remote", "money", "link", "secret", "fear", "urgent", "bait", "isolate", "identity"];

function sentenceOf(text: string, term: string) {
  const s = text.split(/(?<=[。！？!?\n])/).find((x) => x.includes(term)) ?? text;
  const t = s.trim();
  return t.length > 48 ? `${t.slice(0, 46)}…` : t;
}

/** 识别一条消息里用到的话术 */
export function findTactics(text: string): TacticHit[] {
  const hits: TacticHit[] = [];
  for (const kind of ORDER) {
    const t = TACTICS[kind];
    if (kind === "link") {
      const bad = extractUrls(text)
        .map((u) => inspectUrl(u))
        .filter((r) => r.risk >= 40);
      if (bad.length) {
        const worst = bad[0].flags.find((f) => f.level === "high" || f.level === "medium");
        hits.push({ kind, label: t.label, why: worst?.text ?? t.why, quote: bad[0].url, terms: bad.map((b) => b.url) });
      }
      continue;
    }
    const terms = [...new Set([...text.matchAll(t.re!)].map((m) => m[0]))];
    if (terms.length) hits.push({ kind, label: t.label, why: t.why, quote: sentenceOf(text, terms[0]), terms });
  }
  return hits;
}

/** 把一段文字按命中的词切开，便于高亮 */
export function highlight(text: string, terms: string[]): { text: string; hit: boolean }[] {
  const list = [...new Set(terms)].filter(Boolean).sort((a, b) => b.length - a.length);
  if (!list.length) return [{ text, hit: false }];
  const re = new RegExp(`(${list.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return text
    .split(re)
    .filter(Boolean)
    .map((part) => ({ text: part, hit: list.includes(part) }));
}

/* ---------------- 对话分析 ---------------- */

function riskOf(text: string, kinds: Set<TacticKind>, stage: number) {
  const matches = searchScams(text);
  const top = matches[0];
  const urlRisk = Math.max(0, ...extractUrls(text).map((u) => inspectUrl(u).risk));
  const phoneRisk = Math.max(0, ...extractPhones(text).map((p) => analyzePhone(p).risk));
  let bonus = [...kinds].reduce((s, k) => s + TACTICS[k].weight, 0);
  // 先亮身份或给好处、再开口要钱，是最典型的完整骗局链条
  if (stage >= 3 && (kinds.has("identity") || kinds.has("bait"))) bonus += 8;
  const raw = Math.min(70, flagWeight(text)) + (top ? top.score * 40 : 0) + urlRisk * 0.4 + phoneRisk * 0.3 + bonus;
  return { risk: Math.max(3, Math.min(98, Math.round(raw))), matches };
}

function stageOf(kinds: Set<TacticKind>) {
  const strong = [...kinds].filter((k) => !TACTICS[k].weak);
  if (!strong.length) return -1;
  return Math.max(...[...kinds].map((k) => TACTICS[k].stage));
}

/** 按这类骗局的常见套路，预测对方的下一句 */
function predictNext(caseId: string | undefined, theirs: string[], stage: number): string | undefined {
  if (caseId) {
    const drill = DRILLS.find((d) => d.caseId === caseId);
    const seq = drill ? [drill.opening, ...drill.script] : (SCAM_CASES.find((c) => c.id === caseId)?.scripts ?? []);
    let progress = -1;
    for (const t of theirs) {
      seq.forEach((line, i) => {
        if (i > progress && similarity(t, line) >= 0.2) progress = i;
      });
    }
    if (progress >= 0 && progress < seq.length - 1) return `按这类骗局的常见套路，对方接下来可能会说：「${seq[progress + 1]}」`;
    if (progress === seq.length - 1) return "这类骗局已经走到最后一步了。接下来对方只会一次次换理由要更多钱。";
  }
  if (stage < 0) return undefined;
  return [
    "接下来对方可能会给你一点「好处」，或者说你遇到了什么「问题」，好让你继续聊下去。",
    "接下来对方很可能会催你、吓你，或者让你先付一小笔钱、下载一个软件。",
    "接下来对方很可能会开口要钱、要验证码，或者让你共享屏幕。",
    "对方已经在要钱或要信息了。就算这次给了，后面也只会要得更多。",
  ].at(stage);
}

export function analyzeConversation(messages: GuardMessage[]): GuardAnalysis {
  const kinds = new Set<TacticKind>();
  const counts = new Map<TacticKind, number>();
  const turns: TurnInsight[] = [];
  const theirs: string[] = [];
  let peak = 0;
  let matches: ReturnType<typeof searchScams> = [];
  let highAt: number | undefined;

  messages.forEach((m, index) => {
    if (m.role !== "them") return;
    theirs.push(m.text);
    const tactics = findTactics(m.text);
    for (const t of tactics) {
      kinds.add(t.kind);
      counts.set(t.kind, (counts.get(t.kind) ?? 0) + 1);
    }
    const r = riskOf(theirs.join("\n"), kinds, stageOf(kinds));
    matches = r.matches;
    const risk = Math.max(peak, r.risk);
    turns.push({ index, risk, delta: risk - peak, tactics });
    if (highAt === undefined && risk >= 70) highAt = index;
    peak = risk;
  });

  const stage = stageOf(kinds);
  const risk = turns.at(-1)?.risk ?? 0;
  const top = matches[0];
  const confident = top && risk >= 35;
  const caseId = confident ? top.id : undefined;

  return {
    risk,
    level: levelOf(risk),
    stage,
    curve: turns.map((t) => ({ index: t.index, risk: t.risk })),
    turns,
    tactics: ORDER.filter((k) => counts.has(k)).map((k) => ({ kind: k, label: TACTICS[k].label, count: counts.get(k)! })),
    scamType: confident ? top.name : stage >= 0 ? "可疑对话" : "暂未发现诈骗特征",
    caseId,
    matches: matches.map((m) => ({ id: m.id, name: m.name, score: m.score })),
    nextMove: predictNext(caseId, theirs, stage),
    verify:
      risk >= 40 && top
        ? [...top.howTo, "拿不准的时候，拨打 96110 反诈专线咨询"].slice(0, 4)
        : ["涉及转账、验证码、密码时，先通过官方渠道核实", "拿不准的时候，拨打 96110 反诈专线咨询"],
    highAt,
    askedCode: theirs.some((t) => t.includes("验证码")),
  };
}

/* ---------------- 发送前把关 ---------------- */

export interface DraftCheck {
  level: "stop" | "caution" | "good";
  label: string;
  why: string;
}

const NEG = /不|别|没|拒绝|才不|休想|凭什么|为什么要/;

export function checkDraft(text: string, ctx: { stage: number; askedCode: boolean }): DraftCheck | undefined {
  const t = text.replace(/[\s-]/g, "");
  if (!t) return undefined;
  const asking = /[?？吗呢]$/.test(t);

  if (/验证码(是|为|:|：)?\d{4,6}/.test(t) || /^\d{4,6}$/.test(t) || (ctx.askedCode && /(?<!\d)\d{4,6}(?!\d)/.test(t))) {
    return { level: "stop", label: "这像是一串验证码", why: "验证码就是你账户的钥匙，谁要都不能给，包括「客服」和「警察」。" };
  }
  if (/(?<!\d)\d{17}[\dXx](?![\dXx])/.test(t) && /^\d{6}(19|20)\d{2}(0[1-9]|1[0-2])/.test(t.match(/\d{17}[\dXx]/)![0])) {
    return { level: "stop", label: "这像是身份证号", why: "身份证号会被拿去冒名办卡、贷款。" };
  }
  if (/(?<!\d)\d{16,19}(?!\d)/.test(t)) {
    return { level: "stop", label: "这像是银行卡号", why: "卡号再配上验证码，就能被盗刷或冒名借款。" };
  }
  if (/密码(是|为|:|：|\d)/.test(t)) {
    return { level: "stop", label: "你要说出密码", why: "任何正规机构都不会向你要密码。" };
  }
  if (!NEG.test(t)) {
    if (/转(账|款|钱|过去|给你|了)|汇(款|钱|过去)|打(款|钱|过去|给你)|付(款|钱|给你|了)|充(值|钱|进去)|垫(付|钱|上)/.test(t)) {
      return asking
        ? { level: "caution", label: "话题到了转账上", why: "问清楚可以，但只要涉及转账，就先停下来，自己去官方渠道核实。" }
        : { level: "stop", label: "你要答应转账", why: "钱一旦转出去就很难追回。先停一停，核实清楚再说。" };
    }
    if (/(下载|安装|装)(了|好|一下|吧)?|共享|开(启)?(屏幕|会议)|进(入)?会议|扫码/.test(t)) {
      return asking
        ? { level: "caution", label: "对方想让你装软件", why: "陌生人让你下载的软件、开的会议，很可能是用来偷看你屏幕的。" }
        : { level: "stop", label: "你要下载软件或共享屏幕", why: "共享屏幕后，你输入的密码、收到的验证码，对方全都能看到。" };
    }
    if (/(住在|地址是|家在|住址)/.test(t) || /(?<!\d)1[3-9]\d{9}(?!\d)/.test(t)) {
      return { level: "caution", label: "你要透露个人信息", why: "住址、手机号这类信息，对陌生人能不说就不说。" };
    }
    if (ctx.stage >= 2 && /^(好的?|行|可以|嗯+|ok|没问题|收到|怎么(弄|做|操作)|然后呢)/i.test(t)) {
      return { level: "caution", label: "先别急着答应", why: "对方已经在施压或要钱了，这时候顺着答应，后面就更难拒绝。" };
    }
  }
  if (replyTag(text) === "good") return { level: "good", label: "这样回很稳", why: "追问、拒绝、说要核实，都会让骗子很难继续。" };
  return undefined;
}

/* ---------------- 规则版建议与点评 ---------------- */

const CASE_VERIFY: Record<string, string> = {
  refund: "我自己在购物 App 的订单里联系官方客服处理。",
  police: "我会自己打 110 核实，有事请让派出所通知我。",
  leader: "我先打您原来的电话确认一下，确认了再说。",
  kin: "我先打个视频电话，确认一下是不是你本人。",
  shuadan: "正规工作不会让人先垫钱，这个我不做了。",
  parttime: "正规招聘不收任何费用，我不做了。",
  loan: "正规贷款放款前不收任何费用，我不办了。",
  invest: "陌生人推荐的平台我不投，谢谢。",
  game: "交易只走游戏官方平台，别的渠道我不认。",
  campusloan: "我自己去征信中心查，不用你帮我注销。",
  romance: "没见过面的人，我不会借钱，也不会一起投资。",
  prize: "我没参加过活动，不需要领奖。",
  phishing: "陌生链接我不点，有事我自己去官网办。",
  flight: "我自己打航空公司官方电话问。",
  health: "我会去正规医院问医生，不买这个。",
  videochat: "我不会下载陌生软件，再骚扰我就报警。",
};

const TACTIC_REPLY: Partial<Record<TacticKind, Suggestion>> = {
  identity: { tone: "追问", text: "你说的身份我没法确认，请告诉我全名和工号，我自己打官方电话核实。" },
  isolate: { tone: "拒绝", text: "我不加别的联系方式，有事就在官方平台上说。" },
  bait: { tone: "拒绝", text: "谢谢，这个好处我不需要，你找别人吧。" },
  fear: { tone: "核实", text: "如果真有这回事，我会自己去派出所或打 110 当面核实。" },
  urgent: { tone: "拒绝", text: "不着急，没核实清楚之前我什么都不会做。" },
  secret: { tone: "核实", text: "这么大的事，我得先跟家人或同事确认一下。" },
  money: { tone: "拒绝", text: "涉及转账的事我不在聊天里办，我会自己去官方渠道处理。" },
  info: { tone: "拒绝", text: "验证码和密码我不会告诉任何人。" },
  remote: { tone: "拒绝", text: "我不下载陌生软件，也不共享屏幕。" },
  link: { tone: "拒绝", text: "陌生链接我不点，有事我自己去官网办。" },
};

export function ruleSuggestions(a: GuardAnalysis): Suggestion[] {
  if (a.stage < 0) return [];
  const latest = a.turns.at(-1)?.tactics ?? [];
  const pool: Suggestion[] = [
    ...latest.map((t) => TACTIC_REPLY[t.kind]),
    a.caseId && CASE_VERIFY[a.caseId] ? { tone: "核实" as const, text: CASE_VERIFY[a.caseId] } : undefined,
    ...a.tactics.map((t) => TACTIC_REPLY[t.kind]),
    { tone: "核实" as const, text: "我先通过官方渠道核实一下，再回复你。" },
  ].filter((s): s is Suggestion => Boolean(s));

  // 先挑语气各不相同的，再按顺序补满三条
  const out: Suggestion[] = [];
  for (const s of pool) {
    if (out.length < 3 && !out.some((o) => o.tone === s.tone)) out.push(s);
  }
  for (const s of pool) {
    if (out.length >= 3) break;
    if (!out.some((o) => o.text === s.text)) out.push(s);
  }
  if (a.level === "high") out.splice(2, 1, { tone: "结束", text: "我已经知道你是骗子了，别再联系我。" });
  return out;
}

export function ruleAdvice(a: GuardAnalysis): GuardAdvice {
  return {
    risk: a.risk,
    ruleRisk: a.risk,
    level: a.level,
    stage: a.stage,
    scamType: a.scamType,
    nextMove: a.nextMove,
    suggestions: ruleSuggestions(a),
    source: "rules",
  };
}

export function ruleCommentary(a: GuardAnalysis): string {
  const latest = a.turns.at(-1);
  const t = latest?.tactics[0];
  const s1 = t
    ? `「${t.quote}」这句是在${TACTICS[t.kind].act}。${t.why}`
    : a.stage >= 0
      ? "这一句本身没什么问题，不过前面的对话我都记着呢。"
      : "目前看起来是正常的聊天，我没发现骗局的套路。";
  const s2 = a.stage >= 0 ? `现在对话已经走到「${STAGES[a.stage].label}」这一步了${a.caseId ? `，和「${a.scamType}」的套路很像` : ""}。` : "";
  const s3 =
    a.level === "high"
      ? "我建议你别再回了：不转账、不给验证码，直接拉黑。拿不准就打 96110。"
      : a.level === "medium"
        ? "先别答应任何事，用官方渠道自己核实一下。"
        : a.stage >= 0
          ? "继续聊的时候我帮你盯着。"
          : "有新消息就贴进来，我帮你看着。";
  return s1 + s2 + s3;
}

/* ---------------- 聊天记录导入 ---------------- */

/** 解析「对方：…」「我：…」格式的聊天记录；没有前缀的行接在上一条后面 */
export function parseTranscript(raw: string): GuardMessage[] {
  const out: GuardMessage[] = [];
  for (const line of raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    const me = line.match(/^(我|自己|本人|右)\s*[：:]\s*(.*)$/);
    const them = line.match(/^([^：:]{1,12})\s*[：:]\s*(.*)$/);
    if (me) out.push({ role: "me", text: me[2] });
    else if (them && !/^https?$/i.test(them[1])) out.push({ role: "them", text: them[2] });
    else if (out.length) out[out.length - 1].text += `\n${line}`;
    else out.push({ role: "them", text: line });
  }
  return out.filter((m) => m.text.trim()).map((m) => ({ ...m, text: m.text.trim().slice(0, 1000) }));
}

/* ---------------- 求助摘要 ---------------- */

export function buildSummary(messages: GuardMessage[], a: GuardAnalysis, advice?: GuardAdvice) {
  const risk = advice?.risk ?? a.risk;
  const level = { high: "高危", medium: "可疑", low: "较安全" }[levelOf(risk)];
  const quotes = a.turns
    .flatMap((t) => t.tactics.slice(0, 1).map((h) => `· “${h.quote}”（${h.label}）`))
    .slice(0, 6);
  const mine = messages.filter((m) => m.role === "me").map((m) => checkDraft(m.text, a)).filter((c) => c?.level === "stop");
  return [
    "【知安 · 聊天护航求助摘要】",
    `时间：${new Date().toLocaleString("zh-CN", { hour12: false })}`,
    `风险评分：${risk}（${level}）  疑似：${advice?.scamType ?? a.scamType}`,
    `对话进展：${a.stage >= 0 ? STAGES[a.stage].label : "暂未发现骗局套路"}，对方共发来 ${a.turns.length} 条消息`,
    quotes.length ? `对方的可疑说法：\n${quotes.join("\n")}` : "",
    mine.length ? `需要注意：我的回复里可能有：${mine.map((c) => c!.label).join("、")}` : "",
    `建议：${a.verify.join("；")}`,
    "全国反诈专线 96110 · 报警 110",
  ]
    .filter(Boolean)
    .join("\n");
}
