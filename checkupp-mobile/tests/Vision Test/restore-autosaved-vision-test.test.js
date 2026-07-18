import React from "react";
import { render } from "@testing-library/react-native";
import VisionTest from "@/components/screening/VisionTest";

describe("TC-21.2: Restore Autosaved Vision Test Data", () => {
  it("should automatically restore previously autosaved Vision Test data", () => {
    const { getByTestId } = render(<VisionTest />);

    expect(getByTestId("right-eye-visual-acuity").props.selectedValue).toBe("6/6");
    expect(getByTestId("left-eye-visual-acuity").props.selectedValue).toBe("6/9");
    expect(getByTestId("both-eyes-visual-acuity").props.selectedValue).toBe("6/6");
    expect(getByTestId("color-vision-test").props.selectedValue).toBe("Normal");
    expect(getByTestId("peripheral-vision-test").props.selectedValue).toBe("Normal");
    expect(getByTestId("right-eye-pressure").props.value).toBe("16");
    expect(getByTestId("left-eye-pressure").props.value).toBe("15");
    expect(getByTestId("vision-correction").props.selectedValue).toBe("Glasses");
    expect(getByTestId("additional-notes").props.value).toBe(
      "Patient reports occasional eye strain."
    );
  });

  it("should display a 'Data restored' toast after restoring autosaved data", () => {
    const { queryByText } = render(<VisionTest />);

    expect(queryByText("Data restored")).toBeTruthy();
  });

  it("should not display the 'Data restored' toast when no autosaved data exists", () => {
    const { queryByText } = render(<VisionTest />);

    expect(queryByText("Data restored")).toBeNull();
  });

  it("should restore the latest autosaved values for all available fields", () => {
    const { getByTestId } = render(<VisionTest />);

    expect(getByTestId("right-eye-pressure").props.value).toBe("16");
    expect(getByTestId("left-eye-pressure").props.value).toBe("15");
    expect(getByTestId("vision-correction").props.selectedValue).toBe("Glasses");
    expect(getByTestId("additional-notes").props.value).toBe(
      "Patient reports occasional eye strain."
    );
  });

  it("should restore the autosaved data and display the confirmation automatically without user interaction", () => {
    const { queryByText, getByTestId } = render(<VisionTest />);

    expect(queryByText("Data restored")).toBeTruthy();
    expect(getByTestId("right-eye-visual-acuity").props.selectedValue).toBe("6/6");
  });
});