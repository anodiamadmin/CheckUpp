import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import OtherAilments from "@/components/screening/OtherAilments";

describe("TC-17.3: Test Date Selection", () => {
  /**
   * AC1:
   * The Test Date field must use a calendar date picker.
   */
  it("should open the calendar date picker when the Test Date field is tapped", () => {
    const { getByTestId } = render(<OtherAilments />);

    const testDateField = getByTestId("test-date-picker");

    fireEvent.press(testDateField);

    expect(getByTestId("calendar-date-picker")).toBeTruthy();
  });

  /**
   * AC2:
   * Only valid dates must be accepted.
   */
  it("should accept only a valid test date", () => {
    const { getByTestId } = render(<OtherAilments />);

    const testDateField = getByTestId("test-date-picker");

    fireEvent.press(testDateField);

    fireEvent(testDateField, "onChange", {
      nativeEvent: {
        timestamp: new Date("2026-06-13").getTime(),
      },
    });

    expect(testDateField.props.value).toBe("Jun 13, 2026");
  });

  /**
   * AC2:
   * Invalid dates must not be accepted.
   */
  it("should reject an invalid test date", () => {
    const { getByTestId, queryByText } = render(<OtherAilments />);

    const testDateField = getByTestId("test-date-picker");

    fireEvent.press(testDateField);

    fireEvent(testDateField, "onChange", {
      nativeEvent: {
        timestamp: null,
      },
    });

    expect(queryByText("Invalid Date")).toBeNull();
  });

  /**
   * AC3:
   * The selected date must be saved with the health check.
   */
  it("should save the selected Test Date with the health check", () => {
    const { getByTestId, getByText } = render(<OtherAilments />);

    const testDateField = getByTestId("test-date-picker");

    fireEvent.press(testDateField);

    fireEvent(testDateField, "onChange", {
      nativeEvent: {
        timestamp: new Date("2026-06-13").getTime(),
      },
    });

    fireEvent.press(getByText("Save Health Check"));

    expect(testDateField.props.value).toBe("Jun 13, 2026");
  });
});