import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import Toast from "react-native-toast-message";
import CardiovascularReading from "@/app/path/to/CardiovascularReading";
import { getAutosavedCardiovascularData } from "@/lib/features/cardiovascular";

jest.mock("@/lib/features/cardiovascular", () => ({
  getAutosavedCardiovascularData: jest.fn(),
}));

jest.mock("react-native-toast-message", () => ({
  show: jest.fn(),
}));

describe("Requirement 19.2 - Restore Autosaved Cardiovascular Reading", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * TC-19.2.1
   * Previously autosaved data is restored automatically
   */
  it("should automatically restore previously autosaved cardiovascular data when the screen is reopened", async () => {
    getAutosavedCardiovascularData.mockResolvedValue({
      systolic: "120",
      diastolic: "80",
      heartRate: "72",
      ecgResult: "Normal",
      total: "200",
      ldl: "100",
      hdl: "40",
      triglycerides: "150",
    });

    const { getByDisplayValue } = render(<CardiovascularReading />);

    await waitFor(() => {
      expect(getByDisplayValue("120")).toBeTruthy();
      expect(getByDisplayValue("80")).toBeTruthy();
      expect(getByDisplayValue("72")).toBeTruthy();
      expect(getByDisplayValue("200")).toBeTruthy();
      expect(getByDisplayValue("100")).toBeTruthy();
      expect(getByDisplayValue("40")).toBeTruthy();
      expect(getByDisplayValue("150")).toBeTruthy();
    });
  });

  /**
   * TC-19.2.2
   * Show Data restored toast
   */
  it("should display a 'Data restored' toast after successfully restoring autosaved data", async () => {
    getAutosavedCardiovascularData.mockResolvedValue({
      systolic: "120",
    });

    render(<CardiovascularReading />);

    await waitFor(() => {
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          text1: "Data restored",
        })
      );
    });
  });

  /**
   * TC-19.2.3
   * Do not show toast when no saved data exists
   */
  it("should not display the 'Data restored' toast when no autosaved data exists", async () => {
    getAutosavedCardiovascularData.mockResolvedValue(null);

    render(<CardiovascularReading />);

    await waitFor(() => {
      expect(Toast.show).not.toHaveBeenCalled();
    });
  });

  /**
   * TC-19.2.4
   * Restore latest autosaved values
   */
  it("should restore the latest autosaved values exactly as they were saved", async () => {
    const latestData = {
      systolic: "130",
      diastolic: "85",
      heartRate: "78",
      ecgResult: "Abnormal",
      total: "220",
      ldl: "120",
      hdl: "45",
      triglycerides: "160",
    };

    getAutosavedCardiovascularData.mockResolvedValue(latestData);

    const { getByDisplayValue } = render(<CardiovascularReading />);

    await waitFor(() => {
      expect(getByDisplayValue(latestData.systolic)).toBeTruthy();
      expect(getByDisplayValue(latestData.diastolic)).toBeTruthy();
      expect(getByDisplayValue(latestData.heartRate)).toBeTruthy();
      expect(getByDisplayValue(latestData.total)).toBeTruthy();
      expect(getByDisplayValue(latestData.ldl)).toBeTruthy();
      expect(getByDisplayValue(latestData.hdl)).toBeTruthy();
      expect(getByDisplayValue(latestData.triglycerides)).toBeTruthy();
    });
  });

  /**
   * TC-19.2.5
   * Restore occurs automatically without user interaction
   */
  it("should restore saved data automatically without requiring any user interaction", async () => {
    getAutosavedCardiovascularData.mockResolvedValue({
      systolic: "120",
      diastolic: "80",
    });

    const { getByDisplayValue } = render(<CardiovascularReading />);

    await waitFor(() => {
      expect(getByDisplayValue("120")).toBeTruthy();
      expect(getByDisplayValue("80")).toBeTruthy();
    });

    expect(getAutosavedCardiovascularData).toHaveBeenCalledTimes(1);
  });
});