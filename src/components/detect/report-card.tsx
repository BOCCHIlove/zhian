"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { AlertTriangle, ShieldCheck, ShieldAlert, Copy, CheckCheck, BookOpenText, LifeBuoy, Cpu } from "lucide-react";
import type { Report, RiskLevel } from "@/lib/analyze";

export const LEVEL = {
  high: { label: "高危", color: "#e0524f", text: "text-danger", bg: "bg-danger-soft", icon: ShieldAlert },
  medium: { label: "可疑", color: "#e59a2c", text: "text-warn", bg: "bg-warn-soft", icon: AlertTriangle },
  low: { label: "较安全", color: "#2f9e6e", text: "text-safe", bg: "bg-safe-soft", icon: ShieldCheck },
} satisfies Record<RiskLevel, unknown>;

/** 半圆仪表盘 */
function Gauge({ score, color }: { score: number; color: string }) {
  const r = 70;
  const len = Math.PI * r;
  return (
    <svg viewBox="0 0 180 104" className="w-44" role="img" aria-label={`风险评分 ${score}`}>
      <path d="M20 94 A70 70 0 0 1 160 94" fill="none" stroke="#efe7dc" strokeWidth="14" strokeLinecap="round" />
      <motion.path
        d="M20 94 A70 70 0 0 1 160 94"
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={len}
        initial={{ strokeDashoffset: len }}
        animate={{ strokeDashoffset: len * (1 - score / 100) }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      />
      <text x="90" y="82" textAnchor="middle" fontSize="38" fontWeight="700" fill={color}>
        {score}
      </text>
      <text x="90" y="100" textAnchor="middle" fontSize="11" fill="#52646a">
        风险评分
      </text>
    </svg>
  );
}

export function ReportCard({ report }: { report: Report }) {
  const lv = LEVEL[report.riskLevel];
  const [copied, setCopied] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
      <div className={`flex flex-col items-center gap-4 p-6 sm:flex-row ${lv.bg}`}>
        <Gauge score={report.riskScore} color={lv.color} />
        <div className="text-center sm:text-left">
          <span className={`chip bg-white ${lv.text}`}>
            <lv.icon className="size-3.5" />
            {lv.label}
          </span>
          <h3 className="mt-2 text-2xl font-bold">{report.scamType}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{report.summary}</p>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {report.evidence.length > 0 && (
          <section>
            <h4 className="text-sm font-semibold">念安发现的可疑之处</h4>
            <ul className="mt-3 space-y-2.5">
              {report.evidence.map((e, i) => (
                <li key={i} className="rounded-2xl border border-ink/5 bg-white p-3.5">
                  <p className="text-sm">
                    <mark className="rounded bg-peach-soft px-1 text-ink">“{e.quote}”</mark>
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{e.reason}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h4 className="text-sm font-semibold">现在该怎么做</h4>
          <ol className="mt-3 space-y-2">
            {report.advice.map((a, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{i + 1}</span>
                {a}
              </li>
            ))}
          </ol>
        </section>

        {report.reply && (
          <section>
            <h4 className="text-sm font-semibold">可以这样回复对方</h4>
            <div className="mt-3 flex items-start gap-3 rounded-2xl bg-brand-soft/60 p-4">
              <p className="flex-1 text-sm leading-relaxed">{report.reply}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(report.reply ?? "");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1 text-xs text-brand"
              >
                {copied ? <CheckCheck className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "已复制" : "复制"}
              </button>
            </div>
          </section>
        )}

        {report.matchedCases.length > 0 && (
          <section>
            <h4 className="text-sm font-semibold">知识库里的相似骗局</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {report.matchedCases.map((c) => (
                <Link key={c.id} href={`/cases#${c.id}`} className="chip bg-cream text-ink-soft transition hover:bg-brand-soft hover:text-brand">
                  <BookOpenText className="size-3.5" />
                  {c.name} · {Math.round(c.score * 100)}%
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/5 pt-4">
          <span className="flex items-center gap-1.5 text-xs text-ink-soft">
            <Cpu className="size-3.5" />
            {report.source === "ai" ? "大模型分析 · 规则引擎交叉校验" : "规则引擎分析"}
          </span>
          {report.riskLevel !== "low" && (
            <Link href="/help" className="inline-flex items-center gap-1.5 rounded-full bg-danger px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
              <LifeBuoy className="size-4" />
              已经转账了？立即求助
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}
