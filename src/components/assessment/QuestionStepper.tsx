import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  total: number;
  current: number; // index of the question on screen; -1 when none (completion view)
  answers: (boolean | undefined)[];
  onSelect: (index: number) => void;
  disabled?: boolean;
};

/**
 * Numbered indicators for all questions. Answered ones show a check, the current one
 * is outlined, and any of them can be clicked to jump straight to that question.
 */
export function QuestionStepper({ total, current, answers, onSelect, disabled }: Props) {
  return (
    <ol className="flex items-center justify-between gap-1 sm:gap-2" aria-label="Questions">
      {Array.from({ length: total }, (_, i) => {
        const answer = answers[i];
        const done = answer !== undefined;
        const isCurrent = i === current;
        return (
          <li key={i} className="flex flex-1 justify-center">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(i)}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`Question ${i + 1}${done ? `, answered ${answer ? "Yes" : "No"}` : ", not answered"}`}
              className={cn(
                "grid size-7 place-items-center rounded-full text-xs font-semibold tabular-nums sm:size-8",
                "transition-[background-color,color,box-shadow,transform] duration-150 ease-fluid motion-safe:active:scale-90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                done
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-sunken text-muted-foreground hover:bg-muted hover:text-foreground",
                isCurrent && "ring-2 ring-accent ring-offset-2 ring-offset-background",
              )}
            >
              {done && !isCurrent ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : i + 1}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
