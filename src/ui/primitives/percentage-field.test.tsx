import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PercentageField } from "./percentage-field";

afterEach(cleanup);

describe("PercentageField", () => {
  it("accepts a zero reserve and custom percentages", () => {
    const onValueChange = vi.fn();
    render(<PercentageField value={0.15} onValueChange={onValueChange} label="Reserve" />);
    const input = screen.getByRole("spinbutton", { name: "Reserve" });
    fireEvent.change(input, { target: { value: "0" } });
    expect(onValueChange).toHaveBeenLastCalledWith(0);
    fireEvent.change(input, { target: { value: "7.5" } });
    expect(onValueChange).toHaveBeenLastCalledWith(0.075);
  });

  it("clamps an out-of-range value when focus leaves the field", () => {
    const onValueChange = vi.fn();
    render(<PercentageField value={0.1} onValueChange={onValueChange} label="Reserve" />);
    const input = screen.getByRole("spinbutton", { name: "Reserve" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "140" } });
    fireEvent.blur(input);
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    expect(input).toHaveValue(100);
  });
});
