import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AssistantAnswerBody, safeAssistantHref } from "./assistantMarkdown.jsx";

describe("assistant answer markdown", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders bold and italic without leaving the markers visible", () => {
    render(<AssistantAnswerBody text={"Lorenzo is an **IT Audit Specialist** with *hands-on* and _targeted_ experience."} />);

    expect(screen.getByText("IT Audit Specialist").tagName).toBe("STRONG");
    expect(screen.getByText("hands-on").tagName).toBe("EM");
    expect(screen.getByText("targeted").tagName).toBe("EM");
    expect(screen.queryByText(/\*\*IT Audit Specialist\*\*/)).toBeNull();
    expect(document.body.textContent).not.toContain("**");
    expect(document.body.textContent).not.toContain("_targeted_");
  });

  it("renders paragraphs, line breaks, and both list types", () => {
    const { container } = render(
      <AssistantAnswerBody
        text={"First line\nsecond line\n\nNext paragraph.\n\n- Audit\n- Risk\n\n1. Plan\n2. Review"}
      />,
    );

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].querySelector("br")).toBeTruthy();
    expect(paragraphs[0].textContent).toBe("First linesecond line");
    expect(paragraphs[1].textContent).toBe("Next paragraph.");

    const lists = container.querySelectorAll("ul, ol");
    expect(lists[0].tagName).toBe("UL");
    expect(lists[0]).toHaveClass("list-disc");
    expect(Array.from(lists[0].querySelectorAll("li")).map((item) => item.textContent)).toEqual(["Audit", "Risk"]);
    expect(lists[1].tagName).toBe("OL");
    expect(lists[1]).toHaveClass("list-decimal");
    expect(Array.from(lists[1].querySelectorAll("li")).map((item) => item.textContent)).toEqual(["Plan", "Review"]);
    expect(container.firstElementChild).toHaveClass("space-y-1.5", "leading-6", "break-words");
    expect(lists[0]).toHaveClass("pl-5");
    expect(lists[0]).not.toHaveClass("space-y-1");
  });

  it("renders safe links and does not link unsafe schemes", () => {
    const { container } = render(
      <AssistantAnswerBody
        text={"See [the portfolio](https://lorenzo-natali.github.io/professional-portfolio/) and [this](javascript:alert(1)) or [that](data:text/html,hi)."}
      />,
    );

    const link = screen.getByRole("link", { name: "the portfolio" });
    expect(link).toHaveAttribute("href", "https://lorenzo-natali.github.io/professional-portfolio/");
    expect(link).toHaveAttribute("rel", "noreferrer noopener");
    expect(link).toHaveClass("font-medium", "assistant-link", "underline-offset-4");
    expect(container.querySelectorAll("a")).toHaveLength(1);
    expect(container.innerHTML).not.toMatch(/javascript:|data:text/);
    expect(container.textContent).toContain("this");
    expect(container.textContent).toContain("that");
  });

  it("shows literal HTML as text and does not execute it", () => {
    const { container } = render(
      <AssistantAnswerBody text={'Before <script>alert(1)</script> <img src=x onerror="alert(1)"> after'} />,
    );

    expect(container.querySelector("script, img")).toBeNull();
    expect(container.innerHTML).not.toContain("<script>");
    expect(container.textContent).toContain('<script>alert(1)</script>');
    expect(container.textContent).toContain('<img src=x onerror="alert(1)">');
  });

  it("rejects unsafe URL schemes before they can become an href", () => {
    expect(safeAssistantHref("https://example.com/path")).toBe("https://example.com/path");
    expect(safeAssistantHref("http://example.com")).toBe("http://example.com/");
    expect(safeAssistantHref("/professional-portfolio/")).toBe("/professional-portfolio/");
    expect(safeAssistantHref("#experience")).toBe("#experience");
    expect(safeAssistantHref("javascript:alert(1)")).toBeNull();
    expect(safeAssistantHref("JaVaScRiPt:alert(1)")).toBeNull();
    expect(safeAssistantHref("data:text/html,hi")).toBeNull();
    expect(safeAssistantHref("vbscript:msg")).toBeNull();
    expect(safeAssistantHref("//evil.example")).toBeNull();
    expect(safeAssistantHref("  javascript:alert(1)")).toBeNull();
  });
});
