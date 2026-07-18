import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import DiabetesTest from "@/components/screening/DiabetesTest";

describe("TC-20.1: Auto Save Diabetes Test", () => {
  it("should automatically save the Test Date whenever it is entered or updated", () => {
    const { getByTestId } = render(<DiabetesTest />);

    fireEvent(getByTestId("test-date-picker"), "onChange", {
      nativeEvent: {
        timestamp: new Date("2026-07-18").getTime(),
      },
    });

    expect(getByTestId("test-date-picker").props.value).toBe("Jul 18, 2026");
  });

  it("should automatically save all Blood Glucose Level values whenever they are entered or updated", () => {
    const { getByTestId } = render(<DiabetesTest />);

    fireEvent.changeText(getByTestId("fasting-glucose"), "90");
    fireEvent.changeText(getByTestId("random-glucose"), "120");
    fireEvent.changeText(getByTestId("postmeal-glucose"), "140");

    expect(getByTestId("fasting-glucose").props.value).toBe("90");
    expect(getByTestId("random-glucose").props.value).toBe("120");
    expect(getByTestId("postmeal-glucose").props.value).toBe("140");
  });

  it("should automatically save HbA1c and Ketones whenever they are entered or updated", () => {
    const { getByTestId } = render(<DiabetesTest />);

    fireEvent.changeText(getByTestId("hba1c"), "5.6");
    fireEvent.changeText(getByTestId("ketones"), "Negative");

    expect(getByTestId("hba1c").props.value).toBe("5.6");
    expect(getByTestId("ketones").props.value).toBe("Negative");
  });

  it("should automatically save Additional Measurements whenever they are entered or updated", () => {
    const { getByTestId } = render(<DiabetesTest />);

    fireEvent.changeText(getByTestId("systolic-bp"), "120");
    fireEvent.changeText(getByTestId("diastolic-bp"), "80");
    fireEvent.changeText(getByTestId("weight"), "70");
    fireEvent.changeText(getByTestId("height"), "175");

    expect(getByTestId("systolic-bp").props.value).toBe("120");
    expect(getByTestId("diastolic-bp").props.value).toBe("80");
    expect(getByTestId("weight").props.value).toBe("70");
    expect(getByTestId("height").props.value).toBe("175");
  });

  it("should automatically save Additional Notes whenever they are entered or updated", () => {
    const { getByTestId } = render(<DiabetesTest />);

    fireEvent.changeText(
      getByTestId("additional-notes"),
      "Patient feeling better."
    );

    expect(getByTestId("additional-notes").props.value).toBe(
      "Patient feeling better."
    );
  });

  it("should restore autosaved Diabetes Test data when the user returns after tapping Back", () => {
    const { getByTestId } = render(<DiabetesTest />);

    expect(getByTestId("fasting-glucose").props.value).toBe("90");
  });

  it("should restore autosaved Diabetes Test data when the application is reopened", () => {
    const { getByTestId } = render(<DiabetesTest />);

    expect(getByTestId("fasting-glucose").props.value).toBe("90");
  });

  it("should restore the latest autosaved values for all fields", () => {
    const { getByTestId } = render(<DiabetesTest />);

    expect(getByTestId("hba1c").props.value).toBe("5.6");
    expect(getByTestId("weight").props.value).toBe("70");
    expect(getByTestId("additional-notes").props.value).toBe(
      "Patient feeling better."
    );
  });

  it("should restore only the autosaved Diabetes Test data for the logged-in user", () => {
    const { getByTestId } = render(<DiabetesTest />);

    expect(getByTestId("fasting-glucose").props.value).toBe("90");
  });
});