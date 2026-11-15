"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { DRILLS, MAX_ROUNDS, type DrillScenario } from "@/data/drills";
import type { Audience } from "@/data/scams";
import { detectTrap, type DrillMessage, type DrillOutcome, type DrillResult as Result } from "@/lib/drill";
import { saveDrill } from "@/lib/history";
import { DrillSetup } from "./drill-setup";
import { DrillChat } from "./drill-chat";
import { IdentifyDialog } from "./identify-dialog";
import { DrillResult } from "./drill-result";

type Phase = "setup" | "chat" | "reviewing" | "result";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** 模拟打字时间：字越多打得越久 */
const typingTime = (t: string) => Math.min(2200, 500 + t.length * 35);

export function DrillGame() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [audience, setAudience] = useState<Audience>("student");
  const [scenario, setScenario] = useState<DrillScenario>();
  const [messages, setMessages] = useState<DrillMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [identifying, setIdentifying] = useState(false);
  const [mode, setMode] = useState<"live" | "demo">();
  const [result, setResult] = useState<{ result: Result; review: string }>();
  const [error, setError] = useState<string>();
  const lastId = useRef<string>(undefined);
  const ended = useRef(false);

  const pushScammer = async (lines: string[]) => {
    for (const line of lines) {
      if (ended.current) return;
      setTyping(true);
      await sleep(typingTime(line));
      setTyping(false);
      if (ended.current) return;
      setMessages((m) => [...m, { role: "scammer", text: line }]);
      await sleep(250);
    }
  };

  const start = async (aud = audience) => {
    const pool = DRILLS.filter((d) => d.audiences.includes(aud));
    const choices = pool.length > 1 ? pool.filter((d) => d.id !== lastId.current) : pool;
    const s = choices[Math.floor(Math.random() * choices.length)];
    lastId.current = s.id;
    ended.current = false;
    setScenario(s);
    setMessages([]);
    setHintsUsed(0);
    setResult(undefined);
    setError(undefined);
    setPhase("chat");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setBusy(true);
    await pushScammer([s.opening]);
    setBusy(false);
  };

  const finish = async (outcome: DrillOutcome, history: DrillMessage[], picked: string[] = []) => {
    if (!scenario || ended.current) return;
    ended.current = true;
    setTyping(false);
    setBusy(true);
    setPhase("reviewing");
    try {
      const res = await fetch("/api/drill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "review", scenarioId: scenario.id, messages: history, outcome, picked, hintsUsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "复盘失败");
      setResult(data);
      saveDrill({
        scenario: scenario.title,
        caseId: scenario.caseId,
        audience,
        score: data.result.score,
        title: data.result.title,
        outcome,
        dims: data.result.dims,
      });
      setPhase("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
      setPhase("chat");
      ended.current = false;
    } finally {
      setBusy(false);
    }
  };

  const send = async (text: string) => {
    if (!scenario || busy) return;
    const history: DrillMessage[] = [...messages, { role: "user", text }];
    setMessages(history);

    const trap = detectTrap(text);
    if (trap) {
      const stop: DrillMessage = { role: "nianan", text: `停！这一步就上当了——你${trap.label}。${trap.why}` };
      setMessages([...history, stop]);
      await sleep(1600);
      return finish("trapped", [...history, stop]);
    }
    if (history.filter((m) => m.role === "user").length >= MAX_ROUNDS) {
      return finish("timeout", history);
    }

    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch("/api/drill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reply", scenarioId: scenario.id, messages: history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "对方没有回复");
      setMode(data.mode);
      await pushScammer(data.reply);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const hint = () => {
    if (!scenario || hintsUsed >= scenario.hints.length) return;
    setMessages((m) => [...m, { role: "nianan", text: scenario.hints[hintsUsed] }]);
    setHintsUsed((h) => h + 1);
  };

  if (phase === "setup" || !scenario) {
    return <DrillSetup audience={audience} onAudience={setAudience} onStart={() => start()} />;
  }

  if (phase === "result" && result) {
    return (
      <DrillResult
        scenario={scenario}
        messages={messages}
        result={result.result}
        review={result.review}
        onAgain={() => start()}
        onChange={() => setPhase("setup")}
      />
    );
  }

  return (
    <>
      <DrillChat
        scenario={scenario}
        messages={messages}
        typing={typing}
        busy={busy}
        hintsLeft={scenario.hints.length - hintsUsed}
        mode={mode}
        onSend={send}
        onHint={hint}
        onIdentify={() => setIdentifying(true)}
      />
      {error && <p className="mx-auto mt-4 max-w-2xl rounded-2xl bg-danger-soft p-3 text-center text-sm text-danger">{error}</p>}
      {identifying && (
        <IdentifyDialog
          scenario={scenario}
          onCancel={() => setIdentifying(false)}
          onConfirm={(picked) => {
            setIdentifying(false);
            finish("caught", messages, picked);
          }}
        />
      )}
      {phase === "reviewing" && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-cream/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Image src="/nianan/avatar.png" alt="念安" width={88} height={88} className="animate-pulse rounded-full ring-4 ring-brand/30" />
            <p className="flex items-center gap-2 font-medium">
              <Loader2 className="size-4 animate-spin text-brand" />
              念安正在给你复盘…
            </p>
          </div>
        </div>
      )}
    </>
  );
}
