import { z } from "zod";
import { runDetect } from "@/lib/agent";
import type { DetectEvent } from "@/lib/events";
import { rateLimit, takeAiQuota } from "@/lib/rate-limit";

export const maxDuration = 60;

const bodySchema = z.object({
  text: z.string().max(4000, "内容太长了，请控制在 4000 字以内").default(""),
  image: z
    .string()
    .regex(/^data:image\/(png|jpe?g|webp|gif);base64,/, "图片格式不支持")
    .max(6_000_000, "图片太大了，请压缩到 4MB 以内")
    .optional(),
  audience: z.enum(["student", "worker", "elder", "shopper"]).optional(),
});

/** POST /api/detect —— 以 NDJSON 事件流返回 Agent 的每一步和最终报告 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "detect");
  if (limited) return limited;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "请求格式错误" }, { status: 400 });
  }
  if (!parsed.data.text.trim() && !parsed.data.image) {
    return Response.json({ error: "请粘贴要检测的内容，或上传一张截图" }, { status: 400 });
  }

  const live = takeAiQuota(request);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: DetectEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
        } catch {
          /* 客户端已断开 */
        }
      };
      try {
        await runDetect(parsed.data, emit, request.signal, { live });
      } catch (e) {
        const msg = (e as Error).message || "未知错误";
        emit({ type: "error", message: `念安这边出了点问题：${msg}` });
      }
      emit({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
