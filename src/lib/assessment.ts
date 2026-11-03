import { z } from "zod";

export const QUESTION_COUNT = 10;

export const QUESTIONS: { id: number; question: string }[] = [
  { id: 1, question: "Are you set up as a company (i.e. Pty Ltd)?" },
  { id: 2, question: "Do you have a shareholders agreement?" },
  { id: 3, question: "Do you fully understand your duties and responsibilities as a director?" },
  { id: 4, question: "Are you able to step away from the business for an extended period of time? I.e. 6 months off?" },
  { id: 5, question: "Do you have a general manager or CEO running your business for you?" },
  { id: 6, question: "Is your business adequately capitalized? Have access to cash reserves." },
  { id: 7, question: "Can your business access bank funding right now? Will the bank give you money if you called them tomorrow?" },
  { id: 8, question: "Is your business investor ready right now? You can attract an investor within 1 month" },
  { id: 9, question: "Are your directors insured?" },
  { id: 10, question: "Is your business insured? Professional Indemnity, Public Liability, Assets" },
];

export const answersSchema = z
  .array(
    z.object({
      question_id: z.number().int().min(1).max(QUESTION_COUNT),
      answer: z.boolean(),
    }).strict(),
  )
  .length(QUESTION_COUNT, "All 10 questions must be answered")
  .refine((a) => new Set(a.map((x) => x.question_id)).size === QUESTION_COUNT, "Each question must be answered once");

export type Answer = z.infer<typeof answersSchema>[number];

export function scoreAnswers(answers: Answer[]) {
  const totalNo = answers.filter((a) => a.answer === false).length;
  const totalYes = answers.length - totalNo;
  const score = Math.max(0, Math.min(QUESTION_COUNT, QUESTION_COUNT - totalNo));
  return { score, totalYes, totalNo };
}

export type QuestionRow = { id: number; weakness_title: string; weakness_description: string };
export type Weakness = { questionId: number; title: string; description: string };

export function buildWeaknesses(answers: Answer[], questions: QuestionRow[]): Weakness[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  return answers
    .filter((a) => a.answer === false)
    .sort((a, b) => a.question_id - b.question_id)
    .flatMap((a) => {
      const q = byId.get(a.question_id);
      return q ? [{ questionId: q.id, title: q.weakness_title, description: q.weakness_description }] : [];
    });
}
