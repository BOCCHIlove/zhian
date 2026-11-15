import { z } from "zod";
import { DRILLS, MAX_ROUNDS } from "@/data/drills";
import { niananReview, scammerReply } from "@/lib/drill-agent";
import { detectTrap, scoreDrill } from "@/lib/drill";
import { rateLimit, takeAiQuota } from "@/lib/rate-limit";

export const maxDuration = 60;

const message = z.object({ role: z.enum(["scammer", "user", "nianan"]), text: z.string().max(1000) });

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reply"),
    scenarioId: z.string(),
    messages: z.array(message).max(MAX_ROUNDS * 4 + 4),
  }),
  z.object({
    action: z.literal("review"),
    scenarioId: z.string(),
    messages: z.array(message).max(MAX_ROUNDS * 4 + 4),
    outcome: z.enum(["caught", "trapped", "timeout"]),
    picked: z.array(z.string()).max(10),
    hintsUsed: z.number().int().min(0).max(5),
  }),
]);

/**
 * POST /api/drill
 * - action=reply：AI 骗子的下一条回复
 * - action=review：服务端重新计算评分（不信任前端分数）并生成念安的复盘点评
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "drill");
  if (limited) return limited;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "请求格式错误" }, { status: 400 });
  const body = parsed.data;
  const scenario = DRILLS.find((d) => d.id === body.scenarioId);
  if (!scenario) return Response.json({ error: "演练场景不存在" }, { status: 404 });

  const live = takeAiQuota(request);
  try {
    if (body.action === "reply") {
      return Response.json(await scammerReply(scenario, body.messages, live));
    }
    const trap = body.outcome === "trapped" ? body.messages.filter((m) => m.role === "user").map((m) => detectTrap(m.text)).find(Boolean) : undefined;
    const result = scoreDrill({ outcome: body.outcome, messages: body.messages, scenario, picked: body.picked, hintsUsed: body.hintsUsed, trap });
    const review = await niananReview(scenario, body.messages, result, live);
    return Response.json({ result, review });
  } catch (e) {
    return Response.json({ error: `演练服务出错：${(e as Error).message}` }, { status: 500 });
  }
}
