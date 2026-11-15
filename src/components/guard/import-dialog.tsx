"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { parseTranscript, type GuardMessage } from "@/lib/guard";
import { readScreenshot } from "@/lib/use-guard";
import { compressImage } from "@/lib/image";

const EXAMPLE = "客服：您好，我是平台售后客服\n我：有什么事？\n客服：您的订单需要办理理赔";

/** 一次导入一段聊天记录：粘贴文字，或上传截图让视觉模型转写 */
export function ImportDialog({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (m: GuardMessage[]) => void }) {
  const [raw, setRaw] = useState("");
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => parseTranscript(raw), [raw]);
  const theirs = parsed.filter((m) => m.role === "them").length;

  const readFile = async (file?: File | null) => {
    if (!file?.type.startsWith("image/")) return;
    setReading(true);
    setError(undefined);
    try {
      const list = await readScreenshot(await compressImage(file));
      setRaw(list.map((m) => `${m.role === "them" ? "对方" : "我"}：${m.text}`).join("\n"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReading(false);
    }
  };

  const close = () => {
    setRaw("");
    setError(undefined);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ y: 20, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 20, scale: 0.97 }}
            onClick={(e) => e.stopPropagation()}
            onPaste={(e) => {
              const file = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"))?.getAsFile();
              if (file) {
                e.preventDefault();
                readFile(file);
              }
            }}
            className="card w-full max-w-lg p-6"
            role="dialog"
            aria-label="导入聊天记录"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">导入聊天记录</h2>
              <button onClick={close} className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-cream" aria-label="关闭">
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">每行一条消息。以「我：」开头的是你说的，其余的算对方说的；没有前缀的行会接在上一条后面。</p>

            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value.slice(0, 8000))}
              rows={8}
              placeholder={EXAMPLE}
              className="mt-4 w-full resize-none rounded-2xl border-2 border-ink/5 bg-white p-3 text-sm outline-none focus:border-brand/50"
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={() => fileRef.current?.click()} disabled={reading} className="chip bg-cream text-ink-soft hover:text-brand disabled:opacity-50">
                {reading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
                {reading ? "正在识别截图…" : "从聊天截图识别"}
              </button>
              <span className="text-xs text-ink-soft">也可以直接 Ctrl+V 粘贴截图</span>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => readFile(e.target.files?.[0])} />
            </div>
            {error && <p className="mt-3 rounded-xl bg-warn-soft p-3 text-xs text-warn">{error}</p>}

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-xs text-ink-soft">{parsed.length ? `共 ${parsed.length} 条，对方 ${theirs} 条、我 ${parsed.length - theirs} 条` : "还没有内容"}</p>
              <button
                disabled={!parsed.length}
                onClick={() => {
                  onImport(parsed.slice(0, 40));
                  close();
                }}
                className="btn-primary px-5 py-2.5 text-sm disabled:opacity-40"
              >
                导入
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
