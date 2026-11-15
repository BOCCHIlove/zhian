/** 危险程度：5 个圆点，越多越危险 */
export function DangerDots({ level }: { level: number }) {
  const color = level >= 5 ? "bg-danger" : level >= 4 ? "bg-warn" : "bg-peach";
  return (
    <span className="flex items-center gap-1" title={`危险程度 ${level}/5`} aria-label={`危险程度 ${level}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`size-2 rounded-full ${i < level ? color : "bg-ink/10"}`} />
      ))}
    </span>
  );
}
