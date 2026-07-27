import { prisma } from "../../db/prisma";
import { AuthContext } from "../../types/auth";
import { withAppwriteCompat } from "../../utils/compat";
import { toDate } from "../../utils/date";
import { toSkipTake, withPagination } from "../../utils/pagination";

interface CreateFeedbackInput {
  feedback: string;
  rating?: number | null;
  submittedAt?: string;
}

export const createFeedback = async (auth: AuthContext, input: CreateFeedbackInput) => {
  const feedback = await prisma.feedbackEntry.create({
    data: {
      userId: auth.userId,
      feedback: input.feedback,
      rating: input.rating ?? undefined,
      submittedAt: (toDate(input.submittedAt) as Date | undefined) ?? new Date(),
    },
  });

  return {
    ...withAppwriteCompat(feedback),
    user: feedback.userId,
  };
};

export const listFeedback = async (auth: AuthContext, page: number, pageSize: number) => {
  const paging = toSkipTake({ page, pageSize });

  const [items, total] = await Promise.all([
    prisma.feedbackEntry.findMany({
      where: { userId: auth.userId },
      orderBy: { submittedAt: "desc" },
      skip: paging.skip,
      take: paging.take,
    }),
    prisma.feedbackEntry.count({ where: { userId: auth.userId } }),
  ]);

  return {
    items: items.map((entry) => ({ ...withAppwriteCompat(entry), user: entry.userId })),
    pagination: withPagination({ page: paging.page, pageSize: paging.pageSize }, total),
  };
};

export const deleteFeedback = async (auth: AuthContext, id: string) => {
  const existing = await prisma.feedbackEntry.findFirst({
    where: { id, userId: auth.userId },
  });

  if (!existing) return null;

  await prisma.feedbackEntry.delete({ where: { id } });

  return {
    ...withAppwriteCompat(existing),
    user: existing.userId,
  };
};
