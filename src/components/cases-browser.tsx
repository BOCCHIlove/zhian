"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search, MessageSquareWarning, Siren, ShieldCheck } from "lucide-react";
import { AUDIENCES, SCAM_CASES, type Audience } from "@/data/scams";
import { DangerDots } from "@/components/danger-dots";

export function CasesBrowser() {
  const [aud, setAud] = useState<Audience | "all">("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const kw = q.trim();
    return SCAM_CASES.filter((c) => aud === "all" || c.audiences.includes(aud)).filter(
      (c) => !kw || [c.name, c.summary, ...c.scripts, ...c.keywords].some((t) => t.includes(kw)),
    );
  }, [aud, q]);

  return (
    <div>
      <div className="card flex flex-col gap-4 p-4 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-full bg-cream px-4 py-2.5">
          <Search className="size-4 text-ink-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索骗局名称、话术或关键词，例如「验证码」"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink-soft/60"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[{ id: "all" as const, label: "全部" }, ...AUDIENCES].map((a) => (
            <button
              key={a.id}
              onClick={() => setAud(a.id)}
              className={`rounded-full px-4 py-2 text-sm transition ${aud === a.id ? "bg-brand text-white" : "bg-white text-ink-soft hover:text-ink"}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm text-ink-soft">共 {list.length} 类骗局</p>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        {list.map((c, i) => (
          <motion.article
            key={c.id}
            id={c.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: (i % 2) * 0.06 }}
            className="card scroll-mt-24 p-6 target:ring-2 target:ring-brand"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{c.name}</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.audiences.map((a) => (
                    <span key={a} className="chip bg-cream text-ink-soft">
                      {AUDIENCES.find((x) => x.id === a)?.label}
                    </span>
                  ))}
                </div>
              </div>
              <DangerDots level={c.danger} />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">{c.summary}</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-danger">
                  <MessageSquareWarning className="size-4" />
                  骗子常说
                </p>
                <ul className="mt-2 space-y-1.5">
                  {c.scripts.slice(0, 3).map((s) => (
                    <li key={s} className="rounded-xl bg-danger-soft/60 px-3 py-2 text-xs leading-relaxed">
                      “{s}”
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-warn">
                  <Siren className="size-4" />
                  危险信号
                </p>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink-soft">
                  {c.redFlags.map((s) => (
                    <li key={s} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warn" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-safe-soft/70 p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-safe">
                <ShieldCheck className="size-4" />
                念安教你
              </p>
              <ul className="mt-2 space-y-1 text-sm leading-relaxed">
                {c.howTo.map((s) => (
                  <li key={s}>· {s}</li>
                ))}
              </ul>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
