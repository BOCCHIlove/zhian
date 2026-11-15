"use client";

import type { Report } from "./analyze";
import type { DetectRequest } from "./events";

/** 检测记录只保存在用户自己的浏览器（localStorage），不上传服务器 */
export interface DetectRecord {
  id: string;
  time: number;
  input: string;
  hasImage: boolean;
  audience?: DetectRequest["audience"];
  report: Report;
}

const KEY = "zhian:history";
const MAX = 50;

export function loadRecords(): DetectRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as DetectRecord[];
  } catch {
    return [];
  }
}

export function saveRecord(r: Omit<DetectRecord, "id" | "time">) {
  const list = loadRecords();
  list.unshift({ ...r, input: r.input.slice(0, 300), id: crypto.randomUUID(), time: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
}

export function clearRecords() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
}

/* ---------- 演练成绩 ---------- */

export interface DrillRecord {
  id: string;
  time: number;
  scenario: string;
  caseId: string;
  audience?: DetectRequest["audience"];
  score: number;
  title: string;
  outcome: "caught" | "trapped" | "timeout";
  dims: { key: string; label: string; value: number }[];
}

const DRILL_KEY = "zhian:drills";

export function saveDrill(r: Omit<DrillRecord, "id" | "time">) {
  let list: DrillRecord[] = [];
  try {
    list = JSON.parse(localStorage.getItem(DRILL_KEY) ?? "[]");
  } catch {}
  list.unshift({ ...r, id: crypto.randomUUID(), time: Date.now() });
  localStorage.setItem(DRILL_KEY, JSON.stringify(list.slice(0, MAX)));
}

export function getDrillsSnapshot() {
  return localStorage.getItem(DRILL_KEY);
}

export function clearDrills() {
  localStorage.removeItem(DRILL_KEY);
  window.dispatchEvent(new StorageEvent("storage", { key: DRILL_KEY }));
}

/* 供 useSyncExternalStore 使用：订阅记录变化、读取原始快照 */
export function subscribeRecords(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

export function getRecordsSnapshot() {
  return localStorage.getItem(KEY);
}
