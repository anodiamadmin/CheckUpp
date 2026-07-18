import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import OtherAilments from "@/components/screening/OtherAilments";

describe("TC-17.2: Condition Selection and Custom Condition Entry", () => {
  /**
   * AC1:
   * Users must be able to select a predefined condition.
   */
  it("should allow the user to select a predefined condition", () => {
    const { getByTestId, getByText } = render(<OtherAilments />);

    fireEvent.press(getByTestId("condition-dropdown"));

    fireEvent.press(getByText("Vitamin D Deficiency"));

    expect(getByText("Vitamin D Deficiency")).toBeTruthy();
  });

  /**
   * AC2:
   * Users must be able to enter a custom condition name.
   */
  it("should allow the user to enter a custom condition name", () => {
    const { getByPlaceholderText } = render(<OtherAilments />);

    const customCondition = getByPlaceholderText(
      "Can't find it? Type your condition"
    );

    fireEvent.changeText(customCondition, "Thyroid Disorder");

    expect(customCondition.props.value).toBe("Thyroid Disorder");
  });

  /**
   * AC3 (Predefined Condition):
   * The selected predefined condition must be saved.
   */
  it("should save the selected predefined condition", () => {
    const { getByTestId, getByText } = render(<OtherAilments />);

    fireEvent.press(getByTestId("condition-dropdown"));
    fireEvent.press(getByText("Vitamin D Deficiency"));

    fireEvent.press(getByText("Save Health Check"));

    expect(getByText("Vitamin D Deficiency")).toBeTruthy();
  });

  /**
   * AC3 (Custom Condition):
   * The entered custom condition must be saved.
   */
  it("should save the entered custom condition name", () => {
    const { getByPlaceholderText, getByText } = render(
      <OtherAilments />
    );

    const customCondition = getByPlaceholderText(
      "Can't find it? Type your condition"
    );

    fireEvent.changeText(customCondition, "Thyroid Disorder");

    fireEvent.press(getByText("Save Health Check"));

    expect(customCondition.props.value).toBe("Thyroid Disorder");
  });
});