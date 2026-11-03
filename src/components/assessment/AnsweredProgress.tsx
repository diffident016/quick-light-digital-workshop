type Props = { answered: number; total: number };

/** Progress bar driven by answered questions (not the screen you're on); glides to each new value. */
export function AnsweredProgress({ answered, total }: Props) {
  const pct = (answered / total) * 100;
  return (
    <div
      role="progressbar"
      aria-label="Questions answered"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={answered}
      aria-valuetext={`${answered} of ${total} answered`}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
    >
      <div
        className="h-full origin-left rounded-full bg-accent transition-transform duration-[var(--duration-slow)] ease-fluid"
        style={{ transform: `scaleX(${pct / 100})` }}
      />
    </div>
  );
}
