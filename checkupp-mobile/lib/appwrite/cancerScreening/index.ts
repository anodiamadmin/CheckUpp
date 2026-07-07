import { ApiClientError, apiRequest } from "@/lib/api/client";

const parseIfJsonString = (value: unknown) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const fetchUserCancerScreeningData = async (_userId: string) => {
  try {
    const response = await apiRequest<any>("/me/screenings/cancer-snapshot");
    return response.data ? [response.data] : [];
  } catch (error: any) {
    if (error instanceof ApiClientError && error.status === 404) {
      try {
        const seeded = await apiRequest<any>("/me/screenings/cancer-snapshot", {
          method: "PUT",
          body: {
            calculatedScreeningDates: [],
            testResults: {},
          },
        });

        return seeded.data ? [seeded.data] : [];
      } catch {
        return [];
      }
    }

    throw new Error(error.message);
  }
};

export const saveCancerScreeningData = async (data: any) => {
  try {
    const response = await apiRequest<any>("/me/screenings/cancer-snapshot", {
      method: "PUT",
      body: {
        age: data.age,
        gender: data.gender,
        calculatedScreeningDates: parseIfJsonString(data.calculatedScreeningDates),
        testResults: parseIfJsonString(data.testResults),
        lastScreeningDate: data.lastScreeningDate
          ? new Date(data.lastScreeningDate).toISOString()
          : null,
      },
    });

    return response.data;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const deleteCancerScreeningData = async (_userId: string) => {
  try {
    const response = await apiRequest<{ id: string }>(
      "/me/screenings/cancer-snapshot",
      {
        method: "DELETE",
      }
    );

    return response.data;
  } catch (error: any) {
    if (error instanceof ApiClientError && error.status === 404) {
      return null;
    }

    throw new Error(error.message);
  }
};
