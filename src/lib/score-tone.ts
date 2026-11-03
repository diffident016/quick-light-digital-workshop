// Visual tone for a score. This only picks an accent colour; it is deliberately not a
// rating or label, because the spec doesn't define score categories.
export type ScoreTone = "high" | "mid" | "low";

export function scoreTone(score: number): ScoreTone {
  if (score >= 8) return "high";
  if (score >= 5) return "mid";
  return "low";
}
