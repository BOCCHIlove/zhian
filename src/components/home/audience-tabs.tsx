"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { GraduationCap, Briefcase, HeartHandshake, ShoppingBag, Quote } from "lucide-react";
import { AUDIENCES, SCAM_CASES, type Audience } from "@/data/scams";
import { DangerDots } from "@/components/danger-dots";

const ICONS: Record<Audience, typeof GraduationCap> = {
  student: GraduationCap,
  worker: Briefcase,
  elder: HeartHandshake,
  shopper: ShoppingBag,
};

export function AudienceTabs() {
  const [active, setActive] = useState<Audience>("student");
  const cases = SCAM_CASES.filter((c) => c.audiences.includes(active))
    .sort((a, b) => b.danger - a.danger)
    .slice(0, 3);

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-3">
        {AUDIENCES.map((a) => {
          const Icon = ICONS[a.id];
          const on = a.id === active;
          return (
            <button
              key={a.id}
              onClick={() => setActive(a.id)}
              className={`relative flex items-center gap-2 rounded-2xl px-5 py-3 text-left transition ${on ? "text-white" : "bg-white/70 text-ink hover:bg-white"}`}
            >
              {on && <motion.span layoutId="aud-pill" className="absolute inset-0 -z-10 rounded-2xl bg-brand shadow-glow" />}
              <Icon className="size-5" />
              <span>
                <span className="block font-medium">{a.label}</span>
                <span className={`block text-xs ${on ? "text-white/80" : "text-ink-soft"}`}>{a.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {cases.map((c, i) => (
            <motion.div
              key={`${active}-${c.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.08 } }}
              exit={{ opacity: 0, y: -10 }}
              className="card flex flex-col p-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{c.name}</h3>
                <DangerDots level={c.danger} />
              </div>
              <div className="mt-4 rounded-2xl bg-cream p-4 text-sm leading-relaxed text-ink-soft">
                <Quote className="mb-1 size-4 text-peach" />
                {c.scripts[0]}
              </div>
              <p className="mt-4 text-sm text-ink-soft">
                <span className="font-medium text-ink">识破它：</span>
                {c.howTo[0]}
              </p>
              <Link href={`/cases#${c.id}`} className="mt-auto pt-5 text-sm font-medium text-brand hover:underline">
                看完整套路 →
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
