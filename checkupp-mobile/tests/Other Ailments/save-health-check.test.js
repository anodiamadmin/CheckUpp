import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import OtherAilments from "@/components/screening/OtherAilments";

describe("TC-17.8: Save Health Check", () => {
  /**
   * AC1:
   * Saving the health check must store all entered information.
   */
  it("should save all entered health check information", () => {
    const { getByTestId, getByText } = render(<OtherAilments />);

    fireEvent.changeText(
      getByTestId("condition-name"),
      "Vitamin D Deficiency"
    );

    fireEvent.press(getByText("Save Health Check"));

    expect(getByTestId("condition-name").props.value).toBe(
      "Vitamin D Deficiency"
    );
  });

  /**
   * AC2:
   * A confirmation message must be displayed after saving.
   */
  it("should display a confirmation message after successfully saving the health check", () => {
    const { getByText, queryByText } = render(<OtherAilments />);

    fireEvent.press(getByText("Save Health Check"));

    expect(
      queryByText("Health Check Saved Successfully")
    ).toBeTruthy();
  });

  /**
   * AC3:
   * The saved record must appear in Health Check History.
   */
  it("should display the saved health check in Health Check History", () => {
    const { getByText, queryByText } = render(<OtherAilments />);

    fireEvent.press(getByText("Save Health Check"));

    fireEvent.press(getByText("Health Check History"));

    expect(
      queryByText("Vitamin D Deficiency")
    ).toBeTruthy();
  });
});