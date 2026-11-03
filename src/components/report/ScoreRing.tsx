import type { CSSProperties } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import { scoreTone } from "@/lib/score-tone";
import { cn } from "@/lib/utils";

type Props = {
  score: number;
  max?: number;
  size?: "md" | "lg";
  /** Count the number up from 0. Only for client-rendered pages, so SSR never shows "0". */
  countUp?: boolean;
};

/** Circular score indicator. The ring fills and the number counts up together, once. */
export function ScoreRing({ score, max = 10, size = "lg", countUp = true }: Props) {
  const counted = useCountUp(score);
  const shown = countUp ? counted : score;
  const pct = (score / max) * 100;
  return (
    <div
      role="img"
      aria-label={`Score ${score} out of ${max}`}
      data-tone={scoreTone(score)}
      className={cn(
        "score-ring grid shrink-0 place-items-center rounded-full",
        size === "lg" ? "size-44 sm:size-48" : "size-28",
      )}
      style={{ "--ring-pct": `${pct}%` } as CSSProperties}
    >
      <div
        className={cn(
          "grid place-items-center rounded-full bg-card",
          size === "lg" ? "size-[8.75rem] sm:size-[9.75rem]" : "size-[5.5rem]",
        )}
      >
        <span aria-hidden className="flex items-baseline font-serif font-semibold tabular-nums leading-none">
          <span className={size === "lg" ? "text-6xl" : "text-4xl"}>
            {/* Paper always gets the real score, never a mid-animation value. */}
            <span className="print:hidden">{shown}</span>
            <span className="hidden print:inline">{score}</span>
          </span>
          <span className={cn("ml-1 text-muted-foreground", size === "lg" ? "text-2xl" : "text-base")}>/{max}</span>
        </span>
      </div>
    </div>
  );
}
