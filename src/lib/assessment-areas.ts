import { Building2, ShieldCheck, Users, Wallet, type LucideIcon } from "lucide-react";

// Groups the existing 10 questions into the four areas they cover. Presentation only:
// it changes neither the questions nor the scoring.
export type AssessmentArea = {
  title: string;
  description: string;
  questionIds: number[];
  icon: LucideIcon;
};

export const AREAS: AssessmentArea[] = [
  {
    title: "Business Structure",
    description: "Company setup, shareholder arrangements and your duties as a director.",
    questionIds: [1, 2, 3],
    icon: Building2,
  },
  {
    title: "Leadership & Independence",
    description: "Whether the business can run without you, with management in place.",
    questionIds: [4, 5],
    icon: Users,
  },
  {
    title: "Financial Readiness",
    description: "Capital and cash reserves, access to bank funding and investor readiness.",
    questionIds: [6, 7, 8],
    icon: Wallet,
  },
  {
    title: "Risk & Protection",
    description: "Insurance cover for your directors and for the business itself.",
    questionIds: [9, 10],
    icon: ShieldCheck,
  },
];

export function areaForQuestion(id: number): AssessmentArea | undefined {
  return AREAS.find((a) => a.questionIds.includes(id));
}
