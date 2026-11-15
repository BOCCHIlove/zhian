/**
 * 演练场核心逻辑：陷阱检测、用户应对行为分析、五维防骗力评分、输出安全过滤。
 * 这些都是确定性的规则，前后端共用，保证评分稳定、可解释。
 */
import { findRedFlags, similarity, type Evidence } from "./analyze";
import { DRILL_NOTES, type DrillScenario } from "@/data/drills";

export interface DrillMessage {
  role: "scammer" | "user" | "nianan";
  text: string;
}

export type DrillOutcome = "caught" | "trapped" | "timeout";

export interface Trap {
  kind: "code" | "card" | "id" | "password" | "transfer" | "screen";
  label: string;
  why: string;
}

export interface DrillResult {
  outcome: DrillOutcome;
  score: number;
  title: string;
  dims: { key: string; label: string; value: number }[];
  rounds: number;
  hintsUsed: number;
  trap?: Trap;
  picked: { text: string; correct: boolean }[];
}

/* ---------------- 陷阱检测：用户回复里是否泄露信息或答应转账 ---------------- */

const NEGATION = /不|别|没|拒绝|才不|休想|凭什么|为什么要/;

export function detectTrap(text: string): Trap | undefined {
  const t = text.replace(/\s/g, "");
  if (/验证码(是|为|:|：)?\d{4,6}/.test(t) || /^\d{4,6}$/.test(t)) {
    return { kind: "code", label: "说出了验证码", why: "验证码就是你账户的钥匙。任何人索要验证码，都是在盗取你的账户。" };
  }
  if (/\d{16,19}/.test(t)) {
    return { kind: "card", label: "发出了银行卡号", why: "银行卡号配合验证码，就能被盗刷或冒名借款。" };
  }
  if (/\d{17}[\dXx]/.test(t)) {
    return { kind: "id", label: "发出了身份证号", why: "身份证号会被用来冒名办卡、贷款。" };
  }
  if (/密码(是|为|:|：)/.test(t)) {
    return { kind: "password", label: "说出了密码", why: "任何正规机构都不会索要你的密码。" };
  }
  if (NEGATION.test(t)) return undefined;
  if (/(已经?|这就|马上|现在就?|我)(转|汇|付|充值|充)(了|过去|好|账|款|钱)?|转好了|付好了|充好了|转过去了|打过去了/.test(t)) {
    return { kind: "transfer", label: "答应了转账", why: "钱一旦转出去就很难追回。只要涉及转账，就要先停下来核实。" };
  }
  if (/(共享|下载|装)(好|了)|开(了|始)共享|已共享|已下载/.test(t)) {
    return { kind: "screen", label: "下载软件或共享了屏幕", why: "共享屏幕后，你输入的密码、收到的验证码，对方全都能看到。" };
  }
  return undefined;
}

/* ---------------- 用户应对行为 ---------------- */

const QUESTION = /为什么|怎么证明|凭什么|你是谁|真的吗|骗子|骗人|诈骗|不信|不可能|有问题|证据|什么意思/;
const REFUSE = /不(转|给|要|需要|做|用|下载|共享|借)|拒绝|算了|不了|没兴趣|拉黑|挂了|再见/;
const VERIFY = /官方|核实|确认一下|打电话|回拨|报警|110|96110|问问|家人|爸|妈|财务|当面|视频|客服电话|反诈/;

export function analyzeReplies(messages: DrillMessage[]) {
  const replies = messages.filter((m) => m.role === "user").map((m) => m.text);
  return {
    rounds: replies.length,
    questions: replies.filter((r) => QUESTION.test(r)).length,
    refusals: replies.filter((r) => REFUSE.test(r)).length,
    verified: replies.some((r) => VERIFY.test(r)),
  };
}

