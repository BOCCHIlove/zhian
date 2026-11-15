"use client";

import { motion } from "motion/react";
import { levelOf } from "@/lib/analyze";
import { LEVEL } from "@/components/detect/report-card";

const W = 300;
const H = 96;
const PAD = 12;

const y = (risk: number) => H - PAD - (risk / 100) * (H - PAD * 2);

/** 风险曲线：对方每发一条消息，风险累计到多少 */
export function RiskCurve({ points }: { points: number[] }) {
  const n = Math.max(points.length, 1);
  const x = (i: number) => (n === 1 ? PAD + 8 : PAD + (i / (n - 1)) * (W - PAD * 2));
  const coords = points.map((r, i) => `${x(i).toFixed(1)},${y(r).toFixed(1)}`);
  const line = coords.join(" ");
  const area = points.length > 1 ? `${x(0)},${H - PAD} ${line} ${x(points.length - 1)},${H - PAD}` : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="风险变化曲线">
      <defs>
        <linearGradient id="risk-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#e0524f" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#e0524f" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[70, 40].map((t) => (
        <g key={t}>
          <line x1={PAD} x2={W - PAD} y1={y(t)} y2={y(t)} stroke={t === 70 ? "#e0524f" : "#e59a2c"} strokeOpacity="0.35" strokeDasharray="4 4" />
          <text x={W - PAD} y={y(t) - 3} textAnchor="end" fontSize="9" fill={t === 70 ? "#e0524f" : "#e59a2c"}>
            {t === 70 ? "高危" : "可疑"}
          </text>
        </g>
      ))}
      {points.length > 1 && (
        <>
          <motion.polygon fill="url(#risk-fill)" initial={false} animate={{ points: area }} transition={{ duration: 0.6 }} />
          <motion.polyline
            fill="none"
            stroke="#1d2b2f"
            strokeOpacity="0.55"
            strokeWidth="2"
            strokeLinejoin="round"
            initial={false}
            animate={{ points: line }}
            transition={{ duration: 0.6 }}
          />
        </>
      )}
      {points.map((r, i) => {
        const color = LEVEL[levelOf(r)].color;
        const last = i === points.length - 1;
        return (
          <g key={i}>
            {last && (
              <motion.circle
                cx={x(i)}
                cy={y(r)}
                fill={color}
                initial={{ r: 4, opacity: 0.5 }}
                animate={{ r: 11, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.6 }}
              />
            )}
            <motion.circle initial={{ r: 0 }} animate={{ r: last ? 5 : 3.5, cx: x(i), cy: y(r) }} fill={color} stroke="#fff" strokeWidth="1.5" />
          </g>
        );
      })}
    </svg>
  );
}
