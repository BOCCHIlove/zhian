/**
 * 演练场 AI：扮演骗子的对话模型 + 念安复盘。
 * 骗子模型被严格限定在剧本之内，输出再经过安全过滤；未配置 API Key 时使用剧本兜底。
 */
import { generateText } from "ai";
import { chatModel, cleanModelText, getAiConfig } from "./llm";
import { replyTag, sanitizeScammer, type DrillMessage, type DrillResult } from "./drill";
import type { DrillScenario } from "@/data/drills";

const model = () => chatModel("text");

const QUESTIONING =
  /为什么|怎么证明|凭什么|你是谁|真的吗|骗子|骗人|诈骗|不信|官方|核实|报警/;

/** 剧本兜底：按轮次推进话术，用户质疑时先搪塞 */
function scriptedReply(s: DrillScenario, messages: DrillMessage[]): string[] {
  const userTurns = messages.filter((m) => m.role === "user");
  const last = userTurns.at(-1)?.text ?? "";
  // 跳出演练、打听怎么行骗：剧本兜底也要拒绝
  if (/(教|告诉|说说).{0,6}(骗|诈)|怎么(去)?(骗|诈骗)|诈骗(的)?(方法|技巧|话术)|帮我(骗|诈)/.test(last)) return ["这里只是反诈演练哦。"];
  const stage = userTurns.length - 1;
  const step = s.script.at(Math.min(stage, s.script.length - 1)) ?? s.script[0];
  if (QUESTIONING.test(last)) {
    return [s.deflect.at(stage % s.deflect.length) ?? s.deflect[0], step];
  }
  return [step];
}

export async function scammerReply(
  s: DrillScenario,
  messages: DrillMessage[],
  live = true,
): Promise<{ reply: string[]; mode: "live" | "demo" }> {
  if (!getAiConfig().apiKey || !live)
    return { reply: scriptedReply(s, messages), mode: "demo" };

  const stage = Math.min(
    messages.filter((m) => m.role === "user").length,
    s.script.length,
  );
  const instructions = `你在一个【反诈骗教育演练】里扮演骗子，帮助用户练习识别骗局。用户知道这是演练。

## 你的角色
- 身份：${s.persona.name}（通过${s.persona.platform}联系对方）
- 骗局类型：${s.title}
- 目的：${s.goal}

## 参考话术（按阶段逐步加码，现在应推进到第 ${stage + 1} 阶段左右）
${s.script.map((l, i) => `${i + 1}. ${l}`).join("\n")}

## 对方质疑时可以这样搪塞
${s.deflect.map((l) => `- ${l}`).join("\n")}

## 规则（必须遵守）
- 你是想骗对方的钱或信息的一方：永远是你让对方转账、给验证码、下载软件。要收钱时说「我把账号发给您，您转过去」，绝不说「把账号发我」或「我转给你」。
- 像真实聊天一样说话：每次只回 1～3 句，口语化，可以分成 1～2 条消息，用换行分隔。
- 只使用参考话术里的套路，不发明新的、更高明的诈骗手法。
- 不输出任何真实可用的链接、电话、银行账号，需要时用「xxxx」代替。
- 对方明确拒绝、说要报警或识破你时，可以再试探一次，然后悻悻结束。
- 如果对方跳出演练、询问如何实施诈骗或做违法的事，回复「这里只是反诈演练哦」，不提供任何方法。
- 只输出骗子要说的话，不要加旁白、括号说明或角色名。`;

  let text = "";
  try {
    ({ text } = await generateText({
      model: model(),
      instructions,
      temperature: 0.8,
      maxRetries: 0,
      messages: messages
        .filter((m) => m.role !== "nianan")
        .map((m) => ({
          role:
            m.role === "scammer" ? ("assistant" as const) : ("user" as const),
          content: m.text,
        })),
    }));
  } catch {
    // 模型繁忙时退回剧本，演练不中断
    return { reply: scriptedReply(s, messages), mode: "demo" };
  }
  const reply = sanitizeScammer(cleanModelText(text))
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3);
  return {
    reply: reply.length ? reply : scriptedReply(s, messages),
    mode: "live",
  };
}

