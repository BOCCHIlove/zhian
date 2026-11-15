import type { Metadata } from "next";
import { GuardConsole } from "@/components/guard/guard-console";

export const metadata: Metadata = { title: "聊天护航" };

export default function GuardPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 pt-10">
      <div className="mb-8">
        <p className="text-sm font-semibold tracking-widest text-peach">CHAT GUARD</p>
        <h1 className="mt-2 font-display text-4xl font-bold">聊天护航</h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          正在和可疑的人聊天？把对方发来的话一条条贴进来，念安会实时标出话术、看清骗局走到了哪一步，告诉你下一句怎么回。你要回的话，发出去之前她也会先帮你把关。
        </p>
        <p className="mt-2 text-xs text-ink-soft">对话只保留在当前页面，刷新后清空。</p>
      </div>
      <GuardConsole />
    </div>
  );
}
