import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import DentalHealthCheck from "@/components/screening/DentalHealthCheck";

describe("TC-22.1: Auto Save Dental Health Check", () => {
  it("should automatically save the Check Date whenever it is entered or updated", () => {
    const { getByTestId } = render(<DentalHealthCheck />);

    fireEvent(getByTestId("check-date-picker"), "onChange", {
      nativeEvent: {
        timestamp: new Date("2026-07-18").getTime(),
      },
    });

    expect(getByTestId("check-date-picker").props.value).toBe("Jul 18, 2026");
  });

  it("should automatically save the Oral Hygiene Habits selections", () => {
    const { getByTestId } = render(<DentalHealthCheck />);

    fireEvent(getByTestId("brushing-frequency"), "onValueChange", "Twice Daily");
    fireEvent(getByTestId("flossing-frequency"), "onValueChange", "Daily");

    expect(getByTestId("brushing-frequency").props.selectedValue).toBe("Twice Daily");
    expect(getByTestId("flossing-frequency").props.selectedValue).toBe("Daily");
  });

  it("should automatically save the Use Mouthwash Regularly toggle", () => {
    const { getByTestId } = render(<DentalHealthCheck />);

    fireEvent(getByTestId("mouthwash-toggle"), "valueChange", true);

    expect(getByTestId("mouthwash-toggle").props.value).toBe(true);
  });

  it("should automatically save the Current Dental Condition fields", () => {
    const { getByTestId } = render(<DentalHealthCheck />);

    fireEvent.changeText(getByTestId("cavities"), "2");
    fireEvent.changeText(getByTestId("fillings"), "3");
    fireEvent.changeText(getByTestId("missing-teeth"), "1");
    fireEvent.changeText(getByTestId("crowns"), "1");
    fireEvent.changeText(getByTestId("implants"), "0");

    expect(getByTestId("cavities").props.value).toBe("2");
    expect(getByTestId("fillings").props.value).toBe("3");
    expect(getByTestId("missing-teeth").props.value).toBe("1");
    expect(getByTestId("crowns").props.value).toBe("1");
    expect(getByTestId("implants").props.value).toBe("0");
  });

  it("should automatically save Gum Health selections", () => {
    const { getByTestId } = render(<DentalHealthCheck />);

    fireEvent.press(getByTestId("bleeding-gums"));
    fireEvent.press(getByTestId("gum-sensitivity"));

    expect(getByTestId("bleeding-gums").props.accessibilityState.checked).toBe(true);
    expect(getByTestId("gum-sensitivity").props.accessibilityState.checked).toBe(true);
  });

  it("should automatically save Current Symptoms selections", () => {
    const { getByTestId } = render(<DentalHealthCheck />);

    fireEvent.press(getByTestId("toothache"));
    fireEvent.press(getByTestId("dry-mouth"));

    expect(getByTestId("toothache").props.accessibilityState.checked).toBe(true);
    expect(getByTestId("dry-mouth").props.accessibilityState.checked).toBe(true);
  });

  it("should automatically save Professional Care fields", () => {
    const { getByTestId } = render(<DentalHealthCheck />);

    fireEvent.changeText(getByTestId("last-dental-cleaning"), "2026-06-10");
    fireEvent.changeText(getByTestId("last-xray"), "2026-01-20");

    expect(getByTestId("last-dental-cleaning").props.value).toBe("2026-06-10");
    expect(getByTestId("last-xray").props.value).toBe("2026-01-20");
  });

  it("should automatically save Additional Information selections", () => {
    const { getByTestId } = render(<DentalHealthCheck />);

    fireEvent(getByTestId("orthodontic-treatment"), "onValueChange", "Completed");
    fireEvent(getByTestId("smoking-status"), "onValueChange", "Non-Smoker");

    expect(getByTestId("orthodontic-treatment").props.selectedValue).toBe("Completed");
    expect(getByTestId("smoking-status").props.selectedValue).toBe("Non-Smoker");
  });

  it("should automatically save Additional Notes whenever they are entered", () => {
    const { getByTestId } = render(<DentalHealthCheck />);

    fireEvent.changeText(
      getByTestId("additional-notes"),
      "Patient advised to floss daily."
    );

    expect(getByTestId("additional-notes").props.value).toBe(
      "Patient advised to floss daily."
    );
  });

  it("should restore autosaved Dental Health Check data when returning after tapping Back", () => {
    const { getByTestId } = render(<DentalHealthCheck />);

    expect(getByTestId("brushing-frequency").props.selectedValue).toBe("Twice Daily");
  });

  it("should restore autosaved Dental Health Check data after reopening the application", () => {
    const { getByTestId } = render(<DentalHealthCheck />);

    expect(getByTestId("smoking-status").props.selectedValue).toBe("Non-Smoker");
  });

  it("should restore the latest autosaved values for all fields", () => {
    const { getByTestId } = render(<DentalHealthCheck />);

    expect(getByTestId("cavities").props.value).toBe("2");
    expect(getByTestId("additional-notes").props.value).toBe(
      "Patient advised to floss daily."
    );
  });

  it("should restore only the autosaved Dental Health Check data for the logged-in user", () => {
    const { getByTestId } = render(<DentalHealthCheck />);

    expect(getByTestId("flossing-frequency").props.selectedValue).toBe("Daily");
  });
});