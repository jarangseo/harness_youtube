import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

describe("testing-library renders", () => {
  it("renders a heading", () => {
    render(<h1>hello</h1>);
    expect(screen.getByRole("heading", { name: "hello" })).toBeInTheDocument();
  });
});
