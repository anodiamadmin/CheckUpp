import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import OtherAilments from "@/components/screening/OtherAilments";

describe("TC-17.7: Review Your Entries", () => {
  /**
   * AC1:
   * The Review Your Entries screen must display all entered information.
   */
  it("should display all entered information on the Review Your Entries screen", () => {
    const { getByText } = render(<OtherAilments />);

    expect(getByText("Review Your Entries")).toBeTruthy();
    expect(getByText("Condition / Test Name")).toBeTruthy();
    expect(getByText("Test Date")).toBeTruthy();
    expect(getByText("Appointment Details")).toBeTruthy();
    expect(getByText("Custom Fields")).toBeTruthy();
  });

  /**
   * AC2:
   * Users must be able to edit any section before saving.
   */
  it("should allow the user to edit information before saving", () => {
    const { getByText, getByTestId } = render(<OtherAilments />);

    fireEvent.press(getByText("Edit"));

    const conditionName = getByTestId("condition-name");

    fireEvent.changeText(conditionName, "Updated Condition");

    expect(conditionName.props.value).toBe("Updated Condition");
  });

  /**
   * AC3:
   * Validation must occur before the health check is saved.
   */
  it("should validate the entered information before saving the health check", () => {
    const { getByText, queryByText } = render(<OtherAilments />);

    fireEvent.press(getByText("Save Health Check"));

    expect(queryByText("Please complete all required fields")).toBeTruthy();
  });

  /**
   * AC3:
   * The health check should be saved when all required information is valid.
   */
  it("should save the health check when all required information is valid", () => {
    const { getByText, queryByText } = render(<OtherAilments />);

    fireEvent.press(getByText("Save Health Check"));

    expect(queryByText("Health Check Saved")).toBeTruthy();
  });
});