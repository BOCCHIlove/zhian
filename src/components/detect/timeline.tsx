"use client";

import { motion, AnimatePresence } from "motion/react";
import { ScanText, DatabaseZap, Link2, Phone, FileCheck2, Loader2, Check, X } from "lucide-react";
import type { Step } from "@/lib/use-detect";
import type { Flag, ScamMatch } from "@/lib/analyze";
import type { StepTool } from "@/lib/events";

const ICONS: Record<StepTool, typeof ScanText> = {
  read_image: ScanText,
  search_scam_knowledge: DatabaseZap,
  analyze_url: Link2,
  analyze_phone: Phone,
  submit_report: FileCheck2,
};

const FLAG_STYLE: Record<Flag["level"], string> = {
  high: "bg-danger-soft text-danger",
  medium: "bg-warn-soft text-warn",
  info: "bg-cream text-ink-soft",
  good: "bg-safe-soft text-safe",
};

function StepExtra({ step }: { step: Step }) {
  if (step.status !== "done" || !step.data) return null;
  if (step.tool === "search_scam_knowledge") {
    const matches = step.data as ScamMatch[];
    if (!matches.length) return null;
    return (
      <div className="mt-2 space-y-1.5">
        {matches.map((m) => (
          <div key={m.id} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 truncate text-ink">{m.name}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/5">
              <motion.span
                className="block h-full rounded-full bg-brand"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(m.score * 100)}%` }}
                transition={{ duration: 0.8 }}
              />
            </span>
            <span className="w-9 text-right tabular-nums text-ink-soft">{Math.round(m.score * 100)}%</span>
          </div>
        ))}
      </div>
    );
  }
  if (step.tool === "analyze_url" || step.tool === "analyze_phone") {
    const flags = (step.data as { flags: Flag[] }).flags ?? [];
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {flags.map((f, i) => (
          <span key={i} className={`rounded-lg px-2 py-1 text-[11px] leading-snug ${FLAG_STYLE[f.level]}`}>
            {f.text}
          </span>
        ))}
      </div>
    );
  }
  return null;
}

export function Timeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="relative space-y-3 before:absolute before:bottom-3 before:left-[19px] before:top-3 before:w-px before:bg-ink/10">
      <AnimatePresence initial={false}>
        {steps.map((s) => {
          const Icon = ICONS[s.tool] ?? FileCheck2;
          return (
            <motion.li
              key={s.id}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative flex gap-3"
            >
              <span
                className={`relative z-10 grid size-10 shrink-0 place-items-center rounded-xl ${
                  s.status === "error" ? "bg-danger-soft text-danger" : s.status === "done" ? "bg-brand text-white" : "bg-brand-soft text-brand"
                }`}
              >
                <Icon className="size-5" />
                {s.status === "running" && <span className="absolute inset-0 animate-ping rounded-xl bg-brand/20" />}
              </span>
              <div className="min-w-0 flex-1 rounded-2xl bg-white/70 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{s.title}</p>
                  {s.status === "running" && <Loader2 className="size-4 shrink-0 animate-spin text-brand" />}
                  {s.status === "done" && <Check className="size-4 shrink-0 text-safe" />}
                  {s.status === "error" && <X className="size-4 shrink-0 text-danger" />}
                </div>
                {s.detail && <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{s.detail}</p>}
                <StepExtra step={s} />
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