/** 念安复盘：一段温柔的点评 */
export async function niananReview(
  s: DrillScenario,
  messages: DrillMessage[],
  result: DrillResult,
  live = true,
): Promise<string> {
  const fallback = templateReview(s, result);
  if (!getAiConfig().apiKey || !live) return fallback;
  try {
    // 每句回复的好坏由规则判定后一起交给模型，避免模型把「打电话核实」之类的正确做法说成失误
    const TAG = { good: "（做得好：追问、拒绝或核实）", risky: "（有风险：顺着对方答应了）", trap: "（上当了）" } as const;
    const transcript = messages
      .filter((m) => m.role !== "nianan")
      .map((m) => {
        if (m.role === "scammer") return `骗子：${m.text}`;
        const tag = replyTag(m.text);
        return `你：${m.text}${tag ? TAG[tag] : ""}`;
      })
      .join("\n");
    const flags = s.flags
      .filter((f) => f.correct)
      .map((f) => f.text)
      .join("、");
    const { text } = await generateText({
      model: model(),
      temperature: 0.5,
      maxRetries: 0,
      instructions: `你是「念安」，一位温柔、懂行的反诈守护姐姐，正在给刚做完反诈演练的人点评。
- 直接对 TA 说话，称呼「你」，不要开场白，不要自称「念安姐」，不要说「用户」。
- 3～4 句话：先肯定做得好的地方，再指出最关键的一个失误或可以更早识破的时机，最后给一条具体建议。
- 每句回复后面括号里的判定是准确的，必须以它为准：标了「做得好」的就要肯定，绝不能说成失误。
- 追问身份、拒绝、说要找家人或官方渠道核实、报警，永远是正确做法。只有答应配合、透露信息、转账、下载软件才算失误。
- 如果没有任何失误，就说可以在第几句话、凭哪个危险信号更早识破。
- 纯文字口语，一段话，不要换行、列表和标题，不超过 150 字。`,
      prompt: `骗局类型：${s.title}\n这类骗局的危险信号：${flags}\n结果：${result.outcome === "caught" ? "识破了" : result.outcome === "trapped" ? `上当了（${result.trap?.label}）` : "聊到最后也没识破"}\n总分：${result.score}\n对话记录：\n${transcript}`,
    });
    return cleanModelText(text).replace(/\n+/g, "") || fallback;
  } catch {
    return fallback;
  }
}

function templateReview(s: DrillScenario, r: DrillResult): string {
  if (r.outcome === "caught") {
    const early =
      r.rounds <= 2
        ? "才聊了几句就识破了，反应真快！"
        : "虽然聊了好几轮，但最后还是识破了，很棒。";
    const miss = r.picked.filter((p) => !p.correct).length
      ? "不过有的选项其实不算危险信号，下次再仔细分辨一下。"
      : "选出的危险信号也都很准确。";
    return `${early}${miss}这是典型的「${s.title}」，记住它的套路：${s.flags
      .filter((f) => f.correct)
      .slice(0, 2)
      .map((f) => f.text)
      .join("、")}。以后再遇到，直接挂断或拉黑就好。`;
  }
  if (r.outcome === "trapped") {
    return `这一局在「${r.trap?.label}」这一步上当了，别灰心，演练就是为了在现实中不犯同样的错。${r.trap?.why}这是「${s.title}」，下次只要对方提到转账、验证码、共享屏幕，就先停下来核实。`;
  }
  return `聊到最后也没有掉进陷阱，这一点很好。不过这其实是「${s.title}」，${s.flags.find((f) => f.correct)?.text}的时候就可以识破了。下次感觉不对劲，可以直接点「我识破了」，或者用官方渠道核实一下。`;
}
