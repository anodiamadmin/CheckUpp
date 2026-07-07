import { ApiClientError, apiRequest } from "@/lib/api/client";

export type PracticeContactPayload = {
  screeningName?: string | null;
  isDefault?: boolean;
  hotdocUrl?: string | null;
  practicePhone?: string | null;
  practiceEmail?: string | null;
};

export type PracticeContactRecord = {
  id?: string;
  screeningName?: string | null;
  isDefault?: boolean;
  hotdocUrl?: string | null;
  practicePhone?: string | null;
  practiceEmail?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export const listMyPracticeContacts = async () => {
  try {
    const response = await apiRequest<
      PracticeContactRecord[] | { items?: PracticeContactRecord[] }
    >("/me/screenings/practice-contacts");

    if (Array.isArray(response.data)) {
      return response.data;
    }

    return response.data?.items || [];
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return [];
    }

    throw error;
  }
};

export const saveMyPracticeContact = async (
  payload: PracticeContactPayload,
) => {
  const response = await apiRequest<PracticeContactRecord>(
    "/me/screenings/practice-contacts",
    {
      method: "PUT",
      body: payload,
    },
  );

  return response.data;
};
