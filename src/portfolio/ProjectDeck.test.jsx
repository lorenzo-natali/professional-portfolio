import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children, custom, mode }) => (
    <div data-testid="animate-presence" data-custom={custom} data-mode={mode}>
      {children}
    </div>
  ),
  motion: {
    div: ({
      animate,
      children,
      custom,
      exit,
      initial,
      transition,
      variants,
      ...props
    }) => {
      void transition;
      return (
        <div
          {...props}
          data-testid="project-slide"
          data-custom={custom}
          data-enter-x={variants[initial](custom).x}
          data-exit-x={variants[exit](custom).x}
          data-center-x={variants[animate].x}
        >
          {children}
        </div>
      );
    },
  },
}));

import ProjectDeck from "./ProjectDeck.jsx";

function expectDirection({ custom, enterX, exitX }) {
  expect(screen.getByTestId("animate-presence")).toHaveAttribute(
    "data-custom",
    String(custom)
  );
  expect(screen.getByTestId("animate-presence")).toHaveAttribute(
    "data-mode",
    "wait"
  );
  expect(screen.getByTestId("project-slide")).toHaveAttribute(
    "data-enter-x",
    String(enterX)
  );
  expect(screen.getByTestId("project-slide")).toHaveAttribute(
    "data-exit-x",
    String(exitX)
  );
  expect(screen.getByTestId("project-slide")).toHaveAttribute(
    "data-center-x",
    "0"
  );
}

describe("ProjectDeck directional transitions", () => {
  afterEach(cleanup);

  it("uses functional variants with the current custom direction", () => {
    render(<ProjectDeck />);
    expectDirection({ custom: 1, enterX: 80, exitX: -80 });
  });

  it("moves Next forward and wraps from the last project to the first", () => {
    render(<ProjectDeck />);

    fireEvent.click(screen.getByRole("button", { name: "Next project" }));
    expect(
      screen.getByRole("heading", { name: "CodeIAK — Local AI Coding Agent" })
    ).toBeTruthy();
    expectDirection({ custom: 1, enterX: 80, exitX: -80 });

    fireEvent.click(screen.getByRole("button", { name: "Next project" }));
    expect(
      screen.getByRole("heading", {
        name: "Cognitive Behavior Intelligence — AI Governance Platform",
      })
    ).toBeTruthy();
    expectDirection({ custom: 1, enterX: 80, exitX: -80 });
  });

  it("moves Previous backward and wraps from the first project to the last", () => {
    render(<ProjectDeck />);

    fireEvent.click(screen.getByRole("button", { name: "Previous project" }));
    expect(
      screen.getByRole("heading", { name: "CodeIAK — Local AI Coding Agent" })
    ).toBeTruthy();
    expectDirection({ custom: -1, enterX: -80, exitX: 80 });
  });

  it("keeps the latest direction through Next, Previous, Next", () => {
    render(<ProjectDeck />);

    fireEvent.click(screen.getByRole("button", { name: "Next project" }));
    expectDirection({ custom: 1, enterX: 80, exitX: -80 });

    fireEvent.click(screen.getByRole("button", { name: "Previous project" }));
    expectDirection({ custom: -1, enterX: -80, exitX: 80 });

    fireEvent.click(screen.getByRole("button", { name: "Next project" }));
    expectDirection({ custom: 1, enterX: 80, exitX: -80 });
  });

  it("derives direction from indicator navigation", () => {
    render(<ProjectDeck />);

    fireEvent.click(screen.getByRole("button", { name: "Show project 2" }));
    expectDirection({ custom: 1, enterX: 80, exitX: -80 });

    fireEvent.click(screen.getByRole("button", { name: "Show project 1" }));
    expectDirection({ custom: -1, enterX: -80, exitX: 80 });
  });
});
