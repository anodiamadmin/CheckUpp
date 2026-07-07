import { ApiClientError, apiRequest } from "@/lib/api/client";

const parseCheckupDates = (value: unknown) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

export const savePregnancyPlannerData = async (data: any) => {
  try {
    if (!data.conceptionDate || !data.expectedDueDate) {
      throw new Error(
        "Both conception date and expected due date are required",
      );
    }

    // Ensure dates are Date objects
    const conceptionDate =
      data.conceptionDate instanceof Date
        ? data.conceptionDate
        : new Date(data.conceptionDate);
    const expectedDueDate =
      data.expectedDueDate instanceof Date
        ? data.expectedDueDate
        : new Date(data.expectedDueDate);

    // Validate date objects
    if (isNaN(conceptionDate.getTime()) || isNaN(expectedDueDate.getTime())) {
      throw new Error("Invalid date format provided");
    }

    const payload = {
      conceptionDate: conceptionDate.toISOString(),
      expectedDueDate: expectedDueDate.toISOString(),
      estimatedCheckupDates: parseCheckupDates(data.estimatedCheckUpDates),
    };

    const response = await apiRequest<any>("/me/pregnancy-plan", {
      method: "PUT",
      body: payload,
    });

    return response.data;
  } catch (error: any) {
    console.error("Error saving pregnancy planner data:", error.message);
    throw new Error(error.message || error);
  }
};

export const fetchUserPregnancyData = async (_userId: string) => {
  try {
    const response = await apiRequest<any>("/me/pregnancy-plan");
    return response.data ? [response.data] : [];
  } catch (error: any) {
    if (error instanceof ApiClientError && error.status === 404) {
      return [];
    }

    console.error("Error fetching pregnancy planner data:", error.message);
    throw new Error(error);
  }
};

export const markCheckupAsCompleted = async (
  _userId: string,
  checkupName: string,
) => {
  try {
    const response = await apiRequest<any>(
      `/me/pregnancy-plan/checkups/${encodeURIComponent(checkupName)}`,
      {
        method: "PATCH",
        body: {
          cascadeMode: "current_and_prior",
        },
      },
    );

    return response.data;
  } catch (error: any) {
    console.error("Error updating checkup status:", error.message);
    throw new Error(error);
  }
};

export const deletePregnancyData = async (_userId: string) => {
  try {
    const response = await apiRequest<{ id: string }>("/me/pregnancy-plan", {
      method: "DELETE",
    });

    return response.data;
  } catch (error: any) {
    if (error instanceof ApiClientError && error.status === 404) {
      return null;
    }

    console.error("Error deleting pregnancy data:", error.message);
    throw new Error(error);
  }
};
