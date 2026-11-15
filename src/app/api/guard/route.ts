import { z } from "zod";
import { getAiConfig } from "@/lib/llm";
import { readChatScreenshot, runGuard } from "@/lib/guard-agent";
import type { GuardEvent } from "@/lib/guard";
import { rateLimit, takeAiQuota } from "@/lib/rate-limit";

export const maxDuration = 60;

const message = z.object({ role: z.enum(["them", "me"]), text: z.string().trim().min(1).max(1000) });

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("analyze"), messages: z.array(message).min(1).max(60) }),
  z.object({
    action: z.literal("ocr"),
    image: z
      .string()
      .regex(/^data:image\/(png|jpe?g|webp|gif);base64,/, "图片格式不支持")
      .max(6_000_000, "图片太大了，请压缩到 4MB 以内"),
  }),
]);

/**
 * POST /api/guard
 * - action=analyze：以 NDJSON 事件流返回念安对这段对话的研判、回复建议和点评
 * - action=ocr：把聊天截图转写成「对方 / 我」两侧的消息
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "guard");
  if (limited) return limited;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "请求格式错误" }, { status: 400 });
  const body = parsed.data;

  if (body.action === "ocr") {
    if (!getAiConfig().apiKey) {
      return Response.json({ error: "演示模式还不能识别截图（需要配置 AI_API_KEY），可以先把文字粘贴进来。" }, { status: 400 });
    }
    if (!takeAiQuota(request)) {
      return Response.json({ error: "今天的截图识别额度用完了，明天再来，或者先把文字粘贴进来。" }, { status: 429 });
    }
    try {
      const messages = await readChatScreenshot(body.image);
      if (!messages.length) return Response.json({ error: "没能从截图里认出聊天内容，换一张清楚点的试试？" }, { status: 422 });
      return Response.json({ messages });
    } catch (e) {
      return Response.json({ error: `截图识别失败：${(e as Error).message}` }, { status: 500 });
    }
  }

  if (!body.messages.some((m) => m.role === "them")) {
    return Response.json({ error: "至少要有一条对方发来的消息" }, { status: 400 });
  }

  const live = takeAiQuota(request);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: GuardEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
        } catch {
          /* 客户端已断开 */
        }
      };
      try {
        await runGuard(body.messages, emit, request.signal, { live });
      } catch (e) {
        emit({ type: "error", message: `念安这边出了点问题：${(e as Error).message || "未知错误"}` });
      }
      emit({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
