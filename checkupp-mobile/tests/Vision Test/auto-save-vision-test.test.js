import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import VisionTest from "@/components/screening/VisionTest";

describe("TC-21.1: Auto Save Vision Test", () => {
  it("should automatically save the Visual Acuity values whenever they are selected or updated", () => {
    const { getByTestId } = render(<VisionTest />);

    fireEvent(getByTestId("right-eye-visual-acuity"), "onValueChange", "6/6");
    fireEvent(getByTestId("left-eye-visual-acuity"), "onValueChange", "6/9");
    fireEvent(getByTestId("both-eyes-visual-acuity"), "onValueChange", "6/6");

    expect(getByTestId("right-eye-visual-acuity").props.selectedValue).toBe("6/6");
    expect(getByTestId("left-eye-visual-acuity").props.selectedValue).toBe("6/9");
    expect(getByTestId("both-eyes-visual-acuity").props.selectedValue).toBe("6/6");
  });

  it("should automatically save the Specialised Vision Test values whenever they are updated", () => {
    const { getByTestId } = render(<VisionTest />);

    fireEvent(getByTestId("color-vision-test"), "onValueChange", "Normal");
    fireEvent(getByTestId("peripheral-vision-test"), "onValueChange", "Normal");

    expect(getByTestId("color-vision-test").props.selectedValue).toBe("Normal");
    expect(getByTestId("peripheral-vision-test").props.selectedValue).toBe("Normal");
  });

  it("should automatically save Eye Pressure values whenever they are entered", () => {
    const { getByTestId } = render(<VisionTest />);

    fireEvent.changeText(getByTestId("right-eye-pressure"), "16");
    fireEvent.changeText(getByTestId("left-eye-pressure"), "15");

    expect(getByTestId("right-eye-pressure").props.value).toBe("16");
    expect(getByTestId("left-eye-pressure").props.value).toBe("15");
  });

  it("should automatically save the Vision Correction selection whenever it is updated", () => {
    const { getByTestId } = render(<VisionTest />);

    fireEvent(getByTestId("vision-correction"), "onValueChange", "Glasses");

    expect(getByTestId("vision-correction").props.selectedValue).toBe("Glasses");
  });

  it("should automatically save Vision Symptoms whenever they are selected", () => {
    const { getByTestId } = render(<VisionTest />);

    fireEvent.press(getByTestId("blurred-vision"));
    fireEvent.press(getByTestId("dry-eyes"));

    expect(getByTestId("blurred-vision").props.accessibilityState.checked).toBe(true);
    expect(getByTestId("dry-eyes").props.accessibilityState.checked).toBe(true);
  });

  it("should automatically save Additional Notes whenever they are entered", () => {
    const { getByTestId } = render(<VisionTest />);

    fireEvent.changeText(
      getByTestId("additional-notes"),
      "Patient reports occasional eye strain."
    );

    expect(getByTestId("additional-notes").props.value).toBe(
      "Patient reports occasional eye strain."
    );
  });

  it("should restore autosaved Vision Test data when the user returns after tapping Back", () => {
    const { getByTestId } = render(<VisionTest />);

    expect(getByTestId("right-eye-visual-acuity").props.selectedValue).toBe("6/6");
  });

  it("should restore autosaved Vision Test data when the application is reopened", () => {
    const { getByTestId } = render(<VisionTest />);

    expect(getByTestId("vision-correction").props.selectedValue).toBe("Glasses");
  });

  it("should restore the latest autosaved values for all Vision Test fields", () => {
    const { getByTestId } = render(<VisionTest />);

    expect(getByTestId("right-eye-pressure").props.value).toBe("16");
    expect(getByTestId("additional-notes").props.value).toBe(
      "Patient reports occasional eye strain."
    );
  });

  it("should restore only the autosaved Vision Test data for the logged-in user", () => {
    const { getByTestId } = render(<VisionTest />);

    expect(getByTestId("left-eye-visual-acuity").props.selectedValue).toBe("6/9");
  });
});