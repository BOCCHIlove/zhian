"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X, PhoneCall } from "lucide-react";
import { NAV, SITE } from "@/lib/site";

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-50 border-b border-ink/5 bg-cream/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" onClick={() => setOpen(false)}>
          <Image src="/nianan/avatar.png" alt="念安" width={36} height={36} className="rounded-full ring-2 ring-brand/30" priority />
          <span className="leading-tight">
            <span className="block text-lg font-bold tracking-wide text-ink">{SITE.name}</span>
            <span className="block text-[11px] text-ink-soft">{SITE.slogan}</span>
          </span>
        </Link>

        <ul className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {NAV.slice(1).map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`relative rounded-full px-4 py-2 text-sm transition ${
                  isActive(item.href) ? "text-brand" : "text-ink-soft hover:text-ink"
                }`}
              >
                {isActive(item.href) && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-brand-soft" transition={{ type: "spring", stiffness: 380, damping: 30 }} />
                )}
                {item.label}
                {!item.ready && <span className="ml-1 align-super text-[10px] text-peach">即将</span>}
              </Link>
            </li>
          ))}
        </ul>

        <a href={`tel:${SITE.hotline}`} className="ml-auto hidden items-center gap-1.5 rounded-full bg-danger-soft px-4 py-2 text-sm font-medium text-danger transition hover:bg-danger hover:text-white sm:flex lg:ml-0">
          <PhoneCall className="size-4" />
          反诈专线 {SITE.hotline}
        </a>

        <button className="ml-auto rounded-full p-2 text-ink lg:hidden sm:ml-0" onClick={() => setOpen((v) => !v)} aria-label="打开菜单">
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-ink/5 lg:hidden"
          >
            <ul className="grid gap-1 p-4 sm:grid-cols-2">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl p-3 ${isActive(item.href) ? "bg-brand-soft text-brand" : "text-ink hover:bg-white"}`}
                  >
                    <item.icon className="size-5" />
                    <span>
                      <span className="block font-medium">{item.label}</span>
                      <span className="block text-xs text-ink-soft">{item.desc}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
