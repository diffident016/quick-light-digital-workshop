import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: "Yes" | "No";
  shortcut: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

/**
 * A large Yes/No choice. It responds on press, and when selected it fills with
 * the primary colour and shows a checkmark, so the answer clearly registered.
 * Native <button>, so Tab focuses it and Enter/Space select it.
 */
export function AnswerOption({ label, shortcut, selected, disabled, onSelect }: Props) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-keyshortcuts={shortcut}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "group relative flex h-20 items-center gap-4 rounded-xl border-2 px-5 text-left sm:h-24 sm:px-6",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-fluid",
        "motion-safe:active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-raised)]"
          : "border-border bg-card text-foreground hover:border-primary/35 hover:shadow-[var(--shadow-card)]",
      )}
    >
      {/* Selection indicator: empty ring → filled check. */}
      <span
        aria-hidden
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors duration-150",
          selected ? "border-primary-foreground bg-primary-foreground text-primary" : "border-border group-hover:border-primary/40",
        )}
      >
        {selected && <Check key="check" className="size-4 animate-pop" strokeWidth={3} />}
      </span>
      <span className="text-xl font-semibold tracking-tight sm:text-2xl">{label}</span>
    </button>
  );
}
