"use client";

import { useCallback, useRef, useState } from "react";
import type { Report } from "./analyze";
import type { DetectEvent, DetectRequest, StepTool } from "./events";
import { saveRecord } from "./history";

export interface Step {
  id: string;
  tool: StepTool;
  status: "running" | "done" | "error";
  title: string;
  detail?: string;
  data?: unknown;
}

export type DetectStatus = "idle" | "running" | "done" | "error";

/** 调用 /api/detect，逐行解析 NDJSON 事件流，驱动检测台界面 */
export function useDetect() {
  const [status, setStatus] = useState<DetectStatus>("idle");
  const [mode, setMode] = useState<"live" | "demo">();
  const [steps, setSteps] = useState<Step[]>([]);
  const [text, setText] = useState("");
  const [report, setReport] = useState<Report>();
  const [error, setError] = useState<string>();
  const abortRef = useRef<AbortController>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
    setSteps([]);
    setText("");
    setReport(undefined);
    setError(undefined);
  }, []);

  const run = useCallback(async (req: DetectRequest) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setStatus("running");
    setSteps([]);
    setText("");
    setReport(undefined);
    setError(undefined);

    let finalReport: Report | undefined;
    let failed = false;

    const handle = (e: DetectEvent) => {
      switch (e.type) {
        case "mode":
          setMode(e.mode);
          break;
        case "step":
          setSteps((prev) => {
            const i = prev.findIndex((s) => s.id === e.id);
            const next: Step = { id: e.id, tool: e.tool, status: e.status, title: e.title, detail: e.detail, data: "data" in e ? e.data : undefined };
            if (i === -1) return [...prev, next];
            const copy = prev.slice();
            copy[i] = { ...copy[i], ...next, detail: next.detail ?? copy[i].detail };
            return copy;
          });
          break;
        case "text":
          setText((t) => t + e.delta);
          break;
        case "report":
          finalReport = e.report;
          setReport(e.report);
          break;
        case "error":
          failed = true;
          setError(e.message);
          break;
      }
    };

    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `请求失败（${res.status}）`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) if (line.trim()) handle(JSON.parse(line) as DetectEvent);
      }
      if (finalReport) {
        saveRecord({ input: req.text || "（截图）", hasImage: Boolean(req.image), audience: req.audience, report: finalReport });
        setStatus("done");
      } else {
        setStatus(failed ? "error" : "done");
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
      setStatus("error");
    }
  }, []);

  return { status, mode, steps, text, report, error, run, reset };
}
