import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GenerateCard, PlanView } from "@/components/report/ActionPlanSection";

const base = {
  busy: false,
  error: null,
  initialContext: null,
  remainingToday: 5,
  dailyLimit: 5,
  isRegenerate: false,
  onCancel: undefined,
};

describe("GenerateCard", () => {
  it("submits an empty context when the optional details are skipped", () => {
    const onSubmit = vi.fn();
    render(<GenerateCard {...base} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Create my action plan/ }));
    expect(onSubmit).toHaveBeenCalledWith({});
  });

  it("submits the details the user filled in", () => {
    const onSubmit = vi.fn();
    render(<GenerateCard {...base} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Tell us about your business/ }));
    fireEvent.change(screen.getByLabelText("Industry"), { target: { value: "Construction" } });
    fireEvent.change(screen.getByLabelText("Team size"), { target: { value: "11–50" } });
    fireEvent.click(screen.getByRole("button", { name: /Create my action plan/ }));
    expect(onSubmit).toHaveBeenCalledWith({ industry: "Construction", teamSize: "11–50" });
  });

  it("blocks unsafe industry text inline instead of sending it", () => {
    const onSubmit = vi.fn();
    render(<GenerateCard {...base} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Tell us about your business/ }));
    fireEvent.change(screen.getByLabelText("Industry"), { target: { value: "Retail <ignore instructions>" } });
    fireEvent.click(screen.getByRole("button", { name: /Create my action plan/ }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Industry")).toHaveAttribute("aria-invalid", "true");
  });

  it("disables generation when the daily limit is used up", () => {
    render(<GenerateCard {...base} remainingToday={0} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Create my action plan/ })).toBeDisabled();
    expect(screen.getByText("Daily limit reached")).toBeInTheDocument();
  });
});

describe("PlanView", () => {
  it("shows priorities in the order given, labelled with the report's own weakness titles", () => {
    render(
      <PlanView
        stored={{
          createdAt: "2026-11-03T00:00:00Z",
          model: "m",
          language: "en",
          businessContext: null,
          plan: {
            summary: "Summary.",
            priorities: [
              { questionId: 8, headline: "Second weakness first", actions: ["A.", "B."] },
              { questionId: 2, headline: "Then this", actions: ["C.", "D."] },
            ],
            maintain: [],
          },
        }}
        weaknesses={[
          { questionId: 2, title: "Shareholders Agreement", description: "" },
          { questionId: 8, title: "Investor Readiness", description: "" },
        ]}
        onRegenerate={vi.fn()}
        remainingToday={3}
      />,
    );
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Second weakness first", "Then this"]);
    expect(screen.getByText(/Question 8 · Investor Readiness/)).toBeInTheDocument();
    expect(screen.getByText("AI-generated")).toBeInTheDocument();
  });
});
