import { apiRequest } from "@/lib/api/client";

interface FeedbackData {
  userId: string;
  feedback: string;
  rating: number | null;
}

const MAX_API_PAGE_SIZE = 100;

export const saveUserFeedback = async (data: FeedbackData) => {
  try {
    const response = await apiRequest<any>("/me/feedback", {
      method: "POST",
      body: {
        feedback: data.feedback,
        rating: data.rating,
      },
    });

    return response.data;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const fetchUserFeedback = async (_userId: string) => {
  try {
    const response = await apiRequest<any[]>("/me/feedback", {
      query: {
        page: 1,
        pageSize: MAX_API_PAGE_SIZE,
      },
    });

    return response.data ?? [];
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const deleteUserFeedback = async (feedbackId: string) => {
  try {
    const response = await apiRequest<{ id: string }>(`/me/feedback/${feedbackId}`, {
      method: "DELETE",
    });

    return response.data;
  } catch (error: any) {
    throw new Error(error.message);
  }
};
