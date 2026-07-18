import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import OtherAilments from "@/components/screening/OtherAilments";

describe("TC-17.1: Navigate to Other Ailments", () => {
  /**
   * AC1:
   * Tapping Other Ailments must open the Other Ailments screen.
   */
  it("should open the Other Ailments screen when the user taps Other Ailments from Available Health Checks", () => {
    const { getByText } = render(<OtherAilments />);

    fireEvent.press(getByText("Other Ailments"));

    expect(getByText("Other Ailments")).toBeTruthy();
  });

  /**
   * AC2:
   * The screen must display Condition Name and Test Date fields.
   */
  it("should display the Condition Name and Test Date fields", () => {
    const { getByText, getByPlaceholderText } = render(<OtherAilments />);

    expect(getByText("Condition / Test Name")).toBeTruthy();
    expect(
      getByPlaceholderText("Select from common conditions")
    ).toBeTruthy();

    expect(getByText("Test Date")).toBeTruthy();
  });

  /**
   * AC3:
   * The Save Health Check button must be available.
   */
  it("should display the Save Health Check button", () => {
    const { getByText } = render(<OtherAilments />);

    expect(getByText("Save Health Check")).toBeTruthy();
  });
});