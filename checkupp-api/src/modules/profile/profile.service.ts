import { Gender, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AuthContext } from "../../types/auth";
import { toDate } from "../../utils/date";
import { toGender } from "../../utils/gender";

interface UpsertProfileInput {
  email?: string;
  name?: string;
  phoneNumber?: string | null;
  gender?: string;
  dob?: string | Date | null;
  avatarUrl?: string | null;
}

export const getMyProfile = async (auth: AuthContext) => {
  return prisma.user.findUnique({ where: { id: auth.userId } });
};

const toCreateData = (auth: AuthContext, input: UpsertProfileInput): Prisma.UserUncheckedCreateInput => ({
  id: auth.userId,
  firebaseUid: auth.firebaseUid,
  email: input.email ?? auth.email,
  name: input.name ?? auth.email.split("@")[0],
  phoneNumber: input.phoneNumber ?? undefined,
  gender: toGender(input.gender) ?? Gender.UNKNOWN,
  dob: (toDate(input.dob) as Date | null | undefined) ?? undefined,
  avatarUrl: input.avatarUrl ?? undefined,
  role: auth.role,
});

export const upsertMyProfile = async (auth: AuthContext, input: UpsertProfileInput) => {
  const existing = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!existing) {
    return prisma.user.create({
      data: toCreateData(auth, input),
    });
  }

  return prisma.user.update({
    where: { id: auth.userId },
    data: {
      email: input.email,
      name: input.name,
      phoneNumber: input.phoneNumber ?? undefined,
      gender: toGender(input.gender),
      dob: toDate(input.dob) as Date | null | undefined,
      avatarUrl: input.avatarUrl ?? undefined,
    },
  });
};

export const patchMyProfile = async (auth: AuthContext, input: UpsertProfileInput) => {
  return prisma.user.update({
    where: { id: auth.userId },
    data: {
      email: input.email,
      name: input.name,
      phoneNumber: input.phoneNumber ?? undefined,
      gender: toGender(input.gender),
      dob: toDate(input.dob) as Date | null | undefined,
      avatarUrl: input.avatarUrl ?? undefined,
    },
  });
};

export const deleteMyProfile = async (auth: AuthContext) => {
  return prisma.user.update({
    where: { id: auth.userId },
    data: { isDeleted: true },
  });
};
