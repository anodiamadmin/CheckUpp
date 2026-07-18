import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import OtherAilments from "@/components/screening/OtherAilments";

describe("TC-17.4: Appointment Details", () => {
  /**
   * AC1:
   * Appointment Details must include appointment date, time and location.
   */
  it("should allow the user to enter appointment date, time and location", () => {
    const { getByTestId } = render(<OtherAilments />);

    fireEvent.press(getByTestId("appointment-date-picker"));

    fireEvent(
      getByTestId("appointment-date-picker"),
      "onChange",
      {
        nativeEvent: {
          timestamp: new Date("2026-07-20").getTime(),
        },
      }
    );

    fireEvent.changeText(
      getByTestId("appointment-time"),
      "10:30 AM"
    );

    fireEvent.changeText(
      getByTestId("appointment-location"),
      "City Medical Centre"
    );

    expect(
      getByTestId("appointment-date-picker").props.value
    ).toBe("Jul 20, 2026");

    expect(
      getByTestId("appointment-time").props.value
    ).toBe("10:30 AM");

    expect(
      getByTestId("appointment-location").props.value
    ).toBe("City Medical Centre");
  });

  /**
   * AC2:
   * Appointment information must be saved with the health check.
   */
  it("should save the appointment details with the health check", () => {
    const { getByTestId, getByText } = render(<OtherAilments />);

    fireEvent.changeText(
      getByTestId("appointment-time"),
      "10:30 AM"
    );

    fireEvent.changeText(
      getByTestId("appointment-location"),
      "City Medical Centre"
    );

    fireEvent.press(getByText("Save Health Check"));

    expect(
      getByTestId("appointment-time").props.value
    ).toBe("10:30 AM");

    expect(
      getByTestId("appointment-location").props.value
    ).toBe("City Medical Centre");
  });

  /**
   * AC3:
   * Calendar Sync must be available for appointments.
   */
  it("should display the Calendar Sync option for appointments", () => {
    const { getByText } = render(<OtherAilments />);

    expect(getByText("Add to Calendar")).toBeTruthy();
  });
});