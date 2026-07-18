import React from "react";
import { render } from "@testing-library/react-native";
import DentalHealthCheck from "@/components/screening/DentalHealthCheck";

describe("TC-22.2: Restore Autosaved Dental Health Check Data", () => {
  it("should automatically restore previously autosaved Dental Health Check data", () => {
    const { getByTestId } = render(<DentalHealthCheck />);

    expect(getByTestId("check-date-picker").props.value).toBe("Jul 18, 2026");
    expect(getByTestId("brushing-frequency").props.selectedValue).toBe("Twice Daily");
    expect(getByTestId("flossing-frequency").props.selectedValue).toBe("Daily");
    expect(getByTestId("mouthwash-toggle").props.value).toBe(true);
    expect(getByTestId("cavities").props.value).toBe("2");
    expect(getByTestId("fillings").props.value).toBe("3");
    expect(getByTestId("missing-teeth").props.value).toBe("1");
    expect(getByTestId("crowns").props.value).toBe("1");
    expect(getByTestId("implants").props.value).toBe("0");
    expect(getByTestId("last-dental-cleaning").props.value).toBe("2026-06-10");
    expect(getByTestId("last-xray").props.value).toBe("2026-01-20");
    expect(getByTestId("orthodontic-treatment").props.selectedValue).toBe("Completed");
    expect(getByTestId("smoking-status").props.selectedValue).toBe("Non-Smoker");
    expect(getByTestId("additional-notes").props.value).toBe(
      "Patient advised to floss daily."
    );
  });

  it("should display a 'Data restored' toast after restoring autosaved data", () => {
    const { queryByText } = render(<DentalHealthCheck />);

    expect(queryByText("Data restored")).toBeTruthy();
  });

  it("should not display the 'Data restored' toast when no autosaved data exists", () => {
    const { queryByText } = render(<DentalHealthCheck />);

    expect(queryByText("Data restored")).toBeNull();
  });

  it("should restore the latest autosaved values for all Dental Health Check fields", () => {
    const { getByTestId } = render(<DentalHealthCheck />);

    expect(getByTestId("cavities").props.value).toBe("2");
    expect(getByTestId("smoking-status").props.selectedValue).toBe("Non-Smoker");
    expect(getByTestId("additional-notes").props.value).toBe(
      "Patient advised to floss daily."
    );
  });

  it("should automatically restore data and display the confirmation without user interaction", () => {
    const { queryByText, getByTestId } = render(<DentalHealthCheck />);

    expect(queryByText("Data restored")).toBeTruthy();
    expect(getByTestId("brushing-frequency").props.selectedValue).toBe("Twice Daily");
  });
});