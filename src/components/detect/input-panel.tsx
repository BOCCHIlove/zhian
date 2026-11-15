"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X, ScanSearch, Loader2, Lightbulb } from "lucide-react";
import { AUDIENCES, type Audience } from "@/data/scams";
import type { DetectRequest } from "@/lib/events";
import { compressImage } from "@/lib/image";

const SAMPLES: { label: string; text: string }[] = [
  {
    label: "刷单兼职",
    text: "【兼职】宝妈学生都能做，动动手指日赚300！先垫付50元做第一单，完成后立返本金+佣金20元。这是联单任务，要连做三单才能一起提现，今天名额有限，马上报名！",
  },
  {
    label: "客服理赔",
    text: "您好，我是某宝官方客服，您购买的面膜检测出质量问题，我们给您双倍理赔。请您下载会议软件，开启屏幕共享，我指导您在支付宝备用金里领取理赔款。有问题请回电 17012345678。",
  },
  {
    label: "冒充公安",
    text: "这里是市公安局刑侦支队，你的银行卡涉嫌一起洗钱案件，已经被列为通缉对象。案件需要保密，不能告诉任何人，包括家人。请你把资金转到安全账户接受资金核查，核查无误后会退还给你。",
  },
  {
    label: "ETC 短信",
    text: "【ETC服务中心】您的ETC卡已失效，请于今日内点击链接 http://etc-renzheng.top/verify 重新认证，逾期将停止使用。",
  },
  {
    label: "家常消息",
    text: "妈，我这周末回家吃饭，帮我留点你做的红烧肉哈，周六中午到。",
  },
];

export function InputPanel({ busy, onSubmit }: { busy: boolean; onSubmit: (req: DetectRequest) => void }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string>();
  const [audience, setAudience] = useState<Audience>();
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFile = async (file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImage(await compressImage(file));
  };

  const canSubmit = !busy && (text.trim().length > 0 || Boolean(image));
  const submit = () => canSubmit && onSubmit({ text, image, audience });

  return (
    <div className="card flex flex-col gap-5 p-6">
      <div>
        <label htmlFor="detect-text" className="text-sm font-semibold">
          要检测的内容
        </label>
        <div
          className={`mt-2 rounded-2xl border-2 bg-white transition ${dragging ? "border-brand bg-brand-soft/40" : "border-ink/5 focus-within:border-brand/50"}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFile(e.dataTransfer.files[0]);
          }}
        >
          <textarea
            id="detect-text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 4000))}
            onPaste={(e) => {
              const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
              if (file) {
                e.preventDefault();
                addFile(file);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
            }}
            rows={7}
            placeholder="把可疑的短信、聊天记录、对方说的话粘贴到这里…&#10;也可以直接粘贴或拖入截图"
            className="w-full resize-none rounded-2xl bg-transparent p-4 text-[15px] leading-relaxed outline-none placeholder:text-ink-soft/60"
          />
          <div className="flex items-center justify-between gap-3 border-t border-ink/5 px-4 py-2.5">
            {image ? (
              <div className="relative">
                <Image src={image} alt="已上传的截图" width={56} height={56} unoptimized className="size-14 rounded-xl object-cover ring-1 ring-ink/10" />
                <button
                  onClick={() => setImage(undefined)}
                  className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-ink text-white"
                  aria-label="移除截图"
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-brand">
                <ImagePlus className="size-4" />
                上传截图
              </button>
            )}
            <span className="text-xs text-ink-soft/70">{text.length} / 4000</span>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => addFile(e.target.files?.[0])} />
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold">
          你是 <span className="font-normal text-ink-soft">（选填，念安会给更贴心的建议）</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {AUDIENCES.map((a) => (
            <button
              key={a.id}
              onClick={() => setAudience((cur) => (cur === a.id ? undefined : a.id))}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                audience === a.id ? "border-brand bg-brand text-white" : "border-ink/10 bg-white text-ink-soft hover:border-brand/40"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="flex items-center gap-1 text-sm font-semibold">
          <Lightbulb className="size-4 text-peach" />
          没有素材？试试这些例子
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => setText(s.text)}
              className="rounded-full bg-cream px-3 py-1.5 text-xs text-ink-soft transition hover:bg-peach-soft hover:text-ink"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={submit} disabled={!canSubmit} className="btn-primary w-full py-3.5 text-base">
        {busy ? <Loader2 className="size-5 animate-spin" /> : <ScanSearch className="size-5" />}
        {busy ? "念安正在查…" : "让念安帮我看看"}
      </button>
      <p className="-mt-2 text-center text-xs text-ink-soft/70">Ctrl + Enter 快速提交 · 检测记录只保存在你的浏览器</p>
    </div>
  );
}
