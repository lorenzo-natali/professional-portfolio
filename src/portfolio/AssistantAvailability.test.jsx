import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AssistantAvailabilityIndicator } from "./AssistantAvailability.jsx";

const DESCRIPTIONS = {
  available: "AI Assistant available",
  visitor_limit: "Your daily question limit has been reached",
  global_limit: "AI Assistant daily capacity reached",
  unavailable: "AI Assistant unavailable",
  unknown: "AI Assistant status unknown",
};

function indicator(status) {
  return screen.getByRole("img", { name: DESCRIPTIONS[status] });
}

describe("assistant availability indicator", () => {
  afterEach(() => {
    cleanup();
  });

  it("defaults to an unknown dot without a visible label", () => {
    render(<AssistantAvailabilityIndicator />);
    const dot = indicator("unknown");

    expect(dot).toHaveAttribute("data-assistant-availability", "unknown");
    expect(dot).toHaveClass("bg-slate-500", "ml-2", "inline-block", "rounded-full", "h-1.5", "w-1.5");
    expect(dot.tagName).toBe("SPAN");
    expect(dot).toHaveAttribute("tabindex", "0");
    expect(screen.queryByText("Status unknown")).toBeNull();
    expect(screen.queryByText("Available")).toBeNull();
    expect(screen.queryByText("Unavailable")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("uses green, orange, and muted red without changing the dot size", () => {
    const { rerender } = render(<AssistantAvailabilityIndicator status="available" />);
    expect(indicator("available")).toHaveClass("bg-emerald-400", "h-1.5", "w-1.5", "ml-2");

    rerender(<AssistantAvailabilityIndicator status="visitor_limit" />);
    const orange = indicator("visitor_limit");
    expect(orange).toHaveClass("bg-amber-400", "h-1.5", "w-1.5", "ml-2");
    expect(orange).not.toHaveClass("bg-emerald-400", "bg-red-400/60", "bg-slate-500");

    rerender(<AssistantAvailabilityIndicator status="global_limit" />);
    const red = indicator("global_limit");
    expect(red).toHaveClass("bg-red-400/60", "h-1.5", "w-1.5", "ml-2");
    expect(red).toHaveAttribute("data-assistant-availability", "global_limit");
    expect(screen.queryByRole("img", { name: DESCRIPTIONS.visitor_limit })).toBeNull();
  });

  it("keeps a green or muted red dot when a caller supplies that state", () => {
    const { rerender } = render(<AssistantAvailabilityIndicator status="available" />);
    expect(indicator("available")).toHaveClass("bg-emerald-400");
    expect(indicator("available")).not.toHaveClass("bg-slate-500");

    rerender(<AssistantAvailabilityIndicator status="unavailable" />);
    expect(indicator("unavailable")).toHaveClass("bg-red-400/60");
    expect(screen.queryByText("Unavailable")).toBeNull();
    expect(screen.queryByRole("img", { name: DESCRIPTIONS.available })).toBeNull();
  });

  it("keeps an accessible name without a hover or focus tooltip", () => {
    const { rerender } = render(<AssistantAvailabilityIndicator />);
    const dot = indicator("unknown");

    expect(dot).toHaveAttribute("aria-label", DESCRIPTIONS.unknown);
    expect(dot).not.toHaveAttribute("title");
    expect(dot).not.toHaveAttribute("aria-describedby");
    expect(dot.className).not.toMatch(/group-hover|group-focus/);
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(screen.queryByText(DESCRIPTIONS.unknown)).toBeNull();

    dot.focus();
    expect(dot).toHaveFocus();
    expect(screen.queryByRole("tooltip")).toBeNull();

    rerender(<AssistantAvailabilityIndicator status="visitor_limit" spacious />);
    const headerDot = indicator("visitor_limit");
    expect(headerDot.querySelector("[data-assistant-status-dot]")).toHaveClass("bg-amber-400", "h-1.5", "w-1.5");
    expect(headerDot).toHaveClass("h-11", "w-5");
    expect(headerDot).not.toHaveAttribute("title");
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(screen.queryByText(DESCRIPTIONS.visitor_limit)).toBeNull();
  });
});
