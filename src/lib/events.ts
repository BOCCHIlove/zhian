/**
 * 检测接口的事件流协议（NDJSON，一行一个事件）。
 * 服务端把 Agent 的每一步（调用了什么工具、得到什么结果）实时推给前端，
 * 前端据此渲染「念安正在做什么」的思考过程时间线。
 */
import type { Report } from "./analyze";

export type StepTool = "read_image" | "search_scam_knowledge" | "analyze_url" | "analyze_phone" | "submit_report";

export type DetectEvent =
  | { type: "mode"; mode: "live" | "demo"; model?: string }
  | { type: "step"; id: string; tool: StepTool; status: "running"; title: string; detail?: string }
  | { type: "step"; id: string; tool: StepTool; status: "done" | "error"; title: string; detail?: string; data?: unknown }
  | { type: "text"; delta: string }
  | { type: "report"; report: Report }
  | { type: "error"; message: string }
  | { type: "done" };

export interface DetectRequest {
  text: string;
  /** data URL，例如 data:image/png;base64,... */
  image?: string;
  audience?: "student" | "worker" | "elder" | "shopper";
}

export const STEP_LABELS: Record<StepTool, string> = {
  read_image: "识别截图内容",
  search_scam_knowledge: "检索骗局知识库",
  analyze_url: "检查链接",
  analyze_phone: "检查号码",
  submit_report: "生成检测报告",
};
