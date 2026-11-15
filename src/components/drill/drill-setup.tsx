"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { GraduationCap, Briefcase, HeartHandshake, ShoppingBag, Swords, MessagesSquare, Siren, Trophy } from "lucide-react";
import { AUDIENCES, type Audience } from "@/data/scams";
import { DRILLS } from "@/data/drills";

const ICONS: Record<Audience, typeof GraduationCap> = {
  student: GraduationCap,
  worker: Briefcase,
  elder: HeartHandshake,
  shopper: ShoppingBag,
};

const RULES = [
  { icon: MessagesSquare, title: "和「骗子」聊天", desc: "像平时一样回复。对方是谁、想干什么，要靠你自己判断。" },
  { icon: Siren, title: "识破就点按钮", desc: "觉得不对劲，随时点「我识破了」，选出你发现的危险信号。" },
  { icon: Trophy, title: "拿到防骗力报告", desc: "识破越早、理由越准，分数越高。念安会陪你逐句复盘。" },
];

export function DrillSetup({ audience, onAudience, onStart }: { audience: Audience; onAudience: (a: Audience) => void; onStart: () => void }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_380px]">
      <div>
        <p className="text-sm font-semibold tracking-widest text-peach">DRILL</p>
        <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">骗局演练场</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          AI 会扮演一个骗子来找你聊天。你不知道它是哪种骗局，就像现实中一样。试试看，你能在第几句识破它？
        </p>

        <p className="mt-8 text-sm font-semibold">先选一个身份，念安会按这个身份给你出题</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {AUDIENCES.map((a) => {
            const Icon = ICONS[a.id];
            const on = audience === a.id;
            const n = DRILLS.filter((d) => d.audiences.includes(a.id)).length;
            return (
              <button
                key={a.id}
                onClick={() => onAudience(a.id)}
                className={`flex items-center gap-4 rounded-3xl border-2 p-4 text-left transition ${
                  on ? "border-brand bg-brand-soft/50 shadow-soft" : "border-transparent bg-white/80 hover:border-brand/30"
                }`}
              >
                <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${on ? "bg-brand text-white" : "bg-cream text-brand"}`}>
                  <Icon className="size-6" />
                </span>
                <span>
                  <span className="block font-semibold">{a.label}</span>
                  <span className="block text-xs text-ink-soft">{a.desc} · 题库 {n} 种</span>
                </span>
              </button>
            );
          })}
        </div>

        <ol className="mt-8 grid gap-3 md:grid-cols-3">
          {RULES.map((r, i) => (
            <li key={r.title} className="rounded-3xl bg-white/70 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span className="grid size-6 place-items-center rounded-full bg-peach-soft text-xs text-peach">{i + 1}</span>
                {r.title}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">{r.desc}</p>
            </li>
          ))}
        </ol>

        <button onClick={onStart} className="btn-primary mt-8 px-10 py-4 text-base">
          <Swords className="size-5" />
          开始演练
        </button>
        <p className="mt-3 text-xs text-ink-soft/70">演练中的骗子由 AI 扮演，只演示常见套路，所有链接和账号都是虚构的。</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative mx-auto hidden w-full max-w-[380px] lg:block">
        <div className="absolute inset-x-4 bottom-0 top-20 rounded-t-full bg-gradient-to-b from-peach-soft via-white to-brand-soft" />
        <Image src="/nianan/nianan-happy.webp" alt="念安" width={709} height={1100} priority className="relative mx-auto h-[500px] w-auto" />
        <div className="card absolute left-0 top-6 max-w-[200px] rounded-2xl rounded-bl-sm p-3 text-xs leading-relaxed">
          别紧张，我就在旁边看着。真遇到危险，我会喊停的～
        </div>
      </motion.div>
    </div>
  );
}
