import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import OtherAilments from "@/components/screening/OtherAilments";

describe("TC-17.5: Custom Fields", () => {
  /**
   * AC1:
   * Users must be able to create multiple custom fields.
   */
  it("should allow the user to add multiple custom fields", () => {
    const { getByText, getAllByTestId } = render(<OtherAilments />);

    fireEvent.press(getByText("Add Field"));
    fireEvent.press(getByText("Add Field"));

    expect(getAllByTestId("custom-field").length).toBe(2);
  });

  /**
   * AC2:
   * Each custom field must allow a name and description.
   */
  it("should allow the user to enter a name and description for a custom field", () => {
    const { getByText, getAllByTestId } = render(<OtherAilments />);

    fireEvent.press(getByText("Add Field"));

    const fieldNames = getAllByTestId("field-name");
    const fieldDescriptions = getAllByTestId("field-description");

    fireEvent.changeText(fieldNames[0], "Blood Sugar");
    fireEvent.changeText(
      fieldDescriptions[0],
      "Fasting Blood Sugar Result"
    );

    expect(fieldNames[0].props.value).toBe("Blood Sugar");
    expect(fieldDescriptions[0].props.value).toBe(
      "Fasting Blood Sugar Result"
    );
  });

  /**
   * AC3:
   * Custom fields must remain editable before saving.
   */
  it("should allow the user to edit a custom field before saving", () => {
    const { getByText, getAllByTestId } = render(<OtherAilments />);

    fireEvent.press(getByText("Add Field"));

    const fieldNames = getAllByTestId("field-name");

    fireEvent.changeText(fieldNames[0], "Blood Sugar");
    fireEvent.changeText(fieldNames[0], "HbA1c");

    expect(fieldNames[0].props.value).toBe("HbA1c");
  });
});