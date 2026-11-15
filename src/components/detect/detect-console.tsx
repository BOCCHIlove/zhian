"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { RotateCcw, FlaskConical, Sparkles } from "lucide-react";
import { useDetect } from "@/lib/use-detect";
import { InputPanel } from "./input-panel";
import { Timeline } from "./timeline";
import { ReportCard } from "./report-card";

function NiananBubble({ text, typing, happy }: { text: string; typing: boolean; happy: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <Image
        src={happy ? "/nianan/avatar-happy.png" : "/nianan/avatar.png"}
        alt="念安"
        width={44}
        height={44}
        className={`shrink-0 rounded-full ring-2 ${typing ? "ring-brand animate-pulse" : "ring-brand/30"}`}
      />
      <div className="card rounded-2xl rounded-tl-sm px-4 py-3 text-[15px] leading-relaxed">
        {text}
        {typing && <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-blink bg-brand" />}
      </div>
    </div>
  );
}

export function DetectConsole() {
  const { status, mode, steps, text, report, error, run, reset } = useDetect();
  const busy = status === "running";
  const resultRef = useRef<HTMLDivElement>(null);

  // 手机等单栏布局下，提交后自动滚动到结果区
  const submit: typeof run = (req) => {
    if (window.innerWidth < 1024) setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    return run(req);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <InputPanel busy={busy} onSubmit={submit} />
      </div>

      <div ref={resultRef} className="min-h-[560px] scroll-mt-20 space-y-5">
        <AnimatePresence mode="wait">
          {status === "idle" ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="card relative flex h-full min-h-[560px] flex-col items-center justify-end overflow-hidden px-6 pt-10 text-center"
            >
              <div className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-brand-soft/60 to-transparent" />
              <div className="relative">
                <p className="font-display text-2xl font-bold">把拿不准的内容交给我吧</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
                  我会先翻翻骗局知识库，再检查里面的链接和电话，最后告诉你哪句话有问题、接下来该怎么做。每一步我都会摆在这里给你看。
                </p>
              </div>
              <Image src="/nianan/nianan.webp" alt="念安" width={641} height={1100} className="relative mt-6 h-[380px] w-auto" />
            </motion.div>
          ) : (
            <motion.div key="work" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Sparkles className="size-5 text-peach" />
                  {busy ? "念安正在帮你查…" : status === "error" ? "这次没能查完" : "检测完成"}
                </h2>
                <div className="flex items-center gap-2">
                  {mode === "demo" && (
                    <span className="chip bg-warn-soft text-warn" title="未配置大模型 API Key，使用规则引擎检测">
                      <FlaskConical className="size-3.5" />
                      演示模式
                    </span>
                  )}
                  {!busy && (
                    <button onClick={reset} className="chip bg-white text-ink-soft hover:text-brand">
                      <RotateCcw className="size-3.5" />
                      重新开始
                    </button>
                  )}
                </div>
              </div>

              {(busy || steps.length > 0) && (
                <div className="card p-5">
                  <p className="mb-4 text-xs font-semibold tracking-widest text-ink-soft">念安的检查过程</p>
                  {steps.length ? (
                    <Timeline steps={steps} />
                  ) : (
                    <div className="space-y-3">
                      <div className="skeleton h-14" />
                      <div className="skeleton h-14 w-4/5" />
                    </div>
                  )}
                </div>
              )}

              {report && <ReportCard report={report} />}

              {(text || (busy && report)) && <NiananBubble text={text} typing={busy} happy={report?.riskLevel === "low"} />}

              {error && (
                <div className="rounded-2xl border border-danger/20 bg-danger-soft p-4 text-sm text-danger">{error}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
