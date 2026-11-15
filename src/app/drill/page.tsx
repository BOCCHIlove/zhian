import type { Metadata } from "next";
import { DrillGame } from "@/components/drill/drill-game";

export const metadata: Metadata = { title: "演练场" };

export default function DrillPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 pt-10">
      <DrillGame />
    </div>
  );
}
