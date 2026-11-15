"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, ImageIcon } from "lucide-react";
import { clearRecords, getRecordsSnapshot, subscribeRecords, type DetectRecord } from "@/lib/history";
import { LEVEL } from "@/components/detect/report-card";

export function ArchiveView() {
  const raw = useSyncExternalStore(subscribeRecords, getRecordsSnapshot, () => null);
  const records = useMemo<DetectRecord[]>(() => {
    try {
      return JSON.parse(raw ?? "[]");
    } catch {
      return [];
    }
  }, [raw]);

  const counts = {
    high: records.filter((r) => r.report.riskLevel === "high").length,
    medium: records.filter((r) => r.report.riskLevel === "medium").length,
    low: records.filter((r) => r.report.riskLevel === "low").length,
  };

  if (!records.length) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center sm:flex-row sm:text-left">
        <Image src="/nianan/avatar-happy.png" alt="念安" width={48} height={48} className="rounded-full" />
        <p className="flex-1 text-sm text-ink-soft">还没有检测记录。在检测台完成检测后，记录会保存在这里。</p>
        <Link href="/detect" className="btn-primary px-5 py-2.5 text-sm">去检测一条</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card p-5">
          <p className="text-sm text-ink-soft">累计检测</p>
          <p className="mt-1 text-3xl font-bold text-brand">{records.length}</p>
        </div>
        {(["high", "medium", "low"] as const).map((k) => (
          <div key={k} className="card p-5">
            <p className="text-sm text-ink-soft">{LEVEL[k].label}</p>
            <p className={`mt-1 text-3xl font-bold ${LEVEL[k].text}`}>{counts[k]}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-soft">最近 {records.length} 条</p>
        <button
          onClick={() => confirm("确定清空所有检测记录吗？清空后无法恢复。") && clearRecords()}
          className="chip bg-white text-ink-soft hover:text-danger"
        >
          <Trash2 className="size-3.5" />
          清空记录
        </button>
      </div>

      <ul className="space-y-3">
        {records.map((r) => {
          const lv = LEVEL[r.report.riskLevel];
          return (
            <li key={r.id} className="card flex items-center gap-4 p-4">
              <span className={`grid size-14 shrink-0 place-items-center rounded-2xl text-xl font-bold ${lv.bg} ${lv.text}`}>{r.report.riskScore}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.report.scamType}</span>
                  <span className={`chip ${lv.bg} ${lv.text}`}>{lv.label}</span>
                  {r.hasImage && (
                    <span className="chip bg-cream text-ink-soft">
                      <ImageIcon className="size-3" />
                      含截图
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-ink-soft">{r.input}</p>
              </div>
              <time className="hidden shrink-0 text-xs text-ink-soft sm:block">{new Date(r.time).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
