import { apiRequest } from "@/lib/api/client";

export interface ImmunisationListParams {
  page?: number;
  pageSize?: number;
}

export interface ImmunisationUpcomingParams extends ImmunisationListParams {
  daysAhead?: number;
}

export interface ImmunisationSummary {
  total?: number;
  upcoming?: number;
  overdue?: number;
  dueSoon?: number;
  noDueDate?: number;
  travel?: number;
  completedDoseSeries?: number;
  daysAhead?: number;
  completed?: number;
  [key: string]: unknown;
}

export interface ImmunisationPayload {
  wasNormal?: boolean | null;
  outcomeStatus?: string;
  resultSummary?: string | null;
  notes?: string | null;
  source?: string;
  providerName?: string | null;
  facilityName?: string | null;
  structuredData?: Record<string, unknown> | unknown[] | string | null;
  vaccineName?: string;
  vaccineType?: string;
  brand?: string | null;
  batchNumber?: string | null;
  doseNumber?: number;
  totalDoses?: number;
  administrationSite?: string;
  clinic?: string | null;
  location?: string | null;
  nextDueDate?: string | null;
  sideEffectsNone?: boolean;
  sideEffectsMild?: boolean;
  sideEffectsModerate?: boolean;
  sideEffectsSevere?: boolean;
  sideEffectsDescription?: string | null;
  isTravel?: boolean;
  travelDestination?: string | null;
  departureDate?: string | null;
}

export const createMyImmunisation = async (payload: ImmunisationPayload) => {
  const response = await apiRequest<any>("/me/immunisations", {
    method: "POST",
    body: payload,
  });
  return response.data;
};

export const listMyImmunisations = async ({
  page = 1,
  pageSize = 20,
}: ImmunisationListParams = {}) => {
  const response = await apiRequest<any>("/me/immunisations", {
    query: { page, pageSize },
  });
  return {
    data: Array.isArray(response.data)
      ? response.data
      : response.data?.items || [],
    pagination: response.pagination,
  };
};

export const getMyImmunisation = async (id: string) => {
  const response = await apiRequest<any>(`/me/immunisations/${id}`);
  return response.data;
};

export const updateMyImmunisation = async (
  id: string,
  payload: Partial<ImmunisationPayload>,
) => {
  const response = await apiRequest<any>(`/me/immunisations/${id}`, {
    method: "PATCH",
    body: payload,
  });
  return response.data;
};

export const deleteMyImmunisation = async (id: string) => {
  const response = await apiRequest<any>(`/me/immunisations/${id}`, {
    method: "DELETE",
  });
  return response.data;
};

export const listMyImmunisationsUpcoming = async ({
  daysAhead = 30,
  page = 1,
  pageSize = 20,
}: ImmunisationUpcomingParams = {}) => {
  const response = await apiRequest<any>("/me/immunisations/upcoming", {
    query: { daysAhead, page, pageSize },
  });
  return {
    data: Array.isArray(response.data)
      ? response.data
      : response.data?.items || [],
    pagination: response.pagination,
    meta: (response as any).meta || undefined,
  };
};

export const getMyImmunisationsSummary = async (daysAhead = 30) => {
  const response = await apiRequest<ImmunisationSummary>(
    "/me/immunisations/summary",
    {
      query: { daysAhead },
    },
  );
  return response.data || {};
};
