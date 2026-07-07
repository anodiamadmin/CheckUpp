import { ApiClientError, apiRequest } from "@/lib/api/client";
import { updateStoredSessionUser } from "@/lib/auth/session";

interface UserData {
  id?: string;
  dob?: string;
  email: string;
  name?: string;
  gender?: string;
  password?: string;
  lastName?: string;
  firstName?: string;
  phoneNumber?: string;
}

const buildName = (data: UserData) => {
  const fullName = data.name?.trim();
  if (fullName) return fullName;

  const firstName = data.firstName?.trim();
  const lastName = data.lastName?.trim();
  return [firstName, lastName].filter(Boolean).join(" ").trim();
};

const toIsoDateOrNull = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const buildProfilePayload = (data: UserData) => {
  const payload: Record<string, unknown> = {
    email: data.email,
  };

  const name = buildName(data);
  if (name) payload.name = name;
  if (data.phoneNumber !== undefined) payload.phoneNumber = data.phoneNumber;
  if (data.gender !== undefined) payload.gender = data.gender || null;

  const normalizedDob = toIsoDateOrNull(data.dob);
  if (data.dob !== undefined) payload.dob = normalizedDob;

  return payload;
};

export const createUser = async (data: UserData) => {
  try {
    const payload = buildProfilePayload(data);

    const response = await apiRequest<any>("/me/profile", {
      method: "POST",
      body: payload,
    });

    await updateStoredSessionUser(response.data ?? null);
    return response.data;
  } catch (error: any) {
    if (error instanceof ApiClientError && error.status === 409) {
      const fallback = await apiRequest<any>("/me/profile", {
        method: "PATCH",
        body: buildProfilePayload(data),
      });
      return fallback.data;
    }

    throw new Error(error.message || "An error occurred during user creation");
  }
};

export const updateUser = async (_userId: string, data: UserData) => {
  try {
    const payload: Record<string, unknown> = {};

    const name = buildName(data);
    if (name) payload.name = name;
    if (data.email) payload.email = data.email;
    if (data.phoneNumber !== undefined) payload.phoneNumber = data.phoneNumber;
    if (data.gender !== undefined) payload.gender = data.gender || null;
    if (data.dob !== undefined) payload.dob = toIsoDateOrNull(data.dob);

    if (!Object.keys(payload).length) {
      throw new Error("No user fields provided for update");
    }

    const response = await apiRequest<any>("/me/profile", {
      method: "PATCH",
      body: payload,
    });

    await updateStoredSessionUser(response.data ?? null);
    return response.data;
  } catch (error: any) {
    throw new Error(error.message || "An error occurred during user update");
  }
};

export const getUser = async (email: string) => {
  try {
    const response = await apiRequest<any>("/me/profile");
    if (!response.data) return null;

    if (
      email &&
      response.data.email &&
      response.data.email.toLowerCase() !== email.toLowerCase()
    ) {
      return null;
    }

    return response.data;
  } catch (error: any) {
    if (error instanceof ApiClientError && error.status === 404) {
      return null;
    }

    throw new Error(error.message || "An error occurred during user retrieval");
  }
};

export const deleteUser = async (_userId: string) => {
  try {
    const response = await apiRequest<{ id: string; isDeleted?: boolean }>(
      "/me/profile",
      {
        method: "DELETE",
      }
    );

    return response.data;
  } catch (error: any) {
    throw new Error(error.message || "An error occurred during user deletion");
  }
};
