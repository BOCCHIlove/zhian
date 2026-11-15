import type { Metadata } from "next";
import Image from "next/image";
import { PhoneCall, Ban, Landmark, FileArchive, ShieldAlert, Smartphone } from "lucide-react";

export const metadata: Metadata = { title: "紧急求助" };

const STEPS = [
  {
    icon: Ban,
    title: "立刻停止转账",
    desc: "不管对方说什么「再交一笔就能退款」「不交就影响征信」，都不要再转一分钱。停止和对方联系，但不要删除聊天记录。",
  },
  {
    icon: PhoneCall,
    title: "马上报警",
    desc: "拨打 110 报警，或拨打 96110 全国反诈专线。说清楚转账时间、金额、对方账号，越快报警，追回的机会越大。",
  },
  {
    icon: Landmark,
    title: "联系银行冻结",
    desc: "拨打银行官方客服电话（银行卡背面的号码），说明被骗情况，申请紧急止付。同时修改银行卡、支付软件的密码。",
  },
  {
    icon: FileArchive,
    title: "保存好证据",
    desc: "截图保存聊天记录、对方账号、转账凭证、对方让你下载的 App 和链接。这些都是警方追查的关键线索。",
  },
  {
    icon: ShieldAlert,
    title: "当心二次诈骗",
    desc: "被骗后如果有人联系你说「可以帮你追回损失」，收取手续费，那一定也是骗子。追回钱款只能通过公安机关。",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-10">
      <div className="card relative overflow-hidden bg-danger p-8 text-white md:p-10">
        <div className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10" />
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center">
          <Image src="/nianan/avatar.png" alt="念安" width={88} height={88} className="rounded-full ring-4 ring-white/30" />
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold md:text-4xl">先深呼吸，别慌，我陪着你。</h1>
            <p className="mt-2 text-white/85">被骗不是你的错。现在最重要的是抓紧时间，按下面的步骤一步步来。</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <a href="tel:110" className="rounded-full bg-white px-6 py-2.5 text-center font-semibold text-danger">报警 110</a>
            <a href="tel:96110" className="rounded-full border border-white/50 px-6 py-2.5 text-center font-semibold">反诈专线 96110</a>
          </div>
        </div>
      </div>

      <ol className="relative mt-12 space-y-6 before:absolute before:bottom-6 before:left-[27px] before:top-6 before:w-0.5 before:bg-danger/15">
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative flex gap-5">
            <span className="relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-danger shadow-soft">
              <s.icon className="size-6" />
            </span>
            <div className="card flex-1 p-5">
              <p className="text-xs font-semibold text-danger">第 {i + 1} 步</p>
              <h2 className="mt-1 text-lg font-bold">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="card mt-10 flex flex-col items-start gap-4 p-6 md:flex-row md:items-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
          <Smartphone className="size-6" />
        </span>
        <p className="flex-1 text-sm leading-relaxed text-ink-soft">
          推荐安装公安部推出的<strong className="text-ink">「国家反诈中心」App</strong>，开启来电预警和可疑短信提醒，在应用商店搜索即可下载。
        </p>
      </div>
    </div>
  );
}
