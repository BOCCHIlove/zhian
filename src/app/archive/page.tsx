import type { Metadata } from "next";
import { ArchiveView } from "@/components/archive-view";
import { DrillArchive } from "@/components/drill-archive";

export const metadata: Metadata = { title: "我的档案" };

export default function ArchivePage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-10">
      <p className="text-sm font-semibold tracking-widest text-peach">ARCHIVE</p>
      <h1 className="mt-2 font-display text-4xl font-bold">我的防骗档案</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">演练成绩和检测记录都在这里，只保存在你自己的浏览器里。</p>

      <h2 className="mb-4 mt-10 text-xl font-semibold">演练成绩</h2>
      <DrillArchive />

      <h2 className="mb-4 mt-12 text-xl font-semibold">检测记录</h2>
      <ArchiveView />
    </div>
  );
}
