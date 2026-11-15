"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { RotateCcw, Users, BookOpenText, CheckCircle2, XCircle, CircleDashed, ThumbsUp, TriangleAlert } from "lucide-react";
import { Radar } from "./radar";
import { annotateScammer, detectTrap, replyTag, type DrillMessage, type DrillResult as Result } from "@/lib/drill";
import type { DrillScenario } from "@/data/drills";

const OUTCOME = {
  caught: { text: "成功识破", cls: "bg-safe-soft text-safe" },
  trapped: { text: "不小心上当了", cls: "bg-danger-soft text-danger" },
  timeout: { text: "没能识破", cls: "bg-warn-soft text-warn" },
};

export function DrillResult({
  scenario,
  messages,
  result,
  review,
  onAgain,
  onChange,
}: {
  scenario: DrillScenario;
  messages: DrillMessage[];
  result: Result;
  review: string;
  onAgain: () => void;
  onChange: () => void;
}) {
  const o = OUTCOME[result.outcome];
  const missed = scenario.flags.filter((f) => f.correct && !result.picked.some((p) => p.text === f.text));

  return (
    <div className="space-y-6">
      {/* 成绩 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card grid items-center gap-6 overflow-hidden p-6 md:grid-cols-[1fr_auto_1fr] md:p-8">
        <div className="text-center md:text-left">
          <span className={`chip ${o.cls}`}>{o.text}</span>
          <p className="mt-3 text-sm text-ink-soft">你的防骗力得分</p>
          <p className="font-display text-7xl font-bold text-brand">
            {result.score}
          </p>
          <p className="mt-1 text-xl font-semibold">{result.title}</p>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            这一局是 <strong className="text-ink">「{scenario.title}」</strong>。你一共回复了 {result.rounds} 次
            {result.hintsUsed ? `，用了 ${result.hintsUsed} 次提示` : ""}。
          </p>
        </div>
        <div className="flex justify-center">
          <Radar dims={result.dims} />
        </div>
        <ul className="space-y-3">
          {result.dims.map((d) => (
            <li key={d.key}>
              <div className="flex justify-between text-sm">
                <span>{d.label}</span>
                <span className="tabular-nums text-ink-soft">{d.value}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/5">
                <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${d.value}%` }} transition={{ duration: 0.9 }} />
              </div>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* 念安点评 */}
      <div className="flex items-start gap-3">
        <Image src={result.score >= 70 ? "/nianan/avatar-happy.png" : "/nianan/avatar.png"} alt="念安" width={52} height={52} className="shrink-0 rounded-full ring-2 ring-brand/30" />
        <div className="card rounded-2xl rounded-tl-sm px-5 py-4 leading-relaxed">{review}</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* 逐句复盘 */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold">逐句复盘</h2>
          <p className="mt-1 text-xs text-ink-soft">红色标注是骗子用到的套路，绿色是你做得好的回应。</p>
          <ol className="mt-5 space-y-3">
            {messages.map((m, i) => {
              if (m.role === "nianan") return null;
              if (m.role === "scammer") {
                const notes = annotateScammer(m.text, scenario);
                return (
                  <li key={i} className="rounded-2xl bg-cream p-3.5">
                    <p className="text-xs font-semibold text-ink-soft">{scenario.persona.name}</p>
                    <p className="mt-1 text-sm leading-relaxed">{m.text}</p>
                    {notes.map((n, j) => (
                      <p key={j} className="mt-2 flex gap-1.5 text-xs leading-relaxed text-danger">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                        {n}
                      </p>
                    ))}
                  </li>
                );
              }
              const tag = replyTag(m.text);
              return (
                <li key={i} className="ml-8 rounded-2xl bg-white p-3.5 ring-1 ring-ink/5">
                  <p className="text-xs font-semibold text-ink-soft">你</p>
                  <p className="mt-1 text-sm">{m.text}</p>
                  {tag === "good" && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-safe">
                      <ThumbsUp className="size-3.5" />
                      很好，追问、拒绝或核实都是对的
                    </p>
                  )}
                  {tag === "trap" && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-danger">
                      <XCircle className="size-3.5" />
                      这一步上当了：{detectTrap(m.text)?.label}
                    </p>
                  )}
                  {tag === "risky" && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-warn">
                      <TriangleAlert className="size-3.5" />
                      这样回应容易让对方得寸进尺
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* 危险信号对照 */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold">危险信号对照</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {result.picked.map((p) => (
                <li key={p.text} className="flex items-start gap-2">
                  {p.correct ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-safe" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-danger" />}
                  <span>
                    {p.text}
                    {!p.correct && <span className="block text-xs text-ink-soft">这一条其实不能说明是骗局</span>}
                  </span>
                </li>
              ))}
              {missed.map((f) => (
                <li key={f.text} className="flex items-start gap-2 text-ink-soft">
                  <CircleDashed className="mt-0.5 size-4 shrink-0 text-warn" />
                  <span>
                    {f.text}
                    <span className="block text-xs">你没有选出这一条</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-3">
            <button onClick={onAgain} className="btn-primary">
              <RotateCcw className="size-4" />
              同一身份再来一局
            </button>
            <button onClick={onChange} className="btn-ghost">
              <Users className="size-4" />
              换个身份
            </button>
            <Link href={`/cases#${scenario.caseId}`} className="btn-ghost">
              <BookOpenText className="size-4" />
              在图鉴里看「{scenario.title}」
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
