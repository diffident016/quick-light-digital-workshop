import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssessmentFlow } from "@/components/assessment/AssessmentFlow";
import { useCountUp } from "@/hooks/use-count-up";
import { QUESTIONS } from "@/lib/assessment";

describe("useCountUp", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] }));
  afterEach(() => vi.useRealTimers());

  it("starts at 0 and settles exactly on the target", () => {
    const { result } = renderHook(() => useCountUp(7));
    expect(result.current).toBe(0);
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current).toBe(7);
  });
});

describe("AssessmentFlow", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const answerCurrent = (label: "Yes" | "No") => {
    fireEvent.click(screen.getByRole("radio", { name: new RegExp(`^${label}`) }));
    fireEvent.click(screen.getByRole("button", { name: /^(Next|Finish|Next unanswered)/ }));
  };

  it("walks through all 10 questions, shows the completion step, and submits every answer", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AssessmentFlow onSubmit={onSubmit} />);

    for (let i = 0; i < 10; i++) {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(QUESTIONS[i]!.question);
      answerCurrent(i % 3 === 0 ? "No" : "Yes");
    }

    expect(screen.getByRole("heading", { name: "Assessment Complete" })).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Generate My Report/ }));
    });
    const submitted = onSubmit.mock.calls[0]![0] as { question_id: number; answer: boolean }[];
    expect(submitted).toHaveLength(10);
    expect(submitted.map((a) => a.question_id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(submitted.filter((a) => !a.answer).map((a) => a.question_id)).toEqual([1, 4, 7, 10]);
  });

  it("selecting an answer does not move to the next question on its own", () => {
    render(<AssessmentFlow onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^Next/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /^Yes/ }));
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(QUESTIONS[0]!.question);
    expect(screen.getByRole("button", { name: /^Next/ })).toBeEnabled();
  });

  it("answering the last question waits for Finish before showing completion", () => {
    render(<AssessmentFlow onSubmit={vi.fn()} initialStep={9} initialAnswers={Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, true]))} />);
    fireEvent.click(screen.getByRole("radio", { name: /^No/ }));
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByRole("heading", { name: "Assessment Complete" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Finish/ }));
    expect(screen.getByRole("heading", { name: "Assessment Complete" })).toBeInTheDocument();
  });

  it("keeps answers when moving back and lets the user change them", () => {
    render(<AssessmentFlow onSubmit={vi.fn()} />);
    answerCurrent("Yes");
    fireEvent.click(screen.getByRole("button", { name: /Previous/ }));
    expect(screen.getByRole("radio", { name: /^Yes/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: /^No/ }));
    expect(screen.getByRole("radio", { name: /^No/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /^Yes/ })).toHaveAttribute("aria-checked", "false");
  });

  it("does not reach the completion step while a question is unanswered", () => {
    render(<AssessmentFlow onSubmit={vi.fn()} initialStep={9} initialAnswers={{ 1: true, 2: true }} />);
    fireEvent.click(screen.getByRole("radio", { name: /^Yes/ }));
    expect(screen.queryByRole("heading", { name: "Assessment Complete" })).not.toBeInTheDocument();
    expect(screen.getByText(/still unanswered/)).toBeInTheDocument();
  });

  it("answers with the Y and N keys", () => {
    render(<AssessmentFlow onSubmit={vi.fn()} />);
    fireEvent.keyDown(window, { key: "n" });
    expect(screen.getByRole("radio", { name: /^No/ })).toHaveAttribute("aria-checked", "true");
  });
});
