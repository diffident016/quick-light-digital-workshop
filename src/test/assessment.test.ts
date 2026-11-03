import { describe, it, expect } from "vitest";
import { answersSchema, buildWeaknesses, scoreAnswers, type Answer } from "@/lib/assessment";

const questions = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  weakness_title: `W${i + 1}`,
  weakness_description: `D${i + 1}`,
}));
const make = (noCount: number): Answer[] =>
  Array.from({ length: 10 }, (_, i) => ({ question_id: i + 1, answer: i >= noCount }));

describe("scoring", () => {
  it.each([
    [0, 10],
    [2, 8],
    [5, 5],
    [8, 2],
    [10, 0],
  ])("%i No answers -> score %i and that many weaknesses", (no, score) => {
    const a = make(no);
    expect(scoreAnswers(a)).toEqual({ score, totalYes: 10 - no, totalNo: no });
    expect(buildWeaknesses(a, questions)).toHaveLength(no);
  });

  it("maps each No to its own weakness and never includes Yes", () => {
    const a = make(0).map((x) => (x.question_id === 3 || x.question_id === 9 ? { ...x, answer: false } : x));
    expect(buildWeaknesses(a, questions).map((w) => w.title)).toEqual(["W3", "W9"]);
  });
});

describe("validation", () => {
  it("rejects 9 answers", () => expect(answersSchema.safeParse(make(0).slice(0, 9)).success).toBe(false));
  it("rejects duplicates", () => {
    const a = make(0);
    a[9] = { question_id: 1, answer: true };
    expect(answersSchema.safeParse(a).success).toBe(false);
  });
  it("rejects non-boolean answers", () => {
    const a: unknown[] = make(0);
    a[0] = { question_id: 1, answer: "yes" };
    expect(answersSchema.safeParse(a).success).toBe(false);
  });
  it("accepts 10 unique answers", () => expect(answersSchema.safeParse(make(4)).success).toBe(true));
});
