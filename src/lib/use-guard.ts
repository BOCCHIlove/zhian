"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { analyzeConversation, type GuardAdvice, type GuardEvent, type GuardMessage } from "./guard";

export interface GuardStep {
  id: string;
  label: string;
  status: "running" | "done" | "error";
  detail?: string;
}

/**
 * 聊天护航的前端状态：
 * - 规则分析在浏览器里即时计算（每来一条消息，风险曲线马上更新）
 * - 对方发来新消息时请求 /api/guard，流式接收念安的研判、回复建议和点评
 */
export function useGuard() {
  const [messages, setMessages] = useState<GuardMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [mode, setMode] = useState<"live" | "demo">();
  const [steps, setSteps] = useState<GuardStep[]>([]);
  const [text, setText] = useState("");
  const [advice, setAdvice] = useState<GuardAdvice>();
  const [error, setError] = useState<string>();
  const abortRef = useRef<AbortController>(null);
  // 用 ref 保存最新的对话，避免连续操作时拿到过期的闭包
  const listRef = useRef<GuardMessage[]>([]);
  const commit = useCallback((next: GuardMessage[]) => {
    listRef.current = next;
    setMessages(next);
  }, []);

  const analysis = useMemo(() => analyzeConversation(messages), [messages]);

  const run = useCallback(async (list: GuardMessage[]) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setStatus("running");
    setSteps([]);
    setText("");
    setAdvice(undefined);
    setError(undefined);

    const handle = (e: GuardEvent) => {
      switch (e.type) {
        case "mode":
          setMode(e.mode);
          break;
        case "step":
          setSteps((prev) => {
            const i = prev.findIndex((s) => s.id === e.id);
            if (i === -1) return [...prev, { id: e.id, label: e.label, status: e.status, detail: e.detail }];
            const copy = prev.slice();
            copy[i] = { ...copy[i], status: e.status, label: e.label, detail: e.detail ?? copy[i].detail };
            return copy;
          });
          break;
        case "text":
          setText((t) => t + e.delta);
          break;
        case "advice":
          setAdvice(e.advice);
          break;
        case "error":
          setError(e.message);
          break;
      }
    };

    try {
      const res = await fetch("/api/guard", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "analyze", messages: list.slice(-60) }),
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
        for (const line of lines) if (line.trim()) handle(JSON.parse(line) as GuardEvent);
      }
      setStatus("done");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
      setStatus("error");
    }
  }, []);

  /** 追加消息；其中有对方的新消息时，请念安重新研判 */
  const add = useCallback(
    (items: GuardMessage[]) => {
      const clean = items.map((m) => ({ ...m, text: m.text.trim().slice(0, 1000) })).filter((m) => m.text);
      if (!clean.length) return;
      const next = [...listRef.current, ...clean];
      commit(next);
      if (clean.some((m) => m.role === "them")) run(next);
    },
    [commit, run],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    commit([]);
    setStatus("idle");
    setSteps([]);
    setText("");
    setAdvice(undefined);
    setError(undefined);
  }, [commit]);

  const undo = useCallback(() => {
    const next = listRef.current.slice(0, -1);
    if (!next.some((m) => m.role === "them")) return reset();
    commit(next);
    run(next);
  }, [commit, reset, run]);

  return { messages, analysis, status, mode, steps, text, advice, error, add, undo, reset };
}

/** 截图转写成对话 */
export async function readScreenshot(image: string): Promise<GuardMessage[]> {
  const res = await fetch("/api/guard", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "ocr", image }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `识别失败（${res.status}）`);
  return body.messages as GuardMessage[];
}
