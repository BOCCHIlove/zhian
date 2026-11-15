import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageUp, DatabaseZap, Gauge, MessageSquareHeart } from "lucide-react";
import { Hero } from "@/components/home/hero";
import { AudienceTabs } from "@/components/home/audience-tabs";
import { NAV } from "@/lib/site";
import { AUDIENCES, RED_FLAG_TERMS, SCAM_CASES } from "@/data/scams";

const STEPS = [
  { icon: ImageUp, title: "丢给我", desc: "粘贴短信、聊天记录，上传截图或链接", tech: "多模态识别" },
  { icon: DatabaseZap, title: "我来查", desc: "对照骗局知识库，检查链接和号码", tech: "知识库检索 · 工具调用" },
  { icon: Gauge, title: "讲清楚", desc: "风险评分，并指出原文里哪句话有问题", tech: "可解释的风险报告" },
  { icon: MessageSquareHeart, title: "教你做", desc: "接下来怎么做、怎么回复对方，一步步说", tech: "个性化应对建议" },
];

function SectionTitle({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold tracking-widest text-peach">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">{title}</h2>
      {desc && <p className="mt-4 text-ink-soft">{desc}</p>}
    </div>
  );
}

export default function Home() {
  const stats = [
    { value: SCAM_CASES.length, unit: "类", label: "收录骗局" },
    { value: SCAM_CASES.reduce((s, c) => s + c.scripts.length, 0), unit: "条", label: "典型话术" },
    { value: RED_FLAG_TERMS.length, unit: "个", label: "危险信号" },
    { value: AUDIENCES.length, unit: "类", label: "覆盖人群" },
  ];

  return (
    <>
      <Hero />

      {/* 知识库规模 */}
      <section className="mx-auto max-w-5xl px-5">
        <div className="card grid grid-cols-2 divide-ink/5 p-2 md:grid-cols-4 md:divide-x">
          {stats.map((s) => (
            <div key={s.label} className="px-6 py-5 text-center">
              <p className="text-3xl font-bold text-brand">
                {s.value}
                <span className="ml-1 text-sm font-medium text-ink-soft">{s.unit}</span>
              </p>
              <p className="mt-1 text-sm text-ink-soft">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 不同人群 */}
      <section className="mx-auto mt-28 max-w-7xl px-5">
        <SectionTitle eyebrow="FOR EVERYONE" title="你是谁，念安就更懂你" desc="学生、上班族、长辈、爱网购的人，遇到的骗局各不相同。选一选，看看你身边最常见的套路。" />
        <div className="mt-12">
          <AudienceTabs />
        </div>
      </section>

      {/* 工作流程 */}
      <section className="mx-auto mt-28 max-w-7xl px-5">
        <SectionTitle eyebrow="HOW IT WORKS" title="念安是怎么帮你的" desc="不只是给个结论。念安会把每一步查了什么都摆在你眼前。" />
        <ol className="mt-12 grid gap-5 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card relative p-6">
              <span className="absolute right-5 top-4 font-display text-5xl font-bold text-brand/10">{i + 1}</span>
              <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
                <s.icon className="size-6" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.desc}</p>
              <p className="mt-4 text-xs font-medium text-peach">{s.tech}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 功能入口 */}
      <section className="mx-auto mt-28 max-w-7xl px-5">
        <SectionTitle eyebrow="FEATURES" title="从识别到求助，一站陪到底" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {NAV.slice(1).map((n) => (
            <Link key={n.href} href={n.href} className="card group flex items-start gap-4 p-6 transition hover:-translate-y-1 hover:shadow-glow">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cream text-brand transition group-hover:bg-brand group-hover:text-white">
                <n.icon className="size-6" />
              </span>
              <span>
                <span className="flex items-center gap-2 font-semibold">
                  {n.label}
                  {!n.ready && <span className="chip bg-peach-soft py-0.5 text-[11px] text-peach">即将上线</span>}
                </span>
                <span className="mt-1 block text-sm text-ink-soft">{n.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 行动号召 */}
      <section className="mx-auto mt-28 max-w-5xl px-5">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-brand px-8 py-12 text-white shadow-glow md:px-14">
          <div className="absolute -right-16 -top-16 size-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-24 right-32 size-56 rounded-full bg-peach/20" />
          <div className="relative flex flex-col items-center gap-8 md:flex-row">
            <Image src="/nianan/avatar-happy.png" alt="念安" width={120} height={120} className="rounded-full ring-4 ring-white/30" />
            <div className="flex-1 text-center md:text-left">
              <h2 className="font-display text-3xl font-bold">拿不准的消息，先问问念安</h2>
              <p className="mt-3 text-white/80">多问一句不麻烦。真正麻烦的，是钱转出去以后。</p>
            </div>
            <Link href="/detect" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-medium text-brand transition hover:bg-cream">
              开始检测 <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
