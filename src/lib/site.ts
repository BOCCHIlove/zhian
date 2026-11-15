import {
  ShieldCheck,
  MessageCircleHeart,
  Swords,
  BookOpenText,
  FolderHeart,
  LifeBuoy,
  House,
  type LucideIcon,
} from "lucide-react";

export const SITE = {
  name: "知安",
  slogan: "AI 反诈守护",
  character: "念安",
  hotline: "96110",
};

export interface NavItem {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  ready: boolean;
}

export const NAV: NavItem[] = [
  { href: "/", label: "首页", desc: "认识念安", icon: House, ready: true },
  { href: "/detect", label: "检测台", desc: "截图、链接、聊天记录，丢给念安看看", icon: ShieldCheck, ready: true },
  { href: "/guard", label: "聊天护航", desc: "和可疑的人聊天时，念安实时提醒你", icon: MessageCircleHeart, ready: true },
  { href: "/drill", label: "演练场", desc: "AI 扮演骗子，练练你的识骗能力", icon: Swords, ready: true },
  { href: "/cases", label: "骗局图鉴", desc: "常见骗局的套路、信号和应对方法", icon: BookOpenText, ready: true },
  { href: "/archive", label: "我的档案", desc: "检测记录和防骗力成长", icon: FolderHeart, ready: true },
  { href: "/help", label: "紧急求助", desc: "被骗了怎么办，一步步带你处理", icon: LifeBuoy, ready: true },
];
