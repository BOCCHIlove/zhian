import type { Metadata } from "next";
import { CasesBrowser } from "@/components/cases-browser";

export const metadata: Metadata = { title: "骗局图鉴" };

export default function CasesPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 pt-10">
      <p className="text-sm font-semibold tracking-widest text-peach">CASEBOOK</p>
      <h1 className="mt-2 font-display text-4xl font-bold">骗局图鉴</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        认得出套路，就不容易上当。这里也是念安检测时检索的知识库：每类骗局都整理了骗子常说的话、危险信号和应对方法。
      </p>
      <div className="mt-8">
        <CasesBrowser />
      </div>
    </div>
  );
}
