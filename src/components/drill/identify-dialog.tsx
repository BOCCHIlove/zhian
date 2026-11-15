"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Siren, Check } from "lucide-react";
import type { DrillScenario } from "@/data/drills";

/** 「我识破了」弹窗：从混有干扰项的列表里选出危险信号 */
export function IdentifyDialog({ scenario, onCancel, onConfirm }: { scenario: DrillScenario; onCancel: () => void; onConfirm: (picked: string[]) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  // 打乱选项顺序，避免正确答案总在前面
  const options = useMemo(() => {
    const seed = scenario.id.length;
    return [...scenario.flags].sort((a, b) => ((a.text.charCodeAt(0) * seed) % 7) - ((b.text.charCodeAt(0) * seed) % 7));
  }, [scenario]);

  const toggle = (t: string) => setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="identify-title">
      <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-danger-soft text-danger">
            <Siren className="size-6" />
          </span>
          <div>
            <h2 id="identify-title" className="text-lg font-bold">你发现了哪些危险信号？</h2>
            <p className="text-xs text-ink-soft">可以多选。注意，有些选项其实不是危险信号哦。</p>
          </div>
        </div>
        <ul className="mt-5 space-y-2">
          {options.map((f) => {
            const on = picked.includes(f.text);
            return (
              <li key={f.text}>
                <button
                  onClick={() => toggle(f.text)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm transition ${
                    on ? "border-brand bg-brand-soft/50" : "border-ink/5 hover:border-brand/30"
                  }`}
                >
                  <span className={`grid size-5 shrink-0 place-items-center rounded-md border-2 ${on ? "border-brand bg-brand text-white" : "border-ink/20"}`}>
                    {on && <Check className="size-3.5" />}
                  </span>
                  {f.text}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="btn-ghost px-5 py-2.5 text-sm">
            再聊聊看
          </button>
          <button onClick={() => onConfirm(picked)} disabled={!picked.length} className="btn-primary px-5 py-2.5 text-sm">
            确认识破
          </button>
        </div>
      </motion.div>
    </div>
  );
}
