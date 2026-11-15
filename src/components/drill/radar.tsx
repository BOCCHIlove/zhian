"use client";

import { motion } from "motion/react";

/** 五维防骗力雷达图（纯 SVG） */
export function Radar({ dims, size = 280 }: { dims: { label: string; value: number }[]; size?: number }) {
  const c = size / 2;
  const r = size / 2 - 44;
  const n = dims.length;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + Math.cos(a) * r * (v / 100), c + Math.sin(a) * r * (v / 100)] as const;
  };
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).map((x) => x.toFixed(1)).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[320px]" role="img" aria-label={`防骗力雷达图：${dims.map((d) => `${d.label}${d.value}`).join("，")}`}>
      {[25, 50, 75, 100].map((lv) => (
        <polygon key={lv} points={poly(dims.map(() => lv))} fill={lv === 100 ? "#fbf7f1" : "none"} stroke="#e7ddd0" strokeWidth="1" />
      ))}
      {dims.map((_, i) => {
        const [x, y] = pt(i, 100);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#e7ddd0" strokeWidth="1" />;
      })}
      <motion.polygon
        initial={{ points: poly(dims.map(() => 0)) }}
        animate={{ points: poly(dims.map((d) => Math.max(4, d.value))) }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        fill="rgb(15 118 110 / 0.22)"
        stroke="#0f766e"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {dims.map((d, i) => {
        const [x, y] = pt(i, Math.max(4, d.value));
        return <motion.circle key={d.label} cx={x} cy={y} r="4" fill="#0f766e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} />;
      })}
      {dims.map((d, i) => {
        const [x, y] = pt(i, 128);
        return (
          <g key={d.label}>
            <text x={x} y={y - 2} textAnchor="middle" fontSize="12" fontWeight="600" fill="#1d2b2f">
              {d.label}
            </text>
            <text x={x} y={y + 13} textAnchor="middle" fontSize="11" fill="#52646a">
              {d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
