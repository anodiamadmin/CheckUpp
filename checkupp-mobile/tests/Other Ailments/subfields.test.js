import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import OtherAilments from "@/components/screening/OtherAilments";

describe("TC-17.6: Custom Field Subfields", () => {
  /**
   * AC1:
   * Users must be able to create multiple subfields.
   */
  it("should allow the user to add multiple subfields to a custom field", () => {
    const { getByText, getAllByTestId } = render(<OtherAilments />);

    fireEvent.press(getByText("Add Field"));

    fireEvent.press(getByText("Add Subfield"));
    fireEvent.press(getByText("Add Subfield"));

    expect(getAllByTestId("subfield").length).toBe(2);
  });

  /**
   * AC2:
   * Each subfield must support a name, value, unit and description.
   */
  it("should allow the user to enter a name, value, unit and description for a subfield", () => {
    const { getByText, getAllByTestId } = render(<OtherAilments />);

    fireEvent.press(getByText("Add Field"));
    fireEvent.press(getByText("Add Subfield"));

    const subfieldNames = getAllByTestId("subfield-name");
    const subfieldValues = getAllByTestId("subfield-value");
    const subfieldUnits = getAllByTestId("subfield-unit");
    const subfieldDescriptions = getAllByTestId("subfield-description");

    fireEvent.changeText(subfieldNames[0], "Glucose");
    fireEvent.changeText(subfieldValues[0], "105");
    fireEvent.changeText(subfieldUnits[0], "mg/dL");
    fireEvent.changeText(
      subfieldDescriptions[0],
      "Fasting Blood Glucose"
    );

    expect(subfieldNames[0].props.value).toBe("Glucose");
    expect(subfieldValues[0].props.value).toBe("105");
    expect(subfieldUnits[0].props.value).toBe("mg/dL");
    expect(subfieldDescriptions[0].props.value).toBe(
      "Fasting Blood Glucose"
    );
  });

  /**
   * AC3:
   * Subfields must remain linked to their parent field.
   */
  it("should keep subfields linked to their parent custom field", () => {
    const { getByText, getAllByTestId } = render(<OtherAilments />);

    fireEvent.press(getByText("Add Field"));
    fireEvent.press(getByText("Add Subfield"));

    const parentFields = getAllByTestId("custom-field");
    const subfields = getAllByTestId("subfield");

    expect(parentFields.length).toBe(1);
    expect(subfields.length).toBe(1);

    expect(subfields[0].props.parentFieldId).toBe(
      parentFields[0].props.testID
    );
  });
});