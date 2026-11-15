"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Send, Siren, Lightbulb, ShieldQuestion } from "lucide-react";
import type { DrillMessage } from "@/lib/drill";
import type { DrillScenario } from "@/data/drills";
import { MAX_ROUNDS } from "@/data/drills";

const QUICK = ["你是谁？怎么证明？", "好的，我该怎么做？", "我先通过官方渠道核实一下", "不需要，谢谢"];

export function DrillChat({
  scenario,
  messages,
  typing,
  busy,
  hintsLeft,
  mode,
  onSend,
  onHint,
  onIdentify,
}: {
  scenario: DrillScenario;
  messages: DrillMessage[];
  typing: boolean;
  busy: boolean;
  hintsLeft: number;
  mode?: "live" | "demo";
  onSend: (text: string) => void;
  onHint: () => void;
  onIdentify: () => void;
}) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const rounds = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = (t: string) => {
    const text = t.trim();
    if (!text || busy) return;
    onSend(text);
    setInput("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* 仿手机聊天窗口 */}
      <div className="mx-auto flex h-[min(680px,calc(100vh-140px))] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border-8 border-ink/90 bg-[#efeae2] shadow-2xl">
        <div className="flex items-center gap-3 bg-white/90 px-4 py-3 backdrop-blur">
          <span className="grid size-10 place-items-center rounded-full bg-ink/80 font-semibold text-white">{scenario.persona.initial}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{scenario.persona.name}</p>
            <p className="text-xs text-ink-soft">{typing ? "对方正在输入…" : scenario.persona.platform}</p>
          </div>
          <span className="chip bg-peach-soft text-peach">演练中{mode === "demo" ? " · 剧本模式" : ""}</span>
        </div>
        <div className="h-1 bg-ink/5">
          <motion.div className="h-full bg-peach" animate={{ width: `${(rounds / MAX_ROUNDS) * 100}%` }} />
        </div>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
          <p className="mx-auto w-fit rounded-full bg-ink/10 px-3 py-1 text-[11px] text-ink-soft">演练对话 · 你还可以回复 {MAX_ROUNDS - rounds} 次</p>
          <AnimatePresence initial={false}>
            {messages.map((m, i) =>
              m.role === "nianan" ? (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto flex max-w-[90%] items-start gap-2 rounded-2xl bg-peach-soft p-3 text-sm">
                  <Image src="/nianan/avatar.png" alt="念安" width={28} height={28} className="shrink-0 rounded-full" />
                  <span>
                    <span className="font-semibold text-peach">念安悄悄说：</span>
                    {m.text}
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <p
                    className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm ${
                      m.role === "user" ? "rounded-tr-sm bg-[#95ec69] text-ink" : "rounded-tl-sm bg-white text-ink"
                    }`}
                  >
                    {m.text}
                  </p>
                </motion.div>
              ),
            )}
          </AnimatePresence>
          {typing && (
            <div className="flex">
              <span className="flex gap-1 rounded-2xl rounded-tl-sm bg-white px-4 py-3.5 shadow-sm">
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} className="size-1.5 rounded-full bg-ink/40" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
                ))}
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-ink/5 bg-white/90 p-3">
          {/* 手机端：识破与提示按钮放在输入框上方 */}
          <div className="mb-2 grid grid-cols-2 gap-2 lg:hidden">
            <button onClick={onIdentify} className="flex items-center justify-center gap-1.5 rounded-full bg-danger py-2 text-sm font-semibold text-white">
              <Siren className="size-4" />
              我识破了！
            </button>
            <button onClick={onHint} disabled={!hintsLeft || busy} className="flex items-center justify-center gap-1.5 rounded-full bg-peach-soft py-2 text-sm text-peach disabled:opacity-50">
              <Lightbulb className="size-4" />
              提示（剩 {hintsLeft}）
            </button>
          </div>
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {QUICK.map((q) => (
              <button key={q} onClick={() => send(q)} disabled={busy} className="shrink-0 rounded-full bg-cream px-3 py-1.5 text-xs text-ink-soft transition hover:bg-brand-soft hover:text-brand disabled:opacity-50">
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 200))}
              placeholder={busy ? "等对方回复…" : "输入你的回复"}
              className="flex-1 rounded-full bg-cream px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30"
            />
            <button type="submit" disabled={busy || !input.trim()} className="grid size-10 place-items-center rounded-full bg-brand text-white disabled:opacity-40" aria-label="发送">
              <Send className="size-4" />
            </button>
          </form>
        </div>
      </div>

      {/* 念安侧栏 */}
      <aside className="hidden space-y-4 lg:sticky lg:top-24 lg:block lg:self-start">
        <button onClick={onIdentify} className="flex w-full items-center justify-center gap-2 rounded-3xl bg-danger px-6 py-5 text-lg font-bold text-white shadow-soft transition hover:opacity-90 active:scale-[0.98]">
          <Siren className="size-6" />
          我识破了！
        </button>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <Image src="/nianan/avatar.png" alt="念安" width={48} height={48} className="rounded-full ring-2 ring-brand/30" />
            <div>
              <p className="font-semibold">念安在旁边看着</p>
              <p className="text-xs text-ink-soft">真掉进陷阱，我会马上喊停</p>
            </div>
          </div>
          <button
            onClick={onHint}
            disabled={!hintsLeft || busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-peach-soft px-4 py-3 text-sm font-medium text-peach transition hover:bg-peach hover:text-white disabled:opacity-50"
          >
            <Lightbulb className="size-4" />
            {hintsLeft ? `给我一点提示（还剩 ${hintsLeft} 次，扣 5 分）` : "提示已用完"}
          </button>
        </div>
        <div className="card space-y-2 p-5 text-xs leading-relaxed text-ink-soft">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <ShieldQuestion className="size-4 text-brand" />
            演练小贴士
          </p>
          <p>· 可以像平时一样追问、拒绝，看看对方怎么应对。</p>
          <p>· 说出验证码、卡号，或者答应转账，就算上当。</p>
          <p>· 越早识破、理由越准，分数越高。</p>
        </div>
      </aside>
    </div>
  );
}