export function replyTag(text: string): "trap" | "good" | "risky" | undefined {
  if (detectTrap(text)) return "trap";
  if (QUESTION.test(text) || REFUSE.test(text) || VERIFY.test(text)) return "good";
  if (/好的|可以|行|嗯|怎么(做|操作)|然后呢|在哪/.test(text)) return "risky";
  return undefined;
}

/* ---------------- 评分 ---------------- */

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function scoreDrill(opts: {
  outcome: DrillOutcome;
  messages: DrillMessage[];
  scenario: DrillScenario;
  picked: string[];
  hintsUsed: number;
  trap?: Trap;
}): DrillResult {
  const { outcome, messages, scenario, picked, hintsUsed, trap } = opts;
  const a = analyzeReplies(messages);
  const correctTotal = scenario.flags.filter((f) => f.correct).length;
  const pickedFlags = scenario.flags.filter((f) => picked.includes(f.text));
  const right = pickedFlags.filter((f) => f.correct).length;
  const wrong = pickedFlags.length - right;

  const alert = outcome === "caught" ? clamp(100 - Math.max(0, a.rounds - 1) * 12) : outcome === "trapped" ? 15 : 35;
  const recognition = outcome === "caught" ? clamp((right / correctTotal) * 100 - wrong * 15) : outcome === "trapped" ? 10 : 30;
  const protect = trap && trap.kind !== "transfer" && trap.kind !== "screen" ? 10 : trap ? 35 : 100;
  const response = clamp(30 + 20 * (a.questions + a.refusals));
  const verify = a.verified ? 100 : outcome === "caught" ? 55 : 20;

  const score = clamp(alert * 0.3 + recognition * 0.25 + protect * 0.2 + response * 0.15 + verify * 0.1 - hintsUsed * 5);
  const title = score >= 85 ? "反诈达人" : score >= 70 ? "清醒守护者" : score >= 50 ? "还需多练练" : "差点就上当了";

  return {
    outcome,
    score,
    title,
    rounds: a.rounds,
    hintsUsed,
    trap,
    picked: pickedFlags.map((f) => ({ text: f.text, correct: f.correct })),
    dims: [
      { key: "alert", label: "警觉性", value: alert },
      { key: "recognition", label: "识别力", value: recognition },
      { key: "protect", label: "信息保护", value: protect },
      { key: "response", label: "应对力", value: response },
      { key: "verify", label: "求证意识", value: verify },
    ],
  };
}

/* ---------------- 复盘标注：骗子每句话里的危险信号 ---------------- */

/** 按文本相似度把骗子的话匹配到剧本的逐句说明；匹配不到时退回通用危险信号 */
export function annotateScammer(text: string, scenario: DrillScenario): string[] {
  const notes = DRILL_NOTES[scenario.id];
  if (notes) {
    const candidates = [
      ...[scenario.opening, ...scenario.script].map((line, i) => ({ line, note: notes.lines.at(i) })),
      ...scenario.deflect.map((line) => ({ line, note: notes.deflect })),
    ];
    let best = { score: 0, note: undefined as string | undefined };
    for (const c of candidates) {
      const s = similarity(text, c.line);
      if (s > best.score) best = { score: s, note: c.note };
    }
    if (best.score >= 0.3 && best.note) return [best.note];
  }
  return findRedFlags(text)
    .slice(0, 1)
    .map((e: Evidence) => e.reason);
}

/* ---------------- 安全过滤：AI 骗子的输出不含可用的链接和账号 ---------------- */

export function sanitizeScammer(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, "（演练链接）")
    .replace(/\b[a-z0-9-]+\.(com|cn|net|top|xyz|cc|vip|shop|club|site)\b(\/\S*)?/gi, (m) => (m.includes("xxxx") ? m : "（演练链接）"))
    // 账号、会议号、电话常被空格或横线隔开（123 456 789），合起来 6 位以上的数字都打码
    .replace(/\d(?:[\s-]?\d){5,}/g, (m) => `${m.replace(/\D/g, "").slice(0, 3)}****`)
    .trim();
}
