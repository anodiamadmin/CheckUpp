import { ApiClientError, apiRequest } from "@/lib/api/client";

const parseIfJsonString = (value: unknown) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const saveNutritionData = async (data: any) => {
  try {
    const response = await apiRequest<any>("/me/screenings/health-snapshot", {
      method: "PUT",
      body: {
        checkupDates: parseIfJsonString(data.checkupDates),
        healthResults: parseIfJsonString(data.healthResults),
        lastCheckupDate: data.lastCheckupDate
          ? new Date(data.lastCheckupDate).toISOString()
          : null,
        age: data.age,
        gender: data.gender,
      },
    });

    return response.data;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const fetchUserNutritionData = async (_userId: string) => {
  try {
    const response = await apiRequest<any>("/me/screenings/health-snapshot");

    return response.data ? [response.data] : [];
  } catch (error: any) {
    if (error instanceof ApiClientError && error.status === 404) {
      try {
        const seeded = await apiRequest<any>("/me/screenings/health-snapshot", {
          method: "PUT",
          body: {
            checkupDates: [],
            healthResults: {},
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

export const deleteNutritionData = async (_userId: string) => {
  try {
    const response = await apiRequest<{ id: string }>(
      "/me/screenings/health-snapshot",
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
