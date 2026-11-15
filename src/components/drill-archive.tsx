"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { Swords, Trash2, TrendingUp } from "lucide-react";
import { clearDrills, getDrillsSnapshot, subscribeRecords, type DrillRecord } from "@/lib/history";
import { Radar } from "@/components/drill/radar";

const OUTCOME = { caught: "识破", trapped: "上当", timeout: "未识破" } as const;

/** 档案页：演练成绩、最近一次的防骗力雷达图、得分趋势 */
export function DrillArchive() {
  const raw = useSyncExternalStore(subscribeRecords, getDrillsSnapshot, () => null);
  const drills = useMemo<DrillRecord[]>(() => {
    try {
      return JSON.parse(raw ?? "[]");
    } catch {
      return [];
    }
  }, [raw]);

  if (!drills.length) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center sm:flex-row sm:text-left">
        <span className="grid size-12 place-items-center rounded-2xl bg-peach-soft text-peach">
          <Swords className="size-6" />
        </span>
        <p className="flex-1 text-sm text-ink-soft">还没有演练成绩。去演练场和 AI 骗子过过招，测一测你的防骗力。</p>
        <Link href="/drill" className="btn-primary px-5 py-2.5 text-sm">去演练场</Link>
      </div>
    );
  }

  const latest = drills[0];
  const best = Math.max(...drills.map((d) => d.score));
  const trend = drills.slice(0, 10).reverse();

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="card flex flex-col items-center p-6">
        <p className="self-start text-sm font-semibold">最近一次防骗力</p>
        <Radar dims={latest.dims} size={260} />
        <p className="text-sm text-ink-soft">
          {latest.scenario} · <span className="font-semibold text-brand">{latest.score} 分</span> · {latest.title}
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs text-ink-soft">演练次数</p>
            <p className="mt-1 text-2xl font-bold text-brand">{drills.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-ink-soft">最高分</p>
            <p className="mt-1 text-2xl font-bold text-brand">{best}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-ink-soft">识破率</p>
            <p className="mt-1 text-2xl font-bold text-brand">{Math.round((drills.filter((d) => d.outcome === "caught").length / drills.length) * 100)}%</p>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <TrendingUp className="size-4 text-brand" />
              最近 {trend.length} 次得分
            </p>
            <button onClick={() => confirm("确定清空所有演练成绩吗？清空后无法恢复。") && clearDrills()} className="chip text-ink-soft hover:text-danger">
              <Trash2 className="size-3.5" />
              清空
            </button>
          </div>
          <div className="mt-4 flex h-32 items-end gap-2">
            {trend.map((d) => (
              <div key={d.id} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.scenario} · ${d.score} 分 · ${OUTCOME[d.outcome]}`}>
                <span className="text-[11px] tabular-nums text-ink-soft opacity-0 transition group-hover:opacity-100">{d.score}</span>
                <span
                  className={`w-full max-w-10 rounded-t-lg ${d.outcome === "caught" ? "bg-brand" : d.outcome === "trapped" ? "bg-danger/70" : "bg-warn/70"}`}
                  style={{ height: `${Math.max(6, d.score)}%` }}
                />
              </div>
            ))}
          </div>
          <p className="mt-3 flex gap-4 text-xs text-ink-soft">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-brand" />识破</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-danger/70" />上当</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-warn/70" />未识破</span>
          </p>
        </div>
      </div>
    </div>
  );
}
