import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import OtherAilments from "@/components/screening/OtherAilments";

describe("TC-17.9: Calendar Synchronisation", () => {
  /**
   * AC1:
   * Selecting Add to Calendar must open the calendar sync flow.
   */
  it("should open the calendar sync flow when Add to Calendar is tapped", () => {
    const { getByText, getByTestId } = render(<OtherAilments />);

    fireEvent.press(getByText("Add to Calendar"));

    expect(getByTestId("calendar-sync-screen")).toBeTruthy();
  });

  /**
   * AC2:
   * Appointment details must be added to the selected calendar.
   */
  it("should add the appointment details to the selected calendar", () => {
    const { getByText, getByTestId } = render(<OtherAilments />);

    fireEvent.press(getByText("Add to Calendar"));

    fireEvent.press(getByText("My Calendar"));

    fireEvent.press(getByText("Confirm"));

    expect(getByTestId("calendar-sync-status").props.children).toBe(
      "Appointment added to My Calendar"
    );
  });

  /**
   * AC3:
   * A confirmation message must be displayed after successful calendar synchronisation.
   */
  it("should display a confirmation message after successful calendar synchronisation", () => {
    const { getByText, queryByText } = render(<OtherAilments />);

    fireEvent.press(getByText("Add to Calendar"));

    fireEvent.press(getByText("My Calendar"));

    fireEvent.press(getByText("Confirm"));

    expect(
      queryByText("Appointment successfully added to your calendar")
    ).toBeTruthy();
  });
});