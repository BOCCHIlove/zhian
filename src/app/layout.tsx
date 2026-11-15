import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { NAV, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} · ${SITE.slogan}`,
    template: `%s · ${SITE.name}`,
  },
  description: "念安是你的 AI 反诈守护姐姐：截图、链接、聊天记录丢给她，帮你识别骗局、教你怎么应对。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="flex min-h-full flex-col">
        <SiteNav />
        <main className="flex-1">{children}</main>
        <footer className="mt-24 border-t border-ink/5 bg-cream-deep/60">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <p className="text-lg font-bold">
                {SITE.name} <span className="text-sm font-normal text-ink-soft">{SITE.slogan}</span>
              </p>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
                念安会尽力帮你识别风险，但 AI 也可能出错。涉及钱款时，请务必通过官方渠道核实；遇到紧急情况，请立即拨打 110。
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">功能</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                {NAV.slice(1, 5).map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="hover:text-brand">
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold">紧急求助</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                <li>全国反诈专线：<a className="font-semibold text-danger" href="tel:96110">96110</a></li>
                <li>报警电话：<a className="font-semibold text-danger" href="tel:110">110</a></li>
                <li>
                  <Link href="/help" className="hover:text-brand">被骗了怎么办 →</Link>
                </li>
              </ul>
            </div>
          </div>
          <p className="pb-8 text-center text-xs text-ink-soft/70">© 2026 知安 · 传智杯 AI Web 网页开发挑战赛参赛作品</p>
        </footer>
      </body>
    </html>
  );
}
