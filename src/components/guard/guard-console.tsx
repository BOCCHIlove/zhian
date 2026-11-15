"use client";

import { useState } from "react";
import { useGuard } from "@/lib/use-guard";
import type { GuardSample } from "@/data/guard-samples";
import { GuardChat } from "./guard-chat";
import { GuardPanel } from "./guard-panel";

const FALLBACK_REPLY = "我先通过官方渠道核实一下，再回复你。";

export function GuardConsole() {
  const g = useGuard();
  const [role, setRole] = useState<"them" | "me">("them");
  const [draft, setDraft] = useState("");
  const [sample, setSample] = useState<{ s: GuardSample; pos: number }>();
  const [focusKey, setFocusKey] = useState(0);

  const pickSample = (s: GuardSample) => {
    g.reset();
    setDraft("");
    setSample({ s, pos: 1 });
    g.add([s.messages[0]]);
  };

  const sampleNext = () => {
    if (!sample || sample.pos >= sample.s.messages.length) return;
    g.add([sample.s.messages[sample.pos]]);
    setSample({ ...sample, pos: sample.pos + 1 });
  };

  const reset = () => {
    g.reset();
    setSample(undefined);
    setDraft("");
    setRole("them");
  };

  const use = (text: string) => {
    setRole("me");
    setDraft(text);
    setFocusKey((k) => k + 1);
  };

  const safeReply = g.advice?.suggestions.find((s) => s.tone !== "正常回复")?.text ?? FALLBACK_REPLY;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <GuardChat
        messages={g.messages}
        analysis={g.analysis}
        peer={sample?.s.peer ?? "对方"}
        busy={g.status === "running"}
        comment={g.text}
        role={role}
        draft={draft}
        safeReply={safeReply}
        sample={sample}
        focusKey={focusKey}
        onRole={setRole}
        onDraft={setDraft}
        onAdd={g.add}
        onUndo={() => {
          // 只在纯演示播放时回退进度；手动加过消息就不动演示进度
          if (sample && g.messages.length === sample.pos) setSample({ ...sample, pos: sample.pos - 1 });
          g.undo();
        }}
        onReset={reset}
        onPickSample={pickSample}
        onSampleNext={sampleNext}
      />
      <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:pb-2">
        <GuardPanel
          messages={g.messages}
          analysis={g.analysis}
          advice={g.advice}
          status={g.status}
          mode={g.mode}
          steps={g.steps}
          text={g.text}
          error={g.error}
          onUse={use}
        />
      </div>
    </div>
  );
}
