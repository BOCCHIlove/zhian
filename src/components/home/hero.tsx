"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, ShieldAlert, Sparkles, Lock, Timer, ScanSearch } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.1 * i, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } }),
};

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* 背景：柔和光斑 + 点阵 */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 size-[520px] rounded-full bg-brand/15 blur-3xl" />
        <div className="absolute -right-32 top-20 size-[460px] rounded-full bg-peach/30 blur-3xl" />
        <div className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
        <div>
          <motion.span variants={fadeUp} initial="hidden" animate="show" custom={0} className="chip bg-white/80 text-brand shadow-soft">
            <span className="relative mr-1 flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-safe opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-safe" />
            </span>
            念安在线守护中 · AI 反诈助手
          </motion.span>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="mt-6 font-display text-4xl font-bold leading-[1.15] tracking-tight text-ink sm:text-5xl md:text-6xl"
          >
            别慌，
            <br />
            有<span className="relative inline-block text-brand">
              念安
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden>
                <path d="M2 9 Q 50 0 98 7" stroke="#f3a888" strokeWidth="4" fill="none" strokeLinecap="round" />
              </svg>
            </span>
            帮你看着。
          </motion.h1>

          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2} className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            我是<strong className="text-ink">念安</strong>，你的 AI 反诈守护姐姐。可疑的短信、聊天截图、陌生链接，都可以丢给我。我会一步步查清楚，用大白话告诉你是不是骗局，再教你接下来怎么做。
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="mt-8 flex flex-wrap gap-3">
            <Link href="/detect" className="btn-primary text-base">
              <ScanSearch className="size-5" />
              让念安帮我看看
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/cases" className="btn-ghost text-base">
              先看看常见骗局
            </Link>
          </motion.div>

          <motion.ul variants={fadeUp} initial="hidden" animate="show" custom={4} className="mt-10 grid max-w-xl grid-cols-1 gap-3 text-sm text-ink-soft sm:grid-cols-3">
            <li className="flex items-center gap-2"><Sparkles className="size-4 text-brand" />文字截图链接都能看</li>
            <li className="flex items-center gap-2"><Timer className="size-4 text-brand" />过程可见，结论有据</li>
            <li className="flex items-center gap-2"><Lock className="size-4 text-brand" />记录只存在本地</li>
          </motion.ul>
        </div>

        {/* 右侧：角色 + 浮动卡片 */}
        <div className="relative mx-auto h-[560px] w-full max-w-[460px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-6 bottom-0 top-16 rounded-t-full bg-gradient-to-b from-brand-soft via-white to-peach-soft shadow-glow"
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 bottom-0 flex justify-center"
          >
            <Image src="/nianan/nianan.webp" alt="念安" width={641} height={1100} priority className="h-[540px] w-auto drop-shadow-xl" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="absolute -left-2 top-[210px] w-60 sm:top-8 xl:-left-16"
          >
            <div className="card animate-float rounded-2xl rounded-tl-sm p-3 text-xs leading-relaxed text-ink-soft">
              <p className="mb-1 font-medium text-ink">【某某快递】</p>
              您的包裹已丢失，点击 t.cn/xxxx 办理<span className="font-semibold text-danger">双倍理赔</span>，24 小时内有效。
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.3, duration: 0.6 }}
            className="absolute right-0 top-[330px] w-52 sm:top-[300px] xl:-right-10"
          >
            <div className="card rounded-2xl rounded-tr-sm bg-brand p-3 text-xs leading-relaxed text-white [animation-delay:1.5s]">
              先别点哦～ 快递丢了要理赔，只会在官方 App 里办理，这是冒充客服的套路。
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.8, type: "spring", stiffness: 260, damping: 18 }}
            className="absolute bottom-16 left-0 xl:-left-8"
          >
            <div className="card flex items-center gap-3 rounded-2xl px-4 py-3">
              <span className="grid size-10 place-items-center rounded-xl bg-danger-soft text-danger">
                <ShieldAlert className="size-5" />
              </span>
              <span>
                <span className="block text-xs text-ink-soft">风险评分</span>
                <span className="block text-xl font-bold text-danger">
                  92 <span className="text-xs font-medium">高危</span>
                </span>
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
