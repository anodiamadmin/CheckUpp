import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import CardiovascularHealth from "../../components/screening/CardiovascularHealth";

// Mock autosave service
jest.mock("@/services/cardiovascularService", () => ({
  autoSaveCardiovascularReading: jest.fn(),
}));

import { autoSaveCardiovascularReading } from "@/services/cardiovascularService";

describe("Requirement 19.1 - Cardiovascular Reading Auto Save", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * TC-19.1.1
   * Verify Systolic value is autosaved
   */
  it("should automatically save Systolic whenever the value is entered", async () => {
    const { getByTestId } = render(<CardiovascularReading />);

    fireEvent.changeText(getByTestId("input-systolic"), "120");

    await waitFor(() => {
      expect(autoSaveCardiovascularReading).toHaveBeenCalledWith(
        expect.objectContaining({
          systolic: "120",
        })
      );
    });
  });

  /**
   * TC-19.1.2
   * Verify Diastolic value is autosaved
   */
  it("should automatically save Diastolic whenever the value is entered", async () => {
    const { getByTestId } = render(<CardiovascularReading />);

    fireEvent.changeText(getByTestId("input-diastolic"), "80");

    await waitFor(() => {
      expect(autoSaveCardiovascularReading).toHaveBeenCalledWith(
        expect.objectContaining({
          diastolic: "80",
        })
      );
    });
  });

  /**
   * TC-19.1.3
   * Verify Heart Rate value is autosaved
   */
  it("should automatically save Heart Rate whenever the value is entered", async () => {
    const { getByTestId } = render(<CardiovascularReading />);

    fireEvent.changeText(getByTestId("input-heart-rate"), "72");

    await waitFor(() => {
      expect(autoSaveCardiovascularReading).toHaveBeenCalledWith(
        expect.objectContaining({
          heartRate: "72",
        })
      );
    });
  });

  /**
   * TC-19.1.4
   * Verify updating Blood Pressure values triggers autosave
   */
  it("should automatically save updated blood pressure values", async () => {
    const { getByTestId } = render(<CardiovascularReading />);

    fireEvent.changeText(getByTestId("input-systolic"), "130");
    fireEvent.changeText(getByTestId("input-diastolic"), "85");
    fireEvent.changeText(getByTestId("input-heart-rate"), "76");

    await waitFor(() => {
      expect(autoSaveCardiovascularReading).toHaveBeenCalledWith(
        expect.objectContaining({
          systolic: "130",
          diastolic: "85",
          heartRate: "76",
        })
      );
    });
  });

  /**
   * TC-19.1.5
   * Verify ECG Result (Normal) is autosaved
   */
  it("should automatically save ECG Result when Normal is selected", async () => {
    const { getByTestId } = render(<CardiovascularReading />);

    fireEvent.press(getByTestId("ecg-normal"));

    await waitFor(() => {
      expect(autoSaveCardiovascularReading).toHaveBeenCalledWith(
        expect.objectContaining({
          ecgResult: "Normal",
        })
      );
    });
  });

  /**
   * TC-19.1.6
   * Verify ECG Result (Abnormal) is autosaved
   */
  it("should automatically save ECG Result when Abnormal is selected", async () => {
    const { getByTestId } = render(<CardiovascularReading />);

    fireEvent.press(getByTestId("ecg-abnormal"));

    await waitFor(() => {
      expect(autoSaveCardiovascularReading).toHaveBeenCalledWith(
        expect.objectContaining({
          ecgResult: "Abnormal",
        })
      );
    });
  });

  /**
   * TC-19.1.7
   * Verify ECG Result (Not Done) is autosaved
   */
  it("should automatically save ECG Result when Not Done is selected", async () => {
    const { getByTestId } = render(<CardiovascularReading />);

    fireEvent.press(getByTestId("ecg-not-done"));

    await waitFor(() => {
      expect(autoSaveCardiovascularReading).toHaveBeenCalledWith(
        expect.objectContaining({
          ecgResult: "Not Done",
        })
      );
    });
  });

  /**
   * TC-19.1.8
   * Verify Total Cholesterol autosave
   */
  it("should automatically save Total Cholesterol", async () => {
    const { getByTestId } = render(<CardiovascularReading />);

    fireEvent.changeText(getByTestId("input-total"), "200");

    await waitFor(() => {
      expect(autoSaveCardiovascularReading).toHaveBeenCalledWith(
        expect.objectContaining({
          total: "200",
        })
      );
    });
  });

  /**
   * TC-19.1.9
   * Verify LDL autosave
   */
  it("should automatically save LDL", async () => {
    const { getByTestId } = render(<CardiovascularReading />);

    fireEvent.changeText(getByTestId("input-ldl"), "100");

    await waitFor(() => {
      expect(autoSaveCardiovascularReading).toHaveBeenCalledWith(
        expect.objectContaining({
          ldl: "100",
        })
      );
    });
  });

  /**
   * TC-19.1.10
   * Verify HDL autosave
   */
  it("should automatically save HDL", async () => {
    const { getByTestId } = render(<CardiovascularReading />);

    fireEvent.changeText(getByTestId("input-hdl"), "40");

    await waitFor(() => {
      expect(autoSaveCardiovascularReading).toHaveBeenCalledWith(
        expect.objectContaining({
          hdl: "40",
        })
      );
    });
  });

  /**
   * TC-19.1.11
   * Verify Triglycerides autosave
   */
  it("should automatically save Triglycerides", async () => {
    const { getByTestId } = render(<CardiovascularReading />);

    fireEvent.changeText(getByTestId("input-triglycerides"), "150");

    await waitFor(() => {
      expect(autoSaveCardiovascularReading).toHaveBeenCalledWith(
        expect.objectContaining({
          triglycerides: "150",
        })
      );
    });
  });

  /**
   * TC-19.1.12
   * Verify all cardiovascular values are autosaved together
   */
  it("should automatically save all cardiovascular data after user updates multiple fields", async () => {
    const { getByTestId } = render(<CardiovascularReading />);

    fireEvent.changeText(getByTestId("input-systolic"), "120");
    fireEvent.changeText(getByTestId("input-diastolic"), "80");
    fireEvent.changeText(getByTestId("input-heart-rate"), "72");

    fireEvent.press(getByTestId("ecg-normal"));

    fireEvent.changeText(getByTestId("input-total"), "200");
    fireEvent.changeText(getByTestId("input-ldl"), "100");
    fireEvent.changeText(getByTestId("input-hdl"), "40");
    fireEvent.changeText(getByTestId("input-triglycerides"), "150");

    await waitFor(() => {
      expect(autoSaveCardiovascularReading).toHaveBeenCalledWith(
        expect.objectContaining({
          systolic: "120",
          diastolic: "80",
          heartRate: "72",
          ecgResult: "Normal",
          total: "200",
          ldl: "100",
          hdl: "40",
          triglycerides: "150",
        })
      );
    });
  });
});