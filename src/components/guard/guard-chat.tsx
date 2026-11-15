"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { FileUp, Undo2, Trash2, Send, Play, ShieldCheck, TriangleAlert, Sparkles } from "lucide-react";
import { checkDraft, highlight, type GuardAnalysis, type GuardMessage, type DraftCheck } from "@/lib/guard";
import { levelOf } from "@/lib/analyze";
import { LEVEL } from "@/components/detect/report-card";
import { GUARD_SAMPLES, type GuardSample } from "@/data/guard-samples";
import { ImportDialog } from "./import-dialog";

const CHECK_STYLE: Record<DraftCheck["level"], string> = {
  stop: "bg-danger-soft text-danger",
  caution: "bg-warn-soft text-warn",
  good: "bg-safe-soft text-safe",
};

export function GuardChat({
  messages,
  analysis: a,
  peer,
  busy,
  comment,
  role,
  draft,
  safeReply,
  sample,
  focusKey,
  onRole,
  onDraft,
  onAdd,
  onUndo,
  onReset,
  onPickSample,
  onSampleNext,
}: {
  messages: GuardMessage[];
  analysis: GuardAnalysis;
  peer: string;
  busy: boolean;
  comment: string;
  role: "them" | "me";
  draft: string;
  safeReply: string;
  sample?: { s: GuardSample; pos: number };
  /** 每次变化都把焦点移回输入框（例如从右侧面板选了一条建议） */
  focusKey: number;
  onRole: (r: "them" | "me") => void;
  onDraft: (t: string) => void;
  onAdd: (m: GuardMessage[]) => void;
  onUndo: () => void;
  onReset: () => void;
  onPickSample: (s: GuardSample) => void;
  onSampleNext: () => void;
}) {
  const [importing, setImporting] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const turnOf = useMemo(() => new Map(a.turns.map((t) => [t.index, t])), [a.turns]);
  const check = role === "me" ? checkDraft(draft, a) : undefined;
  const lastThem = a.turns.at(-1)?.index;
  const lv = LEVEL[levelOf(a.risk)];

  useEffect(() => {
    if (focusKey) inputRef.current?.focus();
  }, [focusKey]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, comment]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onAdd([{ role, text }]);
    onDraft("");
    // 记下对方的消息后，通常下一步是写自己的回复
    if (role === "them") onRole("me");
  };

  const remaining = sample ? sample.s.messages.length - sample.pos : 0;

  return (
    <>
      <div className="card flex h-[min(760px,calc(100vh-120px))] min-h-[560px] flex-col overflow-hidden p-0">
        {/* 顶栏 */}
        <div className="flex items-center gap-3 border-b border-ink/5 bg-white/90 px-4 py-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink/80 font-semibold text-white">{peer.slice(0, 1)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{peer}</p>
            <p className="flex items-center gap-1.5 text-xs text-ink-soft">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-safe opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-safe" />
              </span>
              念安护航中
              {a.turns.length > 0 && (
                <span className={`ml-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${lv.bg} ${lv.text}`}>
                  风险 {a.risk} · {lv.label}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setImporting(true)} className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-cream hover:text-brand" title="导入聊天记录或截图">
              <FileUp className="size-4.5" />
            </button>
            <button onClick={onUndo} disabled={!messages.length} className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-cream hover:text-brand disabled:opacity-30" title="撤销上一条">
              <Undo2 className="size-4.5" />
            </button>
            <button onClick={onReset} disabled={!messages.length} className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-cream hover:text-danger disabled:opacity-30" title="清空对话">
              <Trash2 className="size-4.5" />
            </button>
          </div>
        </div>

        {/* 消息列表 */}
        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-[#efeae2]/70 px-4 py-5">
          {!messages.length ? (
            <div className="flex min-h-full flex-col items-center justify-center text-center">
              <Image src="/nianan/nianan-happy.webp" alt="念安" width={709} height={1100} className="h-44 w-auto" />
              <p className="mt-3 font-display text-xl font-bold">正在和陌生人聊天？</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">把对方发来的话一条条贴到下面，我帮你实时盯着。也可以先看一段演示：</p>
              <div className="mt-5 grid w-full max-w-md grid-cols-2 gap-2">
                {GUARD_SAMPLES.map((s) => (
                  <button key={s.id} onClick={() => onPickSample(s)} className="rounded-2xl bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <Play className="size-3.5 text-brand" />
                      {s.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-soft">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((m, i) => {
                if (m.role === "them") {
                  const turn = turnOf.get(i);
                  const terms = turn?.tactics.flatMap((t) => t.terms) ?? [];
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
                      <div className="flex items-end gap-2">
                        <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 text-[15px] leading-relaxed shadow-sm">
                          {highlight(m.text, terms).map((seg, j) =>
                            seg.hit ? (
                              <mark key={j} className="rounded bg-danger-soft px-0.5 text-danger">
                                {seg.text}
                              </mark>
                            ) : (
                              <span key={j}>{seg.text}</span>
                            ),
                          )}
                        </p>
                        {turn && turn.delta > 0 && (
                          <span className={`mb-1 shrink-0 text-xs font-semibold tabular-nums ${LEVEL[levelOf(turn.risk)].text}`}>+{turn.delta}</span>
                        )}
                      </div>
                      {turn && turn.tactics.length > 0 && (
                        <div className="flex max-w-[85%] flex-wrap gap-1">
                          {turn.tactics.map((t) => (
                            <span key={t.kind} className="rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] text-danger" title={t.why}>
                              {t.label}
                            </span>
                          ))}
                        </div>
                      )}
                      {a.highAt === i && (
                        <div className="mx-auto flex max-w-[92%] items-start gap-2 rounded-2xl bg-danger px-3 py-2.5 text-sm text-white">
                          <Image src="/nianan/avatar.png" alt="念安" width={26} height={26} className="shrink-0 rounded-full" />
                          <span>风险升到高危了。先停一停，别再按对方说的做，拿不准就打 96110。</span>
                        </div>
                      )}
                      {/* 手机上把念安的点评直接放在最新消息下面 */}
                      {i === lastThem && (comment || busy) && (
                        <div className="flex items-start gap-2 rounded-2xl bg-peach-soft p-3 text-sm lg:hidden">
                          <Image src="/nianan/avatar.png" alt="念安" width={26} height={26} className="shrink-0 rounded-full" />
                          <span>
                            <span className="font-semibold text-peach">念安：</span>
                            {comment || "正在看这条消息…"}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                }
                const c = checkDraft(m.text, a);
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-end gap-1.5">
                    <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-[#95ec69] px-4 py-2.5 text-[15px] leading-relaxed shadow-sm">{m.text}</p>
                    {c && c.level !== "good" && (
                      <p className={`flex items-center gap-1 text-[11px] ${c.level === "stop" ? "text-danger" : "text-warn"}`}>
                        <TriangleAlert className="size-3" />
                        {c.label}
                        {c.level === "stop" && (
                          <Link href="/help" className="ml-1 underline">
                            已经发出去了？看看怎么补救
                          </Link>
                        )}
                      </p>
                    )}
                    {c?.level === "good" && (
                      <p className="flex items-center gap-1 text-[11px] text-safe">
                        <ShieldCheck className="size-3" />
                        回得好
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* 输入区 */}
        <div className="border-t border-ink/5 bg-white p-3">
          {sample && (
            <div className="mb-2 flex items-center gap-2 rounded-2xl bg-brand-soft/60 px-3 py-2 text-xs">
              <Sparkles className="size-3.5 shrink-0 text-brand" />
              <span className="flex-1 text-ink-soft">
                演示「{sample.s.label}」· {sample.pos}/{sample.s.messages.length}
              </span>
              {remaining > 0 ? (
                <button onClick={onSampleNext} className="chip bg-brand text-white hover:bg-brand-strong">
                  下一条（{sample.s.messages[sample.pos].role === "them" ? "对方" : "我"}）
                  <Play className="size-3" />
                </button>
              ) : (
                <span className="text-brand">演示结束</span>
              )}
            </div>
          )}

          <div className="mb-2 flex items-center gap-2">
            <div className="flex rounded-full bg-cream p-0.5 text-xs">
              {(["them", "me"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => onRole(r)}
                  className={`relative rounded-full px-3 py-1.5 transition ${role === r ? "text-white" : "text-ink-soft hover:text-ink"}`}
                >
                  {role === r && <motion.span layoutId="guard-role" className={`absolute inset-0 rounded-full ${r === "them" ? "bg-ink/80" : "bg-brand"}`} />}
                  <span className="relative">{r === "them" ? "对方发来的" : "我想回复的"}</span>
                </button>
              ))}
            </div>
            <span className="hidden truncate text-xs text-ink-soft sm:block">
              {role === "them" ? "粘贴对方的消息，念安会马上分析" : "发出去之前，先让念安帮你把把关"}
            </span>
          </div>

          <AnimatePresence>
            {check && (
              <motion.div
                key={check.label}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={`mb-2 flex items-start gap-2 rounded-2xl px-3 py-2.5 text-sm ${CHECK_STYLE[check.level]}`}>
                  {check.level === "stop" ? (
                    <Image src="/nianan/avatar.png" alt="念安" width={28} height={28} className="shrink-0 rounded-full" />
                  ) : check.level === "caution" ? (
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  ) : (
                    <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{check.level === "stop" ? `等一下！${check.label}` : check.label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed opacity-90">{check.why}</p>
                  </div>
                  {check.level !== "good" && (
                    <button
                      onClick={() => {
                        onDraft(safeReply);
                        inputRef.current?.focus();
                      }}
                      className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium hover:opacity-80">
                      换个安全说法
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => onDraft(e.target.value.slice(0, 1000))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={2}
              placeholder={role === "them" ? "把对方发来的消息粘贴到这里" : "写下你打算怎么回"}
              className="max-h-32 flex-1 resize-none rounded-2xl bg-cream px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-white transition disabled:opacity-40 ${
                check?.level === "stop" ? "bg-danger" : role === "them" ? "bg-ink/80" : "bg-brand"
              }`}
            >
              <Send className="size-4" />
              {role === "them" ? "添加" : check?.level === "stop" ? "已发出，仍记下" : "记下"}
            </button>
          </form>
        </div>

      </div>
      {/* 放在卡片外面：卡片的毛玻璃效果会让 fixed 定位只覆盖卡片本身 */}
      <ImportDialog open={importing} onClose={() => setImporting(false)} onImport={onAdd} />
    </>
  );
}
