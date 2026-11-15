"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  BookOpenText,
  Check,
  CheckCheck,
  Copy,
  CornerDownLeft,
  FlaskConical,
  Footprints,
  LifeBuoy,
  Loader2,
  MessageSquareReply,
  PhoneCall,
  ShieldCheck,
  Siren,
  X,
} from "lucide-react";
import { levelOf } from "@/lib/analyze";
import { buildSummary, STAGES, type GuardAdvice, type GuardAnalysis, type GuardMessage } from "@/lib/guard";
import type { GuardStep } from "@/lib/use-guard";
import { LEVEL } from "@/components/detect/report-card";
import { RiskCurve } from "./risk-curve";

const TONE: Record<string, string> = {
  追问: "bg-brand-soft text-brand",
  核实: "bg-safe-soft text-safe",
  拒绝: "bg-peach-soft text-peach",
  结束: "bg-danger-soft text-danger",
  正常回复: "bg-cream text-ink-soft",
};

function useCopy() {
  const [copied, setCopied] = useState<string>();
  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? undefined : c)), 1600);
  };
  return { copied, copy };
}

export function GuardPanel({
  messages,
  analysis: a,
  advice,
  status,
  mode,
  steps,
  text,
  error,
  onUse,
}: {
  messages: GuardMessage[];
  analysis: GuardAnalysis;
  advice?: GuardAdvice;
  status: "idle" | "running" | "done" | "error";
  mode?: "live" | "demo";
  steps: GuardStep[];
  text: string;
  error?: string;
  onUse: (text: string) => void;
}) {
  const { copied, copy } = useCopy();
  const busy = status === "running";

  if (!a.turns.length) {
    return (
      <div className="card relative overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-soft/70 to-transparent" />
        <div className="relative flex items-center gap-3">
          <Image src="/nianan/avatar-happy.png" alt="念安" width={56} height={56} className="rounded-full ring-2 ring-brand/30" />
          <div>
            <p className="font-semibold">我在旁边帮你盯着</p>
            <p className="text-xs text-ink-soft">对方每发来一条，我就看一眼</p>
          </div>
        </div>
        <ul className="relative mt-6 space-y-3 text-sm">
          {[
            [Activity, "风险曲线", "每来一条消息，风险实时更新"],
            [Footprints, "骗局走到哪一步", "接近、诱饵、施压、要钱，四步看清"],
            [MessageSquareReply, "下一句怎么回", "给你能直接复制的安全回复"],
            [ShieldCheck, "发送前把关", "要发验证码、答应转账，我会先拦下"],
          ].map(([Icon, title, desc]) => {
            const I = Icon as typeof Activity;
            return (
              <li key={title as string} className="flex gap-3 rounded-2xl bg-white/80 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                  <I className="size-4.5" />
                </span>
                <span>
                  <span className="block font-medium">{title as string}</span>
                  <span className="text-xs text-ink-soft">{desc as string}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const risk = advice?.risk ?? a.risk;
  const lv = LEVEL[levelOf(risk)];
  const stage = advice ? advice.stage : a.stage;
  const points = a.curve.map((c) => c.risk);
  if (advice && points.length) points[points.length - 1] = advice.risk;
  const scamType = advice?.scamType ?? a.scamType;
  const suggestions = advice?.suggestions;
  const nextMove = advice?.nextMove ?? a.nextMove;

  return (
    <div className="space-y-4">
      {/* 高危提醒 */}
      <AnimatePresence>
        {levelOf(risk) === "high" && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-3xl bg-danger p-5 text-white shadow-soft">
            <p className="flex items-center gap-2 text-lg font-bold">
              <Siren className="size-5" />
              建议现在就停止聊天
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-white/90">别转账、别给验证码、别下载对方发来的软件。如果已经转了钱，马上打 110，越快越有机会追回。</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <a href="tel:96110" className="flex items-center justify-center gap-1.5 rounded-full bg-white py-2 font-semibold text-danger">
                <PhoneCall className="size-4" />
                96110
              </a>
              <button onClick={() => copy("summary", buildSummary(messages, a, advice))} className="flex items-center justify-center gap-1.5 rounded-full bg-white/15 py-2 hover:bg-white/25">
                {copied === "summary" ? <CheckCheck className="size-4" /> : <Copy className="size-4" />}
                {copied === "summary" ? "已复制" : "求助摘要"}
              </button>
              <Link href="/help" className="flex items-center justify-center gap-1.5 rounded-full bg-white/15 py-2 hover:bg-white/25">
                <LifeBuoy className="size-4" />
                怎么办
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 风险 + 阶段 */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-ink-soft">当前风险 · 对方第 {a.turns.length} 条消息后</p>
            <p className="mt-1 flex items-baseline gap-2">
              <motion.span key={risk} initial={{ scale: 1.25 }} animate={{ scale: 1 }} className="font-display text-5xl font-bold tabular-nums" style={{ color: lv.color }}>
                {risk}
              </motion.span>
              <span className={`chip ${lv.bg} ${lv.text}`}>
                <lv.icon className="size-3.5" />
                {lv.label}
              </span>
            </p>
            <p className="mt-1 text-sm font-medium">{scamType}</p>
          </div>
          {mode === "demo" && (
            <span className="chip shrink-0 bg-warn-soft text-warn" title="未配置大模型 API Key，由规则引擎研判">
              <FlaskConical className="size-3.5" />
              演示模式
            </span>
          )}
        </div>
        {advice?.aiRisk !== undefined && (
          <p className="mt-1 text-[11px] text-ink-soft">
            规则引擎 {advice.ruleRisk} · 大模型 {advice.aiRisk}，取更谨慎的结果
          </p>
        )}
        <div className="mt-3">
          <RiskCurve points={points} />
        </div>

        <div className="mt-4 border-t border-ink/5 pt-4">
          <p className="text-xs text-ink-soft">骗局走到了哪一步</p>
          <ol className="mt-2 grid grid-cols-4 gap-1.5">
            {STAGES.map((s, i) => {
              const on = i <= stage;
              const now = i === stage;
              return (
                <li key={s.label} className="text-center">
                  <motion.div
                    className={`h-1.5 rounded-full ${on ? (i >= 2 ? "bg-danger" : "bg-warn") : "bg-ink/10"}`}
                    initial={false}
                    animate={{ opacity: on ? 1 : 0.6 }}
                  />
                  <p className={`mt-1.5 text-[11px] leading-tight ${now ? "font-semibold text-ink" : on ? "text-ink-soft" : "text-ink-soft/60"}`}>{s.label}</p>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            {stage >= 0 ? `对方正在${STAGES[stage].desc}。` : "暂时没发现骗局的套路。"}
          </p>
          {a.tactics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {a.tactics.map((t) => (
                <span key={t.kind} className="rounded-lg bg-danger-soft px-2 py-1 text-[11px] text-danger">
                  {t.label}
                  {t.count > 1 && <span className="ml-0.5 opacity-70">×{t.count}</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 念安点评 */}
      <div className="card p-5">
        <div className="flex items-center gap-3">
          <Image
            src={levelOf(risk) === "low" ? "/nianan/avatar-happy.png" : "/nianan/avatar.png"}
            alt="念安"
            width={40}
            height={40}
            className={`rounded-full ring-2 ${busy ? "animate-pulse ring-brand" : "ring-brand/30"}`}
          />
          <p className="font-semibold">念安说</p>
        </div>
        {steps.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {steps.map((s) => (
              <span key={s.id} className="chip bg-cream text-[11px] text-ink-soft" title={s.detail}>
                {s.status === "running" ? (
                  <Loader2 className="size-3 animate-spin text-brand" />
                ) : s.status === "done" ? (
                  <Check className="size-3 text-safe" />
                ) : (
                  <X className="size-3 text-danger" />
                )}
                {s.label}
                {s.status === "done" && s.detail && <span className="max-w-40 truncate text-ink-soft/70">· {s.detail}</span>}
              </span>
            ))}
          </div>
        )}
        <p className="mt-3 min-h-12 text-[15px] leading-relaxed">
          {text || (busy ? <span className="text-ink-soft">正在看这条消息…</span> : null)}
          {busy && text && <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-blink bg-brand" />}
        </p>
        {error && <p className="mt-2 rounded-xl bg-danger-soft p-3 text-xs text-danger">{error}</p>}
      </div>

      {/* 下一步预测 */}
      {nextMove && (
        <div className="card border-l-4 border-l-peach p-5">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Footprints className="size-4 text-peach" />
            提前防一手
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{nextMove}</p>
        </div>
      )}

      {/* 回复建议 */}
      <div className="card p-5">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <MessageSquareReply className="size-4 text-brand" />
          下一句可以这样回
        </p>
        {!suggestions ? (
          <div className="mt-3 space-y-2">
            <div className="skeleton h-12" />
            <div className="skeleton h-12 w-5/6" />
          </div>
        ) : suggestions.length ? (
          <ul className="mt-3 space-y-2">
            {suggestions.map((s, i) => (
              <li key={i} className="group rounded-2xl bg-cream/70 p-3">
                <div className="flex items-start gap-2">
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${TONE[s.tone] ?? TONE.正常回复}`}>{s.tone}</span>
                  <p className="flex-1 text-sm leading-relaxed">{s.text}</p>
                </div>
                <div className="mt-2 flex justify-end gap-1.5">
                  <button onClick={() => onUse(s.text)} className="chip bg-white text-[11px] text-ink-soft hover:text-brand">
                    <CornerDownLeft className="size-3" />
                    用这句
                  </button>
                  <button onClick={() => copy(`s${i}`, s.text)} className="chip bg-white text-[11px] text-ink-soft hover:text-brand">
                    {copied === `s${i}` ? <CheckCheck className="size-3" /> : <Copy className="size-3" />}
                    {copied === `s${i}` ? "已复制" : "复制"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">现在不需要特别的回法，正常聊就好。</p>
        )}
      </div>

      {/* 核实方式 */}
      <div className="card p-5">
        <p className="text-sm font-semibold">怎么核实</p>
        <ol className="mt-2 space-y-1.5 text-sm text-ink-soft">
          {a.verify.map((v, i) => (
            <li key={i} className="flex gap-2">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">{i + 1}</span>
              {v}
            </li>
          ))}
        </ol>
        {a.caseId && (
          <Link href={`/cases#${a.caseId}`} className="mt-3 inline-flex items-center gap-1 text-xs text-brand hover:underline">
            <BookOpenText className="size-3.5" />
            在图鉴里看看「{a.scamType}」
          </Link>
        )}
      </div>
    </div>
  );
}
