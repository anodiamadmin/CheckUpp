import React from "react";
import { render } from "@testing-library/react-native";
import DiabetesTest from "@/components/screening/DiabetesTest";

describe("TC-20.2: Restore Autosaved Diabetes Test Data", () => {
  it("should automatically restore previously autosaved Diabetes Test data", () => {
    const { getByTestId } = render(<DiabetesTest />);

    expect(getByTestId("fasting-glucose").props.value).toBe("90");
    expect(getByTestId("random-glucose").props.value).toBe("120");
    expect(getByTestId("postmeal-glucose").props.value).toBe("140");
    expect(getByTestId("hba1c").props.value).toBe("5.6");
    expect(getByTestId("ketones").props.value).toBe("Negative");
    expect(getByTestId("systolic-bp").props.value).toBe("120");
    expect(getByTestId("diastolic-bp").props.value).toBe("80");
    expect(getByTestId("weight").props.value).toBe("70");
    expect(getByTestId("height").props.value).toBe("175");
    expect(getByTestId("additional-notes").props.value).toBe(
      "Patient feeling better."
    );
  });

  it("should display a 'Data restored' toast after restoring autosaved data", () => {
    const { queryByText } = render(<DiabetesTest />);

    expect(queryByText("Data restored")).toBeTruthy();
  });

  it("should not display the 'Data restored' toast when no autosaved data exists", () => {
    const { queryByText } = render(<DiabetesTest />);

    expect(queryByText("Data restored")).toBeNull();
  });

  it("should restore the latest autosaved values for all available fields", () => {
    const { getByTestId } = render(<DiabetesTest />);

    expect(getByTestId("fasting-glucose").props.value).toBe("90");
    expect(getByTestId("random-glucose").props.value).toBe("120");
    expect(getByTestId("postmeal-glucose").props.value).toBe("140");
    expect(getByTestId("hba1c").props.value).toBe("5.6");
    expect(getByTestId("ketones").props.value).toBe("Negative");
    expect(getByTestId("systolic-bp").props.value).toBe("120");
    expect(getByTestId("diastolic-bp").props.value).toBe("80");
    expect(getByTestId("weight").props.value).toBe("70");
    expect(getByTestId("height").props.value).toBe("175");
    expect(getByTestId("additional-notes").props.value).toBe(
      "Patient feeling better."
    );
  });

  it("should restore the autosaved data and display the confirmation automatically without user interaction", () => {
    const { queryByText, getByTestId } = render(<DiabetesTest />);

    expect(queryByText("Data restored")).toBeTruthy();
    expect(getByTestId("fasting-glucose").props.value).toBe("90");
  });
});