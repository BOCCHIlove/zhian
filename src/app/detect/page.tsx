import type { Metadata } from "next";
import { DetectConsole } from "@/components/detect/detect-console";

export const metadata: Metadata = { title: "检测台" };

export default function DetectPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 pt-10">
      <div className="mb-8">
        <p className="text-sm font-semibold tracking-widest text-peach">DETECT</p>
        <h1 className="mt-2 font-display text-4xl font-bold">万能检测台</h1>
        <p className="mt-3 max-w-2xl text-ink-soft">短信、聊天记录、截图、链接、电话号码，都可以交给念安。她会一步步检查，并告诉你判断的依据。</p>
      </div>
      <DetectConsole />
    </div>
  );
}
